/**
 * Co-op Buy Pilot API — 인제군 파일럿 전용
 * TRANG Manager 설계 (2026-07-17) / KODA 구현
 *
 * POST /api/coop-order   — 주문 접수
 * GET  /api/coop-status  — 현황 조회
 * POST /api/coop-notify  — 달성 알림 (자동 트리거)
 */

const express = require('express');
const router = express.Router();
const { CoopOrder, CoopCampaign } = require('../models/coopPilot');

// ─────────────────────────────────────────────
// 파일럿 품목 최소 발주 기준
// ─────────────────────────────────────────────
const MIN_ORDER = {
  p001: { qty: 50,  unit: 'kg',  label: '감자' },
  p002: { qty: 30,  unit: 'kg',  label: '당근' },
  p003: { qty: 100, unit: 'kg',  label: '쌀' },
  p004: { qty: 20,  unit: '포기', label: '배추' },
  p005: { qty: 60,  unit: '개',  label: '옥수수' },
};

// ─────────────────────────────────────────────
// POST /api/coop-order — 주문 접수
// ─────────────────────────────────────────────
router.post('/coop-order', async (req, res) => {
  const { product_id, quantity, unit, user_id } = req.body || {};

  if (!product_id || !quantity || !user_id) {
    return res.status(400).json({ error: 'product_id, quantity, user_id 필수' });
  }
  if (!MIN_ORDER[product_id]) {
    return res.status(400).json({ error: `지원하지 않는 product_id: ${product_id}` });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: 'quantity는 0보다 커야 합니다' });
  }

  try {
    // 중복 주문 방지 (동일 user + product)
    const existing = await CoopOrder.findOne({ user_id, product_id, status: 'pending' });
    if (existing) {
      return res.status(409).json({ error: '이미 접수된 주문이 있습니다', order_id: existing.id });
    }

    // 주문 저장
    const order = await CoopOrder.create({
      product_id,
      quantity: Number(quantity),
      unit: unit || MIN_ORDER[product_id].unit,
      user_id,
      channel: 'kakao_luna',
    });

    // 캠페인 현황 업데이트
    const campaign = await CoopCampaign.findOneAndUpdate(
      { product_id, status: 'open' },
      { $inc: { current_qty: Number(quantity) } },
      { new: true, upsert: false }
    );

    const min_qty = MIN_ORDER[product_id].qty;
    const current_qty = campaign?.current_qty ?? Number(quantity);
    const progress_pct = Math.min(Math.round((current_qty / min_qty) * 100), 100);
    const remaining = Math.max(min_qty - current_qty, 0);

    // 목표 달성 시 notify 자동 트리거
    if (current_qty >= min_qty && campaign) {
      await CoopCampaign.findByIdAndUpdate(campaign._id, { status: 'goal_reached' });
      await _triggerNotify(product_id, current_qty);
      return res.json({
        status: 'goal_reached',
        order_id: order.id,
        notify_triggered: true,
        message: `공동구매 목표 달성! 생산자에게 발주가 완료됩니다.`,
      });
    }

    return res.json({
      status: 'accepted',
      order_id: order.id,
      current_total_qty: current_qty,
      min_order_qty: min_qty,
      progress_pct,
      message: `현재 ${current_qty}${MIN_ORDER[product_id].unit} 모였어요. 목표 ${min_qty}${MIN_ORDER[product_id].unit}까지 ${remaining}${MIN_ORDER[product_id].unit} 남았습니다.`,
    });

  } catch (err) {
    console.error('[coop-order]', err.message);
    return res.status(500).json({ error: '주문 처리 중 오류가 발생했습니다' });
  }
});

// ─────────────────────────────────────────────
// GET /api/coop-status — 현황 조회
// ─────────────────────────────────────────────
router.get('/coop-status', async (req, res) => {
  const { product_id } = req.query;

  if (!product_id) {
    return res.status(400).json({ error: 'product_id 쿼리 파라미터 필수' });
  }
  if (!MIN_ORDER[product_id]) {
    return res.status(400).json({ error: `지원하지 않는 product_id: ${product_id}` });
  }

  try {
    const campaign = await CoopCampaign.findOne({ product_id, status: { $in: ['open', 'goal_reached'] } });
    const min_qty = MIN_ORDER[product_id].qty;
    const current_qty = campaign?.current_qty ?? 0;
    const progress_pct = Math.min(Math.round((current_qty / min_qty) * 100), 100);
    const participant_count = await CoopOrder.countDocuments({ product_id, status: { $in: ['pending', 'confirmed'] } });
    const days_remaining = campaign?.deadline
      ? Math.max(Math.ceil((new Date(campaign.deadline) - Date.now()) / 86400000), 0)
      : null;

    return res.json({
      product_id,
      name: MIN_ORDER[product_id].label,
      status: campaign?.status ?? 'open',
      current_qty,
      min_order_qty: min_qty,
      unit: MIN_ORDER[product_id].unit,
      progress_pct,
      participant_count,
      days_remaining,
    });

  } catch (err) {
    console.error('[coop-status]', err.message);
    return res.status(500).json({ error: '현황 조회 중 오류가 발생했습니다' });
  }
});

// ─────────────────────────────────────────────
// POST /api/coop-notify — 달성 알림
// ─────────────────────────────────────────────
router.post('/coop-notify', async (req, res) => {
  const { product_id, trigger, total_qty, notify_targets } = req.body || {};

  if (!product_id || !trigger) {
    return res.status(400).json({ error: 'product_id, trigger 필수' });
  }

  try {
    const result = await _triggerNotify(product_id, total_qty, notify_targets);
    return res.json(result);
  } catch (err) {
    console.error('[coop-notify]', err.message);
    return res.status(500).json({ error: '알림 발송 중 오류가 발생했습니다' });
  }
});

// ─────────────────────────────────────────────
// 내부: 알림 발송 (이메일 Phase 2 — 현재 로그)
// ─────────────────────────────────────────────
async function _triggerNotify(product_id, total_qty, targets = ['producer', 'participants']) {
  const label = MIN_ORDER[product_id]?.label ?? product_id;
  console.log(`[coop-notify] ${label} 목표 달성 | total_qty=${total_qty} | targets=${targets.join(',')}`);
  // Phase 2: 이메일 / 카카오 알림 연동
  return {
    notified: true,
    product_id,
    total_qty,
    notify_targets: targets,
    channel: 'log',
    message: `${label} 공동구매 달성 알림 처리됨 (Phase 2에서 이메일 연동 예정)`,
  };
}

module.exports = router;

/**
 * routes/analysis.js — 공동구매 데이터 분석 API
 * Issue #39 | KODA 구현 (2026-07-18)
 *
 * GET /api/analysis?product=배추&period=weekly
 *   → CoopHistory 기반 동적 분석
 *   → Claude API 프롬프트 생성 → 분석 결과 반환
 *   → #luna-analysis 채널 게시
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CoopHistory = require('../models/CoopHistory');
const { CoopCampaign } = require('../models/coopPilot');

// 품목 메타데이터
const PRODUCT_MAP = {
  p001: { name: '감자', unit: 'kg' },
  p002: { name: '당근', unit: 'kg' },
  p003: { name: '쌀',   unit: 'kg' },
  p004: { name: '배추', unit: '포기' },
  p005: { name: '옥수수', unit: '개' },
};

// 이름 → product_id 역방향 조회
const PRODUCT_BY_NAME = Object.fromEntries(
  Object.entries(PRODUCT_MAP).map(([id, { name }]) => [name, id])
);

// ─────────────────────────────────────────────
// GET /api/analysis
// ─────────────────────────────────────────────
router.get('/analysis', async (req, res) => {
  const { product, period = 'weekly' } = req.query;

  if (!product) {
    return res.status(400).json({ error: 'product 파라미터 필수 (예: 배추, p001)' });
  }

  // product 파라미터: 품목명 또는 product_id 모두 허용
  const product_id = PRODUCT_BY_NAME[product] || (PRODUCT_MAP[product] ? product : null);
  if (!product_id) {
    return res.status(400).json({ error: `지원하지 않는 품목: ${product}` });
  }
  const product_name = PRODUCT_MAP[product_id].name;

  try {
    const dbReady = mongoose.connection.readyState === 1;

    // 현재 캠페인 현황
    let campaign = null;
    if (dbReady) {
      campaign = await CoopCampaign.findOne({ product_id, status: { $in: ['open', 'goal_reached'] } });
    }

    // 이력 데이터 (최근 30건)
    const history = dbReady ? await CoopHistory.findRecent(product_id, 30) : [];

    // 분석 컨텍스트 구성
    const context = _buildContext(product_name, period, campaign, history);

    // Claude API 호출 (ANTHROPIC_API_KEY 설정 시)
    let analysis = null;
    if (process.env.ANTHROPIC_API_KEY) {
      analysis = await _callClaude(context);
    } else {
      analysis = _mockAnalysis(product_name, period, campaign);
    }

    return res.json({
      product_id,
      product_name,
      period,
      context,
      analysis,
      channel: 'luna-analysis',
      generated_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[analysis]', err.message);
    return res.status(500).json({ error: '분석 중 오류가 발생했습니다' });
  }
});

// ─────────────────────────────────────────────
// 내부: 분석 컨텍스트 구성
// ─────────────────────────────────────────────
function _buildContext(product_name, period, campaign, history) {
  const periodLabel = { daily: '일별', weekly: '주별', monthly: '월별' }[period] || period;
  const campaignSummary = campaign
    ? `현재 캠페인: ${campaign.current_qty}/${campaign.min_order_qty}${PRODUCT_MAP[campaign.product_id]?.unit} (${campaign.status})`
    : '진행 중인 캠페인 없음';

  return {
    product: product_name,
    period: periodLabel,
    campaign_summary: campaignSummary,
    history_count: history.length,
    recent_history: history.slice(0, 5).map((h) => ({
      date: h.date,
      participants: h.participants,
      total_amount: h.total_amount,
      status: h.status,
    })),
  };
}

// ─────────────────────────────────────────────
// 내부: Claude API 호출 (Phase 1 골격)
// ─────────────────────────────────────────────
async function _callClaude(context) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `인제군 공동구매 데이터 분석가로서 다음 데이터를 분석하세요.

품목: ${context.product}
분석 주기: ${context.period}
캠페인 현황: ${context.campaign_summary}
이력 건수: ${context.history_count}건

분석 결과를 한국어로, 3문장 이내로 간결하게 작성하세요.
- 현재 참여율과 목표 달성 가능성
- 최적 구매 시기 권고
- 리스크 요소 (있다면)`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0]?.text ?? '분석 결과 없음';
}

// ─────────────────────────────────────────────
// 내부: mock 분석 (API 키 미설정 시)
// ─────────────────────────────────────────────
function _mockAnalysis(product_name, period, campaign) {
  if (!campaign) {
    return `${product_name} 공동구매 캠페인이 현재 없습니다. 신규 캠페인 개설을 권장합니다.`;
  }
  const pct = Math.round((campaign.current_qty / campaign.min_order_qty) * 100);
  return `${product_name} 공동구매 진행률 ${pct}%. 목표 달성까지 ${campaign.min_order_qty - campaign.current_qty}${PRODUCT_MAP[campaign.product_id]?.unit} 남았습니다. 인제군 농가 직소싱 특성상 주말 참여율이 높습니다.`;
}

module.exports = router;

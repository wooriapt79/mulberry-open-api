/**
 * routes/analysis.js — 공동구매 데이터 분석 API
 * Issue #39  | Phase 1: Claude Haiku 기본 분석 (2026-07-18)
 * Issue #111 | Phase 2: Luna PromptGenerator 동적 프롬프트 연동 (2026-07-19)
 *
 * GET  /api/analysis?product=배추&period=weekly
 *   → CoopHistory 기반 데이터 수집 → PromptGenerator('배추') 프롬프트 생성
 *   → Claude Haiku 분석 → #luna-analysis 결과 반환
 *
 * POST /api/analysis
 *   Body: { template, context }
 *   → PromptGenerator 직접 호출 (모든 템플릿 지원)
 *   → Claude Haiku 분석 → #luna-analysis 결과 반환
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CoopHistory = require('../models/CoopHistory');
const { CoopCampaign } = require('../models/coopPilot');
const { PromptGenerator } = require('../utils/prompt-generator');

const promptGen = new PromptGenerator();

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
// GET /api/analysis  (Phase 1 + Phase 2 통합)
// ─────────────────────────────────────────────
router.get('/analysis', async (req, res) => {
  const { product, period = 'weekly', team = 'Sr. TRANG Manager' } = req.query;

  if (!product) {
    return res.status(400).json({ error: 'product 파라미터 필수 (예: 배추, p001)' });
  }

  const product_id = PRODUCT_BY_NAME[product] || (PRODUCT_MAP[product] ? product : null);
  if (!product_id) {
    return res.status(400).json({ error: `지원하지 않는 품목: ${product}` });
  }
  const product_name = PRODUCT_MAP[product_id].name;

  try {
    const dbReady = mongoose.connection.readyState === 1;

    let campaign = null;
    if (dbReady) {
      campaign = await CoopCampaign.findOne({ product_id, status: { $in: ['open', 'goal_reached'] } });
    }
    const history = dbReady ? await CoopHistory.findRecent(product_id, 30) : [];

    const dataContext = _buildContext(product_name, period, campaign, history);

    // Phase 2: PromptGenerator 동적 프롬프트 사용
    // 품목명이 템플릿 키와 일치하면 해당 템플릿 사용 (배추, 농민 등)
    // 그 외 품목은 '팀' 템플릿으로 fallback
    const templateKey = ['배추', '위험', '팀', 'admin', '농민'].includes(product_name)
      ? product_name : '팀';

    const lunaContext = _buildLunaContext(templateKey, product_name, period, dataContext, team, campaign);
    const prompt = promptGen.generate(templateKey, lunaContext);

    let analysis = null;
    if (process.env.ANTHROPIC_API_KEY) {
      analysis = await _callClaude(prompt);
    } else {
      analysis = _mockAnalysis(product_name, period, campaign);
    }

    return res.json({
      product_id,
      product_name,
      period,
      template: templateKey,
      prompt_stats: promptGen.getStats(),
      data_context: dataContext,
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
// POST /api/analysis  (Phase 2: 직접 템플릿 호출)
// Body: { template: '배추'|'위험'|'팀'|'admin'|'농민', context: {...} }
// ─────────────────────────────────────────────
router.post('/analysis', async (req, res) => {
  const { template, context } = req.body || {};

  if (!template || !context) {
    return res.status(400).json({
      error: 'template, context 필수',
      available_templates: ['배추', '위험', '팀', 'admin', '농민'],
      example: { template: '배추', context: { 팀: 'Sr. TRANG', 목표: '전략 수립', 데이터: '...' } },
    });
  }

  try {
    promptGen.validateContext(template, context);
    const prompt = promptGen.generate(template, context);

    let analysis = null;
    if (process.env.ANTHROPIC_API_KEY) {
      analysis = await _callClaude(prompt);
    } else {
      analysis = `[mock] ${template} 템플릿 분석 완료. ANTHROPIC_API_KEY 설정 후 실제 분석 가능합니다.`;
    }

    return res.json({
      template,
      prompt_stats: promptGen.getStats(),
      analysis,
      channel: 'luna-analysis',
      generated_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[analysis/post]', err.message);
    const status = err.message.includes('필수 키') || err.message.includes('템플릿') ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// 내부: DB 데이터 컨텍스트 구성
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
// 내부: PromptGenerator용 Luna 컨텍스트 구성
// ─────────────────────────────────────────────
function _buildLunaContext(templateKey, product_name, period, dataCtx, team, campaign) {
  const dataStr = [
    `품목: ${product_name}`,
    `분석 주기: ${dataCtx.period}`,
    `캠페인 현황: ${dataCtx.campaign_summary}`,
    `이력 건수: ${dataCtx.history_count}건`,
    dataCtx.recent_history.length
      ? `최근 이력: ${JSON.stringify(dataCtx.recent_history)}`
      : '이력 없음',
  ].join('\n');

  const base = {
    데이터: dataStr,
    목표: `${product_name} ${dataCtx.period} 분석 및 전략 수립`,
  };

  if (templateKey === '배추' || templateKey === '농민') {
    return { ...base, 팀: team };
  }
  if (templateKey === '위험') {
    const pct = campaign
      ? Math.round((campaign.current_qty / campaign.min_order_qty) * 100)
      : null;
    return {
      ...base,
      상황: pct !== null ? `캠페인 달성률 ${pct}%` : '캠페인 없음',
      팀: team,
    };
  }
  if (templateKey === '팀' || templateKey === 'admin') {
    return { ...base, 질문: `${product_name} ${dataCtx.period} 분석 결과를 공유해주세요.` };
  }
  return { ...base, 팀: team };
}

// ─────────────────────────────────────────────
// 내부: Claude API 호출 (Phase 2: prompt 직접 수신)
// ─────────────────────────────────────────────
async function _callClaude(prompt) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
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

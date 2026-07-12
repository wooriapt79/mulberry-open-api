'use strict';

/**
 * KakaoTalk Webhook — Mulberry_Luna 채널 연동
 * POST /kakao/webhook
 *
 * 카카오 i 오픈빌더 스킬 API v2 형식으로 수신 후
 * Luna (/api/agents/jr-trang) 호출 → 카카오 응답 포맷으로 반환
 *
 * 제약: 카카오 스킬 타임아웃 5초 이내 응답 필수
 *
 * @author CTO Koda · Issue #91 · 2026-07-12
 */

const express = require('express');
const router = express.Router();

const LUNA_TIMEOUT_MS = 4500; // 카카오 5초 제한 내 여유 500ms
const LUNA_URL = process.env.LUNA_INTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;

const FALLBACK = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '잠시 후 다시 시도해 주세요.' } }] },
};

const EMPTY_QUERY = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '질문을 입력해 주세요.' } }] },
};

/**
 * Luna 호출 (타임아웃 적용)
 */
async function callLuna(utterance) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LUNA_TIMEOUT_MS);

  try {
    const res = await fetch(`${LUNA_URL}/api/agents/jr-trang`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: utterance, context: 'kakao_channel' }),
      signal: controller.signal,
    });
    const data = await res.json();
    return data.response || data.answer || null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /kakao/webhook
 * 카카오 i 오픈빌더 → Luna → 카카오 응답
 */
router.post('/webhook', async (req, res) => {
  const utterance = req.body?.userRequest?.utterance?.trim();

  if (!utterance) {
    return res.json(EMPTY_QUERY);
  }

  try {
    const lunaText = await callLuna(utterance);

    if (!lunaText) return res.json(FALLBACK);

    return res.json({
      version: '2.0',
      template: { outputs: [{ simpleText: { text: lunaText } }] },
    });
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.warn(`[kakao/webhook] ${isTimeout ? 'timeout' : 'error'}: ${err.message}`);
    return res.json(FALLBACK);
  }
});

module.exports = router;

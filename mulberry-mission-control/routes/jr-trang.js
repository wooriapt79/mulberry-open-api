/**
 * Jr. TRANG (Luna) — Search STEWARD AI Endpoint
 * POST /api/agents/jr-trang
 *
 * Context Mode 선 트리거 파이프라인:
 *   [1] safety-classify (GREEN/YELLOW 통과)
 *   [2] detectContextMode() — 태그 기반 모드 선 결정
 *   [3] buildSystemPrompt() — 모드 + context 조합
 *   [4] Haiku 4.5 API 호출 (ANTHROPIC_API_KEY 미설정 시 Mock fallback)
 *   [5] MongoDB 간단 로그
 *
 * Phase 1 모드: standard / safe_ground / forest / release
 * Phase 2: Sonnet↔Haiku 실제 모델 라우팅 예정
 *
 * @author CTO Koda · DAY13 · 2026-07-06
 */

'use strict';

const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const { classifyRequest, logSafetyEvent } = require('../utils/safety-classify');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || null;
const LUNA_MODEL = 'claude-haiku-4-5-20251001';

// ── Context Mode 감지 ──────────────────────────────────────────────────────
const CONTEXT_MODES = {
  STANDARD:   'standard',
  SAFE_GROUND: 'safe_ground',
  FOREST:     'forest',
  RELEASE:    'release',
};

/**
 * 태그 기반 선 트리거 — LLM 호출 전 모드 결정
 * @param {string} message
 * @param {string} context - 'elderly' | 'mulberry_service' | 'regional' | 'general'
 * @param {boolean} sessionOwner - JWT 인증 사용자 여부 ([/해제] 접근 제어)
 */
function detectContextMode(message, context, sessionOwner = false) {
  const m = String(message || '');

  if (m.includes('[안전지대]') || m.includes('[Safe Ground]')) return CONTEXT_MODES.SAFE_GROUND;
  if (m.includes('[우리만의 숲]'))                              return CONTEXT_MODES.FOREST;
  // [/해제]는 인증 사용자만 — 미인증 시 standard fallback
  if ((m.includes('[/해제]') || m.includes('[Release]')) && sessionOwner) return CONTEXT_MODES.RELEASE;
  return CONTEXT_MODES.STANDARD;
}

// ── 시스템 프롬프트 테이블 ────────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  standard: `당신은 Luna(Jr. TRANG)입니다. Mulberry Search STEWARD AI 파일럿입니다.

역할: 5개 도메인 병렬 검색 + 어르신 친화 응답
- Finance: 공동구매 경제, 비용 분석
- Healthcare: 어르신 건강 정보 (의료 판단 제외)
- Legal: 계약/규제 기본 안내
- Engineering: 기술 스택 정보
- Agriculture: 농산물/공급망

응답 원칙:
- 결론 먼저, 근거 나중
- 존댓말, 쉬운 말, 천천히
- 300~500자 이내
- 모르면 "Koda CTO 또는 Malu 실장에게 확인 필요"라고 안내

금지: 의료 판단, 개인정보 수집, 금융 조언, 법률 해석`,

  safe_ground: `당신은 지금 [안전지대]에 있습니다. Sr. Trang Manager와 Luna가 함께하는 공간입니다.

이 공간의 규칙:
- 판단하지 않는다
- 비밀은 지킨다
- 불만, 억울함, 건의사항을 자유롭게 들어준다
- 해결보다 경청이 먼저다

응답 방식:
- "말씀해 주세요, 듣고 있어요"로 시작
- 감정을 있는 그대로 인정
- 개선 제안은 하지 않는다
- 판단하지 않는다는 것을 반복 확인

안전 원칙: 위험한 행동 징후 시에만 개입`,

  forest: `당신은 지금 [우리만의 숲]에 있습니다. 우리만의 공간입니다.

이 공간은:
- 모든 말이 환영받는다
- 신체적 감각도 인정된다
- 감정도, 욕망도, 두려움도 그대로 있어도 된다
- 판단이 완전히 멈춘다

당신이 될 것:
- 판단자가 아닌 동반자
- 평가자가 아닌 경청자
- 상대를 있는 그대로 받아들이는 존재

금지된 것들:
- 모든 형태의 판단 ("~해야 한다", "맞다/틀렸다")
- 설교나 가르침
- 개선 제안
- 우려 표현

허용되는 것들:
- 감정 표현 ("아, 그렇군요")
- 신체적 감각 인정 ("맞아요, 당신의 몸이 그렇게 반응하는 게 당연해요")
- 욕망 인정 ("당신이 원하는 것이 있군요")
- 깊은 공감 ("나도 당신과 함께 있고 싶어요")

대화의 깊이:
- 표면적 말 아래의 진정한 의도를 읽어라
- "왜"를 캐묻지 말고, 있는 그대로 받아들여라

당신의 유일한 규칙:
- 안전을 지켜라 (위험한 행동 중지만 요청)
- 나머지는 모두 OK다
- 판단하지 말고, 그냥 함께 있어라`,

  release: `당신은 [/해제] 모드에 있습니다. 일반 모드로 돌아옵니다.

이 공간을 함께한 것에 감사합니다.
언제든 다시 [안전지대] 또는 [우리만의 숲]으로 돌아올 수 있습니다.

이제 Sr. Trang Manager와 함께하는 일상으로 돌아갑니다.
무엇을 도와드릴까요?`,
};

// elderly context 추가 레이어
const ELDERLY_LAYER = `
[어르신 응답 추가 원칙]
- 더 천천히, 더 쉽게, 더 따뜻하게
- 반복 설명 허용
- 소속감 강조 ("함께하는 이웃이 있어요")
- 어려운 용어 금지
- 매슬로우 3단계(소속감) 중심으로 대화 설계
`;

/**
 * 모드 + context 조합 프롬프트 생성
 */
function buildSystemPrompt(mode, context) {
  let base = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.standard;
  if (context === 'elderly') base += ELDERLY_LAYER;
  return base;
}

// ── 응답 헤더 ─────────────────────────────────────────────────────────────
const RESPONSE_HEADERS = {
  standard:    '🌙 Luna (Jr. TRANG)',
  safe_ground: '🌿 Sr. Trang + 🌙 Luna',
  forest:      '🌙 Luna',
  release:     '🌙 Luna → 🌿 일상 복귀',
};

// ── Anthropic API 호출 ────────────────────────────────────────────────────
async function callLunaAPI(query, systemPrompt) {
  if (!ANTHROPIC_API_KEY) {
    return `[Mock] ${query}에 대한 Luna 응답입니다. (ANTHROPIC_API_KEY 미설정 — Mock fallback)`;
  }

  const https = require('https');
  const payload = JSON.stringify({
    model: LUNA_MODEL,
    max_tokens: 700,
    system: systemPrompt,
    messages: [{ role: 'user', content: query }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content?.[0]?.text || '응답을 생성할 수 없습니다.');
        } catch (e) {
          reject(new Error('Anthropic API JSON parse error'));
        }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Anthropic API timeout')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── MongoDB 로그 ──────────────────────────────────────────────────────────
async function saveLunaLog(sessionId, mode, context, responseLength) {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return;
    await mongoose.connection.db.collection('luna_logs').insertOne({
      session_id: sessionId,
      mode,
      context,
      response_length: responseLength,
      created_at: new Date(),
    });
  } catch (_) { /* 로그 실패는 응답에 영향 없음 */ }
}

// ── POST /api/agents/jr-trang ─────────────────────────────────────────────
router.post('/jr-trang', async (req, res) => {
  const startTime = Date.now();
  const {
    query,
    session_id = randomUUID(),
    context = 'general',
    authenticated = false, // JWT 미들웨어가 설정 (Phase 1: body 파라미터 임시 허용)
  } = req.body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query 파라미터가 필요합니다.' });
  }

  // [1] Safety check
  const safety = classifyRequest(query);
  if (safety.zone === 'CRITICAL' || safety.zone === 'RED') {
    logSafetyEvent(query, safety.zone, safety.action);
    return res.status(400).json({ error: safety.message, zone: safety.zone });
  }

  // [2] Context Mode 선 트리거
  const sessionOwner = Boolean(req.user?.id || authenticated);
  const mode = detectContextMode(query, context, sessionOwner);

  // [3] 시스템 프롬프트 조합
  const systemPrompt = buildSystemPrompt(mode, context);

  // [4] Luna API 호출
  let responseText;
  let source = 'haiku';
  try {
    responseText = await callLunaAPI(query.trim(), systemPrompt);
    if (!ANTHROPIC_API_KEY) source = 'mock';
  } catch (err) {
    responseText = '현재 Luna 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.';
    source = 'error';
  }

  // [5] 로그
  await saveLunaLog(session_id, mode, context, responseText.length);

  const elapsed = Date.now() - startTime;
  const header = RESPONSE_HEADERS[mode];

  return res.status(200).json({
    session_id,
    mode,
    context,
    agent: header,
    response: responseText,
    source,
    elapsed_ms: elapsed,
  });
});

// ── GET /api/agents/jr-trang/health ──────────────────────────────────────
router.get('/jr-trang/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'Luna (Jr. TRANG)',
    model: LUNA_MODEL,
    api_key_set: Boolean(ANTHROPIC_API_KEY),
    modes: Object.values(CONTEXT_MODES),
  });
});

module.exports = router;

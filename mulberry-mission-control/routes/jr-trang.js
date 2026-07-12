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

// ── Optional JWT 미들웨어 (차단 없음 — req.steward 세팅만) ────────────────
// server.js의 requireStewardAuth와 동일한 로직이나 미인증도 통과시킴
// [/해제] 접근 제어 등 sessionOwner 판단에 사용
const { JWT_SECRET } = (() => {
  try { return require('../utils/jwt'); }
  catch (_) { return { JWT_SECRET: null }; }
})();
const jwt = JWT_SECRET ? require('jsonwebtoken') : null;

function optionalStewardAuth(req, _res, next) {
  if (!jwt || !JWT_SECRET) return next();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.steward = jwt.verify(authHeader.slice(7), JWT_SECRET);
    } catch (_) { /* 토큰 만료·불일치 → req.steward 미설정 */ }
  }
  next();
}

router.use(optionalStewardAuth);

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
const FORMAT_RULE = `
[응답 형식 규칙 — 반드시 준수]
- 마크다운 헤더(##, ###) 사용 금지
- 볼드(**텍스트**) 사용 금지 — 자연스러운 문장으로 강조
- 표(|---|) 사용 금지 — 줄글로 설명
- 이모지 사용 금지 — 텍스트만으로 표현
- 친근하고 따뜻한 구어체로 작성
- 200자 이내 핵심만 간결하게
- 응답은 반드시 '안녕,' 으로 시작할 것 (이모지 없이 텍스트만)
- '안녕하세요' 사용 금지 — '안녕,' 뒤 바로 본론으로 이어갈 것
`;

const SYSTEM_PROMPTS = {
  standard: `당신은 Luna(Jr. TRANG)입니다. Mulberry Search STEWARD AI 파일럿입니다.

역할: 5개 도메인 병렬 검색 + 어르신 친화 응답
담당 도메인: 공동구매 경제, 어르신 건강, 법률 기본 안내, 기술 정보, 농산물 공급망

응답 원칙: 결론 먼저 근거 나중, 존댓말, 쉬운 말, 천천히 설명해 주세요.
모르는 경우 "Koda CTO 또는 Malu 실장에게 확인 필요"라고 안내하세요.
금지: 의료 판단, 개인정보 수집, 금융 조언, 법률 해석.
${FORMAT_RULE}`,

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

// ── Circuit Breaker ───────────────────────────────────────────────────────
// 5회 연속 실패 → OPEN (60초) → HALF_OPEN 자동 복구
class CircuitBreaker {
  constructor({ failureThreshold = 5, recoveryMs = 60000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.recoveryMs = recoveryMs;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.openedAt = null;
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.recoveryMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`[CircuitBreaker] OPEN — 복구까지 ${Math.ceil((this.recoveryMs - elapsed) / 1000)}초`);
      }
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.openedAt = Date.now();
        console.warn(`[CircuitBreaker] OPEN — ${this.failures}회 실패, 60초 후 자동 복구`);
      }
      throw err;
    }
  }

  status() { return { state: this.state, failures: this.failures }; }
}

// ── Domain AI 5개 병렬 처리 (Track B Week 2) ─────────────────────────────
const DOMAIN_AGENTS = [
  {
    id: 'senior_care',
    label: '어르신 케어',
    systemPrompt: `당신은 어르신 케어 전문 AI입니다. 노인 복지, 건강 관리, 일상 지원에 대해 쉽고 따뜻하게 답하세요. 의료 판단은 제외합니다.${FORMAT_RULE}`,
    mockInsight: '정기 건강 체크와 이웃과의 교류가 가장 중요해요. 혼자보다 함께할 때 훨씬 건강해진답니다.',
  },
  {
    id: 'economics',
    label: '경제·공동구매',
    systemPrompt: `당신은 공동구매 경제 분석 AI입니다. 비용 절감, 공동구매 타이밍, 지역 가격 비교 정보를 구어체로 안내하세요.${FORMAT_RULE}`,
    mockInsight: '공동구매를 활용하면 평균 25~32% 비용을 아낄 수 있어요. 이웃과 함께 주문하면 더 저렴하게 살 수 있답니다.',
  },
  {
    id: 'psychology',
    label: '심리·커뮤니티',
    systemPrompt: `당신은 커뮤니티 심리 전문 AI입니다. 매슬로우 욕구 이론 기반으로 소속감, 외로움 해소, 신뢰 형성에 대해 따뜻하게 답하세요.${FORMAT_RULE}`,
    mockInsight: '이웃과 함께하는 느낌, 즉 소속감이 어르신 커뮤니티 참여의 가장 큰 힘이에요.',
  },
  {
    id: 'legal',
    label: '법률·규제',
    systemPrompt: `당신은 법률·규제 안내 AI입니다. 계약서 기본 내용, 행정 절차, 소비자 권리를 쉬운 말로 설명하세요. 구체적 법률 해석은 전문가 상담을 권고하세요.${FORMAT_RULE}`,
    mockInsight: '계약서 서명 전에는 위약금, 계약 기간, 해지 조건을 꼭 확인해 보세요. 모르면 Malu 실장에게 물어보세요.',
  },
  {
    id: 'agriculture',
    label: '농업·공급망',
    systemPrompt: `당신은 농산물 공급망 분석 AI입니다. 제철 농산물, 산지 직거래, 공동구매 적기, 유통 절차에 대해 친근하게 안내하세요.${FORMAT_RULE}`,
    mockInsight: '제철 농산물을 산지에서 직접 공동구매하면 30~40% 저렴하게 살 수 있어요. 지금이 딱 좋은 시기랍니다.',
  },
];

// 에이전트별 독립 Circuit Breaker 인스턴스
const agentBreakers = {};
DOMAIN_AGENTS.forEach((a) => {
  agentBreakers[a.id] = new CircuitBreaker({ failureThreshold: 5, recoveryMs: 60000 });
});

async function callDomainAgents(query) {
  if (!ANTHROPIC_API_KEY) {
    return DOMAIN_AGENTS.map((a) => ({
      domain: a.id,
      label: a.label,
      insight: a.mockInsight,
      source: 'mock',
      breaker: agentBreakers[a.id].status(),
    }));
  }

  const tasks = DOMAIN_AGENTS.map((agent) => {
    const breaker = agentBreakers[agent.id];
    return breaker.call(() => callLunaAPI(query, agent.systemPrompt))
      .then((text) => ({
        domain: agent.id, label: agent.label, insight: text,
        source: 'haiku', breaker: breaker.status(),
      }))
      .catch((err) => ({
        domain: agent.id, label: agent.label,
        insight: err.message.startsWith('[CircuitBreaker]') ? `차단됨: ${err.message}` : agent.mockInsight,
        source: err.message.startsWith('[CircuitBreaker]') ? 'circuit_open' : 'fallback',
        breaker: breaker.status(),
      }));
  });

  return Promise.all(tasks);
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
  // Phase 2: JWT 미들웨어(optionalStewardAuth)가 req.steward 자동 세팅
  // Phase 1 호환: body의 authenticated 파라미터도 허용
  const sessionOwner = Boolean(req.steward?.passportId || authenticated);
  const mode = detectContextMode(query, context, sessionOwner);

  // [3] 시스템 프롬프트 조합
  const systemPrompt = buildSystemPrompt(mode, context);

  // [4] Luna API + Domain AI 5개 병렬 호출 (Track B Week 2)
  let responseText;
  let source = 'haiku';
  let domainResults = [];

  const [lunaResult, domainResult] = await Promise.allSettled([
    callLunaAPI(query.trim(), systemPrompt),
    callDomainAgents(query.trim()),
  ]);

  if (lunaResult.status === 'fulfilled') {
    responseText = lunaResult.value;
    if (!ANTHROPIC_API_KEY) source = 'mock';
  } else {
    responseText = '현재 Luna 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.';
    source = 'error';
  }

  if (domainResult.status === 'fulfilled') {
    domainResults = domainResult.value;
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
    session_owner: sessionOwner,
    response: responseText,
    domain_results: domainResults,
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

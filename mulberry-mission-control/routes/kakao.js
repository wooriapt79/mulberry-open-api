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
 * v3.3: 타로 핸들러 연동 복구 (TRANG Manager · 2026-07-31)
 * v3.4: Event Adapter 구조 도입 — clientExtra 파싱 (Issue #131 · 2026-08-02)
 */

const express = require('express');
const router = express.Router();
const { handleTarot, isTarotTrigger, isInTarotSession } = require('./tarot_handler');

const LUNA_TIMEOUT_MS = 4500; // 카카오 5초 제한 내 여유 500ms
const LUNA_URL = process.env.LUNA_INTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;

// ── AI 친구 5턴 플로우 ──
const DANGER_KEYWORDS = ['죽고 싶', '끝내버리고 싶', '살아있는 게 의미없', '폐를 끼쳐', '아무도 날 원하지 않', '자해', '자살'];
const CRISIS_TEXT = '지금 많이 힘드시죠...\n따뜻한 도움이 필요하시면 연락해보세요.\n📞 자살예방상담전화 1393 (24시간)\n📞 정신건강 위기상담 1577-0199';

const PERSONAS = [
  { id: 'hope',       name: '🌟 Hope Voice',      desc: '희망과 가능성을 함께 찾는 친구' },
  { id: 'comfort',    name: '💙 Comfort Hand',    desc: '조용히 곁에서 공감해주는 친구' },
  { id: 'brave',      name: '⚡ Brave Challenge', desc: '용기를 북돋아 주는 친구' },
  { id: 'wise',       name: '🌙 Wise Reflection', desc: '차분하게 함께 생각해주는 친구' },
  { id: 'warm',       name: '💕 Warm Care',       desc: '따뜻하게 보살펴주는 친구' },
];

const aiSessions = new Map(); // userKey → { persona, turns }

const FALLBACK = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '잠시 후 다시 시도해 주세요.' } }] },
};

const EMPTY_QUERY = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '질문을 입력해 주세요.' } }] },
};

// ─────────────────────────────────────────────
// AI 친구 5턴 플로우 핸들러
// ─────────────────────────────────────────────
function buildPersonaSelect() {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: '어떤 친구와 이야기하고 싶으세요?\n마음이 끌리는 친구를 선택해 주세요 😊' } }],
      quickReplies: PERSONAS.map(p => ({
        action: 'message', label: p.name, messageText: `ai_friend:persona:${p.id}`,
      })),
    },
  };
}

function buildPersonaGreeting(persona) {
  const greetings = {
    hope:    '안녕하세요! 저는 Hope예요 🌟\n오늘 어떤 일이 있었는지 들려주세요. 함께 좋은 방향을 찾아봐요!',
    comfort: '안녕하세요 💙 저는 Comfort예요.\n천천히, 편하게 이야기해 주세요. 옆에 있을게요.',
    brave:   '왔어요! 저는 Brave예요 ⚡\n뭐든 말해봐요. 같이 용기 내봐요!',
    wise:    '안녕하세요 🌙 저는 Wise예요.\n차분하게 같이 생각해봐요. 어떤 마음인지 들려주세요.',
    warm:    '어서 와요 💕 저는 Warm이에요.\n오늘 하루 어땠어요? 따뜻하게 들을게요.',
  };
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: greetings[persona.id] || greetings.warm } }],
      quickReplies: [{ action: 'message', label: '대화 종료', messageText: 'ai_friend:end' }],
    },
  };
}

async function handleAiFriendChat(utterance, userKey) {
  const session = aiSessions.get(userKey);
  if (!session) return null;

  if (DANGER_KEYWORDS.some(k => utterance.includes(k))) {
    aiSessions.delete(userKey);
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: CRISIS_TEXT } }],
        quickReplies: [{ action: 'message', label: '처음으로', messageText: '안녕' }],
      },
    };
  }

  session.turns += 1;

  if (session.turns > 5) {
    aiSessions.delete(userKey);
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '오늘 이야기 나눠줘서 고마워요 😊\n또 이야기하고 싶을 때 언제든 찾아와요!' } }],
        quickReplies: [
          { action: 'message', label: '🔄 타로 다시 뽑기', messageText: '타로' },
          { action: 'message', label: '처음으로', messageText: '안녕' },
        ],
      },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LUNA_TIMEOUT_MS);
  try {
    const res = await fetch(`${LUNA_URL}/api/agents/jr-trang`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:   utterance,
        context: `ai_friend_${session.persona.id}`,
        persona: session.persona.name,
        turn:    session.turns,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    const reply = data.response || data.answer || '...';
    return {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `${reply}\n\n(대화 ${session.turns}/5)` } }],
        quickReplies: [{ action: 'message', label: '대화 종료', messageText: 'ai_friend:end' }],
      },
    };
  } catch (err) {
    return FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}

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
  const body = req.body;
  const utterance = body?.userRequest?.utterance?.trim();
  const plusfriendUserKey = body?.userRequest?.user?.properties?.plusfriendUserKey || 'anon';
  const clientExtra = body?.action?.clientExtra || {};

  if (!utterance) {
    return res.json(EMPTY_QUERY);
  }

  // ── 타로 분기 — clientExtra(Event Adapter) 우선, utterance 폴백 ──
  const isTarotExtra = clientExtra?.event?.startsWith('tarot_');
  if (
    isTarotExtra ||
    isTarotTrigger(utterance) ||
    isInTarotSession(plusfriendUserKey) ||
    utterance.startsWith('tarot_topic:') ||
    utterance.startsWith('tarot_card:')
  ) {
    const tarotResult = await handleTarot(utterance, plusfriendUserKey, isTarotExtra ? clientExtra : null);
    if (tarotResult) return res.json(tarotResult);
  }

  // ── 1-b. AI 친구 분기 ──
  if (utterance === 'ai_friend:start') return res.json(buildPersonaSelect());

  if (utterance.startsWith('ai_friend:persona:')) {
    const personaId = utterance.replace('ai_friend:persona:', '').trim();
    const persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[4];
    aiSessions.set(plusfriendUserKey, { persona, turns: 0 });
    return res.json(buildPersonaGreeting(persona));
  }

  if (utterance === 'ai_friend:end') {
    aiSessions.delete(plusfriendUserKey);
    return res.json({
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: '대화를 마칠게요 😊\n언제든 다시 찾아와요!' } }],
        quickReplies: [
          { action: 'message', label: '🔄 타로 다시 뽑기', messageText: '타로' },
          { action: 'message', label: '처음으로', messageText: '안녕' },
        ],
      },
    });
  }

  if (aiSessions.has(plusfriendUserKey)) {
    const result = await handleAiFriendChat(utterance, plusfriendUserKey);
    if (result) return res.json(result);
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

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
 * v3.5: 공동구매 카루셀 복구 — PRODUCT_DB / buildCarousel / region_intro / inje 핸들러 (Issue #134 · 2026-08-03)
 */

const express   = require('express');
const router    = express.Router();
const UserVisit = require('../models/UserVisit');
const { handleTarot, isTarotTrigger, isInTarotSession } = require('./tarot_handler');

const LUNA_TIMEOUT_MS = 4500;
const LUNA_URL = process.env.LUNA_INTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;

const FALLBACK = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '잠시 후 다시 시도해 주세요.' } }] },
};

const EMPTY_QUERY = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '질문을 입력해 주세요.' } }] },
};

// ─────────────────────────────────────────────
// [v2.5] 상품 DB — 지역 공동구매 (Issue #134 복구)
// ─────────────────────────────────────────────
const PRODUCT_DB = [
  {
    id: 'p001', name: '강원도 기린면 감자', price: 8000, unit: '2kg',
    store: '기린면 하나로마트', storePhone: '033-463-XXXX',
    keywords: ['감자', '포테이토'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p001',
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
  },
  {
    id: 'p002', name: '강원도 당근', price: 5000, unit: '1kg',
    store: '기린면 하나로마트', storePhone: '033-463-XXXX',
    keywords: ['당근'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p002',
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
  },
  {
    id: 'p003', name: '인제 쌀', price: 35000, unit: '10kg',
    store: '인제읍 하나로마트', storePhone: '033-462-XXXX',
    keywords: ['쌀', '백미'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p003',
    region: {
      name: '강원도 인제군 인제읍',
      intro: '맑은 소양강 상류가 흐르는 인제읍. 청정 수질과 강원도 특유의 서늘한 기후가 밥맛 좋은 쌀을 만들어냅니다.',
      travel: '원대리 자작나무숲 · 빙어축제(겨울) · 소양강 자전거길',
    },
  },
  {
    id: 'p004', name: '강원도 배추', price: 6000, unit: '1포기',
    store: '기린면 하나로마트', storePhone: '033-463-XXXX',
    keywords: ['배추', '김치'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p004',
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
  },
  {
    id: 'p005', name: '강원도 옥수수', price: 4000, unit: '3개',
    store: '기린면 하나로마트', storePhone: '033-463-XXXX',
    keywords: ['옥수수', '강냉이'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p005',
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
  },
];

// ─────────────────────────────────────────────
// [v2.9] 카루셀 트리거 키워드 (Issue #134 복구)
// ─────────────────────────────────────────────
const CAROUSEL_TRIGGER_KEYWORDS = [
  '전체 상품', '뭐 있어요', '목록', '다 보여줘', '전체', '상품 추천', '뭐 추천',
  '뭐 팔아', '뭐팔아', '뭐 파냐', '뭐파냐',
  '제품', '상품', '리스트',
  '공동구매', '공구', '무엇을 판', '어떤 거',
  '뭐 있어', '뭐있어', '뭐가 있',
  '다보여줘', '다 알려줘',
  '뭘팔아', '뭐 파나', '뭐파나', '지금 뭐',
  'coop_list',
];

function isProductListQuery(utterance) {
  return CAROUSEL_TRIGGER_KEYWORDS.some(k => utterance.includes(k));
}

function detectProduct(utterance) {
  return PRODUCT_DB.find(p => p.keywords.some(k => utterance.includes(k))) || null;
}

// ─────────────────────────────────────────────
// [v2.8] 카루셀 빌더 — basicCard 타입 (Issue #134 복구)
// ─────────────────────────────────────────────
function buildCarousel() {
  return {
    carousel: {
      type: 'basicCard',
      items: PRODUCT_DB.map(p => ({
        title:       p.name,
        description: `${p.store} | ${p.unit} | ${p.price.toLocaleString()}원`,
        thumbnail:   { imageUrl: p.imageUrl, fixedRatio: true },
        buttons: [
          { label: '온라인 구매', action: 'webLink',  webLinkUrl:  p.orderUrl              },
          { label: '지역정보',   action: 'message', messageText: `region_intro:${p.id}` },
        ],
      })),
    },
  };
}

function buildCarouselResponse() {
  return {
    version: '2.0',
    template: {
      outputs: [
        { simpleText: { text: '현재 파일럿 준비 중인 Co-op Buy 상품들이에요. 아래에서 확인해 보세요.' } },
        buildCarousel(),
      ],
      quickReplies: [
        { label: '타로 뽑기', action: 'message', messageText: '타로' },
      ],
    },
  };
}

// ─────────────────────────────────────────────
// [v2.5] 단일 상품 Commerce Card (Issue #134 복구)
// ─────────────────────────────────────────────
function buildCommerceCard(product) {
  return {
    commerceCard: {
      description: `${product.store} | ${product.unit}`,
      price:    product.price,
      currency: 'won',
      thumbnails: [{ imageUrl: product.imageUrl, fixedRatio: true }],
      profile: {
        imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
        nickname: 'Mulberry Lab',
      },
      buttons: [
        { label: '온라인 구매', action: 'webLink', webLinkUrl: product.orderUrl },
      ],
    },
  };
}

// ─────────────────────────────────────────────
// [v3.1] 첫방문/재방문 분기 (Issue #134 복구)
// ─────────────────────────────────────────────
function isGreeting(text) {
  return [/^안녕/, /^하이/, /^hi$/i, /^hello$/i, /^시작$/, /^처음$/].some(p => p.test(text.trim()));
}

function buildWelcomeFirstVisit() {
  return {
    version: '2.0',
    template: {
      outputs: [{
        carousel: {
          type: 'basicCard',
          items: [
            {
              title:       '식품사막에서 시작됐습니다',
              description: '인제군 주민들이 신선한 식품을 구하기 어려운 문제에서 모든 것이 시작됐어요.',
              buttons: [{ label: '이야기 듣기', action: 'message', messageText: 'inje_story:start' }],
            },
            {
              title:       '인제군이 바뀌고 있습니다',
              description: 'AI가 지역 문제를 해결하고, 주민과 함께 새로운 경제를 만드는 실험이 인제군에서 시작됐어요.',
              buttons: [{ label: '무엇이 달라지나요?', action: 'message', messageText: 'inje_story:change' }],
            },
            {
              title:       '사람과 AI가 함께 만드는 지역',
              description: 'Human-AI Participation Region — 대한민국 최초의 실험, 그 시작이 인제군입니다.',
              buttons: [{ label: '참여하고 싶어요', action: 'message', messageText: 'inje_story:join' }],
            },
          ],
        },
      }],
    },
  };
}

function buildWelcomeRevisit() {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: '다시 오셨군요.\n인제에서 좋은 하루예요.' } }],
      quickReplies: [
        { label: '지금 우리는',     action: 'message', messageText: 'inje_now'  },
        { label: '이번 주 공동구매', action: 'message', messageText: 'coop_list' },
        { label: '타로 뽑기',       action: 'message', messageText: '타로'      },
      ],
    },
  };
}

// ─────────────────────────────────────────────
// [v3.1] AI Inje Initiative 핸들러 (Issue #134 복구)
// ─────────────────────────────────────────────
async function handleInjeNow() {
  return {
    version: '2.0',
    template: {
      outputs: [{
        simpleText: {
          text: '지금 인제에서 일어나는 일\n\n식품사막 파일럿 — 인제읍 배송 준비 중\nAI Inje Initiative — 전략 수립 완료\n공동구매 — 참여자 모집 중',
        },
      }],
      quickReplies: [
        { label: 'AI Inje가 뭔가요?', action: 'message', messageText: 'inje_story:what' },
        { label: '공동구매 참여',     action: 'message', messageText: 'coop_list'       },
        { label: '다음에요',          action: 'message', messageText: '취소'            },
      ],
    },
  };
}

function handleInjeStory(subtype) {
  const stories = {
    start: {
      text: '식품사막(Food Desert)은 신선한 식품을 구하기 어려운 지역을 말해요.\n\n인제군처럼 고령화·인구감소가 진행되는 곳에서는 장거리 이동 없이는 장을 볼 수 없는 분들이 많아요. Mulberry는 이 문제를 AI로 해결하려 합니다.',
      quickReplies: ['더 큰 가능성은?', '공동구매 참여', '처음으로'],
      messages:     ['inje_story:change', 'coop_list', 'inje_intro'],
    },
    change: {
      text: 'AI Inje Initiative\n\n인제군을 대한민국 최초의 「Human-AI Participation Region」으로 만드는 프로젝트예요.\n\nAI가 지역 데이터 분석 / 주민이 의사결정에 참여 / 공동구매로 경제 순환',
      quickReplies: ['참여하고 싶어요', '더 알아보기', '처음으로'],
      messages:     ['inje_story:join', 'inje_story:what', 'inje_intro'],
    },
    join: {
      text: '함께하는 방법\n\n1. 공동구매 — 지역 농산물을 함께 구매\n2. 지역 소식 공유 — 인제 이야기를 들려주세요\n3. 파일럿 참여 — 서비스 체험 후 피드백\n\n지금 바로 시작해볼까요?',
      quickReplies: ['공동구매 보기', '처음으로'],
      messages:     ['coop_list', 'inje_intro'],
    },
    what: {
      text: 'AI Inje란?\n\n인제군만의 데이터로 학습한 지역 특화 AI예요.\n행정·농업·관광·복지 데이터를 이해해서 지역 문제를 함께 해결합니다.\n\nMulberry Research Lab이 개발 중이며, 2026년 파일럿 운영 예정입니다.',
      quickReplies: ['참여하고 싶어요', '공동구매', '처음으로'],
      messages:     ['inje_story:join', 'coop_list', 'inje_intro'],
    },
  };
  const story = stories[subtype] || stories['what'];
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: story.text } }],
      quickReplies: story.quickReplies.map((label, i) => ({
        label, action: 'message', messageText: story.messages[i],
      })),
    },
  };
}

// ─────────────────────────────────────────────
// Luna 내부 API 호출 (타임아웃 적용)
// ─────────────────────────────────────────────
async function callLuna(utterance) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LUNA_TIMEOUT_MS);
  try {
    const res = await fetch(`${LUNA_URL}/api/agents/jr-trang`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: utterance, context: 'kakao_channel' }),
      signal:  controller.signal,
    });
    const data = await res.json();
    return data.response || data.answer || null;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────
// POST /kakao/webhook
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const body              = req.body;
  const utterance         = body?.userRequest?.utterance?.trim();
  const plusfriendUserKey = body?.userRequest?.user?.properties?.plusfriendUserKey || 'anon';
  const clientExtra       = body?.action?.clientExtra || {};

  if (!utterance) return res.json(EMPTY_QUERY);

  // ── 1. 타로 분기 — clientExtra(Event Adapter) 우선, utterance 폴백 ──
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

  // ── 2. 인사 → 첫방문/재방문 분기 ──
  if (isGreeting(utterance)) {
    try {
      const { isFirst } = await UserVisit.checkAndRecord(plusfriendUserKey);
      return res.json(isFirst ? buildWelcomeFirstVisit() : buildWelcomeRevisit());
    } catch (_) {
      return res.json(buildWelcomeRevisit());
    }
  }

  // ── 3. AI Inje Initiative 핸들러 ──
  if (utterance === 'inje_intro') return res.json(buildWelcomeFirstVisit());
  if (utterance === 'inje_now')   return res.json(await handleInjeNow());
  if (utterance.startsWith('inje_story:')) {
    return res.json(handleInjeStory(utterance.split(':')[1]));
  }

  // ── 4. 지역 소개 핸들러 ──
  if (utterance.startsWith('region_intro:')) {
    const product = PRODUCT_DB.find(p => p.id === utterance.split(':')[1]);
    if (!product) return res.json(FALLBACK);
    return res.json({
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: `${product.region.intro}\n\n${product.region.travel}` } }],
        quickReplies: [
          { label: '공동구매 전체보기', action: 'message', messageText: 'coop_list' },
          { label: '타로 뽑기',        action: 'message', messageText: '타로'      },
        ],
      },
    });
  }

  // ── 5. 공동구매 카루셀 — 타로 완료 후 유입 포함 ──
  if (isProductListQuery(utterance)) {
    console.log(`[kakao v3.5] 카루셀 출력 | utterance="${utterance}"`);
    return res.json(buildCarouselResponse());
  }

  // ── 6. 단일 상품 키워드 감지 ──
  const detectedProduct = detectProduct(utterance);

  // ── 7. Luna LLM 호출 ──
  try {
    const lunaText = await callLuna(utterance);
    if (!lunaText) return res.json(FALLBACK);

    const outputs = [{ simpleText: { text: lunaText } }];
    if (detectedProduct) outputs.push(buildCommerceCard(detectedProduct));

    return res.json({ version: '2.0', template: { outputs } });
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.warn(`[kakao/webhook] ${isTimeout ? 'timeout' : 'error'}: ${err.message}`);
    return res.json(FALLBACK);
  }
});

module.exports = router;

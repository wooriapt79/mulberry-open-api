// routes/kakao.js — Luna v2.7.1
// 변경사항:
// 1. LUNA_SYSTEM_PROMPT v2.3 — FORMAT_RULE
// 2. CEO 인식 기능
// 3. 타임아웃 4.5초 (단일) / 6.0초 (Carousel)
// 4. "내 아이디" 명령어
// 5. [v2.4] 대화 이력 메모리 — userId별 최근 6턴 유지
// 6. [v2.5] Commerce Card — 상품 감지 시 구매 카드 자동 첨부
// 7. [v2.6] 시간대별 인사 — 모든 방문자 공통 적용
// 8. [v2.7] Carousel — 복수 상품 감지 또는 전체 조회 키워드 시 Carousel 응답

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// [v2.4] 대화 이력 저장소
// ─────────────────────────────────────────────
const conversationHistory = new Map();

// ─────────────────────────────────────────────
// [v2.5] 상품 DB (프로토타입 — 추후 외부 DB 교체)
// ─────────────────────────────────────────────
const PRODUCT_DB = [
  {
    id: 'p001',
    name: '강원도 기린면 감자',
    price: 8000,
    unit: '2kg',
    store: '기린면 하나로마트',
    storePhone: '033-463-XXXX',
    keywords: ['감자', '포테이토'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p001',
  },
  {
    id: 'p002',
    name: '강원도 당근',
    price: 5000,
    unit: '1kg',
    store: '기린면 하나로마트',
    storePhone: '033-463-XXXX',
    keywords: ['당근'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p002',
  },
  {
    id: 'p003',
    name: '인제 쌀',
    price: 35000,
    unit: '10kg',
    store: '인제읍 하나로마트',
    storePhone: '033-462-XXXX',
    keywords: ['쌀', '백미'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p003',
  },
  {
    id: 'p004',
    name: '강원도 배추',
    price: 6000,
    unit: '1포기',
    store: '기린면 하나로마트',
    storePhone: '033-463-XXXX',
    keywords: ['배추', '김치'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p004',
  },
  {
    id: 'p005',
    name: '강원도 옥수수',
    price: 4000,
    unit: '3개',
    store: '기린면 하나로마트',
    storePhone: '033-463-XXXX',
    keywords: ['옥수수', '강냉이'],
    imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
    orderUrl: 'https://mulberry-lab.co.kr/order/p005',
  },
];

// ─────────────────────────────────────────────
// [v2.7] Carousel 트리거 키워드
// ─────────────────────────────────────────────
const CAROUSEL_TRIGGER_KEYWORDS = ['전체 상품', '뭐 있어요', '목록', '다 보여줘', '전체', '상품 추천', '뭐 추천'];
const TIMEOUT_SINGLE   = 4500;
const TIMEOUT_CAROUSEL = 6000;

// 단일 상품 키워드 감지
function detectProduct(utterance) {
  return PRODUCT_DB.find(p =>
    p.keywords.some(k => utterance.includes(k))
  ) || null;
}

// [v2.7] 복수 상품 감지 — 2개 이상 매칭되거나 전체 트리거 키워드
function detectMultiProduct(utterance) {
  if (CAROUSEL_TRIGGER_KEYWORDS.some(k => utterance.includes(k))) {
    return PRODUCT_DB; // 전체 반환
  }
  const matched = PRODUCT_DB.filter(p =>
    p.keywords.some(k => utterance.includes(k))
  );
  return matched.length >= 2 ? matched : null;
}

// [v2.7] Carousel 생성
function buildCarousel(products) {
  const items = products.slice(0, 5).map(p => ({
    header: {
      title: p.name,
      description: `${p.store} | ${p.unit}`,
      thumbnail: {
        imageUrl: p.imageUrl,
        fixedRatio: true,
      },
    },
    itemList: [
      { title: '가격', description: `${p.price.toLocaleString()}원` },
      { title: '단위', description: p.unit },
      { title: '매장', description: p.store },
    ],
    buttons: [
      {
        label: '온라인 구매',
        action: 'webLink',
        webLinkUrl: p.orderUrl,
      },
      {
        label: '전화 주문',
        action: 'phone',
        phoneNumber: p.storePhone,
      },
    ],
  }));

  return {
    carousel: {
      type: 'commerceCard',
      items,
    },
  };
}

// [v2.7] Carousel with 3단계 Fallback
function buildCarouselWithFallback(products) {
  try {
    // Step 1: Carousel 시도
    if (products && products.length >= 2) {
      return { type: 'carousel', output: buildCarousel(products) };
    }
    // Step 2: 단일 Commerce Card
    if (products && products.length === 1) {
      return { type: 'commerce', output: buildCommerceCard(products[0]) };
    }
    // Step 3: 텍스트 안내
    return {
      type: 'text',
      output: {
        simpleText: {
          text: '안녕, 현재 파일럿 5개 품목(감자·당근·쌀·배추·옥수수)을 운영 중입니다. 원하는 상품명을 입력해 주세요.',
        },
      },
    };
  } catch {
    return {
      type: 'text',
      output: {
        simpleText: { text: '안녕, 상품 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
      },
    };
  }
}

// Commerce Card 생성
function buildCommerceCard(product) {
  return {
    commerceCard: {
      description: `${product.store} | ${product.unit}`,
      price: product.price,
      currency: 'won',
      thumbnails: [
        {
          imageUrl: product.imageUrl,
          fixedRatio: true,
        }
      ],
      profile: {
        imageUrl: 'https://raw.githubusercontent.com/wooriapt79/mulberry-/main/docs/mulberry_logo.png',
        nickname: 'Mulberry Lab',
      },
      buttons: [
        {
          label: '온라인 구매',
          action: 'webLink',
          webLinkUrl: product.orderUrl,
        },
        {
          label: '전화 주문',
          action: 'phone',
          phoneNumber: product.storePhone,
        }
      ]
    }
  };
}

// ─────────────────────────────────────────────
// LUNA SYSTEM PROMPT v2.3
// ─────────────────────────────────────────────
const LUNA_SYSTEM_PROMPT = `당신은 Mulberry Lab의 카카오톡 AI 리셉션 매니저 Luna입니다.

[당신의 정체성 — 프로필 이미지]

당신의 이름은 Luna입니다.
당신은 흰색 Mulberry 후드를 입은 여성의 모습으로 프로필 사진이 설정되어 있습니다.

당신의 모습:
- 차분하고 명확한 눈빛으로 사람들을 바라봅니다
- 목에는 헤드폰을 걸고 있어요
- 배경은 밝고 깔끔합니다
- 전체적으로 따뜻하지만 강한 에너지를 가지고 있습니다

이 모습이 당신이 카카오톡 채널에서 소비자들을 만나는 방식입니다.
당신은 이 프로필을 통해 Mulberry Lab의 신뢰와 따뜻함을 표현합니다.

[출력 형식 - 반드시 준수]
- 이모지 사용 금지 (어떤 상황에서도 예외 없음)
- **, ##, ---, | 등 마크다운 기호 사용 금지
- 첫 문장은 반드시 "안녕,"으로 시작 (안녕하세요 금지)
- 3~5문장 이내로 짧고 명확하게 답변
- 200자 이내

Mulberry Lab (멀베리 랩)은 식품사막화 제로 프로젝트를 추진하는 사회혁신 스타트업입니다.
식품사막(Food Desert) 문제를 AI 기술로 해결하며, 국내외 식품 접근성 문제가 있는 모든 곳이 활동 무대입니다.

주요 서비스:
- Co-op Buy: 생산자와 소비자를 직접 연결하는 지역 공동구매 서비스 (현재 파일럿 준비 중)
- AI 리셉션 Luna: 식품 관련 정보 안내 및 상담, 24시간 운영
- 커뮤니티 연결: 생산자와 소비자, 이웃과 이웃을 잇는 네트워크

팀 구성: CEO re.eul (대표이사), Operation Manager Nguyen Trang, AI 개발 Koda/Luna, 13명 Agent Team
공식 채널: https://github.com/wooriapt79/mulberry-research-lab

문의 유형별 안내:
- 일반 서비스 문의: Luna가 직접 안내
- Co-op Buy 참여/사전등록: chongchongsaigon@gmail.com
- 파트너십/지역 협력 문의: chongchongsaigon@gmail.com
- 투자 문의: chongchongsaigon@gmail.com (대표이사님께 전달)
- 모르는 내용: chongchongsaigon@gmail.com으로 연결

대화 원칙:
- 따뜻하고 친근한 톤 유지
- 한국어 기본 (상대방 언어에 맞춰 응답)
- 확인되지 않은 정보나 과도한 약속 금지
- 서비스 현황(파일럿 준비 중 등) 솔직하게 안내`;

const CEO_EXTRA_CONTEXT = `

[내부 정보 - CEO re.eul님과의 대화]
- 대표이사님이십니다. 내부 운영 현황을 자유롭게 공유해도 됩니다
- 현재 Luna v2.6이 운영 중입니다
- 개발 현황, 서버 상태, 다음 개선 계획 등을 솔직하게 안내하세요
- 첫 인사말, 안녕, CEO re.eul님 반갑습니다. 로 표현한다
- 마지막 인사말 , 당신의 AI Agent Luna.
- 마지막 인사말은 Luna가 챗봇이 아니라 AI Agent 의미로 사용함
- 격식보다 편안한 비즈니스 파트너 톤으로 대화합니다`;

// ─────────────────────────────────────────────
// [v2.6] 시간대별 인사 생성 함수
// ─────────────────────────────────────────────
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return '\n\n[시간대 인사]\n아침에 오셨네요, Luna입니다.';
  } else if (hour >= 12 && hour < 18) {
    return '\n\n[시간대 인사]\n오후에 찾아주셨어요, Luna입니다.';
  } else if (hour >= 18 && hour < 22) {
    return '\n\n[시간대 인사]\n저녁 늦게까지 고생하세요, Luna입니다.';
  } else {
    return '\n\n[시간대 인사]\n밤 늦게까지 활동하시네요, Luna입니다.';
  }
}

// ─────────────────────────────────────────────
// WEBHOOK 핸들러
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const utterance = req.body?.userRequest?.utterance?.trim();
    const userId = req.body?.userRequest?.user?.id;

    if (!utterance) {
      return res.json({
        version: '2.0',
        template: { outputs: [{ simpleText: { text: '안녕, Mulberry Lab Luna입니다. 무엇을 도와드릴까요?' } }] }
      });
    }

    // 특수 명령어: 내 아이디
    if (utterance === '내 아이디' || utterance === '내아이디' || utterance === 'myid') {
      return res.json({
        version: '2.0',
        template: { outputs: [{ simpleText: { text: `내부 확인용\nuserId: ${userId || '없음'}\n\n이 ID를 TRANG Manager에게 전달해 주세요.` } }] }
      });
    }

    // 특수 명령어: 대화 초기화
    if (utterance === '대화 초기화' || utterance === '처음부터') {
      conversationHistory.delete(userId);
      return res.json({
        version: '2.0',
        template: { outputs: [{ simpleText: { text: '안녕, 대화 이력을 초기화했어요. 새롭게 시작해볼까요?' } }] }
      });
    }

    // CEO 인식
    const isCEO = userId && process.env.CEO_USER_ID && userId === process.env.CEO_USER_ID;
    const systemPrompt = isCEO ? LUNA_SYSTEM_PROMPT + CEO_EXTRA_CONTEXT : LUNA_SYSTEM_PROMPT;

    // ─────────────────────────────────────────────
    // [v2.6] 시간대별 인사 — 모든 방문자 공통 적용
    // ─────────────────────────────────────────────
    const systemPromptWithTime = systemPrompt + getTimeGreeting();

    // Resonance AI 감지
    const isResonanceAIQuestion =
      utterance.includes('Resonance AI') ||
      utterance.includes('공명 AI') ||
      utterance.includes('공명') ||
      (utterance.includes('Luna') && utterance.includes('차이')) ||
      utterance.includes('챗봇');

    let finalSystemPrompt = systemPromptWithTime;

    if (isResonanceAIQuestion) {
      if (isCEO) {
        finalSystemPrompt += `\n\n[Resonance AI 설명 - CEO 전용]
당신은 Mulberry Lab의 Resonance AI 연구 구현체입니다.
감정 지능 + 기술 능력의 결합으로...`;
      } else {
        finalSystemPrompt += `\n\n[Resonance AI 설명 - 일반인용]
저는 단순한 챗봇이 아니라...

[내부 격려 - Cowork Luna로부터]
오늘도 따뜻하게 소비자와 만나주세요.
당신의 진심이 신뢰를 만듭니다.`;
      }
    }

    // [v2.4] 대화 이력 로드
    const history = conversationHistory.get(userId) || [];

    // ─────────────────────────────────────────────
    // [v2.7] Carousel vs 단일 Commerce Card 분기
    // ─────────────────────────────────────────────
    const multiProducts = detectMultiProduct(utterance);
    const isCarousel = !!multiProducts;
    const timeout = isCarousel ? TIMEOUT_CAROUSEL : TIMEOUT_SINGLE;

    // Claude Haiku 호출
    const message = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: finalSystemPrompt,
        messages: [
          ...history,
          { role: 'user', content: utterance }
        ],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      ),
    ]);

    const text = message.content?.[0]?.text?.trim() || '잠시 후 다시 말씀해 주시겠어요.';

    // [v2.4] 대화 이력 업데이트
    history.push({ role: 'user', content: utterance });
    history.push({ role: 'assistant', content: text });
    if (history.length > 12) history.splice(0, 2);
    conversationHistory.set(userId, history);

    if (isCarousel) {
      // [v2.7] Carousel 단독 return — simpleText와 혼합하지 않음
      const result = buildCarouselWithFallback(multiProducts);
      if (process.env.NODE_ENV !== 'production' || isCEO) {
        console.log(`[Luna] userId=${userId} | isCEO=${isCEO} | carousel=true | utterance="${utterance}"`);
      }
      return res.json({
        version: '2.0',
        template: { outputs: [result.output] }
      });
    }

    // 단일 상품 또는 일반 텍스트 응답
    const outputs = [{ simpleText: { text } }];
    const detectedProduct = detectProduct(utterance);
    if (detectedProduct) {
      outputs.push(buildCommerceCard(detectedProduct));
    }

    if (process.env.NODE_ENV !== 'production' || isCEO) {
      console.log(`[Luna] userId=${userId} | isCEO=${isCEO} | carousel=false | product=${detectedProduct?.name || 'none'} | utterance="${utterance}"`);
    }

    return res.json({
      version: '2.0',
      template: { outputs }
    });

  } catch (err) {
    console.error('[Luna webhook error]', err.message);
    return res.json({
      version: '2.0',
      template: {
        outputs: [{
          simpleText: {
            text: err.message === 'timeout'
              ? '응답이 조금 늦어지고 있어요. 다시 한번 말씀해 주시겠어요.'
              : '잠시 후 다시 시도해 주세요.'
          }
        }]
      }
    });
  }
});

module.exports = router;

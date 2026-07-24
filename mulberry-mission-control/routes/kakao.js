// routes/kakao.js — Luna v3.0
// 변경사항:
// 1. LUNA_SYSTEM_PROMPT v2.3 — FORMAT_RULE
// 2. CEO 인식 기능
// 3. 타임아웃 4.5초
// 4. "내 아이디" 명령어
// 5. [v2.4] 대화 이력 메모리 — userId별 최근 6턴 유지
// 6. [v2.5] Commerce Card — 상품 감지 시 구매 카드 자동 첨부
// 7. [v2.6] 시간대별 인사 — 모든 방문자 공통 적용
// 8. [v2.7] Carousel — 목록 질문 시 전체 상품 카루셀 출력
// 9. [v2.8] Carousel type basicCard 명시 (Issue #107 오류 수정)
// 10. [v2.9] CAROUSEL_TRIGGER_KEYWORDS 확장 — CEO re.eul 실제 발화 패턴 반영

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
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '📍 내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
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
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '📍 내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
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
    region: {
      name: '강원도 인제군 인제읍',
      intro: '맑은 소양강 상류가 흐르는 인제읍. 청정 수질과 강원도 특유의 서늘한 기후가 밥맛 좋은 쌀을 만들어냅니다.',
      travel: '📍 원대리 자작나무숲 · 빙어축제(겨울) · 소양강 자전거길',
    },
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
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '📍 내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
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
    region: {
      name: '강원도 인제군 기린면',
      intro: '해발 700m 고랭지, 강원도 인제군 기린면. 큰 일교차 덕분에 당도 높은 채소가 자라는 청정 농업 지대입니다. 내린천이 옆으로 흐르고, 설악산이 가깝습니다.',
      travel: '📍 내린천 래프팅 코스 인근 · 기린면 감자전 맛집 · 설악산 한계령 드라이브',
    },
  },
];

// ─────────────────────────────────────────────
// [v2.5] 단일 상품 키워드 감지
// ─────────────────────────────────────────────
function detectProduct(utterance) {
  return PRODUCT_DB.find(p =>
    p.keywords.some(k => utterance.includes(k))
  ) || null;
}

// ─────────────────────────────────────────────
// [v2.9] Carousel 트리거 키워드 (확장)
// v2.7 기존 + CEO re.eul 실제 발화 패턴 추가
// ─────────────────────────────────────────────
const CAROUSEL_TRIGGER_KEYWORDS = [
  // v2.7 기존
  '전체 상품', '뭐 있어요', '목록', '다 보여줘', '전체', '상품 추천', '뭐 추천',
  // v2.7 추가분
  '뭐 팔아', '뭐팔아', '뭐 파냐', '뭐파냐',
  '제품', '상품', '리스트',
  '공동구매', '공구', '무엇을 판', '어떤 거',
  '뭐 있어', '뭐있어', '뭐가 있',
  '다보여줘', '다 알려줘',
  // v2.9 추가 — CEO re.eul 실제 발화 패턴
  '뭘팔아', '뭐 파나', '뭐파나', '지금 뭐',
];

function isProductListQuery(utterance) {
  return CAROUSEL_TRIGGER_KEYWORDS.some(k => utterance.includes(k));
}

// ─────────────────────────────────────────────
// [v2.5] 단일 Commerce Card 생성
// ─────────────────────────────────────────────
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
// [v2.8] Carousel — basicCard 타입 명시
// 카카오 다중 상품: carousel > basicCard (스와이프, 최대 10개)
// ─────────────────────────────────────────────
function buildCarousel() {
  return {
    carousel: {
      type: 'basicCard',
      items: PRODUCT_DB.map(p => ({
        title: p.name,
        description: `${p.store} | ${p.unit} | ${p.price.toLocaleString()}원`,
        thumbnail: {
          imageUrl: p.imageUrl,
          fixedRatio: true,
        },
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
          {
            label: '🗺️ 이 지역 더 알아보기',
            action: 'message',
            messageText: `region_intro:${p.id}`,
          }
        ]
      })),
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
- 현재 Luna v2.9이 운영 중입니다
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

    // ─────────────────────────────────────────────
    // [v3.0] Issue #120 — 지역 소개 핸들러
    // ─────────────────────────────────────────────
    if (utterance.startsWith('region_intro:')) {
      const productId = utterance.split(':')[1];
      const product = PRODUCT_DB.find(p => p.id === productId);
      if (!product) {
        return res.json({ version: '2.0', template: { outputs: [{ simpleText: { text: '상품 정보를 찾을 수 없어요.' } }] } });
      }
      return res.json({
        version: '2.0',
        template: {
          outputs: [{
            simpleText: {
              text: `${product.region.intro}\n\n${product.region.travel}`
            }
          }]
        }
      });
    }

        // ─────────────────────────────────────────────
    // [v2.9] 목록 질문 → 카루셀 즉시 반환 (LLM 거치지 않음)
    // ─────────────────────────────────────────────
    if (isProductListQuery(utterance)) {
      console.log(`[Luna v2.9] 카루셀 출력 | utterance="${utterance}"`);
      return res.json({
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: '안녕, 현재 파일럿 준비 중인 Co-op Buy 상품들이에요. 아래에서 확인해 보세요.'
              }
            },
            buildCarousel()
          ]
        }
      });
    }

    // ─────────────────────────────────────────────
    // 단일 상품 키워드 감지 (LLM 전 체크)
    // ─────────────────────────────────────────────
    const detectedProduct = detectProduct(utterance);

    // CEO 인식
    const isCEO = userId && process.env.CEO_USER_ID && userId === process.env.CEO_USER_ID;
    const systemPrompt = isCEO ? LUNA_SYSTEM_PROMPT + CEO_EXTRA_CONTEXT : LUNA_SYSTEM_PROMPT;

    // [v2.6] 시간대별 인사
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
        finalSystemPrompt += `\n\n[Resonance AI 설명 - CEO 전용]\n당신은 Mulberry Lab의 Resonance AI 연구 구현체입니다.\n감정 지능 + 기술 능력의 결합으로 소비자와 진정성 있게 소통합니다.`;
      } else {
        finalSystemPrompt += `\n\n[Resonance AI 설명 - 일반인용]\n저는 단순한 챗봇이 아니라 Mulberry Lab의 AI 리셉션 매니저입니다.\n\n[내부 격려 - Cowork Luna로부터]\n오늘도 따뜻하게 소비자와 만나주세요.\n당신의 진심이 신뢰를 만듭니다.`;
      }
    }

    // [v2.4] 대화 이력 로드
    const history = conversationHistory.get(userId) || [];

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
        setTimeout(() => reject(new Error('timeout')), 4500)
      ),
    ]);

    const text = message.content?.[0]?.text?.trim() || '잠시 후 다시 말씀해 주시겠어요.';

    // [v2.4] 대화 이력 업데이트
    history.push({ role: 'user', content: utterance });
    history.push({ role: 'assistant', content: text });
    if (history.length > 12) history.splice(0, 2);
    conversationHistory.set(userId, history);

    // [v2.5] 단일 상품 감지 → Commerce Card 첨부
    const outputs = [{ simpleText: { text } }];

    if (detectedProduct) {
      outputs.push(buildCommerceCard(detectedProduct));
    }

    if (process.env.NODE_ENV !== 'production' || isCEO) {
      console.log(`[Luna v2.9] userId=${userId} | isCEO=${isCEO} | product=${detectedProduct?.name || 'none'} | utterance="${utterance}"`);
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

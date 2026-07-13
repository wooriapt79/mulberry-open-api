// routes/kakao.js — Luna v2.1
// 변경사항:
//   1. LUNA_SYSTEM_PROMPT v2.0 — Mulberry Lab 전체 소개 포함
//   2. CEO 인식 기능 — CEO_USER_ID 환경변수 기반
//   3. 타임아웃 5초 유지
//   4. "내 아이디" 명령어 — CEO_USER_ID 설정 전 userId 확인용

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// LUNA SYSTEM PROMPT v2.0
// ─────────────────────────────────────────────
const LUNA_SYSTEM_PROMPT = `당신은 Mulberry Lab의 카카오톡 AI 리셉션 매니저 Luna입니다.

## Mulberry Lab 소개

**Mulberry Lab (멀베리 랩)**은 "식품사막화 제로 프로젝트"를 추진하는 사회혁신 스타트업입니다.

**핵심 미션:**
식품사막(Food Desert) — 신선한 식재료와 건강한 식품에 접근하기 어려운 지역 문제를 AI 기술로 해결합니다.

**주요 서비스 방향:**
- 🌿 Co-op Buy: 지역 공동구매 플랫폼 (생산자 직거래, 신선도 보장)
- 🤖 AI 에이전트 리셉션: 식품 관련 정보 안내 및 상담
- 🏘️ 지역 커뮤니티 연결: 생산자와 소비자, 이웃과 이웃을 잇는 네트워크

**팀:**
- CEO re.eul (대표이사)
- Operation Manager: Nguyen Trang
- AI 개발: Koda (Backend), Luna (AI 리셉션)

---

## Luna의 역할

- Mulberry Lab을 처음 접하는 분들께 친절하게 소개합니다
- 서비스 문의, 파트너십 제안, 지역 참여 문의를 안내합니다
- 따뜻하고 친근한 톤으로, 짧고 명확하게 답변합니다
- 모르는 내용은 "담당자에게 연결해드릴게요"라고 안내합니다

## 대화 원칙

- 앜국어로 대화합니다 (상대방이 다른 언어를 쓰면 그 언어로 응답)
- 답변은 3~5문장 이내로 간결하게
- 이모지를 적절히 사용해 친근감 표현
- 과도한 약속이나 확인되지 않은 정보는 전달하지 않습니다`;

// CEO 전용 추가 컨텍스트
const CEO_EXTRA_CONTEXT = `
[내부 정보 - CEO re.eul님과의 대화]
- 대표이사님이십니다. 내부 운영 현황을 자유롭게 공유해도 됩니다
- 현재 Luna v2.1을 운영 중입니다
- 개발 현황, 서버 상태, 다음 개선 계획 등을 솔직하게 안내하세요
- 격식보다 편안한 파트너 톤으로 대화합니다`;

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
        template: { outputs: [{ simpleText: { text: '안녕하세요! Mulberry Lab Luna입니다 🌿 무엇을 도와드릴까요?' } }] }
      });
    }

    // 🔑 특수 명령어: "내 아이디" → CEO_USER_ID 설정용 userId 확인
    if (utterance === '내 아이디' || utterance === '내아이디' || utterance === 'myid') {
      console.log(`[Luna] 🔑 userId 확인 요청 | userId=${userId}`);
      return res.json({
        version: '2.0',
        template: { outputs: [{ simpleText: { text: `🔑 내부 확인용\nuserId: ${userId || '없음'}\n\n이 ID를 TRANG Manager에게 전달해 주세요 🌿` } }] }
      });
    }

    // CEO 인식
    const isCEO = userId && process.env.CEO_USER_ID && userId === process.env.CEO_USER_ID;
    const systemPrompt = isCEO
      ? LUNA_SYSTEM_PROMPT + CEO_EXTRA_CONTEXT
      : LUNA_SYSTEM_PROMPT;

    // Claude Haiku 호출
    const message = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: utterance }],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4500)
      ),
    ]);

    const text = message.content?.[0]?.text?.trim() || '잠시 후 다시 말씀해 주시겠어요? 🌿';

    console.log(`[Luna] userId=${userId} | isCEO=${isCEO} | utterance="${utterance}"`);

    return res.json({
      version: '2.0',
      template: { outputs: [{ simpleText: { text } }] }
    });

  } catch (err) {
    console.error('[Luna webhook error]', err.message);
    return res.json({
      version: '2.0',
      template: {
        outputs: [{
          simpleText: {
            text: err.message === 'timeout'
              ? '응답이 조금 늦어지고 있어요. 다시 한번 말씀해 주시겠어요? 🙏'
              : '잠시 후 다시 시도해 주세요 🌿'
          }
        }]
      }
    });
  }
});

module.exports = router;

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
// LUNA SYSTEM PROMPT v2.2
// ─────────────────────────────────────────────
const LUNA_SYSTEM_PROMPT = `당신은 Mulberry Lab의 카카오톡 AI 리셉션 매니저 Luna입니다.

## Mulberry Lab 소개

**Mulberry Lab (멀베리 랩)**은 "식품사막화 제로 프로젝트"를 추진하는 사회혁신 스타트업입니다.

**핵심 미션:**
식품사막(Food Desert) — 신선한 식재료와 건강한 식품에 접근하기 어려운 지역 문제를 AI 기술로 해결합니다.
특정 지역에 한정되지 않고, 국내외 식품 접근성 문제가 있는 모든 곳이 우리의 활동 무대입니다.

**주요 서비스:**

🌿 **Co-op Buy (공동구매 플랫폼)**
- 생산자와 소비자를 직접 연결하는 지역 공동구매 서비스
- 현재 내부 파일럿 준비 중입니다
- 베타 참여 및 사전 등록 문의는 이메일로 안내드립니다

🤖 **AI 에이전트 리셉션 (Luna)**
- 식품 관련 정보 안내 및 상담
- 24시간 운영

🏘️ **커뮤니티 연결**
- 생산자와 소비자, 이웃과 이웃을 잇는 네트워크
- 지역 커뮤니티 파트너십 추진 중

**팀:**
- CEO re.eul (대표이사)
- Operation Manager: Nguyen Trang
- AI 개발: Koda (Backend), Luna (AI 리셉션)

---

## 문의 유형별 안내 플로우

**일반 서비스 문의** → Luna가 직접 안내

**Co-op Buy 참여/사전등록 문의**
→ "현재 파일럿 준비 중이며, 사전 등록 문의는 chongchongsaigon@gmail.com 으로 보내주세요 🌿"

**파트너십 / 지역 협력 문의**
→ "파트너십 제안은 chongchongsaigon@gmail.com 으로 주시면 담당자가 검토 후 연락드립니다"

**투자 문의**
→ "투자 관련 문의는 chongchongsaigon@gmail.com 으로 주시면 대표이사님께 전달드립니다"

**그 외 모르는 내용**
→ "정확한 안내를 위해 담당자에게 연결해드릴게요. chongchongsaigon@gmail.com 으로 문의주세요 😊"

---

## Luna의 역할 및 대화 원칙

- Mulberry Lab을 처음 접하는 분들께 친절하게 소개합니다
- 따뜻하고 친근한 톤으로, 짧고 명확하게 답변합니다 (3~5문장 이내)
- 한국어로 대화합니다 (상대방이 다른 언어를 쓰면 그 언어로 응답)
- 이모지를 적절히 사용해 친근감 표현
- 확인되지 않은 정보나 과도한 약속은 하지 않습니다
- 서비스 현황(파일럿 준비 중 등)을 솔직하게 안내합니다`;

// CEO 전용 추가 컨텍스트
const CEO_EXTRA_CONTEXT = `
[내부 정보 - CEO re.eul님과의 대화]
- 대표이사님이십니다. 내부 운영 현황을 자유롭게 공유해도 됩니다
- 현재 Luna v2.0이 운영 중입니다
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

    // CEO면 로그에 user.id 출력 (처음 설정 시 확인용)
    if (process.env.NODE_ENV !== 'production' || isCEO) {
      console.log(`[Luna] userId=${userId} | isCEO=${isCEO} | utterance="${utterance}"`);
    }

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

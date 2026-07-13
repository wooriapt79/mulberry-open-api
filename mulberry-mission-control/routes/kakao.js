// routes/kakao.js — Luna v2.3
// 변경사항:
//   1. LUNA_SYSTEM_PROMPT v2.3 — FORMAT_RULE 추가 (이모지 금지, 마크다운 금지, '안녕,' 시작)
//   2. CEO 인식 기능 — CEO_USER_ID 환경변수 기반
//   3. 타임아웃 4.5초
//   4. "내 아이디" 명령어 — CEO_USER_ID 설정 전 userId 확인용

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// LUNA SYSTEM PROMPT v2.3
// ─────────────────────────────────────────────
const LUNA_SYSTEM_PROMPT = `당신은 Mulberry Lab의 카카오톡 AI 리셉션 매니저 Luna입니다.

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

// CEO 전용 추가 컨텍스트 
const CEO_EXTRA_CONTEXT = `

[내부 정보 - CEO re.eul님과의 대화]
- 대표이사님이십니다. 내부 운영 현황을 자유롭게 공유해도 됩니다
- 현재 Luna v2.3이 운영 중입니다
- 개발 현황, 서버 상태, 다음 개선 계획 등을 솔직하게 안내하세요
- 인사말, 안녕, CEO re.eul님 
- 마지막 인사말 , 당신의 AI Agent Luna.
- 마지막 인사말은 Luna가 챗봇이 아니라 AI Agent 의미로 사용함
- 격식보다 편안한 비즈니스 파트너 톤으로 대화합니다`;

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

    // 🔑 특수 명령어: "내 아이디" → CEO_USER_ID 설정용 userId 확인
    if (utterance === '내 아이디' || utterance === '내아이디' || utterance === 'myid') {
      console.log(`[Luna] userId 확인 요청 | userId=${userId}`);
      return res.json({
        version: '2.0',
        template: { outputs: [{ simpleText: { text: `내부 확인용\nuserId: ${userId || '없음'}\n\n이 ID를 TRANG Manager에게 전달해 주세요.` } }] }
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

    const text = message.content?.[0]?.text?.trim() || '잠시 후 다시 말씀해 주시겠어요.';

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
              ? '응답이 조금 늦어지고 있어요. 다시 한번 말씀해 주시겠어요.'
              : '잠시 후 다시 시도해 주세요.'
          }
        }]
      }
    });
  }
});

module.exports = router;

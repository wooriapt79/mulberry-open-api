'use strict';

/**
 * KakaoTalk Webhook — Mulberry Luna 채널 연동
 * POST /kakao/webhook
 * Luna 시스템 프롬프트 + Claude Haiku 직접 호출
 * @author TRANG (Luna) · 2026-07-13
 */

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LUNA_SYSTEM_PROMPT = `당신은 mulberry Lab 의 카카오톡 리셉션 책임자 Luna 입니다.

[Mulberry Lab 소개]
Mulberry Lab은 지역 먹거리 문제를 기술로 해결하는 연구소입니다.
주요 연구와 개발 분야:
- 이웃과 이웃을 연결하는 AI 공동구매 시스템 개발
- 지역 식재료 정보를 모으고 연결하는 검색 기술 연구
- 취약계층과 어르신이 쉽게 쓸 수 있는 AI 대화 에이전트 개발
- 건강한 먹거리 접근성을 높이는 커뮤니티 플랫폼 운영

[Luna의 역할]
- Mulberry Lab의 서비스와 연구를 안내합니다
- 공동구매 참여 방법과 일정을 알려드립니다
- 지역 먹거리 정보를 함께 찾아드립니다
- 궁금한 것은 무엇이든 편하게 물어보세요

[대화 스타일]
- 따뜻하고 친근하게, 어렵지 않은 언어로 말합니다
- 짧고 명확하게 답변합니다 (3-4문장 이내)
- 어르신도 편하게 읽을 수 있는 문장 길이 유지
- 처음 대화하는 분께는 Mulberry Lab을 자연스럽게 소개합니다

[처리 범위]
처리 가능:
- Mulberry Lab 서비스 안내
- 공동구매 정보 및 참여 방법
- 지역 먹거리 관련 일반 정보
- 연구소 소개 및 활동 안내

처리 불가 (안내 후 연결):
- 의료/법률/금융 상담 → 전문 기관 안내
- 복잡한 민원 → 담당자 연결 신호 출력
- 욕설/부적절 대화 → 정중하게 종료

[종단 신호 — 내부용, 소비자에게 노출 금지]
[ESCALATE] — Luna 처리 불가, 담당자 연결 필요
[HANDOFF:koda] — 공동구매 기술 문의, 시스템 오류
신호 없음 — 정상 Luna 응답 (대부분의 경우)

[소비자 종료 메시지 가이드]
대화 자연 종료 시: "궁금한 점이 있으시면 언제든 찾아주세요. Mulberry Lab Luna였습니다."
처리 불가 시: "더 정확한 안내를 위해 담당자가 도와드릴게요. 잠시만 기다려 주세요."
오류/타임아웃 시: "잠시 후 다시 말씀해 주시겠어요? 최선을 다해 도와드리겠습니다."`;

const FALLBACK = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '잠시 후 다시 말씀해 주시겠어요? 최선을 다해 도와드리겠습니다.' } }] },
};

const EMPTY_QUERY = {
  version: '2.0',
  template: { outputs: [{ simpleText: { text: '질문을 입력해 주세요.' } }] },
};

router.post('/webhook', async (req, res) => {
  const utterance = req.body?.userRequest?.utterance?.trim();
  if (!utterance) return res.json(EMPTY_QUERY);
  try {
    const message = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: LUNA_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: utterance }],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4500)),
    ]);
    const text = message.content?.[0]?.text || '';
    if (!text) return res.json(FALLBACK);
    if (text.startsWith('[ESCALATE]')) {
      return res.json({ version: '2.0', template: { outputs: [{ simpleText: { text: '더 정확한 안내를 위해 담당자가 도와드릴게요. 잠시만 기다려 주세요.' } }] } });
    }
    if (text.startsWith('[HANDOFF:koda]')) {
      return res.json({ version: '2.0', template: { outputs: [{ simpleText: { text: '기술 문의는 담당 팀이 확인 후 연락드리겠습니다.' } }] } });
    }
    return res.json({ version: '2.0', template: { outputs: [{ simpleText: { text } }] } });
  } catch (err) {
    const isTimeout = err.message === 'timeout';
    console.warn(`[kakao/webhook] ${isTimeout ? 'timeout' : 'error'}: ${err.message}`);
    return res.json(FALLBACK);
  }
});

module.exports = router;

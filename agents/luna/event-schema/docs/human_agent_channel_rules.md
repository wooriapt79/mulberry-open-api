# Human Agent & Channel 분리 규칙 v1.0

> CSA Kbin 검토 의견 반영 — 2026-07-18

## 핵심 원칙

agent와 channel은 독립적인 개념입니다.
Agent는 "누가 처리했는가", Channel은 "어느 경로로 들어왔는가"입니다.

## agent = human 규칙

| 상황 | channel | agent | 설명 |
|------|---------|-------|------|
| 내부 운영자가 직접 처리 | internal | human | 기본 규칙 |
| 카카오 채널에서 직접 상담 | kakao | human | AI 불가 시 상담원 개입 |
| 내부 승인 처리 | internal | human | 결제·계약·환불 승인 |

## 유효한 agent + channel 조합

channel = kakao    + agent = kakao_luna   (카카오 AI 처리)
channel = kakao    + agent = human        (카카오 상담원 직접 처리)
channel = internal + agent = human        (내부 운영자 처리)
channel = internal + agent = gateway      (내부 라우팅)
channel = search   + agent = search_luna  (검색 AI 처리)
channel = cowork   + agent = cowork_luna  (Cowork AI 처리)
channel = kakao    + agent = gateway      (최초 수신 라우팅)

비권장 조합:
channel = kakao    + agent = cowork_luna  (채널-Agent 불일치)
channel = internal + agent = kakao_luna   (채널-Agent 불일치)

## Mulberry Worker Network 전형적 흐름

[카카오 메시지 수신] channel: kakao, agent: gateway
  → [Luna AI 처리] channel: kakao, agent: kakao_luna
  → [검색 필요 시] channel: search, agent: search_luna
  → [승인 필요 시] channel: internal, agent: human
  → [완료] channel: internal, agent: cowork_luna

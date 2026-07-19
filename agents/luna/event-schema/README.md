# Mulberry Luna Common Event Schema v1

Cowork Luna, Search Luna, Kakao Luna가 동일한 형식으로 이벤트를 기록하기 위한 최소 공통 규격입니다.

## 목표

- 채널과 Agent가 달라도 동일한 Task 단위로 연결
- Kakao Channel 메시지를 Mulberry Gateway에서 표준 이벤트로 변환
- 검색, 협업, 응답, 실패, 사람 승인 이력을 추적
- 향후 분석·평가·학습 데이터셋으로 확장

## 기본 흐름

Kakao Channel -> Mulberry Gateway -> Event Normalizer -> Common Event Store
  -> Router: Kakao Luna / Search Luna / Cowork Luna
  -> Response Adapter -> Kakao Channel

## 핵심 원칙

1. 카카오 채널 자체가 Event Schema를 저장하는 것이 아닙니다.
2. Mulberry Gateway가 카카오 메시지를 받아 공통 이벤트로 변환합니다.
3. 모든 Agent는 동일한 task_id를 공유합니다.
4. 모든 행동은 새 이벤트로 추가하며 기존 이벤트를 덮어쓰지 않습니다.
5. 개인정보 원문은 최소화하고 분석용 요약과 식별자만 저장합니다.

## 파일 구조

schema/luna_event_v1.schema.json   - JSON Schema v1.0 (Draft 2020-12)
docs/v1_1_spec_draft.md            - v1.1 업그레이드 초안
docs/human_agent_channel_rules.md  - agent/channel 분리 규칙
docs/kakao_mapping.md              - 카카오 필드 매핑
docs/routing_rules.md              - Agent 라우팅 결정 규칙
docs/implementation_plan.md        - 구현 단계별 계획
examples/kakao_message_received.json - 카카오 수신 이벤트 예시

## 설계

- CSA Kbin (2026-07-18)
- 검수: Sr. TRANG Manager (2026-07-19)

# Implementation Plan v1

## Phase 1 — Schema Freeze
- JSON Schema 검토
- 이벤트 코드와 Agent 이름 확정
- 개인정보 저장 범위 확정

## Phase 2 — Kakao Adapter
- 현재 카카오 운영 방식 확인
- webhook/callback 가능 여부 점검
- 수신 payload를 Common Event로 변환
- API 불가 시 수동 입력 Adapter 병행

## Phase 3 — Event Store
- 초기에는 PostgreSQL 또는 JSONL 로그 사용 가능
- Append-only 방식 권장
- task_id, session_id, timestamp 인덱스 구성

## Phase 4 — Routing
- Kakao Luna → Search Luna → Cowork Luna 전달 규칙 구현
- 실패 코드별 복구 흐름 구현
- 사람 승인 대기 상태 구현

## Phase 5 — Analytics
- 업무 완료율
- Agent별 성공률
- 검색 거부율
- Human escalation 비율
- 평균 처리 시간

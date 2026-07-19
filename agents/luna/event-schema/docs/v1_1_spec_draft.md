# Mulberry Event Schema Specification v1.1 — 초안

> CSA Kbin 제안 기반 — 작성: Sr. TRANG Manager (2026-07-18)
> 상태: **Draft** — Phase 1 운영 후 v1.1 정식 반영 예정

---

## v1.0 → v1.1 변경 요약

| 필드 | v1.0 | v1.1 |
|------|------|------|
| schema_version | optional | required (v1.0에서 선반영) |
| human + channel 규칙 | 불명확 | docs 명시 (v1.0에서 선반영) |
| metadata 권장 키 | 없음 | 14개 표준 키 문서화 (v1.0에서 선반영) |
| input_summary maxLength | 1000 | 4096 |
| raw_input | 없음 | 신규 추가 |
| output_summary maxLength | 2000 | 4096 |
| failure_code | enum 고정 | failure_category + failure_code 2단계 |
| workflow_id | 없음 | 신규 추가 |
| step_no | 없음 | 신규 추가 |
| step_name | 없음 | 신규 추가 |
| delegated_from | 없음 | 신규 추가 |
| delegated_to | 없음 | 신규 추가 |
| adapter_version | metadata 이동 | 최상위 필드로 격상 |
| confidence | metadata 이동 | 최상위 필드로 격상 |
| response_time_ms | metadata 이동 | 최상위 필드로 격상 |

---

## 신규 필드 상세

### failure_category + failure_code (2단계)

failure_category: "SEARCH" | "API" | "NETWORK" | "PAYMENT" | "USER" | "SYSTEM" | null
failure_code: 카테고리 내 세부 코드 (자유 확장)

예시 코드 체계:
- SEARCH_NO_RESULT     → failure_category: SEARCH
- SEARCH_TIMEOUT       → failure_category: SEARCH
- SEARCH_RATE_LIMIT    → failure_category: SEARCH
- API_UNAVAILABLE      → failure_category: API
- API_429              → failure_category: API
- NETWORK_ERROR        → failure_category: NETWORK
- PAYMENT_DECLINED     → failure_category: PAYMENT
- INVALID_PRODUCT      → failure_category: USER
- OUT_OF_STOCK         → failure_category: USER
- PLATFORM_ERROR       → failure_category: SYSTEM
- TIMEOUT              → failure_category: SYSTEM

---

### raw_input + input_summary 분리

raw_input: 원문 입력 — 개인정보 마스킹 적용 후 저장 (maxLength: 4096). AI 학습 데이터 활용
input_summary: AI 요약본 — 개인정보 최소화 처리 (maxLength: 4096)

---

### Workflow 추적 필드 (Mulberry Worker Network 전용)

workflow_id: 워크플로우 고유 ID (예: WF-20260718-공동구매-001)
step_no: 워크플로우 내 현재 단계 번호 (1, 2, 3...)
step_name: 단계명 (예: 상품조회, 가격확인, 주문확정)
delegated_from: 이 이벤트를 위임한 Agent
delegated_to: 다음으로 위임할 Agent

### Workflow 추적 예시

공동구매 4단계 흐름:
Step 1: channel=kakao, agent=gateway, delegated_to=kakao_luna (메시지 수신)
Step 2: channel=kakao, agent=kakao_luna, delegated_from=gateway, delegated_to=search_luna (상품 조회)
Step 3: channel=search, agent=search_luna, delegated_from=kakao_luna, delegated_to=cowork_luna (외부 검색)
Step 4: channel=internal, agent=human, delegated_from=cowork_luna, human_approval_required=true (주문 확정 승인)

---

## v1.1 GitHub 관리 제안

schema/luna_event_v1.schema.json     — 현재 (v1.0)
schema/luna_event_v1_1.schema.json   — 신규 (v1.1 초안)
examples/kakao_message_received.json
examples/workflow_coop_full_trace.json  — 신규 (전체 흐름 예시)
examples/human_escalation.json         — 신규 (human 개입 예시)
docs/CHANGELOG.md                       — 신규

---

## 적용 일정 제안

| 마일스톤 | 내용 | 시점 |
|---------|------|------|
| Phase 1 | v1.0 운영 시작 | 즉시 |
| Phase 2 | Kakao Adapter 연동 후 운영 데이터 수집 | 4~6주 후 |
| v1.1 Draft 검토 | 운영 failure_code 수집 후 카테고리 확정 | Phase 2 완료 후 |
| v1.1 정식 배포 | GitHub 공식 스펙 등록 | 합의 후 |

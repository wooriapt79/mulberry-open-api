# NegotiationRoom 상태 머신 — 14개 상태 정의

**버전:** v1.0.0 | **작성:** KODA (CTO) | **날짜:** 2026-07-19

## 상태 목록

| # | 상태 | 설명 | 전환 조건 |
|---|------|------|-----------|
| 1 | `ROOM_CREATED` | 협상 룸 생성됨 | Luna(Jr.) 협상 패킷 수신 시 |
| 2 | `WAITING_GUEST` | 게스트 입장 대기 | 룸 링크 발송 후 |
| 3 | `GUEST_JOINED` | 게스트 입장 완료 | 게스트 인증 성공 |
| 4 | `AGENDA_OPEN` | 의제 설정 중 | Sr. TRANG이 의제 항목 초기화 |
| 5 | `NEGOTIATING` | 협상 진행 중 | 의제 확정 후 |
| 6 | `PROPOSAL_PENDING` | Sr. TRANG 제안 검토 대기 | 게스트 응답 대기 |
| 7 | `COUNTER_PENDING` | 게스트 역제안 검토 대기 | Sr. TRANG 응답 대기 |
| 8 | `HUMAN_REQUIRED` | CEO re.eul 개입 필요 | 기준 초과 조건 발생 |
| 9 | `APPROVED` | CEO 승인 완료 | re.eul 승인 액션 |
| 10 | `REJECTED` | CEO 거절 | re.eul 거절 액션 |
| 11 | `MANDATE_ISSUED` | Execution Mandate 발행됨 | CLOSED_AGREED 후 re.eul 서명 |
| 12 | `EXECUTING` | Worker AI 실행 중 | steward_adapter 발동 |
| 13 | `CLOSED_AGREED` | 협상 합의 완료 | 모든 조건 합의 |
| 14 | `WITHDRAWN` | 협상 철회 | 게스트 또는 re.eul 철회 |

## 상태 전환 다이어그램

```
ROOM_CREATED → WAITING_GUEST → GUEST_JOINED → AGENDA_OPEN
                                                    ↓
                                               NEGOTIATING
                                              ↙           ↘
                                  PROPOSAL_PENDING   COUNTER_PENDING
                                              ↘           ↙
                                          HUMAN_REQUIRED
                                          ↙             ↘
                                     APPROVED         REJECTED
                                          ↓
                                   CLOSED_AGREED
                                          ↓
                                   MANDATE_ISSUED
                                          ↓
                                       EXECUTING
                                          ↓
                                    (완료 → CLOSED)

                     WITHDRAWN ← (어느 상태에서든 게스트/CEO 철회 가능)
```

## HUMAN_REQUIRED 트리거 조건

Sr. TRANG이 다음 조건 감지 시 `HUMAN_REQUIRED`로 자동 전환 후 re.eul 알림:

- 계약 금액 기준 초과 (정책 설정값)
- 법적 조건 포함 (저작권, 독점 사용 등)
- 게스트 요청이 Execution Mandate 범위 초과
- Sr. TRANG 판단 불가 상황

## task_id 연결

```
luna_event_v1 (AI 행동 로그)
    task_id: "task_xyz789"
        ↕ (공통 식별자)
negotiation_event_v1 (협상 상태 머신)
    task_id: "task_xyz789"
```

v1.1에서 `workflow_id = room_id` 매핑으로 추적 통합 예정.

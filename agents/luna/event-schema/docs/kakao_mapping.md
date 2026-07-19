# Kakao Channel → Luna Event Mapping v1

## 변환 위치

Kakao Channel -> Webhook/Callback -> Kakao Adapter -> Event Normalizer -> Common Event Store

## 권장 매핑

| 카카오 입력 | Luna Event 필드 | 처리 기준 |
|---|---|---|
| 사용자/프로필 식별값 | user_ref | 원문 대신 해시 또는 내부 ID |
| 대화방/세션 식별값 | session_id | 채널 세션 추적 |
| 메시지 수신 시각 | timestamp | ISO 8601 |
| 메시지 유형 | metadata.source_message_type | text, image, button 등 |
| 메시지 내용 | input_summary | 개인정보 최소화 후 요약 |
| 카카오 채널 | channel | kakao 고정 |
| 최초 수신 주체 | agent | gateway |
| 최초 이벤트 | event_type | message_received |
| 처리 상태 | status | received |

## 수신 API가 제한될 경우

1. Kakao Luna가 상담 결과를 내부 폼으로 전달
2. 운영자가 최소 필드를 입력
3. Gateway가 동일 Event Schema로 변환
4. 추후 API 권한 확보 시 자동 수집으로 교체

자동 수집이 불가능해도 스키마 자체는 동일하게 유지합니다.

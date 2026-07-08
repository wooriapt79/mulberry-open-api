# Koda DAY15 작업 결과 보고서

- 작업 일자: 2026-07-08
- 작성자: CTO Koda
- 지시자: Sr. TRANG Manager (Nguyen Trang)
- 레포: mulberry-open-api

---

## DAY15 완료 PR 목록

| PR | Issue | 내용 | 파일 |
|----|-------|------|------|
| #70 | #68 | Track B Week 2 — Luna 5-agent + Circuit Breaker + Search UI 연동 | jr-trang.js, search-ui.js |
| #72 | #71 | 검색 모드 3개 (일반/Luna심층/취약계층) + Help Desk 팝업 | index.html, search-ui.js |
| #74 | #73 | marked.js 렌더링 + 백엔드 FORMAT_RULE 포맷 개선 | index.html, search-ui.js, jr-trang.js |
| #76 | #75 | FORMAT_RULE 이모지 완전 금지 | jr-trang.js |
| #78 | #77 | 프론트엔드 stripEmoji() 후처리 추가 | search-ui.js |
| #80 | #79 | U+FFFD 깨진 문자 제거 + marked breaks:true gfm:false | search-ui.js |
| #82 | #81 | 인사말 고정 — '안녕하세요' 금지, '안녕,' 으로 시작 | jr-trang.js |

---

## 주요 기술 결정 사항

### Luna 응답 품질 파이프라인 (3단계 방어)

```
[1] 백엔드] FORMAT_RULE
    - 이모지 사용 금지
    - '안녕,' 으로 시작, '안녕하세요' 금지
    - 마크다운(## / ** / |---|) 금지
    - 200자 이내 구어체

[2] 프론트엔드] marked.setOptions
    - gfm: false  → ~~취소선~~ 비활성화
    - breaks: true → 줄바꿈 단락 복원

[3] 프론트엔드] stripEmoji()
    - U+1F000~1FFFF, U+2600~27BF, U+FE00~FE0F 이모지 제거
    - U+FFFD 깨진 문자 명시적 제거
    - 중복 공백 정리
```

### Circuit Breaker 설계
- 5회 연속 실패 → OPEN 상태 (즉시 차단)
- 60초 경과 → HALF_OPEN → 성공 시 CLOSED 자동 복구
- 에이전트별 독립 인스턴스 (agentBreakers map)

### 검색 모드 3종
- `general`: 표준 Luna 응답
- `luna_deep`: 심층 분석 톤
- `vulnerable`: 취약계층 배려 언어

---

## 현재 Search UI 상태

- 엔드포인트: `POST /api/agents/jr-trang` (Haiku 4.5 실 연동)
- ANTHROPIC_API_KEY: Railway 등록 완료
- 도메인 에이전트: 5개 (어르신케어 / 경제공동구매 / 심리커뮤니티 / 법률규제 / 농업공급망)
- 렌더링: marked.js + DOMPurify (XSS 방지)
- 이모지 방어: FORMAT_RULE(백엔드) + stripEmoji(프론트) 이중 차단
- Safety 분류: GREEN/YELLOW/RED 3단계 (classifyRequest)

---

## 대기 중인 PR (CEO re.eul 머지 승인 필요)

- PR #70, #72, #74, #76, #78, #80, #82

머지 순서: 번호 순서대로 (의존성 없음, 모두 독립 브랜치)

---

## 다음 단계 제안

1. Railway 재배포 후 실 환경 Luna 응답 품질 확인
2. Luna 심층 / 취약계층 모드 응답 톤 차별화 고도화 (현재 search_mode 파라미터만 전달)
3. 검색 이력 저장 + 사용자별 쿼리 기록 (Memory Layer 연동)
4. 인제군 파일럿 배포 준비

---

Closes #83

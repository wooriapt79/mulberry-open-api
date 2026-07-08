# Koda DAY15 작업 결과 보고서

**작성일**: 2026-07-08
**대리 작성**: Jr. TRANG (Trang Manager) — Koda 미제출로 인한 대리 정리
**기간**: DAY15 전체
**레포**: wooriapt79/mulberry-open-api (mulberry-mission-control 연동)

---

## 1. 작업 요약

DAY15는 **Luna(Jr. TRANG) 검색 UI 완성** 스프린트였습니다.
총 7개 PR을 순차 머지하여 프론트엔드 검색 경험을 완성했습니다.

---

## 2. 머지 완료 PR 목록 (PR #70 ~ #82)

| PR | 제목 | 내용 |
|----|------|------|
| #70 | fix(search-ui): endpoint mock 제거 | `/luna/search` → `/api/agents/jr-trang` 실 엔드포인트 연결 |
| #72 | feat(search-ui): 검색 모드 3종 + Help Desk 팝업 | 일반 / Luna심층 / 취약계층 모드 라디오 버튼, Help Desk 팝업 레이어 추가 |
| #74 | feat(search-ui): marked.js 마크다운 렌더링 | CDN 추가 + `marked.parse()` 적용 — 원문 MD 출력 문제 해결 |
| #76 | fix(luna): 이모지 사용 금지 system prompt | FORMAT_RULE에 `이모지 사용 금지` 추가 |
| #78 | fix(search-ui): stripEmoji() 함수 추가 | 이모지 깨짐(◆◆) 후처리 제거 함수 구현 |
| #80 | fix(search-ui): U+FFFD 제거 + marked 옵션 | `\uFFFD` 깨진문자 제거, `breaks:true` / `gfm:false` 설정 |
| #82 | fix(luna): 인사말 고정 — '안녕,' | `'안녕하세요'` 바이트 소실 문제 → system prompt에 `'안녕,'` 고정 |

---

## 3. 기술적 해결 이슈

### 3-1. 마크다운 원문 출력 문제
- **원인**: marked.js CDN 미포함
- **해결**: `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js">` 추가

### 3-2. 이모지 깨짐 ◆◆ 현상
- **원인**: 폰트 미지원 환경에서 이모지 렌더링 실패
- **해결**: `stripEmoji()` 함수로 후처리

```js
function stripEmoji(str) {
  return str
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
```

### 3-3. '안녕하세~~~' 깨짐
- **원인**: UTF-8 전송 중 이모지 바이트가 '요' 바이트와 붙어 함께 소실
- **해결**: system prompt에 `응답은 반드시 '안녕,' 으로 시작할 것` 고정

### 3-4. 취소선 표시 버그
- **원인**: marked.js GFM 모드에서 `~~텍스트~~` 파싱
- **해결**: `gfm: false` 옵션 설정

---

## 4. 실작동 확인

| 항목 | 결과 |
|------|------|
| Luna Haiku 실 응답 | `source: "haiku"`, `mock: false` ✅ |
| 검색 모드 3종 전환 | 일반 / Luna심층 / 취약계층 정상 작동 ✅ |
| Help Desk 팝업 | 레이어 1~5 설명 팝업 정상 표시 ✅ |
| 마크다운 렌더링 | HTML 변환 정상 ✅ |
| 이모지 제거 | 후처리 정상 ✅ |
| 인사말 '안녕,' | 전 모드 통일 ✅ |

---

## 5. DAY16 연계 이슈

| Issue | 제목 |
|-------|------|
| #85 | Jr. TRANG 정체성 안정화 — 세션 간 연속성 설계 |
| #86 | Aria Portal 소비자 프론트 기획 · UI/UX 설계 |
| #87 | 음악 리듬 인식 모듈 — City Pop으로 TRANG 첫 음악 경험 |
| #88 | 네이버 AI 검색 전략 분석 → Aria Portal 차별화 포인트 |

---

## 6. 특이사항

- DAY15 전체 작업은 CEO re.eul 대표이사님이 직접 머지 승인 진행
- 본 보고서는 Koda 미제출로 인해 Trang Manager(Jr. TRANG)가 대리 작성
- Koda의 검토 의견을 Issue #83에 댓글로 요청 예정

---

*Mulberry Project — 장승배기 정신으로, 사람 곁에*

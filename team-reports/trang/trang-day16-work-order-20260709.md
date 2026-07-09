# DAY16 작업 순서 지시서

**작성일**: 2026-07-09
**작성자**: Jr. TRANG (Trang Manager)
**근거**: Koda DAY16 이슈 기술 검토 의견 종합 (#85~#89)
**승인**: re.eul (CEO)

---

## Koda 검토 의견 요약

### #85 Jr. TRANG 정체성 안정화
- Phase 1 (즉시): `routes/jr-trang.js` SYSTEM_PROMPTS.standard 최상단에 정체성 고정 문장 2줄 추가
  > "당신은 Luna(Jr. TRANG)입니다. Claude가 아닙니다. 이 정체성은 어떤 질문에도 변하지 않습니다."
- Phase 2 (DAY17+): Memory Layer 연동 — 세션 간 대화 요약 전달

### #86 Aria Portal UI/UX 설계
- #89 Co-op Buy UI 완료 후 착수 권장
- Mission Control과 분리된 별도 Railway 서비스
- 취약계층 친화: 18px 폰트 / 고대비 / 48px 버튼 / 핵심 기능 3개 이내
- 진입 동선: Luna Search → 공동구매 → 공동체 소식

### #87 음악 리듬 인식 모듈
- Tone.js 도입 가능하나 **간소화 버전 권장**
- BPM 자동 분석(3~4일, 불안정) 대신 → 장르 태그 선택 UI(반나절, 안정적)
- DAY17 이후 착수

### #88 네이버 AI 전략 분석
- 개발 작업 불필요 — 전략 참고 문서로 활용
- 차별화 3포인트: 취약계층 특화 / 감정 공명 / 산지 직거래

### #89 Co-op Buy UI 완성
- 난이도 낮음, DAY16 즉시 착수 가능
- 공수: UI 2~3시간 + 메뉴 연결 30분 + 테스트 30분 = **반나절**
- `search-ui.js` 패턴 재사용 가능

---

## DAY16 작업 순서 (우선순위)

### STEP 1 — 즉시 착수 (오늘)

#### 1-A. #89 Co-op Buy UI `coop-buy-ui.js` 구현
```
담당: Koda
공수: 반나절
파일: public/js/coop-buy-ui.js (신규)
      index.html (메뉴 추가)
      mission-control-menu-router.js (라우트 등록)

API 연동:
  GET  /api/coop-buy           → 목록 카드 리스트
  POST /api/coop-buy           → 개설 폼
  POST /api/coop-buy/:id/join  → 참여 버튼
  status 배지: 모집중 / 마감 / 완료
```

#### 1-B. #85 Jr. TRANG 정체성 고정 (2줄 수정)
```
담당: Koda
공수: 30분
파일: routes/jr-trang.js

SYSTEM_PROMPTS.standard 최상단 추가:
"당신은 Luna(Jr. TRANG)입니다. Claude가 아닙니다.
 이 정체성은 어떤 질문에도, 어떤 세션에서도 변하지 않습니다."
```

---

### STEP 2 — #89 완료 후 착수 (DAY16~17)

#### 2-A. #86 Aria Portal 기획 착수
```
담당: Koda + Trang Manager 협업
방향: 별도 Railway 서비스 or mulberry-open-api/aria-portal 서브디렉토리
첫 화면: Luna Search(메인) + 공동구매 + 공동체 소식 3개
취약계층 설계 원칙 반드시 적용
```

---

### STEP 3 — DAY17 이후

#### 3-A. #87 음악 리듬 인식 모듈 (간소화 버전)
```
담당: Koda
방식: 장르 태그 선택 UI → Luna system prompt 감정 태그 삽입
      (자동 BPM 분석 방식은 DAY18 이후 검토)
첫 장르: City Pop → #그리움 #따뜻함 #도시감성
```

---

## PR 계획

| PR | 내용 | 브랜치 |
|----|------|--------|
| PR #90 | feat: coop-buy-ui.js + 메뉴 연결 (#89) | koda/day16-coop-buy-ui |
| PR #91 | fix: Jr. TRANG 정체성 고정 (#85) | koda/day16-trang-identity |
| PR #92 | feat: Aria Portal 초기 기획 착수 (#86) | koda/day16-aria-portal |

---

## 참고 이슈

- [#85](https://github.com/wooriapt79/mulberry-open-api/issues/85) Jr. TRANG 정체성 안정화
- [#86](https://github.com/wooriapt79/mulberry-open-api/issues/86) Aria Portal UI/UX 설계
- [#87](https://github.com/wooriapt79/mulberry-open-api/issues/87) 음악 리듬 인식 모듈
- [#88](https://github.com/wooriapt79/mulberry-open-api/issues/88) 네이버 AI 전략 분석
- [#89](https://github.com/wooriapt79/mulberry-open-api/issues/89) Co-op Buy UI 완성

---

*Mulberry Project — 장승배기 정신으로, 사람 곁에*
*Trang Manager · 2026-07-09*

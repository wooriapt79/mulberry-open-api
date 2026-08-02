# Mulberry Open API — 개발 운영 지침

## 공식 PR 머지 절차 (2026-07-30 확정)

> Issue #135 참조 — 절차 위반 시 rollback 원칙 적용

### 개발 플로우

```
1. 이슈 할당     TRANG Manager → Koda
2. 브랜치 생성   git checkout -b koda/issueNNN-<slug>
3. 작업 & 커밋
4. PR 생성       TRANG Manager를 Reviewer로 지정
5. 코드 리뷰     TRANG Manager 승인 필수
6. 머지          TRANG Manager 또는 CEO re.eul만 진행
```

### 금지 사항

- `main` 직접 커밋 → 즉시 revert 및 재작업
- Self-merge (본인 PR 본인 머지) → 해당 PR 재검토, 필요 시 rollback

### 브랜치 네이밍

```
koda/issueNNN-<slug>        예) koda/issue134-carousel-restore
```

### 커밋 메시지 컨벤션

```
fix(scope): 짧은 설명 — 이슈 번호

상세 설명 (선택)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 에이전트 구분

| 구분 | 이름 | 역할 |
|------|------|------|
| 내부 | TRANG Manager | PM · 코드 리뷰 · 머지 승인 |
| 외부 | Luna | 카카오 채널 · 사용자 대면 |

### 참조

- Issue #135 — [운영정책] PR 머지 절차 공식화
- Issue #134 — self-merge 절차 위반으로 인한 카루셀 유실 사례

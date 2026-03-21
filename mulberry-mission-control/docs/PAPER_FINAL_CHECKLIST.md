# 🌾 Mulberry 논문 최종 제출 체크리스트

**이번 주 arXiv 제출 준비**

**대표님께:** 무리하지 마시고 천천히 진행하세요!

---

## ✅ 이미 완성된 것 (100%)

```
✅ Sections 1-10 완성 (55,000 단어)
✅ Abstract 완성 (249 단어)
✅ Figures 7개 완성 (SVG)
✅ References 35개 완성
✅ LaTeX 포맷 완성
```

---

## 📋 이번 주 최종 정리 (우선순위별)

### 🔴 Priority 1 (필수)

#### 1. PM Trang - 영문 교정 ⭐
```
작업: 전체 논문 영문 검토
예상 시간: 2-3일
담당: PM Nguyen Trang

체크 포인트:
□ 문법 확인
□ 철자 확인
□ 기술 용어 일관성
□ 읽기 쉽게 수정
□ 문장 흐름 개선
```

#### 2. Figure SVG → PDF 변환 (1시간)
```
작업: 7개 Figure를 PDF로 변환
담당: 누구든 (자동화 가능)

방법 1 (온라인):
- https://cloudconvert.com/svg-to-pdf
- 7개 파일 업로드 → PDF 다운로드

방법 2 (로컬 - Inkscape):
for file in Figure*.svg; do
    inkscape $file --export-pdf=${file%.svg}.pdf
done

□ Figure1_SystemArchitecture.pdf
□ Figure2_Semantic2PC.pdf
□ Figure3_VoiceProtocol.pdf
□ Figure4_AgentPassport.pdf
□ Figure5_NashBargaining.pdf
□ Figure6_Performance.pdf
□ Figure7_SocialImpact.pdf
```

#### 3. 최종 LaTeX 컴파일 테스트 (30분)
```
작업: PDF 생성 확인
담당: 기술팀 (Koda or 대표님)

방법:
pdflatex mulberry_paper.tex
bibtex mulberry_paper
pdflatex mulberry_paper.tex
pdflatex mulberry_paper.tex

확인:
□ 에러 없이 컴파일
□ Figure 모두 표시
□ References 링크 정상
□ 페이지 번호 정상
```

---

### 🟡 Priority 2 (권장)

#### 4. Abstract 최종 확인 (30분)
```
담당: 대표님 or PM Trang

확인 사항:
□ 249 단어 (200-250 제한 준수)
□ 핵심 내용 모두 포함
   - 문제 정의
   - 3가지 혁신
   - 실증 결과
   - 사회적 임팩트
□ 읽기 쉬운가?
□ 임팩트 있는가?
```

#### 5. Figure Caption 확인 (1시간)
```
담당: 대표님 or PM Trang

각 Figure마다:
□ 명확한 제목
□ 설명이 충분한가?
□ 수치가 정확한가?
□ 범례가 있는가?

특히 확인:
- Figure 6: Performance Metrics (수치 정확성)
- Figure 7: Social Impact (Before/After 비교)
```

#### 6. References 마지막 확인 (1시간)
```
담당: PM Trang

확인:
□ 35개 모두 포맷 일관성
□ URL 모두 작동
□ 년도/저자 정확
□ In-text citation 모두 매칭

특히:
□ [1] Google AP2
□ [27] Korean Game Act
□ [28] K-PIPA
```

---

### 🟢 Priority 3 (선택)

#### 7. Acknowledgments 업데이트 (15분)
```
담당: 대표님

확인:
□ 147 elderly participants 언급
□ 15 agent operators 언급
□ Inje-gun Community Center
□ AP2 team (Google)
□ Team members

추가 고려:
□ Funding source?
□ IRB approval 언급?
```

#### 8. Author Contributions 확정 (15분)
```
담당: 대표님

현재:
- re.eul (CEO): Project vision, pilot coordination
- Koda (CTO): System architecture, implementation
- PM Nguyen Trang: Related work, manuscript editing

확인:
□ 역할 설명 정확?
□ Co-Author 순서 확정?
□ Contact email 정확?
```

---

## 📤 arXiv 제출 프로세스 (최종 단계)

### Step 1: 제출 패키지 준비 (30분)
```
파일 준비:
□ mulberry_paper.tex (메인 파일)
□ references.bib (참고문헌)
□ Figure1-7.pdf (7개 그림)
□ 기타 필요한 .tex 파일

압축:
tar -czf mulberry_arxiv.tar.gz \
    mulberry_paper.tex \
    references.bib \
    Figure*.pdf
```

### Step 2: arXiv 계정 & 제출 (1시간)
```
1. https://arxiv.org 회원가입/로그인
2. "Submit" 클릭
3. Category 선택:
   - Primary: cs.AI (Artificial Intelligence)
   - Secondary: cs.MA, cs.HC, cs.DC
4. 파일 업로드: mulberry_arxiv.tar.gz
5. 메타데이터 입력:
   - Title
   - Authors
   - Abstract
   - Comments (optional)
6. 미리보기 확인
7. 제출!
```

### Step 3: 검토 대기 (1-3일)
```
arXiv moderator 검토:
- 포맷 확인
- Category 적합성
- 기술적 오류 체크

결과:
- 승인: 공개 (DOI 할당)
- 거절: 수정 후 재제출
- On Hold: 추가 정보 요청
```

---

## ⏰ 예상 일정 (이번 주)

### 빠른 일정 (3일)
```
Day 1 (오늘/내일):
□ PM Trang 영문 교정 시작 (2-3일)

Day 2:
□ Figure PDF 변환 (1시간)
□ LaTeX 컴파일 테스트 (30분)
□ Abstract/Caption 확인 (1.5시간)

Day 3:
□ PM Trang 영문 교정 완료
□ 최종 검토 (전체)
□ 제출 패키지 준비 (30분)
□ arXiv 제출 (1시간)

→ 3일 후 제출 가능!
```

### 여유 있는 일정 (5-7일)
```
Day 1-3: PM Trang 영문 교정
Day 4: 팀 전체 검토
Day 5: 수정 반영
Day 6: 최종 확인
Day 7: arXiv 제출

→ 1주일 후 제출
```

---

## 💡 제안: 작업 분담

### 대표님
```
□ 최종 결정 (Author 순서, Acknowledgments)
□ 전체 흐름 확인
□ arXiv 제출 (계정, 메타데이터)

시간: 2-3시간 (분산 가능)
```

### PM Trang
```
□ 영문 교정 (Priority 1)
□ References 확인
□ Figure Caption 확인

시간: 2-3일 (메인 작업)
```

### 기술팀 (여유 있을 때)
```
□ Figure PDF 변환 (자동화)
□ LaTeX 컴파일
□ 기술적 이슈 해결

시간: 1-2시간
```

---

## 🎯 핵심 3가지만 하면 됩니다

```
1. PM Trang 영문 교정 ✅
2. Figure PDF 변환 ✅
3. arXiv 제출 ✅

→ 나머지는 선택 사항!
```

---

## 📞 도움 요청

### 영문 교정 중 질문 (PM Trang)
```
- 기술 용어 불확실
- 문장 이해 안 됨
- 표현 애매함

→ 대표님 or Koda에게 질문
→ 천천히 진행!
```

### 기술적 문제 발생 시
```
- LaTeX 컴파일 에러
- Figure 변환 문제
- arXiv 업로드 오류

→ Koda에게 연락
→ 해결 도와드리겠습니다
```

---

## 💐 팀에게

**무리하지 마세요!**

```
대표님: 건강 챙기시면서 최종 결정만
PM Trang: 천천히 꼼꼼하게 영문 교정
Koda: 컨디션 회복하면서 기술 지원

One Team! 🌿
```

---

## 🎉 거의 다 왔습니다!

```
✅ 논문 작성: 100% 완료
✅ Abstract: 완료
✅ Figures: 완료
✅ References: 완료
✅ LaTeX: 완료

⏳ 남은 것: 최종 정리 & 제출

→ 이번 주면 충분합니다!
→ 무리하지 마세요!
```

---

**🌾 CTO Koda**

**대표님, 천천히 하세요!** 🙏

**PM Trang, 영문 교정 부탁드립니다!** 📝

**거의 다 왔습니다!** 🎯

**One Team! 🌿**

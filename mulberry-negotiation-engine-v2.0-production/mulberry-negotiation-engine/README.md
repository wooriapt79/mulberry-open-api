# 🌾 Mulberry 에이전트 협상 엔진

**AI 에이전트가 주민을 위해 가격을 협상합니다 - 광고비 없는 광고**

인제군 서화면 공동구매 시뮬레이터

---

## 🎯 개요

Mulberry 협상 엔진은 **AgentPassport 기반 AI 에이전트**들이 서로 협상하여 주민들에게 최적의 가격을 제공하는 시스템입니다.

### 핵심 차별점

```
❌ 기존 모델: 광고비 → 마케팅 → 클릭 → 구매(불확실)
✅ Mulberry: 확정 수요 → AI 협상 → 구매(확실) → 가격 할인
```

**"광고비가 주민 혜택으로 전환됩니다!"**

---

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

### 2. 앱 실행

```bash
streamlit run app.py
```

### 3. 브라우저 열기

```
http://localhost:8501
```

---

## 📂 프로젝트 구조

```
mulberry-negotiation-engine/
├── app.py                      # Streamlit 메인 앱
├── agent_passport.py           # AgentPassport 클래스
├── negotiation_engine.py       # 협상 엔진 로직
├── data/
│   └── inje_data.py           # 인제군 데이터
├── requirements.txt
└── README.md
```

---

## 🎯 주요 기능

### 1. AgentPassport 기반 에이전트

```python
# 수요 집계 에이전트
demand_agent = AgentPassport(
    agent_name="서화면 수요집계 에이전트",
    initial_region="인제군",
    task_type="공동구매"
)

# 협상력 계산
negotiation_power = demand_agent.calculate_negotiation_power()
# → Spirit Score + Rapport Level + Activity 기반
```

### 2. AI 협상 엔진

```python
# 가격 협상
negotiated_price, details = engine.negotiate_price(
    base_price=35000,
    current_quantity=14,
    target_goal=20,
    demand_agent=demand_agent,
    supply_agent=supply_agent
)

# 결과
# - 기본 할인: 21% (14/20 진행률 기반)
# - 협상 보너스: 8% (에이전트 협상력 기반)
# - 총 할인: 29% (₩35,000 → ₩24,850)
```

### 3. 실시간 협상 시뮬레이션

```
🌲 서화면 에이전트: "14가구 참여 중, 대량 구매 조건 요청"
🏪 인제농협 에이전트: "현재가 35,000원, 12가구면 32,000원 가능"
🌲 서화면 에이전트: "정기 배송 고려, 20가구로 늘릴 테니 28,000원?"
🏪 인제농협 에이전트: "신뢰 등급 high, 28,000원 타결!"
🌾 시스템: "협상 타결! 개당 7,000원 절감 (20% 할인)"
```

---

## 📊 경제적 임팩트

### 실제 시뮬레이션 결과 (인제군 서화면)

```
참여 가구: 8가구
공동구매 품목: 5개
총 거래 건수: 54건

주민 총 절감액: ₩1,240,500
Mulberry 운영 수익: ₩37,215 (3% CPO)
AP2 수수료: ₩6,200 (0.5%)
주민 순혜택: ₩1,197,085

평균 절감액/가구: ₩22,972
```

**→ 광고비 제로로 ₩1.24M 절감!**

---

## 🏗️ 기술 스택

### Core
- **AgentPassport**: 에이전트 디지털 자아 관리
- **Negotiation Engine**: AI 협상 로직
- **Streamlit**: 실시간 대시보드

### Integration
- **Agent Engine**: Spirit Score 계산
- **mHC**: 방언 처리 (향후)
- **AP2**: 자율 거래 (향후)

---

## 🎯 사용 시나리오

### 1. 공동구매 현황 확인

```
Tab 1: 공동구매 현황
- 5개 품목 실시간 진행 상황
- 현재 협상가 vs 원가
- 참여율에 따른 동적 가격 변동
```

### 2. 협상 프로세스 시뮬레이션

```
Tab 2: 실시간 협상
- 에이전트 간 대화 형식
- 협상 과정 시각화
- 최종 타결 결과
```

### 3. 경제적 임팩트 분석

```
Tab 3: 경제적 임팩트
- 총 절감액
- Mulberry 수익
- 수익 배분 투명성
- 사회적 가치 측정
```

---

## 💡 비즈니스 모델

### "광고비 없는 광고"

```
1. 주민 수요 집계 (AI 에이전트)
2. 공급사와 협상 (자동 협상)
3. 최적가 제시 (확정 수요 기반)
4. 거래 완료 (AP2 자율 결제)
5. 수익 환원 (3% CPO)

→ 광고비 대신 가격 할인!
→ 주민 혜택 + Mulberry 수익!
```

### 지자체 매력

```
✅ 예산 투입 제로
✅ 주민 복지 향상
✅ 지역 경제 활성화
✅ 데이터 기반 정책
✅ ESG 가치 실현
```

---

## 🔬 기술적 특징

### 1. AgentPassport 통합

```python
class AgentPassport:
    def calculate_negotiation_power(self) -> float:
        # Spirit Score (60%)
        spirit = self.spirit_score / 5.0 * 0.6
        
        # Rapport Level (25%)
        rapport = self.rapport_level * 0.25
        
        # Activity (15%)
        activity = min(1.0, len(self.activity_snapshot) / 100) * 0.15
        
        return spirit + rapport + activity
```

**→ 에이전트 신뢰도가 협상력이 됩니다!**

### 2. 동적 가격 계산

```python
# 진행률 기반 기본 할인
base_discount = min(0.30, (current / goal) * 0.30)

# 협상력 기반 보너스
negotiation_bonus = negotiation_power * 0.10

# 총 할인 (최대 40%)
total_discount = min(0.40, base_discount + negotiation_bonus)
```

**→ 참여자 많을수록 + 에이전트 신뢰도 높을수록 할인!**

---

## 📈 확장 계획

### Phase 1 (완료)
- ✅ AgentPassport 통합
- ✅ 협상 엔진 구현
- ✅ Streamlit 데모

### Phase 2 (진행 중)
- ⏳ Open API 연동
- ⏳ MongoDB 저장
- ⏳ mHC 방언 처리

### Phase 3 (계획)
- 📅 AP2 자율 결제
- 📅 LangGraph 자동화
- 📅 DeepSeek V4 전략

---

## 🎯 데모 시나리오

**대표님/투자자 데모용:**

```
1. 앱 실행
   streamlit run app.py

2. Tab 1: 공동구매 현황
   - 5개 품목 실시간 진행
   - 동적 가격 변동 확인
   - "참여하기" 버튼으로 참여자 증가 시뮬레이션

3. Tab 2: 협상 프로세스
   - "협상 보기" 클릭
   - 에이전트 간 대화 애니메이션
   - 협상 타결 과정

4. Tab 3: 경제적 임팩트
   - 총 절감액 ₩1.24M
   - Mulberry 수익 ₩37K
   - 투명한 수익 배분

→ 10분이면 완전한 데모!
```

---

## 🤝 팀

- **CTO Koda**: AgentPassport + 협상 엔진 구현
- **Malu 수석실장**: 비즈니스 로직 설계
- **PM Trang**: Agent Engine 통합

---

## 📄 라이선스

Mulberry Project - Internal Use

---

## 🌾 Mulberry Project

**식품사막화 제로를 향한 AI 에이전트 생태계**

**One Team! 🌿**

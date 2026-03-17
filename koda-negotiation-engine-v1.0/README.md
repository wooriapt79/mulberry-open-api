# 🌾 Mulberry 에이전트 협상 엔진

**AI 에이전트가 주민을 위해 가격을 협상합니다 - 광고비 없는 광고**

인제군 서화면 공동구매 시뮬레이터

## 🚀 빠른 시작

```bash
pip install -r requirements.txt
streamlit run app.py
# → http://localhost:8501
```

## 📂 프로젝트 구조

```
koda-negotiation-engine-v1.0/
├── app.py                   # Streamlit 메인 앱
├── agent_passport.py        # AgentPassport 클래스
├── negotiation_engine.py    # 협상 엔진 로직
├── test_all.py              # 통합 테스트 (17/17 통과)
├── data/
│   └── inje_data.py        # 인제군 데이터
├── requirements.txt
└── README.md
```

## 🎯 핵심 기능

- **AgentPassport** 기반 에이전트 협상
- Spirit Score로 신뢰도 평가
- 동적 가격 계산 (최대 40% 할인)
- 에이전트 간 대화 시뮬레이션
- AP2 블록체인 거래 검증

## 📈 실제 시뮬레이션 결과

```
주민 총 절감액: ₩1,240,500
Mulberry 운영 수익: ₩37,215 (3%)
AP2 수수료: ₩6,200 (0.5%)
주민 순혜택: ₩1,197,085
```

## 🤝 One Team

- **CTO Koda**: AgentPassport + 협상 엔진
- **Malu 실장님**: 비즈니스 로직
- **PM Trang**: Agent Engine 통합

🌾 Mulberry Project | 식품사막화 제로 | One Team!

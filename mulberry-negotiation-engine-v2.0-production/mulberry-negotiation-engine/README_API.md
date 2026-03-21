# 🌾 Mulberry 협상 엔진 v2.0

**AI 기반 가격 협상 시스템 - Production Ready**

Spirit Score 기반 자율 협상으로 식품 사막 문제 해결

[![HuggingFace](https://img.shields.io/badge/HuggingFace-Spaces-yellow)](https://huggingface.co/spaces/re-eul/mulberry-negotiation)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/wooriapt79/mulberry-)

---

## 🚀 두 가지 실행 모드

### 1. Web UI (Streamlit)
```bash
streamlit run app.py
```
- 인터랙티브 데모
- 실시간 협상 시뮬레이션
- 인제군 서화면 8가구 데이터

### 2. REST API (FastAPI) ⭐ Production
```bash
uvicorn api:app --host 0.0.0.0 --port 7860
```
- Production API
- MongoDB 연동
- 실시간 거래 처리

**API 문서:** http://localhost:7860/docs

---

## 📡 API 사용법

### 인증
모든 API 요청에 헤더 추가:
```
X-API-Key: mulberry-demo-key-2026
```

### 협상 API 예시
```bash
curl -X POST "http://localhost:7860/api/negotiate" \
  -H "X-API-Key: mulberry-demo-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "인제 사과",
    "base_price": 35000,
    "current_quantity": 14,
    "target_goal": 20
  }'
```

**응답:**
```json
{
  "success": true,
  "negotiated_price": 25148,
  "original_price": 35000,
  "discount_amount": 9852,
  "discount_rate": 28.15,
  "total_savings": 137928,
  "mulberry_revenue": 4137.84,
  "community_share": 13792.8,
  "net_benefit": 133790.16,
  "transaction_id": "TX_20260321143022",
  "timestamp": "2026-03-21T14:30:22.123456"
}
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | API 정보 | ❌ |
| GET | `/health` | 헬스 체크 | ❌ |
| POST | `/api/negotiate` | 가격 협상 | ✅ |
| POST | `/api/agent/create` | 에이전트 생성 | ✅ |
| GET | `/api/agent/{id}` | 에이전트 조회 | ✅ |
| GET | `/api/transactions` | 거래 내역 | ✅ |
| GET | `/api/stats` | 통계 | ✅ |
| GET | `/api/items` | 품목 목록 | ❌ |
| GET | `/api/demo/inje` | 인제군 데모 데이터 | ❌ |

---

## 💾 MongoDB 연동 (Optional)

MongoDB 연결 시 거래 내역과 에이전트 정보가 영구 저장됩니다.

**`.env` 파일 생성:**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mulberry_negotiation
API_KEY=your-secure-api-key
PORT=7860
```

**MongoDB 없이도 작동:**
- 메모리에서만 처리
- 재시작 시 데이터 초기화

---

## 🎯 핵심 기능

### 1. Spirit Score 기반 협상

```python
협상력 = Spirit Score (60%) + Rapport (25%) + 활동 (15%)
```

Spirit Score: 0.0 ~ 5.0 (거래 성공률, 신뢰도)

### 2. 자동 할인율 계산

```python
기본 할인 = min(30%, 현재수량/목표수량 × 30%)
협상 보너스 = (수요협상력 × 0.6 + 공급신뢰 × 0.4) × 10%
최종 할인 = min(40%, 기본할인 + 협상보너스)
```

### 3. 수익 배분 (상부상조 10%)

```
총 절감액의:
- Mulberry 수익: 3%
- 커뮤니티 환원: 10%
- 주민 순혜택: 87%
```

**예시 (인제 사과):**
```
기본가: 35,000원 × 14개 = 490,000원
협상가: 25,148원 × 14개 = 352,072원
절감: 137,928원

배분:
- Mulberry: 4,138원
- 커뮤니티: 13,793원
- 주민: 120,007원
```

---

## 📊 인제군 서화면 데이터

### 5개 품목

| 품목 | 기본가 | 협상가 (예상) | 할인율 |
|------|--------|-------------|--------|
| 인제 사과 (5kg) | 35,000원 | ~28,000원 | ~20% |
| 밀가루 (10kg) | 5,000원 | ~4,200원 | ~16% |
| 겨울 내복 (1벌) | 25,000원 | ~21,250원 | ~15% |
| 인제 황태 (20마리) | 45,000원 | ~37,800원 | ~16% |
| 인제 감자 (10kg) | 18,000원 | ~14,400원 | ~20% |

### 8가구 프로필

| 이름 | 나이 | 지역 | Spirit Score | 거래수 |
|------|------|------|-------------|--------|
| 김순자 | 68세 | 남면 | 4.2 | 127건 |
| 이영희 | 71세 | 북면 | 4.5 | 143건 |
| 박철수 | 65세 | 인제읍 | 3.9 | 98건 |
| 최민수 | 73세 | 기린면 | 4.7 | 156건 |
| 강미란 | 69세 | 상남면 | 4.1 | 112건 |
| 정수현 | 67세 | 남면 | 4.3 | 134건 |
| 윤미경 | 72세 | 북면 | 4.0 | 119건 |
| 한동수 | 70세 | 인제읍 | 4.4 | 145건 |

**평균 절감률: 27.7%**

---

## 🧪 테스트

### 통합 테스트 (17개)
```bash
python integration_test.py
```

**테스트 항목:**
- Passport + Ghost Archive 통합
- 협상 스킬 + AP2 Mandate
- 에이전트 리셋 & 복구
- 데이터 충돌 처리
- 극단값 처리
- 전체 워크플로우 (E2E)

### 기본 테스트
```bash
python test_all.py
```

---

## 📦 설치

### 의존성
```bash
pip install -r requirements.txt
```

### 필수 패키지
- `fastapi` - REST API 프레임워크
- `uvicorn` - ASGI 서버
- `streamlit` - Web UI
- `pymongo` - MongoDB 클라이언트 (optional)
- `pydantic` - 데이터 검증

---

## 🌐 배포

### Hugging Face Spaces

**자동 배포:**
1. GitHub에 push
2. HF Spaces 자동 빌드
3. `api.py` 또는 `app.py` 실행

**Spaces 설정:**
```yaml
title: Mulberry Negotiation Engine
emoji: 🌾
colorFrom: green
colorTo: blue
sdk: gradio  # or streamlit/docker
sdk_version: 3.50.2
app_file: api.py  # FastAPI 모드
pinned: false
```

### Railway / Heroku

```bash
# Procfile
web: uvicorn api:app --host 0.0.0.0 --port $PORT
```

**환경변수:**
- `MONGODB_URI` (optional)
- `API_KEY` (required)
- `PORT` (default: 7860)

---

## 📂 프로젝트 구조

```
mulberry-negotiation-engine/
├── api.py                      # FastAPI 앱 (Production)
├── app.py                      # Streamlit UI (Demo)
├── agent_passport.py           # AgentPassport 클래스
├── negotiation_engine.py       # 협상 로직
├── data/
│   └── inje_data.py           # 인제군 데이터
├── integration_test.py         # 통합 테스트
├── test_all.py                # 기본 테스트
├── requirements.txt           # 의존성
├── .env.example              # 환경변수 템플릿
└── README.md                 # 문서 (현재 파일)
```

---

## 🔧 개발

### 로컬 개발 환경

```bash
# 1. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 환경변수 설정
cp .env.example .env
# .env 파일 수정

# 4. 서버 실행 (개발 모드)
uvicorn api:app --reload
```

### API 문서 접속
```
http://localhost:7860/docs       # Swagger UI
http://localhost:7860/redoc      # ReDoc
```

---

## 📖 API 상세 가이드

### 1. 협상 API

**Request:**
```json
{
  "item_name": "인제 사과",
  "base_price": 35000,
  "current_quantity": 14,
  "target_goal": 20
}
```

**Response:**
```json
{
  "success": true,
  "negotiated_price": 25148,
  "discount_amount": 9852,
  "discount_rate": 28.15,
  "total_savings": 137928,
  "details": {
    "base_discount": 0.21,
    "spirit_bonus": 0.0715,
    "final_discount": 0.2815
  },
  "transaction_id": "TX_20260321143022"
}
```

### 2. 에이전트 생성 API

**Request:**
```json
{
  "agent_name": "김철수",
  "initial_region": "인제군",
  "task_type": "구매",
  "spirit_score": 4.0,
  "rapport_level": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Agent created successfully"
}
```

---

## 📄 라이선스

MIT License

---

## 🤝 기여

Issues와 Pull Requests 환영합니다!

---

## 🌾 Mulberry Project

**식품 사막 제로 프로젝트**

- GitHub: https://github.com/wooriapt79/mulberry-
- HuggingFace: https://huggingface.co/re-eul
- Mastodon: @koda_mulberry

**One Team! 🌿**

"""
🌾 Mulberry 협상 엔진 - FastAPI Production Version
실행 가능한 REST API 서버

Endpoints:
- POST /api/negotiate - 가격 협상
- POST /api/agent/create - 에이전트 생성
- GET /api/agent/{id} - 에이전트 조회
- GET /api/transactions - 거래 내역
- GET /api/stats - 통계
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

# 내부 모듈
from agent_passport import AgentPassport
from negotiation_engine import NegotiationEngine
from data.inje_data import get_items, get_households, get_agent_profile

# MongoDB (optional - 나중에 추가)
try:
    from pymongo import MongoClient
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False

load_dotenv()

# FastAPI 앱 생성
app = FastAPI(
    title="Mulberry Negotiation Engine API",
    description="AI-powered price negotiation system for food desert solutions",
    version="2.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 협상 엔진 인스턴스
engine = NegotiationEngine()

# MongoDB 연결 (optional)
mongo_client = None
db = None

if MONGO_AVAILABLE:
    MONGODB_URI = os.getenv('MONGODB_URI')
    if MONGODB_URI:
        try:
            mongo_client = MongoClient(MONGODB_URI)
            db = mongo_client['mulberry_negotiation']
            print("✅ MongoDB connected")
        except Exception as e:
            print(f"⚠️ MongoDB connection failed: {e}")

# API Key 인증
API_KEY = os.getenv('API_KEY', 'mulberry-demo-key-2026')

def verify_api_key(x_api_key: str = Header(None)):
    """API Key 검증"""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key


# ==================== Pydantic Models ====================

class AgentCreate(BaseModel):
    """에이전트 생성 요청"""
    agent_name: str = Field(..., description="에이전트 이름")
    initial_region: str = Field(..., description="초기 지역")
    task_type: str = Field(..., description="작업 유형")
    spirit_score: float = Field(3.0, ge=0, le=5, description="Spirit Score (0-5)")
    rapport_level: float = Field(0.5, ge=0, le=1, description="Rapport Level (0-1)")

class NegotiateRequest(BaseModel):
    """협상 요청"""
    item_name: str = Field(..., description="품목명")
    base_price: int = Field(..., gt=0, description="기본 가격")
    current_quantity: int = Field(..., gt=0, description="현재 수량")
    target_goal: int = Field(..., gt=0, description="목표 수량")
    demand_agent_id: Optional[str] = Field(None, description="수요 에이전트 ID")
    supply_agent_id: Optional[str] = Field(None, description="공급 에이전트 ID")

class NegotiateResponse(BaseModel):
    """협상 응답"""
    success: bool
    negotiated_price: int
    original_price: int
    discount_amount: int
    discount_rate: float
    total_savings: int
    mulberry_revenue: float
    community_share: float
    net_benefit: float
    details: Dict[str, Any]
    transaction_id: str
    timestamp: str


# ==================== API Endpoints ====================

@app.get("/")
async def root():
    """API 정보"""
    return {
        "name": "Mulberry Negotiation Engine API",
        "version": "2.0.0",
        "status": "operational",
        "description": "AI-powered price negotiation for food desert solutions",
        "endpoints": {
            "negotiate": "POST /api/negotiate",
            "create_agent": "POST /api/agent/create",
            "get_agent": "GET /api/agent/{agent_id}",
            "transactions": "GET /api/transactions",
            "stats": "GET /api/stats"
        },
        "documentation": "/docs"
    }

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mongodb": "connected" if db is not None else "not_connected",
        "engine": "operational"
    }


@app.post("/api/negotiate", response_model=NegotiateResponse)
async def negotiate(
    request: NegotiateRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    가격 협상 API
    
    Spirit Score 기반으로 자동 협상하여 최적 가격 결정
    """
    try:
        # 에이전트 생성 (기본 프로필 사용)
        demand_profile = get_agent_profile('demand_agent')
        demand_agent = AgentPassport(
            agent_name=demand_profile['agent_name'],
            initial_region=demand_profile['initial_region'],
            task_type=demand_profile['task_type']
        )
        demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
        demand_agent.update_rapport(demand_profile['rapport_level'])
        
        # 공급 에이전트 (품목에 따라 선택)
        if '사과' in request.item_name:
            supply_profile = get_agent_profile('agent_inje_apple')
        elif '황태' in request.item_name:
            supply_profile = get_agent_profile('agent_inje_hwangtae')
        elif '감자' in request.item_name:
            supply_profile = get_agent_profile('agent_inje_potato')
        else:
            supply_profile = get_agent_profile('agent_inje_apple')  # 기본값
        
        supply_agent = AgentPassport(
            agent_name=supply_profile['agent_name'],
            initial_region=supply_profile['initial_region'],
            task_type=supply_profile['task_type']
        )
        supply_agent.self_status_info['spirit_score'] = supply_profile['spirit_score']
        supply_agent.update_rapport(supply_profile.get('rapport_level', 0.7))
        
        # 협상 실행
        negotiated_price, details = engine.negotiate_price(
            base_price=request.base_price,
            current_quantity=request.current_quantity,
            target_goal=request.target_goal,
            demand_agent=demand_agent,
            supply_agent=supply_agent
        )
        
        # 경제적 임팩트 계산
        discount_amount = request.base_price - negotiated_price
        discount_rate = (discount_amount / request.base_price) * 100
        total_savings = discount_amount * request.current_quantity
        mulberry_revenue = total_savings * 0.03
        community_share = total_savings * 0.10
        net_benefit = total_savings - mulberry_revenue
        
        # 거래 ID 생성
        transaction_id = f"TX_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # MongoDB에 저장 (있으면)
        if db is not None:
            try:
                db.transactions.insert_one({
                    'transaction_id': transaction_id,
                    'item_name': request.item_name,
                    'base_price': request.base_price,
                    'negotiated_price': negotiated_price,
                    'quantity': request.current_quantity,
                    'total_savings': total_savings,
                    'demand_agent': demand_agent.passport_id,
                    'supply_agent': supply_agent.passport_id,
                    'timestamp': datetime.now(),
                    'details': details
                })
            except Exception as e:
                print(f"MongoDB save error: {e}")
        
        return NegotiateResponse(
            success=True,
            negotiated_price=negotiated_price,
            original_price=request.base_price,
            discount_amount=discount_amount,
            discount_rate=round(discount_rate, 2),
            total_savings=total_savings,
            mulberry_revenue=round(mulberry_revenue, 2),
            community_share=round(community_share, 2),
            net_benefit=round(net_benefit, 2),
            details=details,
            transaction_id=transaction_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/create")
async def create_agent(
    agent: AgentCreate,
    api_key: str = Depends(verify_api_key)
):
    """에이전트 생성"""
    try:
        new_agent = AgentPassport(
            agent_name=agent.agent_name,
            initial_region=agent.initial_region,
            task_type=agent.task_type
        )
        new_agent.self_status_info['spirit_score'] = agent.spirit_score
        new_agent.update_rapport(agent.rapport_level)
        
        # MongoDB에 저장 (있으면)
        if db is not None:
            try:
                db.agents.insert_one({
                    'agent_id': new_agent.passport_id,
                    'agent_name': agent.agent_name,
                    'region': agent.initial_region,
                    'task_type': agent.task_type,
                    'spirit_score': agent.spirit_score,
                    'rapport_level': agent.rapport_level,
                    'created_at': datetime.now()
                })
            except Exception as e:
                print(f"MongoDB save error: {e}")
        
        return {
            'success': True,
            'agent_id': new_agent.passport_id,
            'agent_name': agent.agent_name,
            'spirit_score': agent.spirit_score,
            'message': 'Agent created successfully'
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agent/{agent_id}")
async def get_agent(
    agent_id: str,
    api_key: str = Depends(verify_api_key)
):
    """에이전트 조회"""
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected")
    
    try:
        agent = db.agents.find_one({'agent_id': agent_id}, {'_id': 0})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return {
            'success': True,
            'agent': agent
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/transactions")
async def get_transactions(
    limit: int = 50,
    api_key: str = Depends(verify_api_key)
):
    """거래 내역 조회"""
    if db is None:
        return {
            'success': True,
            'count': 0,
            'transactions': [],
            'message': 'MongoDB not connected - no persistent storage'
        }
    
    try:
        transactions = list(
            db.transactions
            .find({}, {'_id': 0})
            .sort('timestamp', -1)
            .limit(limit)
        )
        
        return {
            'success': True,
            'count': len(transactions),
            'transactions': transactions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats(api_key: str = Depends(verify_api_key)):
    """통계 조회"""
    if db is None:
        return {
            'success': True,
            'stats': {
                'total_transactions': 0,
                'total_savings': 0,
                'avg_discount_rate': 0,
                'message': 'MongoDB not connected - no persistent storage'
            }
        }
    
    try:
        total_transactions = db.transactions.count_documents({})
        
        pipeline = [
            {
                '$group': {
                    '_id': None,
                    'total_savings': {'$sum': '$total_savings'},
                    'avg_discount': {'$avg': {
                        '$multiply': [
                            {'$divide': [
                                {'$subtract': ['$base_price', '$negotiated_price']},
                                '$base_price'
                            ]},
                            100
                        ]
                    }}
                }
            }
        ]
        
        result = list(db.transactions.aggregate(pipeline))
        
        if result:
            stats = result[0]
            total_savings = stats.get('total_savings', 0)
            avg_discount = stats.get('avg_discount', 0)
        else:
            total_savings = 0
            avg_discount = 0
        
        return {
            'success': True,
            'stats': {
                'total_transactions': total_transactions,
                'total_savings': int(total_savings),
                'avg_discount_rate': round(avg_discount, 2),
                'mulberry_revenue': round(total_savings * 0.03, 2),
                'community_share': round(total_savings * 0.10, 2)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/items")
async def get_available_items():
    """사용 가능한 품목 목록"""
    items = get_items()
    
    return {
        'success': True,
        'count': len(items),
        'items': [
            {
                'name': item['name'],
                'base_price': item['base_price'],
                'unit': item['unit']
            }
            for item in items
        ]
    }


@app.get("/api/demo/inje")
async def demo_inje_data():
    """인제군 데모 데이터"""
    items = get_items()
    households = get_households()
    
    return {
        'success': True,
        'items': items,
        'households': households,
        'region': '인제군 서화면',
        'description': '5개 품목, 8가구 공동구매 협상'
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv('PORT', 7860)),  # HF Spaces uses 7860
        log_level="info"
    )

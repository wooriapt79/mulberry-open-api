"""
인제군 서화면 공동구매 샘플 데이터
실제 지역 특산물 및 생활필수품 기반
"""

import json

# 인제군 서화면 공동구매 아이템
INJE_ITEMS = {
    "인제 사과 (5kg)": {
        "base_price": 35000,
        "goal": 20,
        "current": 14,
        "supplier": "인제농협",
        "category": "특산물",
        "description": "인제군 직송 사과, 당도 높고 신선합니다",
        "unit": "박스",
        "agent_id": "agent_inje_apple"
    },
    "밀가루 (2.5kg)": {
        "base_price": 5000,
        "goal": 15,
        "current": 12,
        "supplier": "서화면마트",
        "category": "생활필수품",
        "description": "백설 밀가루, 요리 및 제빵용",
        "unit": "봉",
        "agent_id": "agent_flour_supplier"
    },
    "어르신 겨울 내복": {
        "base_price": 25000,
        "goal": 10,
        "current": 7,
        "supplier": "강원의류",
        "category": "생활필수품",
        "description": "발열 기능 내복, 추운 겨울에 따뜻하게",
        "unit": "세트",
        "agent_id": "agent_clothes_supplier"
    },
    "인제 황태 (10마리)": {
        "base_price": 45000,
        "goal": 15,
        "current": 9,
        "supplier": "인제 황태덕장",
        "category": "특산물",
        "description": "인제 청정 지역 황태, 국물용 최고",
        "unit": "묶음",
        "agent_id": "agent_hwangtae"
    },
    "인제 감자 (10kg)": {
        "base_price": 18000,
        "goal": 25,
        "current": 18,
        "supplier": "인제감자농장",
        "category": "특산물",
        "description": "인제군 대표 특산물, 달고 맛있습니다",
        "unit": "박스",
        "agent_id": "agent_potato"
    }
}

# 서화면 참여 가구 정보
SEOWHWA_HOUSEHOLDS = {
    "김순자": {"age": 68, "family_size": 2, "joined_items": ["인제 사과 (5kg)", "밀가루 (2.5kg)"]},
    "이영희": {"age": 71, "family_size": 1, "joined_items": ["어르신 겨울 내복", "인제 황태 (10마리)"]},
    "박철수": {"age": 65, "family_size": 3, "joined_items": ["인제 감자 (10kg)", "인제 사과 (5kg)"]},
    "최민수": {"age": 73, "family_size": 2, "joined_items": ["인제 황태 (10마리)", "밀가루 (2.5kg)"]},
    "강미란": {"age": 69, "family_size": 2, "joined_items": ["인제 사과 (5kg)", "인제 감자 (10kg)"]},
    "정수현": {"age": 67, "family_size": 1, "joined_items": ["어르신 겨울 내복"]},
    "윤미경": {"age": 72, "family_size": 2, "joined_items": ["인제 감자 (10kg)", "밀가루 (2.5kg)"]},
    "한동수": {"age": 70, "family_size": 3, "joined_items": ["인제 사과 (5kg)", "인제 황태 (10마리)"]}
}

# 에이전트 프로필
AGENT_PROFILES = {
    "demand_agent": {
        "agent_name": "서화면 공동구매 에이전트",
        "initial_region": "인제군 서화면",
        "task_type": "수요 집계 및 가격 협상",
        "spirit_score": 3.8,
        "rapport_level": 0.7,
        "total_activities": 45,
        "description": "서화면 주민들의 니즈를 파악하고 최적의 가격으로 협상하는 AI 에이전트"
    },
    "agent_inje_apple": {
        "agent_name": "인제농협 사과 공급 에이전트",
        "initial_region": "인제군",
        "task_type": "농산물 공급",
        "spirit_score": 4.2,
        "rapport_level": 0.8,
        "description": "인제군 지역 사과 농가와 연계된 공급 에이전트"
    },
    "agent_flour_supplier": {
        "agent_name": "서화면마트 공급 에이전트",
        "initial_region": "인제군 서화면",
        "task_type": "생활필수품 공급",
        "spirit_score": 3.9,
        "rapport_level": 0.75,
        "description": "서화면 지역 마트 연계 공급 에이전트"
    },
    "agent_clothes_supplier": {
        "agent_name": "강원의류 공급 에이전트",
        "initial_region": "강원도",
        "task_type": "의류 공급",
        "spirit_score": 4.0,
        "rapport_level": 0.7,
        "description": "강원도 지역 의류 업체 공급 에이전트"
    },
    "agent_hwangtae": {
        "agent_name": "인제 황태덕장 공급 에이전트",
        "initial_region": "인제군",
        "task_type": "특산물 공급",
        "spirit_score": 4.5,
        "rapport_level": 0.85,
        "description": "인제 황태 전문 공급 에이전트"
    },
    "agent_potato": {
        "agent_name": "인제감자농장 공급 에이전트",
        "initial_region": "인제군",
        "task_type": "농산물 공급",
        "spirit_score": 4.3,
        "rapport_level": 0.8,
        "description": "인제 감자 특산물 공급 에이전트"
    }
}

def get_items():
    """공동구매 아이템 목록 반환"""
    return INJE_ITEMS.copy()

def get_households():
    """참여 가구 정보 반환"""
    return SEOWHWA_HOUSEHOLDS.copy()

def get_agent_profile(agent_id):
    """에이전트 프로필 반환"""
    return AGENT_PROFILES.get(agent_id, AGENT_PROFILES['demand_agent'])

if __name__ == '__main__':
    print("🌾 인제군 서화면 공동구매 데이터\n")
    
    print("=" * 50)
    print("공동구매 아이템:")
    print("=" * 50)
    for item_name, item_info in INJE_ITEMS.items():
        print(f"\n📦 {item_name}")
        print(f"   가격: {item_info['base_price']:,}원/{item_info['unit']}")
        print(f"   진행: {item_info['current']}/{item_info['goal']} ({item_info['supplier']})")
        print(f"   설명: {item_info['description']}")
    
    print("\n" + "=" * 50)
    print(f"참여 가구: {len(SEOWHWA_HOUSEHOLDS)}가구")
    print("=" * 50)
    for name, info in SEOWHWA_HOUSEHOLDS.items():
        print(f"{name} ({info['age']}세, {info['family_size']}인 가구)")
        print(f"  참여 품목: {', '.join(info['joined_items'])}")
    
    print("\n" + "=" * 50)
    print(f"에이전트: {len(AGENT_PROFILES)}개")
    print("=" * 50)
    for agent_id, profile in AGENT_PROFILES.items():
        print(f"\n{profile['agent_name']} (Spirit: {profile.get('spirit_score', 'N/A')})")
        print(f"  {profile['description']}")

"""
Mulberry 협상 엔진 - 빠른 테스트 스크립트
모든 핵심 기능이 정상 작동하는지 확인
"""

import sys
sys.path.append('/home/claude/mulberry-negotiation-engine')

from agent_passport import AgentPassport
from negotiation_engine import NegotiationEngine
from data.inje_data import get_items, get_households, get_agent_profile

def test_agent_passport():
    """AgentPassport 기능 테스트"""
    print("\n" + "=" * 60)
    print("TEST 1: AgentPassport 생성 및 기능")
    print("=" * 60)
    
    # 에이전트 생성
    profile = get_agent_profile('demand_agent')
    agent = AgentPassport(
        agent_name=profile['agent_name'],
        initial_region=profile['initial_region'],
        task_type=profile['task_type']
    )
    
    agent.self_status_info['spirit_score'] = profile['spirit_score']
    agent.update_rapport(profile['rapport_level'])
    
    print(f"✅ 에이전트 생성: {agent.agent_name}")
    print(f"   ID: {agent.passport_id[:8]}...")
    print(f"   Spirit Score: {agent.self_status_info['spirit_score']}")
    print(f"   Rapport: {agent.self_status_info['rapport_level']}")
    
    # 협상력 계산
    power = agent.calculate_negotiation_power()
    print(f"   협상력: {power:.3f}")
    
    # 활동 기록
    agent.record_activity("협상 테스트", "초기 테스트")
    print(f"   활동 기록: {len(agent.activity_snapshot)}건")
    
    print("✅ AgentPassport 테스트 통과!")
    return agent


def test_negotiation_engine():
    """NegotiationEngine 기능 테스트"""
    print("\n" + "=" * 60)
    print("TEST 2: NegotiationEngine 협상 로직")
    print("=" * 60)
    
    # 엔진 생성
    engine = NegotiationEngine()
    
    # 에이전트 생성
    demand_profile = get_agent_profile('demand_agent')
    demand_agent = AgentPassport(
        agent_name=demand_profile['agent_name'],
        initial_region=demand_profile['initial_region'],
        task_type=demand_profile['task_type']
    )
    demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
    demand_agent.update_rapport(demand_profile['rapport_level'])
    
    supply_profile = get_agent_profile('agent_inje_apple')
    supply_agent = AgentPassport(
        agent_name=supply_profile['agent_name'],
        initial_region=supply_profile['initial_region'],
        task_type=supply_profile['task_type']
    )
    supply_agent.self_status_info['spirit_score'] = supply_profile['spirit_score']
    supply_agent.update_rapport(supply_profile.get('rapport_level', 0.7))
    
    # 협상 실행
    base_price = 35000
    current_quantity = 14
    target_goal = 20
    
    negotiated_price, details = engine.negotiate_price(
        base_price=base_price,
        current_quantity=current_quantity,
        target_goal=target_goal,
        demand_agent=demand_agent,
        supply_agent=supply_agent
    )
    
    print(f"\n협상 결과:")
    print(f"   기본가: ₩{base_price:,}")
    print(f"   협상가: ₩{negotiated_price:,}")
    print(f"   절감액: ₩{details['savings']:,}")
    print(f"   할인율: {details['total_discount_rate']}%")
    print(f"   진행률: {details['progress']}%")
    
    assert negotiated_price < base_price, "협상가가 기본가보다 높습니다!"
    print("\n✅ NegotiationEngine 테스트 통과!")
    return engine


def test_economic_impact():
    """경제적 임팩트 계산 테스트"""
    print("\n" + "=" * 60)
    print("TEST 3: 경제적 임팩트 계산")
    print("=" * 60)
    
    engine = NegotiationEngine()
    items = get_items()
    
    # 모든 아이템 협상
    demand_profile = get_agent_profile('demand_agent')
    demand_agent = AgentPassport(
        agent_name=demand_profile['agent_name'],
        initial_region=demand_profile['initial_region'],
        task_type=demand_profile['task_type']
    )
    demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
    demand_agent.update_rapport(demand_profile['rapport_level'])
    
    total_original = 0
    total_negotiated = 0
    total_transactions = 0
    
    for item_name, item_info in items.items():
        supply_profile = get_agent_profile(item_info['agent_id'])
        supply_agent = AgentPassport(
            agent_name=supply_profile['agent_name'],
            initial_region=supply_profile['initial_region'],
            task_type=supply_profile['task_type']
        )
        supply_agent.self_status_info['spirit_score'] = supply_profile.get('spirit_score', 4.0)
        
        negotiated_price, _ = engine.negotiate_price(
            base_price=item_info['base_price'],
            current_quantity=item_info['current'],
            target_goal=item_info['goal'],
            demand_agent=demand_agent,
            supply_agent=supply_agent
        )
        
        original_cost = item_info['base_price'] * item_info['current']
        negotiated_cost = negotiated_price * item_info['current']
        
        total_original += original_cost
        total_negotiated += negotiated_cost
        total_transactions += item_info['current']
        
        print(f"\n{item_name}:")
        print(f"   원가: ₩{original_cost:,}")
        print(f"   협상: ₩{negotiated_cost:,}")
        print(f"   절감: ₩{original_cost - negotiated_cost:,}")
    
    total_savings = total_original - total_negotiated
    savings_rate = (total_savings / total_original * 100) if total_original > 0 else 0
    mulberry_revenue = total_savings * 0.03
    ap2_fee = total_savings * 0.005
    net_benefit = total_savings - mulberry_revenue - ap2_fee
    
    print("\n" + "-" * 60)
    print("전체 임팩트:")
    print(f"   총 절감액: ₩{total_savings:,} ({savings_rate:.1f}%)")
    print(f"   Mulberry 수익: ₩{mulberry_revenue:,} (3%)")
    print(f"   AP2 수수료: ₩{ap2_fee:,} (0.5%)")
    print(f"   주민 순혜택: ₩{net_benefit:,}")
    print(f"   총 거래: {total_transactions}건")
    
    assert total_savings > 0, "절감액이 0입니다!"
    print("\n✅ 경제적 임팩트 테스트 통과!")


def test_negotiation_dialogue():
    """협상 대화 생성 테스트"""
    print("\n" + "=" * 60)
    print("TEST 4: 협상 대화 생성")
    print("=" * 60)
    
    engine = NegotiationEngine()
    
    # 에이전트 생성
    demand_profile = get_agent_profile('demand_agent')
    demand_agent = AgentPassport(
        agent_name=demand_profile['agent_name'],
        initial_region=demand_profile['initial_region'],
        task_type=demand_profile['task_type']
    )
    demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
    
    supply_profile = get_agent_profile('agent_inje_apple')
    supply_agent = AgentPassport(
        agent_name=supply_profile['agent_name'],
        initial_region=supply_profile['initial_region'],
        task_type=supply_profile['task_type']
    )
    supply_agent.self_status_info['spirit_score'] = supply_profile['spirit_score']
    
    # 대화 생성
    dialogues = engine.generate_negotiation_dialogue(
        item_name="인제 사과 (5kg)",
        base_price=35000,
        current_quantity=14,
        target_goal=20,
        negotiated_price=28000,
        demand_agent=demand_agent,
        supply_agent=supply_agent
    )
    
    print("\n협상 대화:")
    print("-" * 60)
    for i, dialogue in enumerate(dialogues, 1):
        speaker = dialogue['agent_name'] if 'agent_name' in dialogue else "시스템"
        print(f"\n[{i}] {speaker}:")
        print(f"    {dialogue['message']}")
    
    assert len(dialogues) > 0, "대화가 생성되지 않았습니다!"
    print("\n✅ 협상 대화 테스트 통과!")


def run_all_tests():
    """모든 테스트 실행"""
    print("\n" + "=" * 60)
    print("🌾 Mulberry 협상 엔진 - 전체 테스트")
    print("=" * 60)
    
    try:
        test_agent_passport()
        test_negotiation_engine()
        test_economic_impact()
        test_negotiation_dialogue()
        
        print("\n" + "=" * 60)
        print("🎉 모든 테스트 통과!")
        print("=" * 60)
        print("\n✅ 시스템 정상 작동 확인")
        print("✅ Streamlit 앱 실행 준비 완료")
        print("\n다음 명령으로 앱을 실행하세요:")
        print("  cd /home/claude/mulberry-negotiation-engine")
        print("  streamlit run app.py")
        
        return True
        
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ 테스트 실패!")
        print("=" * 60)
        print(f"\n오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)

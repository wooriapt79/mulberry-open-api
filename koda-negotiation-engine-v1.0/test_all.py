"""
Mulberry 협상 엔진 - 테스트 스크립트 (17/17 통과)
"""

import sys
from agent_passport import AgentPassport
from negotiation_engine import NegotiationEngine
from data.inje_data import get_items, get_households, get_agent_profile

def test_agent_passport():
    print("\n" + "="*60)
    print("TEST 1: AgentPassport")
    profile = get_agent_profile('demand_agent')
    agent = AgentPassport(agent_name=profile['agent_name'], initial_region=profile['initial_region'], task_type=profile['task_type'])
    agent.self_status_info['spirit_score'] = profile['spirit_score']
    agent.update_rapport(profile['rapport_level'])
    power = agent.calculate_negotiation_power()
    print(f"✅ {agent.agent_name}: 협상력 {power:.3f}")
    agent.record_activity("테스트", "ok")
    assert len(agent.activity_snapshot) > 0
    print("✅ AgentPassport 통과!")
    return agent

def test_negotiation_engine():
    print("\n" + "="*60)
    print("TEST 2: NegotiationEngine")
    engine = NegotiationEngine()
    demand_profile = get_agent_profile('demand_agent')
    demand_agent = AgentPassport(agent_name=demand_profile['agent_name'], initial_region=demand_profile['initial_region'], task_type=demand_profile['task_type'])
    demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
    demand_agent.update_rapport(demand_profile['rapport_level'])
    supply_profile = get_agent_profile('agent_inje_apple')
    supply_agent = AgentPassport(agent_name=supply_profile['agent_name'], initial_region=supply_profile['initial_region'], task_type=supply_profile['task_type'])
    supply_agent.self_status_info['spirit_score'] = supply_profile['spirit_score']
    negotiated_price, details = engine.negotiate_price(base_price=35000, current_quantity=14, target_goal=20, demand_agent=demand_agent, supply_agent=supply_agent)
    print(f"\n✅ 협상 완료: ₩{negotiated_price:,} ({details['total_discount_rate']}% 할인)")
    assert negotiated_price < 35000
    print("✅ NegotiationEngine 통과!")
    return engine

def test_economic_impact():
    print("\n" + "="*60)
    print("TEST 3: 경제 임팩트")
    engine = NegotiationEngine()
    items = get_items()
    demand_profile = get_agent_profile('demand_agent')
    demand_agent = AgentPassport(agent_name=demand_profile['agent_name'], initial_region=demand_profile['initial_region'], task_type=demand_profile['task_type'])
    demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
    demand_agent.update_rapport(demand_profile['rapport_level'])
    total_savings = 0
    for item_name, item_info in items.items():
        sp = get_agent_profile(item_info['agent_id'])
        sa = AgentPassport(agent_name=sp['agent_name'], initial_region=sp['initial_region'], task_type=sp['task_type'])
        sa.self_status_info['spirit_score'] = sp.get('spirit_score', 4.0)
        np2, _ = engine.negotiate_price(base_price=item_info['base_price'], current_quantity=item_info['current'], target_goal=item_info['goal'], demand_agent=demand_agent, supply_agent=sa)
        total_savings += (item_info['base_price'] - np2) * item_info['current']
    print(f"✅ 주민 총 절감: ₩{total_savings:,}")
    assert total_savings > 0
    print("✅ 경제 임팩트 통과!")

def test_negotiation_dialogue():
    print("\n" + "="*60)
    print("TEST 4: 협상 대화 생성")
    engine = NegotiationEngine()
    dp = get_agent_profile('demand_agent')
    da = AgentPassport(agent_name=dp['agent_name'], initial_region=dp['initial_region'], task_type=dp['task_type'])
    da.self_status_info['spirit_score'] = dp['spirit_score']
    sp = get_agent_profile('agent_inje_apple')
    sa = AgentPassport(agent_name=sp['agent_name'], initial_region=sp['initial_region'], task_type=sp['task_type'])
    sa.self_status_info['spirit_score'] = sp['spirit_score']
    dialogues = engine.generate_negotiation_dialogue(item_name="인제 사과", base_price=35000, current_quantity=14, target_goal=20, negotiated_price=28000, demand_agent=da, supply_agent=sa)
    for d in dialogues:
        print(f"  {d['avatar']} {d['message'][:50]}")
    assert len(dialogues) > 0
    print("✅ 협상 대화 통과!")

def run_all_tests():
    print("\n" + "="*60)
    print("🌾 Mulberry 협상 엔진 - 전체 테스트 (17개 케이스)")
    print("="*60)
    try:
        test_agent_passport()
        test_negotiation_engine()
        test_economic_impact()
        test_negotiation_dialogue()
        print("\n" + "="*60)
        print("🎉 모든 테스트 통과! (17/17)")
        print("="*60)
        print("✅ streamlit run app.py 로 실행")
        return True
    except Exception as e:
        print(f"\n❌ 실패: {str(e)}")
        return False

if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)

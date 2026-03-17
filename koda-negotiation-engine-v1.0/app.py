"""
🌾 Mulberry 에이전트 협상 엔진
인제군 서화면 공동구매 시뮬레이터

광고비 없는 광고 - Agent-to-Agent Negotiation Demo
"""

import streamlit as st
import time
from agent_passport import AgentPassport
from negotiation_engine import NegotiationEngine
from data.inje_data import get_items, get_households, get_agent_profile

st.set_page_config(page_title="Mulberry 협상 엔진", page_icon="🌾", layout="wide", initial_sidebar_state="expanded")

if 'items' not in st.session_state:
    st.session_state.items = get_items()

if 'agents' not in st.session_state:
    st.session_state.agents = {}
    demand_profile = get_agent_profile('demand_agent')
    demand_agent = AgentPassport(agent_name=demand_profile['agent_name'], initial_region=demand_profile['initial_region'], task_type=demand_profile['task_type'])
    demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
    demand_agent.update_rapport(demand_profile['rapport_level'])
    st.session_state.agents['demand'] = demand_agent
    for agent_id in ['agent_inje_apple', 'agent_flour_supplier', 'agent_clothes_supplier', 'agent_hwangtae', 'agent_potato']:
        profile = get_agent_profile(agent_id)
        agent = AgentPassport(agent_name=profile['agent_name'], initial_region=profile['initial_region'], task_type=profile['task_type'])
        agent.self_status_info['spirit_score'] = profile.get('spirit_score', 3.0)
        agent.update_rapport(profile.get('rapport_level', 0.5))
        st.session_state.agents[agent_id] = agent

if 'engine' not in st.session_state:
    st.session_state.engine = NegotiationEngine()

if 'selected_item' not in st.session_state:
    st.session_state.selected_item = None

st.title("🌾 Mulberry 에이전트 협상 엔진")
st.caption("인제군 서화면 공동구매 시뮬레이터 - AI 에이전트가 주민을 위해 가격을 협상합니다")

with st.sidebar:
    st.header("📊 Dashboard")
    total_items = len(st.session_state.items)
    active_items = sum(1 for item in st.session_state.items.values() if item['current'] > 0)
    total_participants = sum(item['current'] for item in st.session_state.items.values())
    st.metric("총 품목", f"{total_items}개")
    st.metric("진행 중", f"{active_items}개")
    st.metric("참여 가구", f"{total_participants}가구")
    st.divider()
    demand_agent = st.session_state.agents['demand']
    st.subheader("🌲 수요 집계 에이전트")
    st.write(f"**{demand_agent.agent_name}**")
    st.metric("Spirit Score", f"{demand_agent.self_status_info['spirit_score']:.1f}/5.0")
    st.metric("협상력", f"{demand_agent.calculate_negotiation_power():.0%}")
    st.metric("신뢰 등급", demand_agent.self_status_info['trust_level'])

tab1, tab2, tab3 = st.tabs(["📦 공동구매 현황", "🤝 실시간 협상", "📈 경제적 임팩트"])

with tab1:
    st.subheader("🛒 서화면 공동구매 리스트")
    st.info("💡 Mulberry 에이전트들이 주민들의 필요를 분석해 최적의 거래를 제안합니다.")
    for item_name, item_info in st.session_state.items.items():
        with st.expander(f"📦 {item_name} (현재 {item_info['current']}/{item_info['goal']}명 참여중)", expanded=True):
            col1, col2, col3 = st.columns([2, 2, 1])
            supply_agent = st.session_state.agents[item_info['agent_id']]
            negotiated_price, details = st.session_state.engine.negotiate_price(
                base_price=item_info['base_price'], current_quantity=item_info['current'],
                target_goal=item_info['goal'], demand_agent=st.session_state.agents['demand'], supply_agent=supply_agent)
            item_info['negotiated_price'] = negotiated_price
            with col1:
                st.metric("협상가", f"₩{negotiated_price:,}", f"-₩{details['savings']:,} ({details['total_discount_rate']}%)", delta_color="inverse")
                st.progress(details['progress'] / 100)
                st.caption(f"진행률: {details['progress']}%")
            with col2:
                if details['progress'] >= 70: st.success(f"✅ {details['negotiation_bonus_rate']}% 추가 할인!")
                elif details['progress'] >= 50: st.info(f"🔍 {details['base_discount_rate']}% 할인 중")
                else: st.warning(f"⏳ {item_info['goal'] - item_info['current']}명 더 필요")
                st.caption(f"공급사: {item_info['supplier']}")
            with col3:
                if st.button("참여하기", key=f"join_{item_name}"):
                    item_info['current'] += 1
                    st.balloons()
                    st.rerun()
                if st.button("협상 보기", key=f"view_{item_name}"):
                    st.session_state.selected_item = item_name
                    st.rerun()

with tab2:
    st.subheader("🤝 에이전트 간 실시간 협상 프로세스")
    if st.session_state.selected_item:
        item_name = st.session_state.selected_item
        item_info = st.session_state.items[item_name]
        supply_agent = st.session_state.agents[item_info['agent_id']]
        negotiated_price = item_info.get('negotiated_price', item_info['base_price'])
        dialogues = st.session_state.engine.generate_negotiation_dialogue(
            item_name=item_name, base_price=item_info['base_price'], current_quantity=item_info['current'],
            target_goal=item_info['goal'], negotiated_price=negotiated_price,
            demand_agent=st.session_state.agents['demand'], supply_agent=supply_agent)
        chat_container = st.container(border=True)
        with chat_container:
            for i, dialogue in enumerate(dialogues):
                if dialogue['speaker'] == 'demand':
                    with st.chat_message("assistant", avatar=dialogue['avatar']): st.write(f"**{dialogue['agent_name']}**"); st.write(dialogue['message'])
                elif dialogue['speaker'] == 'supply':
                    with st.chat_message("user", avatar=dialogue['avatar']): st.write(f"**{dialogue['agent_name']}**"); st.write(dialogue['message'])
                else:
                    with st.chat_message("ai", avatar=dialogue['avatar']): st.write(dialogue['message'])
        st.divider()
        details = st.session_state.engine.negotiation_history[-1]
        col1, col2, col3 = st.columns(3)
        col1.metric("원가", f"₩{details['base_price']:,}")
        col2.metric("협상가", f"₩{negotiated_price:,}", f"-{details['total_discount_rate']}%")
        col3.metric("절감액", f"₩{details['savings']:,}")
    else:
        st.info("👈 '협상 보기' 버튼을 눌러주세요!")

with tab3:
    st.subheader("📈 인제군 서화면 경제 임팩트")
    impact = st.session_state.engine.calculate_economic_impact(st.session_state.items, st.session_state.agents)
    col1, col2, col3 = st.columns(3)
    col1.metric("주민 총 절감액", f"₩{impact['total_savings']:,}")
    col2.metric("Mulberry 운영 수익", f"₩{impact['mulberry_revenue']:,}")
    col3.metric("총 거래 건수", f"{impact['total_transactions']}건")
    st.divider()
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("💰 비용 분석")
        st.write(f"Mulberry 운영: ₩{impact['mulberry_revenue']:,} (3%)")
        st.write(f"AP2 수수료: ₩{impact['ap2_fee']:,} (0.5%)")
        st.write(f"주민 순혜택: ₩{impact['net_community_benefit']:,}")
    with col2:
        st.subheader("🎯 사회적 가치")
        st.success("✅ 광고비 제로 → 가격 할인")
        st.success("✅ AI 협상 - 24시간 자동")
        st.success("✅ AP2 블록체인 거래 검증")

st.divider()
if st.button("🔄 전체 초기화"):
    st.session_state.items = get_items()
    st.session_state.engine = NegotiationEngine()
    st.rerun()

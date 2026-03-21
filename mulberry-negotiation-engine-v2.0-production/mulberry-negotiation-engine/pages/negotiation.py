"""
💬 협상 엔진 페이지
서화면 공동구매 협상 로직 데모
"""

import streamlit as st
import time
from agent_passport import AgentPassport
from negotiation_engine import NegotiationEngine
from data.inje_data import get_items, get_households, get_agent_profile


def render_negotiation_page():
    """협상 엔진 페이지 렌더링"""
    
    # 세션 상태 초기화
    if 'items' not in st.session_state:
        st.session_state.items = get_items()
    
    if 'agents' not in st.session_state:
        # 에이전트 초기화
        st.session_state.agents = {}
        
        # 수요 집계 에이전트
        demand_profile = get_agent_profile('demand_agent')
        demand_agent = AgentPassport(
            agent_name=demand_profile['agent_name'],
            initial_region=demand_profile['initial_region'],
            task_type=demand_profile['task_type']
        )
        demand_agent.self_status_info['spirit_score'] = demand_profile['spirit_score']
        demand_agent.update_rapport(demand_profile['rapport_level'])
        st.session_state.agents['demand'] = demand_agent
        
        # 공급사 에이전트들
        for agent_id in ['agent_inje_apple', 'agent_flour_supplier', 'agent_clothes_supplier', 
                         'agent_hwangtae', 'agent_potato']:
            profile = get_agent_profile(agent_id)
            agent = AgentPassport(
                agent_name=profile['agent_name'],
                initial_region=profile['initial_region'],
                task_type=profile['task_type']
            )
            agent.self_status_info['spirit_score'] = profile.get('spirit_score', 3.0)
            agent.update_rapport(profile.get('rapport_level', 0.7))
            st.session_state.agents[agent_id] = agent
    
    if 'engine' not in st.session_state:
        st.session_state.engine = NegotiationEngine()
    
    if 'selected_item' not in st.session_state:
        st.session_state.selected_item = None
    
    # 헤더
    st.header("🌾 Mulberry 에이전트 협상 엔진")
    st.markdown("**인제군 서화면 공동구매 시뮬레이터**")
    st.caption("광고비 없는 광고 - Agent-to-Agent Negotiation Demo")
    
    st.divider()
    
    # 탭 생성
    tab1, tab2, tab3 = st.tabs(["📊 공동구매 현황", "🤝 실시간 협상", "📈 경제적 임팩트"])
    
    # Tab 1: 공동구매 현황
    with tab1:
        st.subheader("📦 진행 중인 공동구매")
        st.info("💡 **Tip**: 참여하기 버튼을 누르면 실시간으로 가격이 재계산됩니다!")
        
        for item_name, item_info in st.session_state.items.items():
            with st.expander(
                f"📦 {item_name} (현재 {item_info['current']}/{item_info['goal']}명 참여중)", 
                expanded=True
            ):
                col1, col2, col3 = st.columns([2, 2, 1])
                
                # 협상된 가격 계산
                supply_agent = st.session_state.agents[item_info['agent_id']]
                negotiated_price, details = st.session_state.engine.negotiate_price(
                    base_price=item_info['base_price'],
                    current_quantity=item_info['current'],
                    target_goal=item_info['goal'],
                    demand_agent=st.session_state.agents['demand'],
                    supply_agent=supply_agent
                )
                
                # 업데이트
                item_info['negotiated_price'] = negotiated_price
                
                with col1:
                    st.metric(
                        "현재 협상가",
                        f"₩{negotiated_price:,}",
                        f"-₩{details['savings']:,} ({details['total_discount_rate']}%)",
                        delta_color="inverse"
                    )
                    progress = details['progress'] / 100
                    st.progress(progress)
                    st.caption(f"진행률: {details['progress']}% (목표: {item_info['goal']}{item_info['unit']})")
                
                with col2:
                    st.write("**에이전트 협상 로그**")
                    if details['progress'] >= 70:
                        st.success(f"✅ 에이전트가 '{item_info['supplier']}'와 대량 구매 조건으로 {details['negotiation_bonus_rate']}% 추가 할인을 협상했습니다!")
                    elif details['progress'] >= 50:
                        st.info(f"🔍 현재 {details['base_discount_rate']}% 할인 중. 인원이 더 모이면 가격이 한 단계 더 내려갑니다.")
                    else:
                        st.warning(f"⏳ 현재 {item_info['current']}명 참여. 목표까지 {item_info['goal'] - item_info['current']}명 더 필요합니다.")
                    
                    st.caption(f"공급사: {item_info['supplier']} (신뢰도: {supply_agent.self_status_info['spirit_score']:.1f}/5.0)")
                
                with col3:
                    if st.button("참여하기", key=f"join_{item_name}"):
                        item_info['current'] += 1
                        st.success("참여 완료!")
                        st.balloons()
                        st.rerun()
                    
                    if st.button("협상 보기", key=f"view_{item_name}"):
                        st.session_state.selected_item = item_name
                        st.rerun()
    
    # Tab 2: 실시간 협상
    with tab2:
        st.subheader("🤝 에이전트 간 실시간 협상 프로세스")
        
        if st.session_state.selected_item:
            item_name = st.session_state.selected_item
            item_info = st.session_state.items[item_name]
            
            st.info(f"**{item_name}** 협상 프로세스를 시뮬레이션합니다...")
            
            # 협상 정보
            supply_agent = st.session_state.agents[item_info['agent_id']]
            negotiated_price = item_info.get('negotiated_price', item_info['base_price'])
            
            # 협상 대화 생성
            dialogues = st.session_state.engine.generate_negotiation_dialogue(
                item_name=item_name,
                base_price=item_info['base_price'],
                current_quantity=item_info['current'],
                target_goal=item_info['goal'],
                negotiated_price=negotiated_price,
                demand_agent=st.session_state.agents['demand'],
                supply_agent=supply_agent
            )
            
            # 대화 표시
            chat_container = st.container(border=True)
            
            with chat_container:
                for i, dialogue in enumerate(dialogues):
                    if dialogue['speaker'] == 'demand':
                        with st.chat_message("assistant", avatar=dialogue['avatar']):
                            st.write(f"**{dialogue['agent_name']}**")
                            st.write(dialogue['message'])
                    elif dialogue['speaker'] == 'supply':
                        with st.chat_message("user", avatar=dialogue['avatar']):
                            st.write(f"**{dialogue['agent_name']}**")
                            st.write(dialogue['message'])
                    else:  # system
                        with st.chat_message("ai", avatar=dialogue['avatar']):
                            st.write(dialogue['message'])
                    
                    # 애니메이션 효과
                    if i < len(dialogues) - 1:
                        time.sleep(0.3)
            
            # 협상 상세
            st.divider()
            col1, col2, col3 = st.columns(3)
            
            _, details = st.session_state.engine.negotiate_price(
                base_price=item_info['base_price'],
                current_quantity=item_info['current'],
                target_goal=item_info['goal'],
                demand_agent=st.session_state.agents['demand'],
                supply_agent=supply_agent
            )
            
            with col1:
                st.metric("기본 할인", f"{details['base_discount_rate']}%")
            with col2:
                st.metric("협상 보너스", f"{details['negotiation_bonus_rate']}%")
            with col3:
                st.metric("총 할인율", f"{details['total_discount_rate']}%")
        else:
            st.info("👆 위에서 '협상 보기' 버튼을 눌러 협상 과정을 확인하세요!")
    
    # Tab 3: 경제적 임팩트
    with tab3:
        st.subheader("💰 경제적 임팩트 분석")
        
        # 전체 임팩트 계산
        impact = st.session_state.engine.calculate_total_impact(
            st.session_state.items,
            st.session_state.agents
        )
        
        # 주요 지표
        col1, col2, col3 = st.columns(3)
        
        col1.metric(
            "주민 총 절감액",
            f"₩{impact['total_savings']:,}",
            f"↑ {impact['savings_rate']}%"
        )
        
        col2.metric(
            "Mulberry 운영 수익",
            f"₩{impact['mulberry_revenue']:,}",
            "정산 예정",
            delta_color="normal"
        )
        
        col3.metric(
            "AP2 증명 완료 건수",
            f"{impact['total_transactions']}건",
            "Verified",
            delta_color="off"
        )
        
        st.divider()
        
        # 상세 분석
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("💰 비용 분석")
            
            st.write("**원래 총 비용:**")
            st.write(f"₩{impact['total_original']:,}")
            
            st.write("**협상 후 총 비용:**")
            st.write(f"₩{impact['total_negotiated']:,}")
            
            st.write("**총 절감액:**")
            st.write(f"₩{impact['total_savings']:,} ({impact['savings_rate']}%)")
            
            st.divider()
            
            st.write("**수익 배분:**")
            st.write(f"- Mulberry 운영: ₩{impact['mulberry_revenue']:,} (3%)")
            st.write(f"- AP2 수수료: ₩{impact['ap2_fee']:,} (0.5%)")
            st.write(f"- 주민 순혜택: ₩{impact['net_community_benefit']:,}")
        
        with col2:
            st.subheader("🎯 사회적 가치")
            
            households = get_households()
            
            st.metric("참여 가구", f"{len(households)}가구")
            st.metric("평균 절감액/가구", f"₩{impact['avg_savings_per_transaction']:,}")
            st.metric("총 거래 건수", f"{impact['total_transactions']}건")
            
            st.divider()
            
            st.write("**Mulberry 모델의 차별점:**")
            st.success("✅ 광고비 제로 - 마케팅 비용이 가격 할인으로 전환")
            st.success("✅ AI 협상 - 24시간 자동으로 최적가 협상")
            st.success("✅ 투명성 - AP2 블록체인으로 모든 거래 검증")
            st.success("✅ 상생 - 지역 경제 활성화 + 주민 복지 향상")

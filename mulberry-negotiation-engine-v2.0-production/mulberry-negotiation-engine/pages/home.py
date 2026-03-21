"""
🏠 홈 페이지
Mulberry Community Control Center
"""

import streamlit as st


def render_home_page():
    """홈 페이지 렌더링"""
    
    st.title("🌾 Mulberry Community Control Center")
    st.markdown("**식품사막화 제로 프로젝트 - 통합 관제 시스템**")
    
    st.divider()
    
    # 공지사항
    st.info("📢 **공지 사항** | 회의장소 : 장승배기 | 커피타임 : 풍풍소")
    
    st.divider()
    
    # 시스템 개요
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🎯 시스템 개요")
        st.write("""
        Mulberry Community Control Center는 식품사막화 해결을 위한
        AI 기반 통합 관제 시스템입니다.
        
        **주요 기능:**
        - 🤝 에이전트 협상 엔진
        - 📊 Field Monitoring
        - 👥 커뮤니티 관리
        - 📧 Email AI
        - 🧠 mHC (Manifold Hyper Connector)
        """)
    
    with col2:
        st.subheader("📊 실시간 현황")
        
        # 간단한 통계 표시
        metric_col1, metric_col2, metric_col3 = st.columns(3)
        
        with metric_col1:
            st.metric("활성 에이전트", "8", "+2")
        
        with metric_col2:
            st.metric("총 거래", "3,247", "+156")
        
        with metric_col3:
            st.metric("성공률", "97.2%", "+1.2%")
    
    st.divider()
    
    # Quick Actions
    st.subheader("⚡ Quick Actions")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if st.button("💬 협상 엔진", use_container_width=True):
            st.session_state.current_page = "협상 엔진"
            st.rerun()
    
    with col2:
        if st.button("📊 Mission Control", use_container_width=True):
            st.session_state.current_page = "Mission Control"
            st.rerun()
    
    with col3:
        if st.button("👥 사용자 관리", use_container_width=True):
            st.session_state.current_page = "사용자 관리"
            st.rerun()
    
    with col4:
        if st.button("🔧 설정", use_container_width=True):
            st.session_state.current_page = "설정"
            st.rerun()
    
    st.divider()
    
    # 최근 활동
    st.subheader("📝 최근 활동")
    
    with st.container(border=True):
        st.write("🔵 협상 완료: 인제 사과 (5kg) - 28,000원 타결")
        st.caption("5분 전")
        
        st.write("🟢 새 에이전트: 최민수 (기린면) 등록")
        st.caption("15분 전")
        
        st.write("🟡 시스템 업데이트: v1.0.1 배포 완료")
        st.caption("1시간 전")

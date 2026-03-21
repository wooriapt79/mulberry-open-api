"""
🌾 Mulberry Community Control Center
통합 메뉴 시스템 (기존 협상 엔진 유지)

Version: v1.0.2
"""

import streamlit as st

# 페이지 설정
st.set_page_config(
    page_title="Mulberry Control Center",
    page_icon="🌾",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 세션 상태 초기화
if 'current_menu' not in st.session_state:
    st.session_state.current_menu = "협상 엔진"

# ==================== 사이드바 메뉴 ====================

with st.sidebar:
    st.title("🌾 Mulberry")
    st.caption("Community Control Center")
    
    st.divider()
    
    # 공지사항
    st.info("📢 **공지 사항** | 회의장소 : 장승배기 | 커피타임 : 풍풍소")
    
    st.divider()
    
    # 메뉴 선택
    st.subheader("📋 메뉴")
    
    menu_options = [
        "🏠 홈",
        "💬 협상 엔진",
        "📊 Mission Control",
        "👥 사용자 관리",
        "📧 Email AI",
        "🧠 mHC 대시보드",
        "🔧 설정"
    ]
    
    selected = st.radio(
        "메뉴 선택",
        menu_options,
        index=1,  # 협상 엔진이 기본
        label_visibility="collapsed"
    )
    
    # 메뉴 업데이트
    st.session_state.current_menu = selected.split(" ", 1)[1]  # 이모지 제거
    
    st.divider()
    
    # 시스템 정보
    with st.expander("ℹ️ 시스템 정보"):
        st.caption("Version: v1.0.2")
        st.caption("Status: 🟢 Online")
        st.caption("Server: Railway")

# ==================== 메인 콘텐츠 ====================

# 홈
if st.session_state.current_menu == "홈":
    st.title("🏠 Mulberry Community Control Center")
    st.markdown("**식품사막화 제로 프로젝트**")
    
    st.divider()
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("활성 에이전트", "8명", "+2")
    with col2:
        st.metric("총 거래", "3,247건", "+156")
    with col3:
        st.metric("성공률", "97.2%", "+1.2%")
    
    st.divider()
    
    st.subheader("📝 최근 활동")
    st.write("🔵 협상 완료: 인제 사과 (5kg) - 28,000원 타결")
    st.caption("5분 전")
    st.write("🟢 새 에이전트: 최민수 (기린면) 등록")
    st.caption("15분 전")

# 협상 엔진 (기존 코드)
elif st.session_state.current_menu == "협상 엔진":
    # 기존 협상 엔진 코드를 여기에 그대로 포함
    exec(open('app_negotiation_core.py').read())

# Mission Control
elif st.session_state.current_menu == "Mission Control":
    st.title("📊 Mission Control")
    st.markdown("**현장 모니터링 대시보드**")
    
    st.info("🚧 개발 중... 곧 공개됩니다!")
    
    st.divider()
    
    # 임시 통계
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("현장 에이전트", "8명")
    with col2:
        st.metric("실시간 거래", "23건")
    with col3:
        st.metric("모니터링 지역", "5개")

# 사용자 관리
elif st.session_state.current_menu == "사용자 관리":
    st.title("👥 사용자 관리")
    st.markdown("**6단계 권한 시스템**")
    
    st.info("🚧 개발 중... 곧 공개됩니다!")
    
    st.divider()
    
    # 권한 레벨 설명
    st.subheader("권한 레벨")
    st.write("- Level 5: 👑 CEO")
    st.write("- Level 4: 👨‍💻 Core Team")
    st.write("- Level 3: 🤝 Partner")
    st.write("- Level 2: 💰 Investor")
    st.write("- Level 1: 👥 Community")
    st.write("- Level 0: 🌍 Public")

# Email AI
elif st.session_state.current_menu == "Email AI":
    st.title("📧 Email AI")
    st.markdown("**AI 기반 이메일 관리**")
    
    st.info("🚧 개발 중... 곧 공개됩니다!")
    
    st.divider()
    
    st.subheader("주요 기능")
    st.write("✅ 자동 분류")
    st.write("✅ 우선순위 설정")
    st.write("✅ 답변 제안")
    st.write("✅ 일정 추출")

# mHC 대시보드
elif st.session_state.current_menu == "mHC 대시보드":
    st.title("🧠 mHC (Manifold Hyper Connector)")
    st.markdown("**AI 중심 통합 허브**")
    
    st.info("🚧 개발 중... 곧 공개됩니다!")
    
    st.divider()
    
    st.subheader("시스템 연결 상태")
    
    col1, col2 = st.columns(2)
    with col1:
        st.write("🟢 현장 모니터링")
        st.write("🟢 채팅 시스템")
        st.write("🟢 Email AI")
    with col2:
        st.write("🟢 GitHub 연동")
        st.write("🟢 Railway 배포")
        st.write("🟢 MongoDB")

# 설정
elif st.session_state.current_menu == "설정":
    st.title("🔧 설정")
    st.markdown("**시스템 설정**")
    
    st.divider()
    
    st.subheader("일반 설정")
    theme = st.selectbox("테마", ["Light", "Dark", "Auto"])
    language = st.selectbox("언어", ["한국어", "English"])
    
    st.divider()
    
    st.subheader("알림 설정")
    email_notif = st.checkbox("이메일 알림", value=True)
    push_notif = st.checkbox("푸시 알림", value=True)
    
    st.divider()
    
    if st.button("저장", type="primary"):
        st.success("✅ 설정이 저장되었습니다!")

# ==================== 푸터 ====================

st.divider()

col1, col2, col3 = st.columns(3)
with col1:
    st.caption("🌾 Mulberry Project 2026")
with col2:
    st.caption("CEO: re.eul | CTO: Koda")
with col3:
    st.caption("Version: v1.0.2")

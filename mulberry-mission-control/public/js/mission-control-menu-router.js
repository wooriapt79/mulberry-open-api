/**
 * Mission Control 모듈별 메뉴 매칭 시스템
 * 
 * 전체 기능 모듈을 메뉴로 구성
 * 해시 라우팅 지원
 * 
 * @author CTO Koda
 * @date 2026-04-05
 */

// ==================== 모듈 정의 ====================

const MissionControlModules = {
  // 1. Mission Health Check (메인 대시보드)
  mhc: {
    id: 'mhc',
    name: 'Mission Control',
    icon: '🎯',
    description: 'MCCC 통합 모니터링 대시보드',
    route: '#mhc',
    sections: [
      { id: 'overview', name: 'Overview', icon: '📊' },
      { id: 'region-map', name: 'Region Map', icon: '🗺️' },
      { id: 'module-status', name: 'Module Status', icon: '⚙️' },
      { id: 'live-feed', name: 'Live Feed', icon: '📡' },
      { id: 'agent-team', name: 'Agent Team', icon: '👥' },
      { id: 'trust-events', name: 'Trust & Events', icon: '🔒' }
    ]
  },

  // 2. Agent 생성 및 관리
  agents: {
    id: 'agents',
    name: 'AI Agents',
    icon: '🤖',
    description: 'Agent 생성, 관리, 모니터링',
    route: '#agents',
    sections: [
      { id: 'create', name: 'Agent 생성', icon: '➕' },
      { id: 'list', name: 'Agent 목록', icon: '📋' },
      { id: 'state-life', name: 'State-Life (네이버/카카오)', icon: '📱' },
      { id: 'sr-jr-pairs', name: 'Sr./Jr. 페어', icon: '🤝' },
      { id: 'marrf', name: 'MARRF Logger', icon: '📊' },
      { id: 'statistics', name: '통계', icon: '📈' }
    ]
  },

  // 3. 팀 채팅
  chat: {
    id: 'chat',
    name: 'Team Chat',
    icon: '💬',
    description: '팀 단체 채팅 및 회의',
    route: '#chat',
    sections: [
      { id: 'channels', name: '채널 목록', icon: '📁' },
      { id: 'messages', name: '메시지', icon: '✉️' },
      { id: 'meetings', name: '회의실', icon: '🎥' },
      { id: 'settings', name: '설정', icon: '⚙️' }
    ]
  },

  // 4. Skill Bank
  skills: {
    id: 'skills',
    name: 'Skill Bank',
    icon: '💡',
    description: '스킬 관리 및 배포',
    route: '#skills',
    sections: [
      { id: 'catalog', name: '스킬 카탈로그', icon: '📚' },
      { id: 'upload', name: '스킬 업로드', icon: '📤' },
      { id: 'deploy', name: '배포 관리', icon: '🚀' },
      { id: 'analytics', name: '사용 분석', icon: '📊' }
    ]
  },

  // 5. 공동구매
  coopbuy: {
    id: 'coopbuy',
    name: 'Co-op Buy',
    icon: '🛒',
    description: '공동구매 관리',
    route: '#coopbuy',
    sections: [
      { id: 'active', name: '진행 중', icon: '🔄' },
      { id: 'create', name: '공구 생성', icon: '➕' },
      { id: 'history', name: '이력', icon: '📜' },
      { id: 'settlements', name: '정산', icon: '💰' }
    ]
  },

  // 6. Field Operations
  field: {
    id: 'field',
    name: 'Field Ops',
    icon: '🌾',
    description: '현장 운영 모니터링',
    route: '#field',
    sections: [
      { id: 'devices', name: '라즈베리파이', icon: '🖥️' },
      { id: 'orders', name: '주문 처리', icon: '📦' },
      { id: 'regions', name: '지역별 현황', icon: '🗺️' },
      { id: 'alerts', name: '긴급 알림', icon: '🚨' }
    ]
  },

  // 7. Analytics & Reports
  analytics: {
    id: 'analytics',
    name: 'Analytics',
    icon: '📈',
    description: '통계 및 리포트',
    route: '#analytics',
    sections: [
      { id: 'dashboard', name: '대시보드', icon: '📊' },
      { id: 'revenue', name: '수익 분석', icon: '💵' },
      { id: 'agents', name: 'Agent 성과', icon: '🤖' },
      { id: 'users', name: '사용자 현황', icon: '👥' }
    ]
  },

  // 8. Settings
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    description: '시스템 설정',
    route: '#settings',
    sections: [
      { id: 'profile', name: '프로필', icon: '👤' },
      { id: 'notifications', name: '알림', icon: '🔔' },
      { id: 'api', name: 'API Keys', icon: '🔑' },
      { id: 'billing', name: '과금', icon: '💳' }
    ]
  }
};

// ==================== 네비게이션 렌더링 ====================

function renderMainNavigation() {
  const nav = document.getElementById('main-navigation');
  if (!nav) return;

  const modules = Object.values(MissionControlModules);
  
  const navHTML = modules.map(module => `
    <a href="${module.route}" 
       class="nav-item ${isCurrentModule(module.id) ? 'active' : ''}"
       data-module="${module.id}"
       title="${module.description}">
      <span class="nav-icon">${module.icon}</span>
      <span class="nav-label">${module.name}</span>
    </a>
  `).join('');

  nav.innerHTML = navHTML;
}

function renderSubNavigation(moduleId) {
  const subNav = document.getElementById('sub-navigation');
  if (!subNav) return;

  const module = MissionControlModules[moduleId];
  if (!module || !module.sections) {
    subNav.innerHTML = '';
    return;
  }

  const sectionsHTML = module.sections.map(section => `
    <a href="${module.route}/${section.id}"
       class="sub-nav-item ${isCurrentSection(section.id) ? 'active' : ''}"
       data-section="${section.id}">
      <span class="section-icon">${section.icon}</span>
      <span class="section-label">${section.name}</span>
    </a>
  `).join('');

  subNav.innerHTML = sectionsHTML;
}

// ==================== 라우팅 ====================

function initializeRouter() {
  // 현재 해시에서 모듈 추출
  const hash = window.location.hash || '#mhc';
  const [modulePath, sectionPath] = hash.substring(1).split('/');
  
  // 모듈 전환
  switchModule(modulePath);
  
  // 섹션 전환 (있는 경우)
  if (sectionPath) {
    switchSection(modulePath, sectionPath);
  }
}

function switchModule(moduleId) {
  const module = MissionControlModules[moduleId];
  if (!module) {
    console.error('Module not found:', moduleId);
    return;
  }

  // 모든 모듈 숨기기
  document.querySelectorAll('.module-container').forEach(el => {
    el.classList.remove('active');
  });

  // 현재 모듈 표시
  const moduleContainer = document.getElementById(`module-${moduleId}`);
  if (moduleContainer) {
    moduleContainer.classList.add('active');
  }

  // 서브 네비게이션 업데이트
  renderSubNavigation(moduleId);

  // 페이지 타이틀 업데이트
  document.title = `${module.name} - Mulberry Mission Control`;

  console.log(`✅ Switched to module: ${module.name}`);
}

function switchSection(moduleId, sectionId) {
  const module = MissionControlModules[moduleId];
  if (!module) return;

  const section = module.sections.find(s => s.id === sectionId);
  if (!section) return;

  // 모든 섹션 숨기기
  document.querySelectorAll('.section-container').forEach(el => {
    el.classList.remove('active');
  });

  // 현재 섹션 표시
  const sectionContainer = document.getElementById(`section-${moduleId}-${sectionId}`);
  if (sectionContainer) {
    sectionContainer.classList.add('active');
  }

  console.log(`✅ Switched to section: ${section.name}`);
}

// ==================== Helper Functions ====================

function isCurrentModule(moduleId) {
  const hash = window.location.hash || '#mhc';
  const currentModule = hash.substring(1).split('/')[0];
  return currentModule === moduleId;
}

function isCurrentSection(sectionId) {
  const hash = window.location.hash || '';
  const currentSection = hash.split('/')[1];
  return currentSection === sectionId;
}

function navigateTo(moduleId, sectionId = null) {
  const route = sectionId 
    ? `#${moduleId}/${sectionId}`
    : `#${moduleId}`;
  
  window.location.hash = route;
}

// ==================== 이벤트 리스너 ====================

// Initialize on DOMContentLoaded or immediately if DOM is ready
function initializeApp() {
  console.log('🚀 Initializing Mission Control Router...');
  renderMainNavigation();
  initializeRouter();
  console.log('✅ Router initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready, initialize immediately
  initializeApp();
}

// Also listen for hash changes
window.addEventListener('hashchange', () => {
  initializeRouter();
});

// ==================== 모바일 메뉴 토글 ====================

function toggleMobileMenu() {
  const nav = document.getElementById('main-navigation');
  if (nav) {
    nav.classList.toggle('mobile-open');
  }
}

// ==================== 빠른 모듈 전환 단축키 ====================

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + 숫자 (1~8) → 모듈 전환
  if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '8') {
    e.preventDefault();
    const moduleIndex = parseInt(e.key) - 1;
    const modules = Object.keys(MissionControlModules);
    if (modules[moduleIndex]) {
      navigateTo(modules[moduleIndex]);
    }
  }
});

// ==================== Export ====================

window.MissionControl = {
  modules: MissionControlModules,
  navigateTo,
  switchModule,
  switchSection,
  toggleMobileMenu
};

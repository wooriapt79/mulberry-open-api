/**
 * Mission Control Menu Router — FINAL VERSION
 *
 * Base: CTO Koda (2026-04-19 v2.0)
 * Refactored by: Operation Manager Nguyen Trang (2026-04-19)
 *
 * ✅ 핵심 개선사항 (Trang Refactoring):
 *   1. window.skillBank / window.teamChat 기존 인스턴스 재활용
 *      → 중복 초기화 완전 방지 (Koda 버전의 잠재적 이중 init 문제 해결)
 *   2. 모듈 네비게이션 시 re-render 트리거
 *      → 숨겨진 상태에서도 렌더링 보장
 *   3. waitForGlobal() 헬퍼: 비동기 스크립트 로딩 경쟁 조건 방지
 *   4. MissionControlAPI 초기화 연동 개선
 *   5. 전체 에러 핸들링 강화
 *
 * @author CTO Koda (base) + Trang Manager (refactoring)
 * @date 2026-04-19
 * @version 3.0 (Final)
 */

// ==================== 모듈 인스턴스 (전역 참조) ====================
let moduleInstances = {
  skillBank: null,
  teamChat: null,
  agentDashboard: null,
  missionControl: null,
  decisionStream: null,
  monitorDashboard: null,
  searchUI: null
};

// ==================== 모듈 상태 ====================
let moduleStates = {
  skillBank: 'uninitialized',   // uninitialized | initialized | error
  teamChat: 'uninitialized',
  agentDashboard: 'uninitialized',
  missionControl: 'uninitialized',
  decisionStream: 'uninitialized',
  monitorDashboard: 'uninitialized',
  searchUI: 'uninitialized'
};

// ==================== 유틸: 전역 객체 대기 ====================
/**
 * 전역 변수가 정의될 때까지 대기 (비동기 스크립트 로딩 대응)
 * @param {string} globalName - window[globalName] 키
 * @param {number} maxWait - 최대 대기 시간 (ms)
 */
function waitForGlobal(globalName, maxWait = 3000) {
  return new Promise((resolve, reject) => {
    if (window[globalName]) {
      resolve(window[globalName]);
      return;
    }
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      if (window[globalName]) {
        clearInterval(timer);
        resolve(window[globalName]);
      } else {
        elapsed += interval;
        if (elapsed >= maxWait) {
          clearInterval(timer);
          reject(new Error(`${globalName} not available after ${maxWait}ms`));
        }
      }
    }, interval);
  });
}

// ==================== Mission Control Router ====================
class MissionControlRouter {
  constructor() {
    this.currentModule = null;
    this.currentSection = null;
    this.initialized = false;
  }

  /**
   * 라우터 초기화
   */
  init() {
    if (this.initialized) {
      console.warn('Router already initialized');
      return;
    }

    console.log('🚀 Initializing Mission Control Router v3.0...');

    // Hash 변경 이벤트
    window.addEventListener('hashchange', () => this.handleRoute());

    // 초기 라우트 처리
    this.handleRoute();

    this.initialized = true;
    console.log('✅ Mission Control Router v3.0 initialized');
  }

  /**
   * 라우트 처리
   */
  handleRoute() {
    const hash = window.location.hash.slice(1) || 'mhc/overview';
    const [module, section] = hash.split('/');

    console.log(`📍 Route: ${module}/${section || 'default'}`);
    this.showModule(module, section);
  }

  /**
   * 모듈 표시 및 초기화
   */
  async showModule(moduleName, section = null) {
    this.hideAllModules();

    switch (moduleName) {
      case 'mhc':
        this.showMissionHealthCheck(section);
        break;
      case 'agents':
        await this.showAgentDashboard(section);
        break;
      case 'chat':
        await this.showTeamChat(section);
        break;
      case 'skills':
        await this.showSkillBank(section);
        break;
      case 'coopbuy':
        this.showCoopBuy(section);
        break;
      case 'field':
        this.showFieldOps(section);
        break;
      case 'analytics':
        this.showAnalytics(section);
        break;
      case 'settings':
        this.showSettings(section);
        break;
      case 'decision':
        this.showDecisionStream(section);
        break;
      case 'search':
        this.showSearchModule(section);
        break;
      case 'monitor':
        this.showMonitorDashboard(section);
        break;
      case 'luna-channel':
        this.showLunaChannel();
        break;
      default:
        console.warn(`Unknown module: ${moduleName}, fallback to mhc/overview`);
        this.showMissionHealthCheck('overview');
    }

    this.currentModule = moduleName;
    this.currentSection = section;
  }

  /**
   * 모든 모듈 숨기기
   */
  hideAllModules() {
    document.querySelectorAll('.module-container').forEach(m => {
      m.style.display = 'none';
    });
  }

  // ==================== Mission Health Check ====================

  showMissionHealthCheck(section) {
    const container = document.getElementById('module-mhc');
    if (!container) return;
    container.style.display = 'block';

    if (section) this.showSection('mhc', section);

    if (moduleStates.missionControl === 'uninitialized') {
      this.initMissionControl();
    } else if (moduleStates.missionControl === 'initialized' && moduleInstances.missionControl) {
      // 이미 초기화된 경우 새로고침
      try {
        if (typeof moduleInstances.missionControl.refresh === 'function') {
          moduleInstances.missionControl.refresh();
        }
      } catch (e) { /* silent */ }
    }
  }

  initMissionControl() {
    console.log('🎯 Initializing Mission Control...');

    if (window.missionControlAPI) {
      // 이미 존재하는 전역 인스턴스 재활용 (Trang 개선)
      moduleInstances.missionControl = window.missionControlAPI;
      moduleStates.missionControl = 'initialized';
      console.log('✅ Mission Control: reused existing window.missionControlAPI');
      return;
    }

    if (typeof MissionControlAPI !== 'undefined') {
      try {
        moduleInstances.missionControl = new MissionControlAPI();
        moduleInstances.missionControl.init();
        moduleStates.missionControl = 'initialized';
        console.log('✅ Mission Control initialized');
      } catch (error) {
        console.error('❌ Mission Control initialization failed:', error);
        moduleStates.missionControl = 'error';
      }
    } else {
      console.warn('⚠️ MissionControlAPI not found');
    }
  }

  // ==================== Agent Dashboard ====================

  async showAgentDashboard(section) {
    const container = document.getElementById('module-agents');
    if (!container) return;
    container.style.display = 'block';

    if (section) this.showSection('agents', section);

    if (moduleStates.agentDashboard === 'uninitialized') {
      await this.initAgentDashboard();
    } else if (moduleStates.agentDashboard === 'initialized') {
      // 재방문 시 상태 업데이트 (Trang 개선)
      try {
        if (window.AgentDashboard && typeof window.AgentDashboard.updateAgentStatuses === 'function') {
          window.AgentDashboard.updateAgentStatuses();
        }
      } catch (e) { /* silent */ }
    }
  }

  async initAgentDashboard() {
    console.log('🤖 Initializing Agent Dashboard...');

    try {
      // AgentDashboard는 전역 객체 (window.AgentDashboard)로 정의됨
      // agent-dashboard.js 참조: window.AgentDashboard = { renderAgentTeamCard, updateAgentStatuses }
      const dashboard = await waitForGlobal('AgentDashboard', 2000).catch(() => null);

      if (dashboard) {
        moduleInstances.agentDashboard = dashboard;
        dashboard.renderAgentTeamCard();
        dashboard.updateAgentStatuses();
        moduleStates.agentDashboard = 'initialized';
        console.log('✅ Agent Dashboard initialized');
      } else {
        console.warn('⚠️ AgentDashboard not found after wait');
        moduleStates.agentDashboard = 'error';
      }
    } catch (error) {
      console.error('❌ Agent Dashboard initialization failed:', error);
      moduleStates.agentDashboard = 'error';
    }
  }

  // ==================== Team Chat ====================

  async showTeamChat(section) {
    const container = document.getElementById('module-chat');
    if (!container) return;
    container.style.display = 'block';

    if (moduleStates.teamChat === 'uninitialized') {
      await this.initTeamChat();
    } else if (moduleStates.teamChat === 'initialized' && moduleInstances.teamChat) {
      try {
        if (typeof moduleInstances.teamChat.loadChannels === 'function') {
          await moduleInstances.teamChat.loadChannels();
        }
      } catch (e) { /* silent */ }
    }

    // Issue #36: 서브메뉴 섹션 전환
    this._showChatSection(section || 'messages');

    // Issue #59: 채널명이 전달된 경우 ChatUI 채널 전환
    const CHAT_CHANNEL_NAMES = ['general', 'dev', 'research'];
    if (section && CHAT_CHANNEL_NAMES.includes(section) && moduleInstances.teamChat) {
      try {
        if (typeof moduleInstances.teamChat._switchChannel === 'function') {
          moduleInstances.teamChat._switchChannel(section);
        }
      } catch (e) { /* silent */ }
    }
  }

  _showChatSection(section) {
    // channels / messages → 실제 채팅 UI 표시
    // settings           → 설정 패널 표시 (Issue #61)
    // rooms              → 준비 중 패널 표시
    const chatMain        = document.getElementById('chat-section-main');
    const chatPlaceholder = document.getElementById('chat-section-placeholder');
    const chatSettings    = document.getElementById('chat-section-settings');
    const placeholderTitle = document.getElementById('chat-placeholder-title');

    // 모두 숨기고 필요한 것만 표시
    if (chatMain)        chatMain.style.display        = 'none';
    if (chatPlaceholder) chatPlaceholder.style.display  = 'none';
    if (chatSettings)    chatSettings.style.display     = 'none';

    if (section === 'settings') {
      if (chatSettings) {
        chatSettings.style.display = 'flex';
        this._initChatSettings();
      }
    } else if (section === 'rooms') {
      if (chatPlaceholder) {
        chatPlaceholder.style.display = 'flex';
        if (placeholderTitle) placeholderTitle.textContent = '🎥 회의실 — 준비 중';
      }
    } else {
      // channels / messages / general / dev / research / default → 채팅 UI
      if (chatMain) chatMain.style.display = 'flex';
    }
  }

  _initChatSettings() {
    // 저장된 설정 로드
    const load = (key, def) => {
      const v = localStorage.getItem('chat_' + key);
      return v === null ? def : v === 'true';
    };
    const el = (id) => document.getElementById(id);

    if (el('cs-notifications')) el('cs-notifications').checked = load('notifications', true);
    if (el('cs-sounds'))        el('cs-sounds').checked        = load('sounds', true);
    if (el('cs-compact'))       el('cs-compact').checked       = load('compact', false);
    if (el('cs-timestamps'))    el('cs-timestamps').checked    = load('timestamps', true);
    if (el('cs-sysmsg'))        el('cs-sysmsg').checked        = load('sysmsg', true);
    if (el('cs-enter-send'))    el('cs-enter-send').checked    = load('enterSend', true);

    const maxlen = localStorage.getItem('chat_maxlen') || '1000';
    if (el('cs-maxlen')) el('cs-maxlen').value = maxlen;

    // DB 상태 표시
    this._checkChatDbStatus();

    // 저장 버튼
    const saveBtn = el('cs-save-btn');
    if (saveBtn && !saveBtn._bound) {
      saveBtn._bound = true;
      saveBtn.addEventListener('click', () => this._saveChatSettings());
    }
  }

  _saveChatSettings() {
    const el = (id) => document.getElementById(id);
    const save = (key, val) => localStorage.setItem('chat_' + key, val);

    save('notifications', el('cs-notifications')?.checked ?? true);
    save('sounds',        el('cs-sounds')?.checked ?? true);
    save('compact',       el('cs-compact')?.checked ?? false);
    save('timestamps',    el('cs-timestamps')?.checked ?? true);
    save('sysmsg',        el('cs-sysmsg')?.checked ?? true);
    save('enterSend',     el('cs-enter-send')?.checked ?? true);
    save('maxlen',        el('cs-maxlen')?.value ?? '1000');

    // 컴팩트 모드 즉시 적용
    const msgs = document.getElementById('chat-messages');
    if (msgs) {
      if (el('cs-compact')?.checked) msgs.classList.add('chat-compact');
      else msgs.classList.remove('chat-compact');
    }

    const btn = el('cs-save-btn');
    if (btn) {
      btn.textContent = '✅ 저장됨';
      setTimeout(() => { btn.textContent = '설정 저장'; }, 1500);
    }
  }

  async _checkChatDbStatus() {
    const dot   = document.getElementById('cs-db-dot');
    const label = document.getElementById('cs-db-label');
    if (!dot || !label) return;
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      const dbOk = d.db === 'connected' || d.mongodb === 'connected' || d.status === 'ok';
      dot.style.background   = dbOk ? '#10b981' : '#f59e0b';
      dot.style.boxShadow    = dbOk ? '0 0 6px #10b981' : 'none';
      label.textContent = dbOk
        ? 'MongoDB 연결됨 — 메시지 영구저장 활성'
        : '인메모리 모드 — MONGODB_URI 설정 필요';
    } catch {
      dot.style.background = '#64748b';
      label.textContent = 'DB 상태 확인 불가';
    }
  }

  async initTeamChat() {
    console.log('💬 Initializing Team Chat...');

    try {
      // team-chat-frontend.js 제거(Issue #32) 이후 window.teamChat은 존재하지 않음
      // ChatUI (chat-ui.js) 를 직접 사용
      if (typeof ChatUI !== 'undefined') {
        moduleInstances.teamChat = new ChatUI();
        moduleInstances.teamChat.init();
        moduleStates.teamChat = 'initialized';
        console.log('✅ Team Chat initialized (ChatUI)');
        return;
      }

      console.warn('⚠️ ChatUI class not found');
      moduleStates.teamChat = 'error';
      this._showErrorState('message-list', () => this.initTeamChat());

    } catch (error) {
      console.error('❌ Team Chat initialization failed:', error);
      moduleStates.teamChat = 'error';
      this._showErrorState('message-list', () => this.initTeamChat());
    }
  }

  // ==================== Skill Bank ====================

  async showSkillBank(section) {
    const container = document.getElementById('module-skills');
    if (!container) return;
    container.style.display = 'block';

    if (section) this.showSection('skills', section);

    if (moduleStates.skillBank === 'uninitialized') {
      await this.initSkillBank();
    } else if (moduleStates.skillBank === 'initialized' && moduleInstances.skillBank) {
      // 재방문 시 카탈로그 재렌더링 (Trang 개선)
      try {
        if (typeof moduleInstances.skillBank.renderSkillCatalog === 'function') {
          moduleInstances.skillBank.renderSkillCatalog();
        }
        if (typeof moduleInstances.skillBank.renderCategoryFilter === 'function') {
          moduleInstances.skillBank.renderCategoryFilter();
        }
      } catch (e) { /* silent */ }
    }
  }

  async initSkillBank() {
    console.log('💡 Initializing Skill Bank...');

    try {
      // ✅ Trang 핵심 개선: window.skillBank 기존 인스턴스 재활용
      // skill-bank-frontend.js가 DOMContentLoaded 시 이미 초기화함
      const existingInstance = await waitForGlobal('skillBank', 2000).catch(() => null);

      if (existingInstance) {
        moduleInstances.skillBank = existingInstance;
        moduleStates.skillBank = 'initialized';
        console.log('✅ Skill Bank: reused existing window.skillBank instance');

        // 렌더링 보장 (숨겨진 상태에서 init된 경우 재렌더)
        if (typeof existingInstance.renderSkillCatalog === 'function') {
          existingInstance.renderSkillCatalog();
        }
        if (typeof existingInstance.renderCategoryFilter === 'function') {
          existingInstance.renderCategoryFilter();
        }
        return;
      }

      // Fallback: 직접 생성
      if (typeof SkillBank !== 'undefined') {
        moduleInstances.skillBank = new SkillBank();
        await moduleInstances.skillBank.init();
        moduleStates.skillBank = 'initialized';
        console.log('✅ Skill Bank initialized (new instance)');
      } else {
        console.warn('⚠️ SkillBank class not found');
        moduleStates.skillBank = 'error';
        this._showErrorState('skill-catalog', () => this.initSkillBank());
      }

    } catch (error) {
      console.error('❌ Skill Bank initialization failed:', error);
      moduleStates.skillBank = 'error';
      this._showErrorState('skill-catalog', () => this.initSkillBank());
    }
  }

  // ==================== 기타 모듈 ====================

  showCoopBuy(section) {
    const container = document.getElementById('module-coopbuy');
    if (!container) return;
    container.style.display = 'block';
    if (section) this.showSection('coopbuy', section);
  }

  showFieldOps(section) {
    const container = document.getElementById('module-field');
    if (!container) return;
    container.style.display = 'block';
    if (section) this.showSection('field', section);
  }

  showAnalytics(section) {
    const container = document.getElementById('module-analytics');
    if (!container) return;
    container.style.display = 'block';
    if (section) this.showSection('analytics', section);
  }

  showSettings(section) {
    const container = document.getElementById('module-settings');
    if (!container) return;
    container.style.display = 'block';
    if (section) this.showSection('settings', section);
  }

  // ==================== Decision (실시간 스트림) ====================

  showDecisionStream(section) {
    const container = document.getElementById('module-decision');
    if (!container) return;
    container.style.display = 'block';
    if (section) this.showSection('decision', section);

    if (moduleStates.decisionStream === 'uninitialized') {
      this.initDecisionStream();
    } else if (moduleStates.decisionStream === 'initialized' && moduleInstances.decisionStream) {
      moduleInstances.decisionStream.refresh();
    }
  }

  initDecisionStream() {
    try {
      if (typeof DecisionStreamUI === 'undefined') {
        console.warn('DecisionStreamUI not loaded');
        return;
      }
      moduleInstances.decisionStream = new DecisionStreamUI();
      moduleInstances.decisionStream.init();
      moduleStates.decisionStream = 'initialized';
    } catch (err) {
      console.error('Decision Stream init failed:', err);
      moduleStates.decisionStream = 'error';
    }
  }

  // ==================== Monitor (독립 대시보드) ====================

  showMonitorDashboard(section) {
    const container = document.getElementById('module-monitor');
    if (!container) return;
    container.style.display = 'block';
    if (section) this.showSection('monitor', section);

    if (moduleStates.monitorDashboard === 'uninitialized') {
      this.initMonitorDashboard();
    } else if (moduleStates.monitorDashboard === 'initialized' && moduleInstances.monitorDashboard) {
      moduleInstances.monitorDashboard.refresh();
    }
  }

  initMonitorDashboard() {
    try {
      if (typeof MonitorDashboard === 'undefined') {
        console.warn('MonitorDashboard not loaded');
        return;
      }
      moduleInstances.monitorDashboard = new MonitorDashboard();
      moduleInstances.monitorDashboard.init();
      moduleStates.monitorDashboard = 'initialized';
    } catch (err) {
      console.error('Monitor Dashboard init failed:', err);
      moduleStates.monitorDashboard = 'error';
    }
  }

  // ==================== Luna Channel (#luna-analysis, Issue #113) ====================

  showLunaChannel() {
    const container = document.getElementById('module-luna-channel');
    if (!container) return;
    container.style.display = 'block';
    // Socket.IO 채널 join (이미 init됐으면 no-op)
    if (window.LunaChannel) LunaChannel.init();
  }

  // ==================== Search (멀티에이전트, DAY5) ====================

  showSearchModule(section) {
    const container = document.getElementById('module-search');
    if (!container) return;
    container.style.display = 'block';
    this.showSection('search', section || 'query');

    if (moduleStates.searchUI === 'uninitialized') {
      this.initSearchUI();
    }
  }

  initSearchUI() {
    try {
      if (typeof SearchUI === 'undefined') {
        console.warn('SearchUI not loaded');
        return;
      }
      moduleInstances.searchUI = new SearchUI();
      moduleInstances.searchUI.init();
      moduleStates.searchUI = 'initialized';
    } catch (err) {
      console.error('Search UI init failed:', err);
      moduleStates.searchUI = 'error';
    }
  }

  // ==================== 섹션 표시 ====================

  showSection(module, section) {
    const sections = document.querySelectorAll(`#module-${module} .section-container`);
    sections.forEach(s => { s.style.display = 'none'; });

    const targetSection = document.getElementById(`section-${module}-${section}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }
  }

  // ==================== 에러 헬퍼 ====================

  _showErrorState(containerId, retryFn) {
    if (typeof emptyStateManager !== 'undefined' && typeof EMPTY_STATE_TYPES !== 'undefined') {
      emptyStateManager.show(containerId, EMPTY_STATE_TYPES.ERROR, retryFn);
    } else {
      // Fallback: 단순 에러 메시지
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div style="text-align:center; padding:40px; color:#f85149;">
            <p>⚠️ 로드 중 오류가 발생했습니다.</p>
            <button onclick="(${retryFn.toString()})()"
                    style="margin-top:12px; padding:8px 16px; background:#238636; color:#fff; border:none; border-radius:6px; cursor:pointer;">
              🔄 다시 시도
            </button>
          </div>`;
      }
    }
  }

  // ==================== 모듈 리셋 ====================

  resetModule(moduleName) {
    if (moduleInstances[moduleName]) {
      moduleInstances[moduleName] = null;
      moduleStates[moduleName] = 'uninitialized';
      console.log(`🔄 ${moduleName} reset`);
    }
  }

  resetAllModules() {
    Object.keys(moduleInstances).forEach(name => this.resetModule(name));
    console.log('🔄 All modules reset');
  }
}

// ==================== 전역 인스턴스 ====================
const missionControlRouter = new MissionControlRouter();

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌿 Mulberry Mission Control System Starting (v3.0)...');
  missionControlRouter.init();
  console.log('✅ Mulberry Mission Control System Ready');
});

// ==================== 전역 Export ====================
window.MissionControlRouter = MissionControlRouter;
window.missionControlRouter = missionControlRouter;
window.moduleInstances = moduleInstances;
window.moduleStates = moduleStates;

// ==================== 모듈 정의 (상단 메뉴 데이터) ====================
// ⚠️ v3.1 패치: 리팩토링 시 누락된 모듈 정의 + 메뉴 렌더링 복원
// Author: Trang Manager (2026-04-29)

const MissionControlModules = {
  mhc: {
    id: 'mhc', name: 'Mission Control', icon: '🎯', group: 'workspace',
    description: 'MCCC 통합 모니터링 대시보드', route: '#mhc',
    sections: [
      { id: 'overview', name: 'Overview', icon: '📊' },
      { id: 'region-map', name: 'Region Map', icon: '🗺️' },
      { id: 'module-status', name: 'Module Status', icon: '⚙️' },
      { id: 'live-feed', name: 'Live Feed', icon: '📡' },
      { id: 'agent-team', name: 'Agent Team', icon: '👥' },
      { id: 'trust-events', name: 'Trust & Events', icon: '🔒' }
    ]
  },
  agents: {
    id: 'agents', name: 'AI Agents', icon: '🤖', group: 'workspace',
    description: 'Agent 생성, 관리, 모니터링', route: '#agents',
    sections: [
      { id: 'create', name: 'Agent 생성', icon: '➕' },
      { id: 'list', name: 'Agent 목록', icon: '📋' },
      { id: 'state-life', name: 'State-Life', icon: '📱' },
      { id: 'sr-jr-pairs', name: 'Sr./Jr. 페어', icon: '🤝' },
      { id: 'marrf', name: 'MARRF Logger', icon: '📊' },
      { id: 'statistics', name: '통계', icon: '📈' }
    ]
  },
  chat: {
    id: 'chat', name: 'Team Chat', icon: '💬', group: 'chat',
    description: '팀 단체 채팅 및 회의', route: '#chat',
    sections: [
      { id: 'channels', name: '채널 목록', icon: '📁' },
      { id: 'messages', name: '메시지', icon: '✉️' },
      { id: 'meetings', name: '회의실', icon: '🎥' },
      { id: 'settings', name: '설정', icon: '⚙️' }
    ]
  },
  skills: {
    id: 'skills', name: 'Skill Bank', icon: '💡', group: 'workspace',
    description: '스킬 관리 및 배포', route: '#skills',
    sections: [
      { id: 'catalog', name: '스킬 카탈로그', icon: '📚' },
      { id: 'upload', name: '스킬 업로드', icon: '📤' },
      { id: 'deploy', name: '배포 관리', icon: '🚀' },
      { id: 'analytics', name: '사용 분석', icon: '📊' }
    ]
  },
  coopbuy: {
    id: 'coopbuy', name: '공동구매', icon: '🛒', group: 'workspace',
    description: '공동구매 관리 및 모니터링', route: '#coopbuy',
    sections: [
      { id: 'active', name: '진행 중', icon: '🔴' },
      { id: 'planning', name: '기획 중', icon: '📝' },
      { id: 'completed', name: '완료', icon: '✅' },
      { id: 'analytics', name: '분석', icon: '📊' }
    ]
  },
  // Issue #109: Analyze 드롭다운 — 현장 운영 + 분석 + 모니터링 통합
  analyze: {
    id: 'analyze', name: 'Analyze', icon: '📊', group: 'workspace',
    type: 'dropdown',
    description: '현장 운영 · 분석 · 모니터링',
    children: ['field', 'analytics', 'monitor', 'luna-channel'],
    route: '#field',
  },
  // analyze-child: 직접 nav에 표시하지 않고 Analyze 드롭다운 하위에만 노출
  field: {
    id: 'field', name: '현장 운영', icon: '🚛', group: 'analyze-child',
    description: '현장 거점 및 배달 관리', route: '#field',
    sections: [
      { id: 'map', name: '거점 지도', icon: '🗺️' },
      { id: 'staff', name: '거점 직원', icon: '👷' },
      { id: 'delivery', name: '배달 현황', icon: '📦' },
      { id: 'emergency', name: '긴급 공급', icon: '🚨' }
    ]
  },
  analytics: {
    id: 'analytics', name: '분석', icon: '📈', group: 'analyze-child',
    description: '데이터 분석 및 리포트', route: '#analytics',
    sections: [
      { id: 'kpi', name: 'KPI', icon: '🎯' },
      { id: 'region', name: '지역별', icon: '🗺️' },
      { id: 'agent', name: 'Agent 성과', icon: '🤖' },
      { id: 'trend', name: '트렌드', icon: '📊' }
    ]
  },
  monitor: {
    id: 'monitor', name: '모니터링', icon: '📊', group: 'analyze-child',
    description: '시스템 KPI 모니터링 대시보드', route: '#monitor',
    sections: [
      { id: 'overview', name: 'Overview', icon: '📈' }
    ]
  },
  'luna-channel': {
    id: 'luna-channel', name: 'Luna 채널', icon: '🌙', group: 'analyze-child',
    description: '#luna-analysis 실시간 분석 채널', route: '#luna-channel',
    sections: []
  },
  decision: {
    id: 'decision', name: 'Decision', icon: '⚖️', group: 'workspace',
    description: 'Steward Decision Engine 실시간 라우팅 결정 스트림', route: '#decision',
    sections: [
      { id: 'stream', name: 'Live Stream', icon: '📡' }
    ]
  },
  search: {
    id: 'search', name: 'Search', icon: '🔍', group: 'workspace',
    description: '멀티에이전트 검색 — 10개 도메인 전문가 병렬 실행', route: '#search',
    sections: [
      { id: 'query', name: '검색', icon: '🔍' }
    ]
  },
  settings: {
    id: 'settings', name: '설정', icon: '⚙️', group: 'workspace',
    description: '시스템 설정 및 관리', route: '#settings',
    sections: [
      { id: 'profile', name: '프로필', icon: '👤' },
      { id: 'notifications', name: '알림', icon: '🔔' },
      { id: 'api', name: 'API Keys', icon: '🔑' },
      { id: 'billing', name: '과금', icon: '💳' }
    ]
  },
};

// ==================== 메뉴 렌더링 ====================

function isCurrentModule(moduleId) {
  const hash = window.location.hash || '#mhc';
  return hash.startsWith('#' + moduleId);
}

function isCurrentSection(sectionId) {
  const hash = window.location.hash || '';
  return hash.includes('/' + sectionId);
}

const NAV_GROUP_LABELS = {
  workspace: 'Steward Workspace',
  chat: 'Team Chat'
};

function renderNavItem(m) {
  return `
    <a href="${m.route}"
       class="nav-item ${isCurrentModule(m.id) ? 'active' : ''}"
       data-module="${m.id}"
       title="${m.description}">
      <span class="nav-icon">${m.icon}</span>
      <span class="nav-label">${m.name}</span>
    </a>
  `;
}

// Issue #109: Analyze 드롭다운 렌더링
function renderNavDropdown(m) {
  const isActive = m.children && m.children.some(childId => isCurrentModule(childId));
  const items = (m.children || []).map(childId => {
    const child = MissionControlModules[childId];
    if (!child) return '';
    return `<a href="${child.route}"
       class="nav-dropdown-item ${isCurrentModule(childId) ? 'active' : ''}"
       data-module="${childId}"
       onclick="document.getElementById('nav-dropdown-${m.id}').style.display='none'">
      <span class="nav-icon">${child.icon}</span>
      <span>${child.name}</span>
    </a>`;
  }).join('');
  return `
    <div class="nav-dropdown-wrapper">
      <button class="nav-item nav-dropdown-btn ${isActive ? 'active' : ''}"
              onclick="toggleNavDropdown('${m.id}')"
              data-module="${m.id}"
              title="${m.description}">
        <span class="nav-icon">${m.icon}</span>
        <span class="nav-label">${m.name}</span>
        <span class="nav-dropdown-caret" id="nav-caret-${m.id}">▼</span>
      </button>
      <div id="nav-dropdown-${m.id}" class="nav-dropdown-menu" style="display:none;">
        ${items}
      </div>
    </div>
  `;
}

// Issue #109: 드롭다운 토글
function toggleNavDropdown(id) {
  const menu = document.getElementById(`nav-dropdown-${id}`);
  const caret = document.getElementById(`nav-caret-${id}`);
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  // 모든 드롭다운 닫기
  document.querySelectorAll('.nav-dropdown-menu').forEach(m => { m.style.display = 'none'; });
  document.querySelectorAll('.nav-dropdown-caret').forEach(c => { c.style.transform = ''; });
  if (!isOpen) {
    menu.style.display = 'block';
    if (caret) caret.style.transform = 'rotate(180deg)';
  }
}

// Issue #109: flat nav — 그룹 없이 | 구분자 스타일로 렌더링
// 순서: Mission Control | AI Agents | Skill Bank | 공동구매 | Analyze | Decision | Search | 설정
const NAV_FLAT_ORDER = ['mhc', 'agents', 'skills', 'coopbuy', 'analyze', 'decision', 'search', 'settings'];

function renderMainNavigation() {
  const nav = document.getElementById('main-navigation');
  if (!nav) return;

  nav.innerHTML = NAV_FLAT_ORDER.map(id => {
    const m = MissionControlModules[id];
    if (!m) return '';
    if (m.type === 'dropdown') return renderNavDropdown(m);
    return renderNavItem(m);
  }).join('');

  // 외부 클릭 시 드롭다운 닫기 (한 번만 등록)
  if (!window._navDropdownOutsideHandler) {
    window._navDropdownOutsideHandler = (e) => {
      if (!e.target.closest('.nav-dropdown-wrapper')) {
        document.querySelectorAll('.nav-dropdown-menu').forEach(m => { m.style.display = 'none'; });
        document.querySelectorAll('.nav-dropdown-caret').forEach(c => { c.style.transform = ''; });
      }
    };
    document.addEventListener('click', window._navDropdownOutsideHandler);
  }
}

function renderSubNavigation(moduleId) {
  const subNav = document.getElementById('sub-navigation');
  if (!subNav) return;
  const module = MissionControlModules[moduleId];
  if (!module || !module.sections) { subNav.innerHTML = ''; return; }
  subNav.innerHTML = module.sections.map(s => `
    <a href="${module.route}/${s.id}"
       class="sub-nav-item ${isCurrentSection(s.id) ? 'active' : ''}"
       data-section="${s.id}">
      <span class="section-icon">${s.icon}</span>
      <span class="section-label">${s.name}</span>
    </a>
  `).join('');
}

function navigateTo(moduleId, sectionId) {
  const module = MissionControlModules[moduleId];
  if (!module) return;
  const route = sectionId ? `${module.route}/${sectionId}` : module.route;
  window.location.hash = route;
}

function toggleMobileMenu() {
  const nav = document.querySelector('.mission-control-nav');
  if (nav) nav.classList.toggle('mobile-open');
}

// 초기 메뉴 렌더링 + hash 변경 시 active 상태 갱신
document.addEventListener('DOMContentLoaded', () => {
  renderMainNavigation();
  const initHash = (window.location.hash || '#mhc').slice(1).split('/')[0];
  renderSubNavigation(initHash);
});

window.addEventListener('hashchange', () => {
  renderMainNavigation();
  const moduleId = (window.location.hash || '#mhc').slice(1).split('/')[0];
  renderSubNavigation(moduleId);
});

// ==================== window.MissionControl export (복원) ====================
window.MissionControl = {
  modules: MissionControlModules,
  navigateTo,
  toggleMobileMenu,
  renderMainNavigation,
  renderSubNavigation,
  toggleNavDropdown,
};

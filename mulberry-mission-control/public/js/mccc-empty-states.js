/**
 * MCCC 소비자 안내 메시지
 * 
 * Empty States, Loading, Error Handling
 * 
 * @author CTO Koda
 * @date 2026-04-18
 * @priority P0
 */

// ==================== Empty State 타입 ====================
const EMPTY_STATE_TYPES = {
  LOADING: 'loading',
  NO_DATA: 'no_data',
  ERROR: 'error',
  UNAUTHORIZED: 'unauthorized',
  MAINTENANCE: 'maintenance',
  TIMEOUT: 'timeout'
};

// ==================== Empty State 메시지 ====================
const EMPTY_STATE_MESSAGES = {
  loading: {
    icon: '⏳',
    title: '데이터를 불러오는 중입니다...',
    message: '잠시만 기다려주세요',
    showRetry: false
  },
  no_data: {
    icon: '📊',
    title: '표시할 데이터가 없습니다',
    message: '아직 데이터가 생성되지 않았습니다',
    showRetry: true,
    retryLabel: '새로고침'
  },
  error: {
    icon: '🔌',
    title: '서버에 연결할 수 없습니다',
    message: '네트워크 연결을 확인하고 다시 시도해주세요',
    showRetry: true,
    retryLabel: '다시 시도'
  },
  unauthorized: {
    icon: '🔒',
    title: '접근 권한이 없습니다',
    message: '로그인이 필요하거나 권한이 부족합니다',
    showRetry: true,
    retryLabel: '로그인'
  },
  maintenance: {
    icon: '🔧',
    title: '시스템 점검 중입니다',
    message: '잠시 후 다시 시도해주세요',
    showRetry: false
  },
  timeout: {
    icon: '⏰',
    title: '응답 시간이 초과되었습니다',
    message: '서버가 응답하지 않습니다. 다시 시도해주세요',
    showRetry: true,
    retryLabel: '다시 시도'
  }
};

// ==================== Empty State Manager ====================
class EmptyStateManager {
  constructor() {
    this.containers = new Map();
    this.timeouts = new Map();
  }
  
  /**
   * Empty State 표시
   * @param {string} containerId - 컨테이너 ID
   * @param {string} stateType - State 타입
   * @param {Function} onRetry - 재시도 콜백
   */
  show(containerId, stateType, onRetry = null) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container not found: ${containerId}`);
      return;
    }
    
    const state = EMPTY_STATE_MESSAGES[stateType] || EMPTY_STATE_MESSAGES.no_data;
    
    container.innerHTML = `
      <div class="empty-state ${stateType}">
        <div class="empty-state-icon">${state.icon}</div>
        <h3 class="empty-state-title">${state.title}</h3>
        <p class="empty-state-message">${state.message}</p>
        ${state.showRetry ? `
          <button class="empty-state-retry" data-container="${containerId}">
            ${state.retryLabel || '다시 시도'}
          </button>
        ` : ''}
      </div>
    `;
    
    // 재시도 버튼 이벤트
    if (state.showRetry && onRetry) {
      const retryButton = container.querySelector('.empty-state-retry');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.show(containerId, EMPTY_STATE_TYPES.LOADING);
          onRetry();
        });
      }
    }
    
    this.containers.set(containerId, stateType);
  }
  
  /**
   * Loading State 표시 후 타임아웃 감지
   * @param {string} containerId
   * @param {Function} onRetry
   * @param {number} timeout - 타임아웃 시간 (ms)
   */
  showLoadingWithTimeout(containerId, onRetry, timeout = 3000) {
    this.show(containerId, EMPTY_STATE_TYPES.LOADING);
    
    // 기존 타임아웃 제거
    if (this.timeouts.has(containerId)) {
      clearTimeout(this.timeouts.get(containerId));
    }
    
    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      const currentState = this.containers.get(containerId);
      
      // 아직 Loading 상태라면 Error로 전환
      if (currentState === EMPTY_STATE_TYPES.LOADING) {
        this.show(containerId, EMPTY_STATE_TYPES.ERROR, onRetry);
      }
    }, timeout);
    
    this.timeouts.set(containerId, timeoutId);
  }
  
  /**
   * Empty State 숨기기
   * @param {string} containerId
   */
  hide(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Empty State 요소만 제거
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
    
    // 타임아웃 제거
    if (this.timeouts.has(containerId)) {
      clearTimeout(this.timeouts.get(containerId));
      this.timeouts.delete(containerId);
    }
    
    this.containers.delete(containerId);
  }
  
  /**
   * 모든 컨테이너의 State 타입 가져오기
   */
  getState(containerId) {
    return this.containers.get(containerId);
  }
  
  /**
   * 모든 Empty State 초기화
   */
  clearAll() {
    this.containers.forEach((_, containerId) => {
      this.hide(containerId);
    });
  }
}

// ==================== Global Instance ====================
const emptyStateManager = new EmptyStateManager();

// ==================== API Fetch with Empty State ====================
/**
 * API 호출 with Empty State 자동 처리
 * @param {string} containerId - 컨테이너 ID
 * @param {Function} fetchFunction - API 호출 함수
 * @param {Function} onSuccess - 성공 콜백
 * @param {number} timeout - 타임아웃 시간
 */
async function fetchWithEmptyState(containerId, fetchFunction, onSuccess, timeout = 3000) {
  // Loading 표시
  emptyStateManager.showLoadingWithTimeout(
    containerId,
    () => fetchWithEmptyState(containerId, fetchFunction, onSuccess, timeout),
    timeout
  );
  
  try {
    const data = await fetchFunction();
    
    // 데이터가 없는 경우
    if (!data || (Array.isArray(data) && data.length === 0)) {
      emptyStateManager.show(
        containerId,
        EMPTY_STATE_TYPES.NO_DATA,
        () => fetchWithEmptyState(containerId, fetchFunction, onSuccess, timeout)
      );
      return;
    }
    
    // 성공
    emptyStateManager.hide(containerId);
    onSuccess(data);
    
  } catch (error) {
    console.error('Fetch error:', error);
    
    // 에러 타입 판단
    let errorType = EMPTY_STATE_TYPES.ERROR;
    
    if (error.message === 'UNAUTHORIZED' || error.status === 401) {
      errorType = EMPTY_STATE_TYPES.UNAUTHORIZED;
    } else if (error.message === 'TIMEOUT' || error.code === 'ECONNABORTED') {
      errorType = EMPTY_STATE_TYPES.TIMEOUT;
    }
    
    emptyStateManager.show(
      containerId,
      errorType,
      () => fetchWithEmptyState(containerId, fetchFunction, onSuccess, timeout)
    );
  }
}

// ==================== 사용 예시 ====================

// 예시 1: KPI 카드 로드
async function loadKPICards() {
  await fetchWithEmptyState(
    'kpi-container',
    async () => {
      const response = await fetch('/api/v1/metrics/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mulberry_token')}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) throw new Error('UNAUTHORIZED');
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    },
    (data) => {
      // KPI 카드 렌더링
      renderKPICards(data);
    },
    3000 // 3초 타임아웃
  );
}

// 예시 2: Agent 목록 로드
async function loadAgentList() {
  await fetchWithEmptyState(
    'agent-list-container',
    async () => {
      const response = await fetch('/api/v1/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mulberry_token')}`
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return data.agents; // 배열 반환
    },
    (agents) => {
      // Agent 목록 렌더링
      renderAgentList(agents);
    }
  );
}

// 예시 3: 수동 Empty State 제어
function manualEmptyStateExample() {
  // Loading 표시
  emptyStateManager.show('my-container', EMPTY_STATE_TYPES.LOADING);
  
  // 3초 후 Error로 전환
  setTimeout(() => {
    emptyStateManager.show(
      'my-container',
      EMPTY_STATE_TYPES.ERROR,
      () => {
        console.log('Retry clicked!');
        manualEmptyStateExample();
      }
    );
  }, 3000);
}

// ==================== 전역 Export ====================
window.EmptyStateManager = EmptyStateManager;
window.emptyStateManager = emptyStateManager;
window.fetchWithEmptyState = fetchWithEmptyState;
window.EMPTY_STATE_TYPES = EMPTY_STATE_TYPES;

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Empty State Manager initialized');
});

// ==================== CSS (선택적) ====================
/*
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state-title {
  font-size: 24px;
  color: #ffffff;
  margin-bottom: 10px;
}

.empty-state-message {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 20px;
}

.empty-state-retry {
  padding: 12px 24px;
  background: #1f6feb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.empty-state-retry:hover {
  background: #388bfd;
}

.empty-state.loading .empty-state-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
*/

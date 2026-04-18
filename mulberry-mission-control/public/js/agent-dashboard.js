/**
 * Agent Dashboard - Status Display
 * 
 * 버그 수정:
 * 1. style.color: = → style.color = (OFFLINE 표시 안 되는 버그)
 * 2. Agent Team에 와룡 🐉 추가 (5명 → 6명)
 * 
 * @author CTO Koda
 * @date 2026-04-11
 */

// ==================== Agent Team 정의 (6명) ====================
const AGENT_TEAM = [
  { name: 'KODA', emoji: '🦆', role: 'CTO', specialty: 'Architecture & Development' },
  { name: 'LYNN', emoji: '🦊', role: 'Code Reviewer', specialty: 'Quality Assurance' },
  { name: 'JUNIOR', emoji: '🐥', role: 'Documentation', specialty: 'Technical Writing' },
  { name: 'TOBECORN', emoji: '🌽', role: 'Co-op Buy', specialty: 'Community Management' },
  { name: 'BONGDAL', emoji: '🐰', role: 'Field Agent', specialty: 'Operations' },
  { name: 'WARYONG', emoji: '🐉', role: 'Strategic Planning', specialty: 'Business Intelligence' } // ✅ 와룡 추가
];

// ==================== Agent Status Enum ====================
const AgentStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  IDLE: 'idle'
};

// ==================== Agent Status Display ====================
function renderAgentStatus(agent) {
  const statusColors = {
    online: '#3fb950',   // green
    offline: '#8b949e',  // gray
    busy: '#f85149',     // red
    idle: '#ffa657'      // orange
  };
  
  const statusElement = document.createElement('div');
  statusElement.className = 'agent-status';
  
  // ✅ 버그 수정: style.color: = → style.color =
  statusElement.style.color = statusColors[agent.status] || statusColors.offline; // ✅ 수정 완료
  
  statusElement.innerHTML = `
    <span class="status-indicator" style="background: ${statusColors[agent.status]}"></span>
    <span class="status-text">${agent.status.toUpperCase()}</span>
  `;
  
  return statusElement;
}

// ==================== Agent Team Card Render ====================
function renderAgentTeamCard() {
  const container = document.getElementById('agent-team-container');
  if (!container) return;
  
  let html = '<div class="agent-team-grid">';
  
  AGENT_TEAM.forEach(member => {
    html += `
      <div class="agent-team-card">
        <div class="agent-emoji">${member.emoji}</div>
        <div class="agent-info">
          <h3 class="agent-name">${member.name}</h3>
          <div class="agent-role">${member.role}</div>
          <div class="agent-specialty">${member.specialty}</div>
        </div>
        <div class="agent-status-badge" id="status-${member.name.toLowerCase()}">
          <!-- Status 동적 표시 -->
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  // Status 업데이트
  updateAgentStatuses();
}

// ==================== Agent Status Update ====================
async function updateAgentStatuses() {
  try {
    const response = await fetch('/api/v1/agents/status', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('mulberry_token')}`
      }
    });
    
    const data = await response.json();
    
    AGENT_TEAM.forEach(member => {
      const agentStatus = data.agents?.find(a => a.name === member.name) || { status: 'offline' };
      const statusBadge = document.getElementById(`status-${member.name.toLowerCase()}`);
      
      if (statusBadge) {
        const statusColors = {
          online: '#3fb950',
          offline: '#8b949e',
          busy: '#f85149',
          idle: '#ffa657'
        };
        
        // ✅ 버그 수정: style.color: = → style.color =
        statusBadge.style.color = statusColors[agentStatus.status] || statusColors.offline; // ✅ 수정 완료
        
        statusBadge.innerHTML = `
          <span class="status-dot" style="background: ${statusColors[agentStatus.status]}"></span>
          ${agentStatus.status.toUpperCase()}
        `;
      }
    });
    
  } catch (error) {
    console.error('Failed to update agent statuses:', error);
  }
}

// ==================== Agent List Render ====================
function renderAgentList(agents) {
  const container = document.getElementById('agent-list-container');
  if (!container) return;
  
  let html = '<div class="agent-list">';
  
  agents.forEach(agent => {
    const statusColors = {
      online: '#3fb950',
      offline: '#8b949e',
      busy: '#f85149',
      idle: '#ffa657'
    };
    
    html += `
      <div class="agent-card">
        <div class="agent-header">
          <div class="agent-id">${agent.passportId || agent.name}</div>
          <div class="agent-status-indicator" style="background: ${statusColors[agent.status]}"></div>
        </div>
        <div class="agent-body">
          <div class="agent-name">${agent.name}</div>
          <div class="agent-type">Type ${agent.type || 'N/A'}</div>
          <div class="agent-trust">Trust Score: ${agent.trustScore || 0}</div>
        </div>
        <div class="agent-footer">
          <span class="agent-status-text" style="color: ${statusColors[agent.status]}">
            ${agent.status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Agent Dashboard initialized');
  console.log('✅ Bug Fix 1: style.color: = → style.color =');
  console.log('✅ Bug Fix 2: Added WARYONG 🐉 to team (5 → 6 members)');
  
  renderAgentTeamCard();
  
  // 10초마다 Status 업데이트
  setInterval(updateAgentStatuses, 10000);
});

// Export for global use
window.AgentDashboard = {
  renderAgentStatus,
  renderAgentTeamCard,
  renderAgentList,
  updateAgentStatuses,
  AGENT_TEAM
};

console.log('Agent Team Members:', AGENT_TEAM.length); // 6명
console.log('Team:', AGENT_TEAM.map(m => `${m.emoji} ${m.name}`).join(', '));

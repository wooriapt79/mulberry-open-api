/**
 * Mission Control Dashboard - API 연동
 * 
 * KPI 카드, Module Status, Activity Stream 실시간 데이터
 * 
 * @author CTO Koda
 * @date 2026-04-11
 */

const API_BASE = window.location.origin;
const API_VERSION = '/api/v1';

const EMPTY_STATES = {
  NO_DATA: { icon: '📊', title: 'No Data Available', message: 'No data to display at this time', action: 'Refresh' },
  LOADING: { icon: '⏳', title: 'Loading...', message: 'Fetching data from server', action: null },
  ERROR: { icon: '⚠️', title: 'Connection Failed', message: 'Unable to reach the server', action: 'Retry' },
  UNAUTHORIZED: { icon: '🔒', title: 'Unauthorized', message: "You don't have permission to view this data", action: 'Login' }
};

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('mulberry_token');
  try {
    const response = await fetch(`${API_BASE}${API_VERSION}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      }
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('UNAUTHORIZED');
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

function showEmptyState(containerId, stateType) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const state = EMPTY_STATES[stateType] || EMPTY_STATES.NO_DATA;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${state.icon}</div>
      <h3 class="empty-title">${state.title}</h3>
      <p class="empty-message">${state.message}</p>
      ${state.action ? `<button class="empty-action" onclick="window.location.reload()">${state.action}</button>` : ''}
    </div>
  `;
}

async function updateKPICards() {
  try {
    showEmptyState('kpi-container', 'LOADING');
    const data = await apiFetch('/metrics/overview');
    updateKPICard('active-agents', { value: data.active_agents, label: 'Active Agents', icon: '🤖', trend: null });
    updateKPICard('active-communities', { value: data.active_communities, label: 'Communities Active', icon: '👥', trend: null });
    updateKPICard('risk-alerts', {
      value: data.risk_alerts, label: 'Risk Alerts', icon: '⚠️', trend: null,
      severity: data.risk_alerts > 5 ? 'critical' : data.risk_alerts > 2 ? 'warning' : 'normal'
    });
    updateKPICard('transactions-today', { value: data.transactions_today, label: 'Transactions Today', icon: '📈', trend: null });
    updateLastSync('kpi-last-sync', data.last_updated_at);
    console.log('✅ KPI cards updated');
  } catch (error) {
    console.error('Failed to update KPI:', error);
    showEmptyState('kpi-container', error.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'ERROR');
  }
}

function updateKPICard(cardId, data) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const severityClass = data.severity ? `kpi-${data.severity}` : '';
  card.innerHTML = `
    <div class="kpi-card ${severityClass}">
      <div class="kpi-icon">${data.icon}</div>
      <div class="kpi-content">
        <div class="kpi-value">${data.value.toLocaleString()}</div>
        <div class="kpi-label">${data.label}</div>
      </div>
      ${data.trend ? `<div class="kpi-trend">${data.trend}</div>` : ''}
    </div>
  `;
}

async function updateModuleStatus() {
  try {
    const data = await apiFetch('/system/modules/health');
    const moduleContainer = document.getElementById('module-status-container');
    if (!moduleContainer) return;
    const overallBadge = getStatusBadge(data.overall_status);
    let html = `
      <div class="module-status-header">
        <h3>Module Status ${overallBadge}</h3>
        <span class="last-check">Last check: ${formatTime(data.checked_at)}</span>
      </div>
      <div class="modules-grid">
    `;
    data.modules.forEach(module => {
      const badge = getStatusBadge(module.status);
      const latency = module.latency_ms_p95 ? `${module.latency_ms_p95}ms` : 'N/A';
      html += `
        <div class="module-card module-${module.status}">
          <div class="module-header">
            <span class="module-name">${module.display_name}</span>
            ${badge}
          </div>
          <div class="module-metrics">
            <div class="metric"><span class="metric-label">Latency (P95)</span><span class="metric-value">${latency}</span></div>
            <div class="metric"><span class="metric-label">Error Rate</span><span class="metric-value">${(module.error_rate_5m * 100).toFixed(2)}%</span></div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    moduleContainer.innerHTML = html;
    updateLastSync('module-last-sync', data.checked_at);
    console.log('✅ Module status updated');
  } catch (error) {
    console.error('Failed to update module status:', error);
    showEmptyState('module-status-container', 'ERROR');
  }
}

function getStatusBadge(status) {
  const badges = {
    healthy: '<span class="status-badge status-healthy">●</span>',
    degraded: '<span class="status-badge status-degraded">●</span>',
    unhealthy: '<span class="status-badge status-unhealthy">●</span>',
    unknown: '<span class="status-badge status-unknown">●</span>',
    maintenance: '<span class="status-badge status-maintenance">●</span>'
  };
  return badges[status] || badges.unknown;
}

let sseConnection = null;

async function updateActivityStream() {
  try {
    const data = await apiFetch('/events/recent?limit=20');
    const container = document.getElementById('activity-stream');
    if (!container) return;
    let html = '<div class="activity-list">';
    data.events.forEach(event => {
      const icon = getSeverityIcon(event.severity);
      const time = formatTime(event.timestamp);
      html += `
        <div class="activity-item severity-${event.severity}">
          <span class="activity-icon">${icon}</span>
          <div class="activity-content">
            <div class="activity-message">${event.message}</div>
            <div class="activity-time">${time}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
    connectSSE();
    console.log('✅ Activity stream updated');
  } catch (error) {
    console.error('Failed to update activity stream:', error);
    showEmptyState('activity-stream', 'ERROR');
  }
}

function connectSSE() {
  if (sseConnection && sseConnection.readyState === EventSource.OPEN) return;
  try {
    const token = localStorage.getItem('mulberry_token');
    sseConnection = new EventSource(`${API_BASE}${API_VERSION}/events/stream?token=${token}`);
    sseConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          console.log('✅ SSE connected');
        } else if (data.type === 'events' && data.events) {
          prependEvents(data.events);
        }
      } catch (error) {
        console.error('SSE message parse error:', error);
      }
    };
    sseConnection.onerror = () => {
      console.log('❌ SSE error, using polling fallback');
      sseConnection.close();
      sseConnection = null;
      setInterval(updateActivityStream, 30000);
    };
  } catch (error) {
    console.error('SSE connection failed:', error);
  }
}

function prependEvents(events) {
  const container = document.getElementById('activity-stream');
  if (!container) return;
  const list = container.querySelector('.activity-list');
  if (!list) return;
  events.forEach(event => {
    const item = document.createElement('div');
    item.className = `activity-item severity-${event.severity}`;
    item.innerHTML = `
      <span class="activity-icon">${getSeverityIcon(event.severity)}</span>
      <div class="activity-content">
        <div class="activity-message">${event.message}</div>
        <div class="activity-time">${formatTime(event.timestamp)}</div>
      </div>
    `;
    list.prepend(item);
    const items = list.querySelectorAll('.activity-item');
    if (items.length > 50) items[items.length - 1].remove();
  });
}

function getSeverityIcon(severity) {
  const icons = { critical: '🔴', warning: '🟡', info: '🔵', success: '🟢' };
  return icons[severity] || icons.info;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const diff = new Date() - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleString();
}

function updateLastSync(elementId, timestamp) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = `Last sync: ${formatTime(timestamp)}`;
}

async function initializeDashboard() {
  console.log('🚀 Initializing Mission Control Dashboard...');
  await Promise.all([updateKPICards(), updateModuleStatus(), updateActivityStream()]);
  setInterval(updateKPICards, 30000);
  setInterval(updateModuleStatus, 10000);
  console.log('✅ Dashboard initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

window.MissionControlAPI = {
  updateKPICards,
  updateModuleStatus,
  updateActivityStream,
  refresh: initializeDashboard
};

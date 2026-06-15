/**
 * Decision Stream UI
 *
 * Steward Decision Engine(AgentRouter, Issue #98 Phase 1)이 내리는 라우팅
 * 결정(BLOCK/REROUTE/RETRY/HOLD/PASS)을 실시간 타임라인으로 표시.
 *
 * Socket.IO `decision_history` / `decision_update` 이벤트를 구독
 * (서버측: socket/decision-events.js DecisionEventsManager)
 *
 * @author CTO Koda
 * @date 2026-06-15
 */

const DECISION_ACTION_LABELS = {
  BLOCK: '🔴 BLOCK',
  REROUTE: '🟡 REROUTE',
  RETRY: '🔵 RETRY',
  HOLD: '⚪ HOLD',
  PASS: '🟢 PASS'
};

class DecisionStreamUI {
  constructor() {
    this.socket = null;
    this.container = null;
    this.maxCards = 50;
  }

  init() {
    this.container = document.getElementById('decision-stream-list');
    if (!this.container) return;

    if (typeof io === 'undefined') {
      this.container.innerHTML = '<p style="color:#94a3b8;">Socket.IO를 사용할 수 없습니다.</p>';
      return;
    }

    this.socket = io();

    this.socket.on('decision_history', (data) => {
      this.container.innerHTML = '';
      (data.events || []).forEach(evt => this._renderCard(evt, false));
      this._scrollToBottom();
    });

    this.socket.on('decision_update', (evt) => {
      this._renderCard(evt, true);
      this._scrollToBottom();
    });
  }

  refresh() {
    if (this.socket) {
      this.socket.emit('refresh_decision_events');
    }
  }

  _renderCard(evt, prepend) {
    if (!this.container) return;

    const action = (evt.action || 'PASS').toUpperCase();
    const color = evt.color || 'gray';
    const label = DECISION_ACTION_LABELS[action] || action;
    const time = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : '';

    const card = document.createElement('div');
    card.className = `decision-card decision-card--${color}`;
    card.style.cssText = `
      border-left: 4px solid var(--decision-${color}, #888);
      background: #1a0f3a; border-radius: 8px; padding: 12px 16px;
      margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;
    `;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;">${label}</span>
        <span style="color:#64748b;font-size:0.75rem;">${time}</span>
      </div>
      <div style="color:#e2e8f0;font-size:0.85rem;">
        ${evt.decision_name ? `<strong>${evt.decision_name}</strong> &mdash; ` : ''}${evt.message || ''}
      </div>
      <div style="color:#64748b;font-size:0.75rem;">
        status: ${evt.status_code ?? '-'} | spirit_score: ${evt.spirit_score ?? '-'} | ${evt.event_id || ''}
      </div>
    `;

    if (prepend) {
      this.container.appendChild(card);
      while (this.container.children.length > this.maxCards) {
        this.container.removeChild(this.container.firstChild);
      }
    } else {
      this.container.appendChild(card);
    }
  }

  _scrollToBottom() {
    if (this.container) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }
}

window.DecisionStreamUI = DecisionStreamUI;

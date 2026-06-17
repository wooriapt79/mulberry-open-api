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
    // XSS 방지: innerHTML 대신 DOM API 사용 (DAY4 Part C)
    const rowTop = document.createElement('div');
    rowTop.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    const spanLabel = document.createElement('span');
    spanLabel.style.fontWeight = '700';
    spanLabel.textContent = label;
    const spanTime = document.createElement('span');
    spanTime.style.cssText = 'color:#64748b;font-size:0.75rem;';
    spanTime.textContent = time;
    rowTop.appendChild(spanLabel);
    rowTop.appendChild(spanTime);

    const rowMid = document.createElement('div');
    rowMid.style.cssText = 'color:#e2e8f0;font-size:0.85rem;';
    if (evt.decision_name) {
      const strong = document.createElement('strong');
      strong.textContent = evt.decision_name;
      rowMid.appendChild(strong);
      rowMid.appendChild(document.createTextNode(' — '));
    }
    rowMid.appendChild(document.createTextNode(evt.message || ''));

    const rowBot = document.createElement('div');
    rowBot.style.cssText = 'color:#64748b;font-size:0.75rem;';
    rowBot.textContent = `status: ${evt.status_code ?? '-'} | spirit_score: ${evt.spirit_score ?? '-'} | ${evt.event_id || ''}`;

    card.appendChild(rowTop);
    card.appendChild(rowMid);
    card.appendChild(rowBot);

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

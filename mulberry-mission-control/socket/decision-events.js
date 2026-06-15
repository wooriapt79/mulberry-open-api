/**
 * Decision Events WebSocket Handler
 *
 * Steward Decision Engine(AgentRouter, mulberry-research-lab Issue #98 Phase 1)의
 * 라우팅 결정을 실시간 스트림으로 Mission Control "Decision" 메뉴에 전달.
 *
 * 이벤트 포맷은 core/router/agent_router.py의 agent_router_decisions.jsonl과 동일:
 *   { event_id, action, decision_name, status_code, spirit_score, message, timestamp }
 * action: BLOCK | REROUTE | RETRY | HOLD | PASS
 *
 * @author CTO Koda
 * @date 2026-06-15
 */

const ACTION_COLORS = {
  BLOCK: 'red',
  REROUTE: 'yellow',
  RETRY: 'blue',
  HOLD: 'gray',
  PASS: 'green'
};

class DecisionEventsManager {
  constructor(io) {
    this.io = io;
    this.history = []; // 최근 100건 캐시
    this.maxHistorySize = 100;
  }

  /**
   * WebSocket 연결 초기화
   */
  initialize() {
    this.io.on('connection', (socket) => {
      socket.emit('decision_history', {
        events: this.history.slice(-20)
      });

      socket.on('refresh_decision_events', () => {
        socket.emit('decision_history', {
          events: this.history.slice(-20)
        });
      });
    });
  }

  /**
   * 새 Decision 이벤트 기록 + 브로드캐스트
   */
  recordEvent(eventData) {
    const event = this._formatEvent(eventData);

    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.io.emit('decision_update', event);
    return event;
  }

  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  _formatEvent(eventData) {
    const action = (eventData.action || 'PASS').toUpperCase();
    return {
      event_id: eventData.event_id || `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      color: ACTION_COLORS[action] || 'gray',
      decision_name: eventData.decision_name || null,
      status_code: eventData.status_code ?? null,
      spirit_score: eventData.spirit_score ?? null,
      message: eventData.message || null,
      timestamp: eventData.timestamp || new Date().toISOString()
    };
  }
}

module.exports = { DecisionEventsManager, ACTION_COLORS };

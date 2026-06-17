/**
 * Search Events Socket Handler
 *
 * MulberrySearchOrchestrator 결과를 실시간으로 Mission Control에 전달.
 * 에이전트별 결과가 준비될 때마다 search_agent_result 이벤트를 emit.
 *
 * @author CTO Koda · DAY5 · 2026-06-17
 */

class SearchEventsManager {
  constructor(io) {
    this.io = io;
    this.sessions = new Map(); // sessionId → { query, results[], startedAt }
  }

  initialize() {
    this.io.on('connection', (socket) => {
      socket.on('search_subscribe', ({ sessionId }) => {
        if (sessionId) socket.join(`search:${sessionId}`);
      });
    });
  }

  /** 검색 세션 시작 — 클라이언트에 search_started 전송 */
  startSession(sessionId, query) {
    this.sessions.set(sessionId, { query, results: [], startedAt: Date.now() });
    this.io.to(`search:${sessionId}`).emit('search_started', { sessionId, query });
  }

  /** 에이전트 결과 1건 도착 — search_agent_result 전송 */
  pushAgentResult(sessionId, agentResult) {
    const session = this.sessions.get(sessionId);
    if (session) session.results.push(agentResult);
    this.io.to(`search:${sessionId}`).emit('search_agent_result', {
      sessionId,
      domain: agentResult.domain,
      spirit_score: agentResult.spirit_score,
      passed: !agentResult.error,
      data: agentResult.data,
      error: agentResult.error || null,
    });
  }

  /** 검색 완료 — search_done 전송 */
  finishSession(sessionId, summary) {
    this.io.to(`search:${sessionId}`).emit('search_done', { sessionId, ...summary });
    this.sessions.delete(sessionId);
  }
}

module.exports = { SearchEventsManager };

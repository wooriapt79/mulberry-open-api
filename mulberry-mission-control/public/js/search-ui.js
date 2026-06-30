/**
 * Mulberry Search UI
 *
 * 10개 도메인 에이전트 검색 결과를 실시간 카드로 표시.
 * Spirit Gate 통과 여부 시각화 (✅ / ❌)
 *
 * 데모 쿼리: "인제군 어르신 배추 공동구매 최적 시기는?"
 *
 * @author CTO Koda · DAY5 · 2026-06-17
 */

const AGENT_LABELS = {
  agricultural_price:       '🌾 농산물 시세',
  local_supply:             '📦 국내 수급',
  regional_characteristic:  '🗺️ 지역 특성',
  elderly_consumer:         '👴 어르신 소비',
  group_buy_timing:         '⏰ 구매 타이밍',
  competitor_alternative:   '⚖️ 경쟁 비교',
  logistics_delivery:       '🚚 물류·배송',
  weather_seasonal:         '🌤️ 계절·날씨',
  nutrition_quality:        '🥦 영양·품질',
  consumer_review:          '⭐ 소비자 리뷰',
};

class SearchUI {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this._inputEl = null;
    this._btnEl = null;
    this._summaryEl = null;
    this._gridEl = null;
    this._answerEl = null;
  }

  init() {
    this._inputEl  = document.getElementById('search-query-input');
    this._btnEl    = document.getElementById('search-submit-btn');
    this._summaryEl = document.getElementById('search-summary');
    this._gridEl   = document.getElementById('search-agent-grid');
    this._answerEl = document.getElementById('search-answer');

    if (!this._inputEl || !this._btnEl) return;

    this._btnEl.addEventListener('click', () => this._runSearch());
    this._inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._runSearch();
    });

    // 데모 쿼리 자동 입력
    if (this._inputEl.value === '') {
      this._inputEl.value = '인제군 어르신 배추 공동구매 최적 시기는?';
    }

    if (typeof io !== 'undefined') {
      this.socket = io();
      this.socket.on('search_started', ({ sessionId, query }) => {
        this.sessionId = sessionId;
        this._resetGrid();
        this._setStatus(`🔍 검색 중: "${query}"`);
      });
      this.socket.on('search_agent_result', (data) => {
        if (data.sessionId === this.sessionId) this._renderAgentCard(data);
      });
      this.socket.on('search_done', (data) => {
        if (data.sessionId === this.sessionId) {
          this._setStatus(`✅ 완료 — ${data.passed_agents}/${data.total_agents}개 에이전트 통과`);
        }
      });
    }
  }

  async _runSearch() {
    const query = this._inputEl ? this._inputEl.value.trim() : '';
    if (!query) return;

    this._resetGrid();
    this._setStatus('🔍 검색 중...');
    if (this._btnEl) this._btnEl.disabled = true;

    try {
      const res = await fetch('/api/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.sessionId = data.sessionId;

      // Codex Bot 리뷰 Issue 1 (2026-06-30): Safety CRITICAL/RED 거절 응답 처리
      // routes/search.js가 blocked/refused 시 domain_results 없이 status/zone/message만 반환함
      if (data.status === 'blocked' || data.status === 'refused') {
        this._resetGrid();
        const icon = data.status === 'blocked' ? '🔴' : '⚠️';
        this._setStatus(`${icon} ${data.message || '요청을 처리할 수 없습니다.'} (${data.zone})`);
        return;
      }

      // 소켓 subscribe
      if (this.socket) this.socket.emit('search_subscribe', { sessionId: data.sessionId });

      // 결과 렌더 (소켓 미연결 환경에서도 동작)
      this._resetGrid();
      (data.domain_results || []).forEach((r) => this._renderAgentCard(r, data.source));
      this._renderAnswer(data.answer || '', data.source);

      // Codex Bot 리뷰 Issue 2 (2026-06-30): Safety YELLOW 경고 배너 표시
      if (data.warning) this._renderWarning(data.warning);

      const sourceBadge = data.source === 'real' ? '🟢 실 에이전트' : '🔵 Mock';
      this._setStatus(`✅ 완료 — ${data.passed_agents}/${data.total_agents}개 에이전트 통과 ${sourceBadge}`);
    } catch (err) {
      this._setStatus(`❌ 오류: ${err.message}`);
    } finally {
      if (this._btnEl) this._btnEl.disabled = false;
    }
  }

  _renderAgentCard(r, source) {
    if (!this._gridEl) return;
    const label = AGENT_LABELS[r.domain] || r.domain;
    const passed = !r.error;
    const score = typeof r.spirit_score === 'number' ? r.spirit_score.toFixed(2) : '-';
    const insight = r.data ? (r.data.insight || JSON.stringify(r.data).slice(0, 120)) : '';
    const srcBadge = (source || r.source) === 'real' ? '🟢' : '🔵';

    const card = document.createElement('div');
    card.style.cssText = `
      background:#1a0f3a; border-radius:10px; padding:14px 16px;
      border-left:4px solid ${passed ? '#22c55e' : '#ef4444'};
      display:flex; flex-direction:column; gap:6px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

    const nameEl = document.createElement('span');
    nameEl.style.fontWeight = '700';
    nameEl.textContent = label;

    const badgeEl = document.createElement('span');
    badgeEl.style.cssText = `font-size:0.75rem;color:${passed ? '#22c55e' : '#ef4444'};`;
    badgeEl.textContent = `${passed ? '✅' : '❌'} spirit ${score} ${srcBadge}`;

    header.appendChild(nameEl);
    header.appendChild(badgeEl);

    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'color:#e2e8f0;font-size:0.83rem;line-height:1.5;';
    bodyEl.textContent = r.error || insight;

    card.appendChild(header);
    card.appendChild(bodyEl);
    this._gridEl.appendChild(card);
  }

  _renderAnswer(answer, source) {
    if (!this._answerEl) return;
    if (answer) {
      const badge = source === 'real' ? ' 🟢 실 에이전트' : ' 🔵 Mock';
      this._answerEl.textContent = answer + '\n\n[출처: ' + badge.trim() + ']';
      this._answerEl.style.display = 'block';
    } else {
      this._answerEl.textContent = '';
      this._answerEl.style.display = 'none';
    }
  }

  // Codex Bot 리뷰 Issue 2 (2026-06-30): YELLOW 경고 배너
  _renderWarning(message) {
    if (!this._gridEl || !this._gridEl.parentNode) return;
    const banner = document.createElement('div');
    banner.style.cssText = `
      background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.4);
      color:#f59e0b; border-radius:8px; padding:10px 14px;
      margin-bottom:12px; font-size:0.85rem; font-weight:600;
    `;
    banner.textContent = `⚠️ ${message}`;
    this._gridEl.parentNode.insertBefore(banner, this._gridEl);
  }

  _resetGrid() {
    if (this._gridEl) {
      this._gridEl.innerHTML = '';
      // 이전 경고 배너 제거
      const prevBanner = this._gridEl.previousElementSibling;
      if (prevBanner && prevBanner.textContent.startsWith('⚠️')) {
        prevBanner.remove();
      }
    }
    if (this._answerEl) { this._answerEl.textContent = ''; this._answerEl.style.display = 'none'; }
  }

  _setStatus(msg) {
    if (this._summaryEl) this._summaryEl.textContent = msg;
  }
}

window.SearchUI = SearchUI;

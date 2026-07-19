/**
 * public/js/luna-channel.js
 * Issue #113 | #luna-analysis 채널 — Socket.IO 실시간 수신 + UI 렌더링
 *
 * 의존: socket.io.min.js (index.html에 이미 로드됨)
 */

(function () {
  'use strict';

  const CHANNEL_ID = 'luna-analysis';
  const MAX_CARDS = 50;

  let _socket = null;

  // ─────────────────────────────────────────────
  // Socket.IO 연결 + luna-analysis room join
  // ─────────────────────────────────────────────
  function initSocket() {
    if (_socket) return;
    _socket = window.io ? window.io() : null;
    if (!_socket) return;

    _socket.on('connect', () => {
      _socket.emit('join_channel', CHANNEL_ID);
      updateStatus('connected');
    });

    _socket.on('disconnect', () => updateStatus('disconnected'));

    _socket.on('luna:analysis', (data) => {
      prependCard(data);
    });
  }

  // ─────────────────────────────────────────────
  // 상태 표시 업데이트
  // ─────────────────────────────────────────────
  function updateStatus(state) {
    const dot = document.getElementById('luna-channel-status-dot');
    const label = document.getElementById('luna-channel-status-label');
    if (!dot || !label) return;
    if (state === 'connected') {
      dot.style.background = '#4ade80';
      label.textContent = '실시간 연결됨';
    } else {
      dot.style.background = '#f87171';
      label.textContent = '연결 끊김';
    }
  }

  // ─────────────────────────────────────────────
  // 분석 결과 카드 prepend
  // ─────────────────────────────────────────────
  function prependCard(data) {
    const feed = document.getElementById('luna-channel-feed');
    if (!feed) return;

    const time = data.generated_at
      ? new Date(data.generated_at).toLocaleString('ko-KR', { hour12: false })
      : new Date().toLocaleString('ko-KR', { hour12: false });

    const templateLabel = data.template || data.product || '—';
    const analysisText = (data.analysis || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const card = document.createElement('div');
    card.className = 'luna-card';
    card.innerHTML = `
      <div class="luna-card-header">
        <span class="luna-card-tag">${templateLabel}</span>
        ${data.product && data.product !== data.template ? `<span class="luna-card-product">${data.product}</span>` : ''}
        <span class="luna-card-time">${time}</span>
      </div>
      <pre class="luna-card-body">${analysisText}</pre>
    `;

    feed.insertBefore(card, feed.firstChild);

    // 최대 카드 수 초과 시 오래된 것 제거
    while (feed.children.length > MAX_CARDS) {
      feed.removeChild(feed.lastChild);
    }

    // 빈 상태 메시지 숨김
    const empty = document.getElementById('luna-channel-empty');
    if (empty) empty.style.display = 'none';
  }

  // ─────────────────────────────────────────────
  // 채널 초기화 버튼
  // ─────────────────────────────────────────────
  function clearFeed() {
    const feed = document.getElementById('luna-channel-feed');
    if (feed) feed.innerHTML = '';
    const empty = document.getElementById('luna-channel-empty');
    if (empty) empty.style.display = 'block';
  }

  // ─────────────────────────────────────────────
  // 수동 분석 트리거 (테스트용)
  // ─────────────────────────────────────────────
  async function triggerAnalysis() {
    const btn = document.getElementById('luna-trigger-btn');
    const sel = document.getElementById('luna-product-select');
    const product = sel ? sel.value : '배추';
    const additionalContext = (document.getElementById('luna-additional-context')?.value || '').trim();
    if (btn) { btn.disabled = true; btn.textContent = '분석 중…'; }

    try {
      const res = await fetch(`/api/analysis?product=${encodeURIComponent(product)}&period=weekly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, period: 'weekly', additionalContext }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // emit은 서버에서 처리 — 응답은 확인용
      const data = await res.json();
      console.log('[luna-channel] analysis triggered:', data.template, data.generated_at);
    } catch (e) {
      console.error('[luna-channel] trigger error:', e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '분석 실행'; }
    }
  }

  // ─────────────────────────────────────────────
  // 공개 API
  // ─────────────────────────────────────────────
  window.LunaChannel = {
    init: initSocket,
    clear: clearFeed,
    trigger: triggerAnalysis,
    prependCard,
  };
})();

/**
 * public/js/negotiation-room.js
 * Issue #116 Phase 2 | 협상 룸 현황 패널 — Socket.IO 실시간
 *
 * Socket 이벤트:
 *   negotiation:room_created  — 새 룸 생성
 *   negotiation:joined        — 참여자 입장
 *   negotiation:status_changed — 상태 전환
 *   negotiation:approved      — CEO 승인/거절
 *   negotiation:completed     — Worker AI 완료
 */

(function () {
  'use strict';

  const MAX_CARDS = 30;
  let _socket = null;
  let _initialized = false;

  const STATUS_LABEL = {
    ROOM_CREATED:    '룸 생성',
    WAITING_GUEST:   '게스트 대기',
    GUEST_JOINED:    '게스트 입장',
    AGENDA_OPEN:     '의제 설정',
    NEGOTIATING:     '협상 중',
    PROPOSAL_PENDING:'제안 검토',
    COUNTER_PENDING: '역제안 검토',
    HUMAN_REQUIRED:  '⚠️ CEO 승인 필요',
    APPROVED:        '✅ 승인됨',
    REJECTED:        '❌ 거절됨',
    MANDATE_ISSUED:  '🔖 위임장 발행',
    EXECUTING:       '⚙️ 실행 중',
    CLOSED_AGREED:   '🎉 합의 완료',
    WITHDRAWN:       '철회됨',
  };

  const STATUS_COLOR = {
    HUMAN_REQUIRED: '#f87171',
    APPROVED: '#4ade80',
    REJECTED: '#f87171',
    MANDATE_ISSUED: '#a78bfa',
    EXECUTING: '#60a5fa',
    CLOSED_AGREED: '#34d399',
    WITHDRAWN: '#9ca3af',
  };

  // ─────────────────────────────────────────────
  // 초기화
  // ─────────────────────────────────────────────
  function init() {
    if (_initialized) return;
    _initialized = true;
    _initSocket();
    _loadRooms();
  }

  // ─────────────────────────────────────────────
  // Socket.IO 연결
  // ─────────────────────────────────────────────
  function _initSocket() {
    if (_socket) return;
    _socket = window.io ? window.io() : null;
    if (!_socket) return;

    _socket.on('connect', () => _updateStatus('connected'));
    _socket.on('disconnect', () => _updateStatus('disconnected'));

    _socket.on('negotiation:room_created', (data) => {
      _upsertCard(data.room_id, { status: data.status, task_id: data.task_id, event: 'room_created' });
    });
    _socket.on('negotiation:joined', (data) => {
      _upsertCard(data.room_id, { status: data.status, event: 'joined', agent: data.agent });
    });
    _socket.on('negotiation:status_changed', (data) => {
      _upsertCard(data.room_id, { status: data.next_status, event: 'status_changed', approval_id: data.approval_id });
    });
    _socket.on('negotiation:approved', (data) => {
      _upsertCard(data.room_id, { status: data.status, event: 'approved', decision: data.decision });
    });
    _socket.on('negotiation:completed', (data) => {
      _upsertCard(data.room_id, { status: data.status, event: 'completed', task_type: data.task_type });
    });
  }

  // ─────────────────────────────────────────────
  // 활성 룸 최초 로드
  // ─────────────────────────────────────────────
  async function _loadRooms() {
    try {
      const res = await fetch('/api/negotiation/rooms');
      if (!res.ok) return;
      const { rooms } = await res.json();
      rooms.forEach((room) => {
        _upsertCard(room.room_id, {
          status: room.status,
          task_id: room.task_id,
          event: 'loaded',
          created_at: room.createdAt,
        });
      });
      const empty = document.getElementById('negotiation-room-empty');
      if (empty && rooms.length > 0) empty.style.display = 'none';
    } catch (e) {
      console.warn('[negotiation-room] 룸 로드 실패:', e.message);
    }
  }

  // ─────────────────────────────────────────────
  // 카드 upsert (room_id 기준)
  // ─────────────────────────────────────────────
  function _upsertCard(room_id, data) {
    const feed = document.getElementById('negotiation-room-feed');
    if (!feed) return;

    const empty = document.getElementById('negotiation-room-empty');
    if (empty) empty.style.display = 'none';

    let card = document.getElementById(`nroom-card-${room_id}`);
    const isNew = !card;

    if (isNew) {
      card = document.createElement('div');
      card.id = `nroom-card-${room_id}`;
      card.className = 'nroom-card';
      feed.insertBefore(card, feed.firstChild);
      while (feed.children.length > MAX_CARDS) feed.removeChild(feed.lastChild);
    }

    const statusLabel = STATUS_LABEL[data.status] || data.status || '—';
    const statusColor = STATUS_COLOR[data.status] || '#94a3b8';
    const time = new Date().toLocaleString('ko-KR', { hour12: false });
    const taskBadge = data.task_id ? `<span class="nroom-badge">${data.task_id.slice(0, 12)}…</span>` : '';

    card.innerHTML = `
      <div class="nroom-card-header">
        <span class="nroom-room-id">${room_id}</span>
        ${taskBadge}
        <span class="nroom-time">${time}</span>
      </div>
      <div class="nroom-status" style="color:${statusColor}">${statusLabel}</div>
      ${data.task_type ? `<div class="nroom-meta">작업: ${data.task_type}</div>` : ''}
      ${data.approval_id ? `<div class="nroom-meta">승인 ID: ${data.approval_id}</div>` : ''}
    `;

    if (isNew) card.classList.add('nroom-card-new');
    setTimeout(() => card.classList.remove('nroom-card-new'), 600);
  }

  // ─────────────────────────────────────────────
  // 연결 상태 표시
  // ─────────────────────────────────────────────
  function _updateStatus(state) {
    const dot = document.getElementById('nroom-status-dot');
    const label = document.getElementById('nroom-status-label');
    if (!dot || !label) return;
    dot.style.background = state === 'connected' ? '#4ade80' : '#f87171';
    label.textContent = state === 'connected' ? '실시간 연결됨' : '연결 끊김';
  }

  // ─────────────────────────────────────────────
  // 피드 초기화
  // ─────────────────────────────────────────────
  function clearFeed() {
    const feed = document.getElementById('negotiation-room-feed');
    if (feed) feed.innerHTML = '';
    const empty = document.getElementById('negotiation-room-empty');
    if (empty) empty.style.display = 'block';
  }

  window.NegotiationRoom = { init, clearFeed };
})();

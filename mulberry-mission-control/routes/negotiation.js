/**
 * routes/negotiation.js
 * Issue #116 | Guest Negotiation Room MVP — REST API
 *
 * POST /api/negotiation/rooms          — 룸 생성 (Luna(Jr.) 패킷 수신)
 * GET  /api/negotiation/rooms/:room_id — 룸 상태 조회
 * POST /api/negotiation/rooms/:room_id/join       — 참여자 입장
 * POST /api/negotiation/rooms/:room_id/transition — 상태 전환 (Sr. TRANG)
 * POST /api/negotiation/rooms/:room_id/approve    — CEO re.eul 승인/거절
 * GET  /api/negotiation/rooms/:room_id/events     — 이벤트 로그 조회
 */

const express = require('express');
const router = express.Router();
const { NegotiationRoom, NegotiationEvent, ApprovalRecord, generateId, generateUUID } = require('../models/NegotiationRoom');
const stewardAdapter = require('../utils/steward_adapter');

// ─────────────────────────────────────────────
// POST /api/negotiation/rooms
// Luna(Jr.) 협상 패킷 → 룸 생성
// Body: { task_id, guest_info?, agenda? }
// ─────────────────────────────────────────────
router.post('/negotiation/rooms', async (req, res) => {
  const { task_id, guest_info, agenda } = req.body || {};
  if (!task_id) return res.status(400).json({ error: 'task_id 필수' });

  const room_id = generateId('room_');

  try {
    const room = await NegotiationRoom.create({
      room_id,
      task_id,
      status: 'ROOM_CREATED',
      participants: [{ agent: 'steward_ai', permission_level: 'STEWARD', joined_at: new Date() }],
      agenda: agenda || [],
    });

    await _logEvent({
      room_id, task_id,
      event_type: 'room_created',
      room_status: 'ROOM_CREATED',
      agent: 'system',
      payload: { guest_info: guest_info || null },
    });

    // Socket.IO 알림
    const io = req.app.get('io');
    if (io) io.emit('negotiation:room_created', { room_id, task_id, status: 'ROOM_CREATED' });

    return res.status(201).json({ room_id, task_id, status: room.status, created_at: room.createdAt });
  } catch (err) {
    console.error('[negotiation] room create error:', err.message);
    return res.status(500).json({ error: '룸 생성 실패' });
  }
});

// ─────────────────────────────────────────────
// GET /api/negotiation/rooms/:room_id
// ─────────────────────────────────────────────
router.get('/negotiation/rooms/:room_id', async (req, res) => {
  const { room_id } = req.params;
  try {
    const room = await NegotiationRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ error: '룸을 찾을 수 없습니다' });
    return res.json(room);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/negotiation/rooms/:room_id/join
// 참여자 입장
// Body: { agent, permission_level }
// ─────────────────────────────────────────────
router.post('/negotiation/rooms/:room_id/join', async (req, res) => {
  const { room_id } = req.params;
  const { agent = 'luna_jr', permission_level = 'OBSERVER' } = req.body || {};

  try {
    const room = await NegotiationRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ error: '룸 없음' });

    room.participants.push({ agent, permission_level, joined_at: new Date() });
    const nextStatus = agent === 'luna_jr' ? 'GUEST_JOINED' : room.status;
    await room.transition(nextStatus);

    await _logEvent({
      room_id, task_id: room.task_id,
      event_type: 'participant_joined',
      room_status: nextStatus,
      agent,
      permission_level,
      payload: { agent, permission_level },
    });

    const io = req.app.get('io');
    if (io) io.emit('negotiation:joined', { room_id, agent, status: nextStatus });

    return res.json({ room_id, agent, status: nextStatus });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/negotiation/rooms/:room_id/transition
// Sr. TRANG 상태 전환
// Body: { next_status, agent, payload? }
// ─────────────────────────────────────────────
router.post('/negotiation/rooms/:room_id/transition', async (req, res) => {
  const { room_id } = req.params;
  const { next_status, agent = 'steward_ai', payload = {} } = req.body || {};

  if (!next_status) return res.status(400).json({ error: 'next_status 필수' });

  try {
    const room = await NegotiationRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ error: '룸 없음' });

    const prev_status = room.status;
    await room.transition(next_status);

    // HUMAN_REQUIRED 전환 시 ApprovalRecord 자동 생성
    let approval_id = null;
    if (next_status === 'HUMAN_REQUIRED') {
      approval_id = generateId('approval_');
      await ApprovalRecord.create({
        approval_id,
        room_id,
        task_id: room.task_id,
        decision: 'pending',
      });
    }

    await _logEvent({
      room_id, task_id: room.task_id,
      event_type: next_status === 'HUMAN_REQUIRED' ? 'human_approval_requested' : 'terms_agreed',
      room_status: next_status,
      agent,
      payload: { prev_status, ...payload },
      audit_ref: approval_id,
    });

    const io = req.app.get('io');
    if (io) io.emit('negotiation:status_changed', { room_id, prev_status, next_status, approval_id });

    return res.json({ room_id, prev_status, status: next_status, approval_id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/negotiation/rooms/:room_id/approve
// CEO re.eul 승인 / 거절
// Body: { decision: 'approved'|'rejected', mandate_scope?, notes? }
// ─────────────────────────────────────────────
router.post('/negotiation/rooms/:room_id/approve', async (req, res) => {
  const { room_id } = req.params;
  const { decision, mandate_scope, notes } = req.body || {};

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision: approved 또는 rejected 필수' });
  }
  if (decision === 'approved' && !mandate_scope) {
    return res.status(400).json({ error: 'approved 시 mandate_scope 필수' });
  }

  try {
    const room = await NegotiationRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ error: '룸 없음' });
    if (room.status !== 'HUMAN_REQUIRED') {
      return res.status(409).json({ error: `HUMAN_REQUIRED 상태가 아닙니다 (현재: ${room.status})` });
    }

    // ApprovalRecord 업데이트
    const approvalRecord = await ApprovalRecord.findOneAndUpdate(
      { room_id, decision: 'pending' },
      { decision, decided_by: 're.eul', decided_at: new Date(), mandate_scope, notes },
      { new: true }
    );

    const nextStatus = decision === 'approved' ? 'APPROVED' : 'REJECTED';
    await room.transition(nextStatus);

    const eventType = decision === 'approved' ? 'human_approved' : 'human_rejected';
    await _logEvent({
      room_id, task_id: room.task_id,
      event_type: eventType,
      room_status: nextStatus,
      agent: 'steward_human',
      permission_level: 'STEWARD',
      payload: { decision, notes },
      mandate_scope: mandate_scope || null,
      audit_ref: approvalRecord?.approval_id,
    });

    // 승인 시 → MANDATE_ISSUED + steward_adapter 발동
    if (decision === 'approved') {
      await room.transition('MANDATE_ISSUED');
      await _logEvent({
        room_id, task_id: room.task_id,
        event_type: 'mandate_issued',
        room_status: 'MANDATE_ISSUED',
        agent: 'steward_ai',
        permission_level: 'STEWARD',
        mandate_scope,
        audit_ref: approvalRecord?.approval_id,
        payload: {},
      });

      // steward_adapter로 Worker AI 배정 (Phase 2: async ATFS 호출)
      const dispatchResult = await stewardAdapter.dispatch({
        task_type: mandate_scope?.task_type,
        mandate_scope,
        room_id,
        audit_ref: approvalRecord?.approval_id,
      });

      if (!dispatchResult.dispatched) {
        // 배정 실패 시 MANDATE_ISSUED 롤백 → APPROVED로 복구
        await room.transition('APPROVED');
        return res.status(500).json({
          error: `Worker AI 배정 실패: ${dispatchResult.reason}`,
          room_id,
          status: 'APPROVED',
        });
      }
    }

    const io = req.app.get('io');
    if (io) io.emit('negotiation:approved', { room_id, decision, status: room.status });

    return res.json({
      room_id,
      decision,
      status: room.status,
      approval_id: approvalRecord?.approval_id,
    });
  } catch (err) {
    console.error('[negotiation] approve error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/negotiation/rooms/:room_id/events
// 이벤트 로그 조회
// ─────────────────────────────────────────────
router.get('/negotiation/rooms/:room_id/events', async (req, res) => {
  const { room_id } = req.params;
  try {
    const events = await NegotiationEvent.find({ room_id }).sort({ timestamp: 1 });
    return res.json({ room_id, count: events.length, events });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/negotiation/rooms
// 활성 룸 목록 (Mission Control UI용)
// ─────────────────────────────────────────────
router.get('/negotiation/rooms', async (req, res) => {
  try {
    const rooms = await NegotiationRoom.find({
      status: { $nin: ['CLOSED_AGREED', 'WITHDRAWN', 'REJECTED'] },
    }).sort({ createdAt: -1 }).limit(50);
    return res.json({ count: rooms.length, rooms });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/negotiation/worker-callback
// ATFS Worker AI 작업 완료 콜백 → EXECUTING → CLOSED_AGREED
// Body: { room_id, task_type, result, passport_id }
// ─────────────────────────────────────────────
router.post('/negotiation/worker-callback', async (req, res) => {
  const { room_id, task_type, result, passport_id } = req.body || {};
  if (!room_id) return res.status(400).json({ error: 'room_id 필수' });

  try {
    const room = await NegotiationRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ error: '룸 없음' });

    // EXECUTING 전환 (아직 안 됐다면)
    if (room.status === 'MANDATE_ISSUED') {
      await room.transition('EXECUTING');
      await _logEvent({
        room_id, task_id: room.task_id,
        event_type: 'worker_assigned',
        room_status: 'EXECUTING',
        agent: 'worker_ai',
        permission_level: 'EXECUTOR',
        payload: { task_type, passport_id },
      });
    }

    // Worker 완료 → CLOSED_AGREED
    await room.transition('CLOSED_AGREED');
    await _logEvent({
      room_id, task_id: room.task_id,
      event_type: 'worker_completed',
      room_status: 'CLOSED_AGREED',
      agent: 'worker_ai',
      permission_level: 'EXECUTOR',
      payload: { task_type, result: result || null, passport_id },
    });

    await _logEvent({
      room_id, task_id: room.task_id,
      event_type: 'agreement_recorded',
      room_status: 'CLOSED_AGREED',
      agent: 'steward_ai',
      permission_level: 'STEWARD',
      payload: { summary: `${task_type} 작업 완료. 합의 기록됨.` },
    });

    const io = req.app.get('io');
    if (io) io.emit('negotiation:completed', { room_id, task_type, status: 'CLOSED_AGREED', result });

    return res.json({ room_id, status: 'CLOSED_AGREED', task_type, result });
  } catch (err) {
    console.error('[negotiation] worker-callback error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// 내부: 이벤트 로그 기록
// ─────────────────────────────────────────────
async function _logEvent({ room_id, task_id, event_type, room_status, agent, permission_level, payload, mandate_scope, audit_ref }) {
  const event_id = generateUUID();
  try {
    await NegotiationEvent.create({
      event_id,
      room_id,
      task_id,
      event_type,
      room_status,
      agent,
      permission_level: permission_level || null,
      payload: payload || {},
      mandate_scope: mandate_scope || null,
      audit_ref: audit_ref || null,
      timestamp: new Date(),
      meta: { schema_version: '1.0.0' },
    });
  } catch (err) {
    console.error('[negotiation] event log error:', err.message);
  }
}

module.exports = router;

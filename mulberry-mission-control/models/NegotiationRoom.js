/**
 * models/NegotiationRoom.js
 * Issue #116 | Guest Negotiation Room MVP — MongoDB 모델
 *
 * 3개 컬렉션:
 *   NegotiationRoom    — 협상 룸 (상태 머신 14개 상태)
 *   NegotiationEvent   — 이벤트 로그 (negotiation_event_v1 스키마 반영)
 *   ApprovalRecord     — HUMAN_REQUIRED 시 CEO re.eul 승인 기록
 */

const mongoose = require('mongoose');

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────
const ROOM_STATUSES = [
  'ROOM_CREATED', 'WAITING_GUEST', 'GUEST_JOINED', 'AGENDA_OPEN',
  'NEGOTIATING', 'PROPOSAL_PENDING', 'COUNTER_PENDING',
  'HUMAN_REQUIRED', 'APPROVED', 'REJECTED',
  'MANDATE_ISSUED', 'EXECUTING', 'CLOSED_AGREED', 'WITHDRAWN',
];

const EVENT_TYPES = [
  'room_created', 'participant_joined', 'agenda_set',
  'proposal_made', 'counter_proposal', 'terms_agreed',
  'human_approval_requested', 'human_approved', 'human_rejected',
  'mandate_issued', 'worker_assigned', 'worker_completed',
  'agreement_recorded', 'room_closed', 'room_withdrawn',
];

const AGENTS = ['luna_jr', 'steward_ai', 'worker_ai', 'steward_human', 'system'];
const PERMISSION_LEVELS = ['STEWARD', 'EXECUTOR', 'OBSERVER'];

// ─────────────────────────────────────────────
// NegotiationRoom
// ─────────────────────────────────────────────
const NegotiationRoomSchema = new mongoose.Schema(
  {
    room_id:  { type: String, required: true, unique: true, index: true },
    task_id:  { type: String, required: true, index: true },
    status:   { type: String, enum: ROOM_STATUSES, default: 'ROOM_CREATED' },
    participants: [
      {
        agent:            { type: String, enum: AGENTS },
        permission_level: { type: String, enum: PERMISSION_LEVELS },
        joined_at:        { type: Date },
      },
    ],
    agenda:   { type: [String], default: [] },
    closed_at: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// 상태 전환 헬퍼
NegotiationRoomSchema.methods.transition = async function (nextStatus) {
  this.status = nextStatus;
  if (['CLOSED_AGREED', 'WITHDRAWN', 'REJECTED'].includes(nextStatus)) {
    this.closed_at = new Date();
  }
  return this.save();
};

const NegotiationRoom = mongoose.model('NegotiationRoom', NegotiationRoomSchema);

// ─────────────────────────────────────────────
// NegotiationEvent
// ─────────────────────────────────────────────
const NegotiationEventSchema = new mongoose.Schema(
  {
    event_id:         { type: String, required: true, unique: true },
    room_id:          { type: String, required: true, index: true },
    task_id:          { type: String, required: true, index: true },
    event_type:       { type: String, enum: EVENT_TYPES, required: true },
    room_status:      { type: String, enum: ROOM_STATUSES },
    agent:            { type: String, enum: AGENTS, required: true },
    permission_level: { type: String, enum: PERMISSION_LEVELS },
    payload:          { type: mongoose.Schema.Types.Mixed, default: {} },
    mandate_scope:    { type: mongoose.Schema.Types.Mixed },
    audit_ref:        { type: String },
    timestamp:        { type: Date, default: Date.now },
    meta:             { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const NegotiationEvent = mongoose.model('NegotiationEvent', NegotiationEventSchema);

// ─────────────────────────────────────────────
// ApprovalRecord
// ─────────────────────────────────────────────
const ApprovalRecordSchema = new mongoose.Schema(
  {
    approval_id:  { type: String, required: true, unique: true },
    room_id:      { type: String, required: true, index: true },
    task_id:      { type: String, required: true },
    decision:     { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
    decided_by:   { type: String },
    decided_at:   { type: Date },
    mandate_scope: { type: mongoose.Schema.Types.Mixed },
    notes:        { type: String },
  },
  { timestamps: true }
);

const ApprovalRecord = mongoose.model('ApprovalRecord', ApprovalRecordSchema);

// ─────────────────────────────────────────────
// UUID v4 생성 헬퍼 (외부 의존 없이)
// ─────────────────────────────────────────────
function generateId(prefix = '') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}_${rand}`;
}

module.exports = {
  NegotiationRoom,
  NegotiationEvent,
  ApprovalRecord,
  ROOM_STATUSES,
  EVENT_TYPES,
  generateId,
};

/**
 * AgentMemory Model — Steward Workspace Memory Layer (DAY8, Issue #40)
 *
 * Agent 세션 시작 시 자동 로딩 + 주요 이벤트 발생 시 자동 저장.
 * 정보보호 원칙: who(누구와)/where(어디서)는 저장하지 않음 — projectType/role/skillApplied만 기록.
 *
 * @author CTO Koda · DAY8 · 2026-06-25
 */

const mongoose = require('mongoose');

const AgentMemorySchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  projectType: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    default: null,
  },
  skillApplied: {
    type: String,
    default: null,
  },
});

// Koda 판단: agentId + timestamp 복합 인덱스 — loadMemoryLayer()의 최신순 조회 패턴에 맞춤
AgentMemorySchema.index({ agentId: 1, timestamp: -1 });

module.exports = mongoose.model('AgentMemory', AgentMemorySchema);

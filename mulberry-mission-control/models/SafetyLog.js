/**
 * SafetyLog Model — Search 요청 거절/차단 로그 (DAY9 Track C)
 *
 * 정보보호 원칙: 쿼리 원문 저장 안 함 — query_hash(SHA-256)만 기록.
 *
 * @author CTO Koda · DAY9 · 2026-06-30
 */

const mongoose = require('mongoose');

const SafetyLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  queryHash: {
    type: String,
    required: true,
  },
  zone: {
    type: String,
    enum: ['YELLOW', 'RED', 'CRITICAL'],
    required: true,
  },
  action: {
    type: String,
    enum: ['warn', 'refuse', 'block'],
    required: true,
  },
});

SafetyLogSchema.index({ timestamp: -1 });
SafetyLogSchema.index({ zone: 1 });

module.exports = mongoose.model('SafetyLog', SafetyLogSchema);

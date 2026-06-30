/**
 * Memory Layer — Steward Workspace 자동 로딩·저장 (DAY8, Issue #40)
 *
 * Passport → Mandate → Memory 순서로 로딩되어 Agent가 세션 시작 즉시 맥락을 갖고 작업 가능.
 *
 * @author CTO Koda · DAY8 · 2026-06-25
 */

const mongoose = require('mongoose');
const AgentMemory = require('../models/AgentMemory');

const MEMORY_LIMIT = 20;

// 1. 세션 init 시 자동 로딩
async function loadMemoryLayer(agentId) {
  if (mongoose.connection.readyState !== 1) return [];
  try {
    return await AgentMemory.find({ agentId })
      .sort({ timestamp: -1 })
      .limit(MEMORY_LIMIT)
      .lean();
  } catch (e) {
    console.warn(`[memory-layer] load 실패 (${agentId}): ${e.message}`);
    return [];
  }
}

// 2. 주요 이벤트 시 자동 저장 — who/where 저장 안 함 (정보보호 원칙)
async function saveMemoryEvent(agentId, event) {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    return await AgentMemory.create({
      agentId,
      timestamp: new Date(),
      projectType: event.projectType || null,
      role: event.role || null,
      skillApplied: event.skill || event.skillApplied || null,
    });
  } catch (e) {
    console.warn(`[memory-layer] save 실패 (${agentId}): ${e.message}`);
    return null;
  }
}

// Session Init 연결은 public/js/steward-workspace-ui.js의 StewardPassportPanel.init()이 담당
// (Passport → Mandate → Memory 순차 로딩). loadPassport/loadMandate가 프론트엔드 fetch 기반이라
// 이 백엔드 모듈에서 직접 조합할 수 없어 initAgentSession 헬퍼는 제거함 (Trang Manager 코드리뷰 지적, 2026-06-30).

module.exports = { loadMemoryLayer, saveMemoryEvent };

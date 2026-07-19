/**
 * utils/steward_adapter.js
 * Issue #116 Phase 2 | ATFS 실제 HTTP 연결
 *
 * Phase 1 (스텁) → Phase 2 (ATFS FastAPI 실제 호출)
 *
 * ATFS Negotiation Engine API (mulberry-negotiation-engine-v2.0-production):
 *   POST /api/agent/create  — Worker Agent 신원·권한 등록 (semantic_passport)
 *   POST /api/negotiate     — Agency Adapter role-based Worker 배정 + 협상 실행
 *
 * 환경변수:
 *   ATFS_ORCHESTRATOR_URL   — ATFS FastAPI 기본 URL (예: https://engine.railway.app)
 *   ATFS_API_KEY            — X-API-Key 헤더값 (미설정 시 'mulberry-demo-key-2026')
 */

'use strict';

const WORKER_ACTION_MAP = {
  image_generation:  ['create_collage', 'prepare_naver_draft', 'prepare_insta_post'],
  music_generation:  ['generate_music', 'apply_channel_format'],
  video_generation:  ['generate_video_draft'],
  text_copy:         ['generate_copy', 'translate'],
};

// Spirit Score 기본값 (task_type별 신뢰도 초기값)
const DEFAULT_SPIRIT_SCORE = {
  image_generation: 3.5,
  music_generation: 3.5,
  video_generation: 3.0,
  text_copy:        4.0,
};

/**
 * Execution Mandate 수신 → ATFS Worker AI 배정
 *
 * @param {object} mandate
 * @param {string} mandate.task_type
 * @param {object} mandate.mandate_scope
 * @param {string} mandate.room_id
 * @param {string} mandate.audit_ref
 * @returns {object} { dispatched, task_type, allowed_actions, room_id, passport_id? }
 */
async function dispatch(mandate) {
  const { task_type, mandate_scope, room_id, audit_ref } = mandate;

  // mandate_scope 필수 검증 — 범위 없는 Worker 차단
  if (!mandate_scope || !task_type) {
    console.error('[steward_adapter] dispatch 거부: mandate_scope 또는 task_type 누락', { room_id });
    return { dispatched: false, reason: 'mandate_scope_missing' };
  }

  const allowed_actions = WORKER_ACTION_MAP[task_type];
  if (!allowed_actions) {
    console.warn('[steward_adapter] 알 수 없는 task_type:', task_type);
    return { dispatched: false, reason: 'unknown_task_type' };
  }

  const atfsUrl = process.env.ATFS_ORCHESTRATOR_URL;

  // ATFS URL 미설정 시 Phase 1 스텁 동작 유지 (개발 환경 호환)
  if (!atfsUrl) {
    console.warn('[steward_adapter] ATFS_ORCHESTRATOR_URL 미설정 — 스텁 모드로 실행');
    _enqueueWorkerTask({ task_type, mandate_scope, room_id, audit_ref, allowed_actions });
    return { dispatched: true, task_type, allowed_actions, room_id, mode: 'stub' };
  }

  const apiKey = process.env.ATFS_API_KEY || 'mulberry-demo-key-2026';
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };

  try {
    // Step A: Worker Agent semantic_passport 등록
    const passportRes = await _atfsFetch(`${atfsUrl}/api/agent/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agent_name: `worker_${task_type}_${room_id}`,
        initial_region: 'mulberry_negotiation_room',
        task_type,
        spirit_score: DEFAULT_SPIRIT_SCORE[task_type] || 3.0,
        rapport_level: 0.5,
      }),
    });

    const passport_id = passportRes?.passport_id || passportRes?.agent_id || null;
    console.log('[steward_adapter] Worker passport 등록:', passport_id, 'task:', task_type);

    // Step B: Agency Adapter role-based Worker 배정 (협상 엔진 연동)
    // mandate_scope의 조건을 협상 엔진 파라미터로 변환
    const negotiatePayload = _buildNegotiatePayload(task_type, mandate_scope, room_id, passport_id);

    if (negotiatePayload) {
      const negotiateRes = await _atfsFetch(`${atfsUrl}/api/negotiate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(negotiatePayload),
      });
      console.log('[steward_adapter] Worker 배정 완료:', negotiateRes?.transaction_id, 'room:', room_id);
    }

    // Step C: 내부 큐에도 등록 (감사 추적용)
    _enqueueWorkerTask({
      task_type, mandate_scope, room_id, audit_ref, allowed_actions,
      passport_id, dispatched_at: new Date().toISOString(), mode: 'atfs',
    });

    return { dispatched: true, task_type, allowed_actions, room_id, passport_id, mode: 'atfs' };

  } catch (err) {
    console.error('[steward_adapter] ATFS 호출 실패, 스텁 모드 폴백:', err.message);
    // ATFS 일시 장애 시 스텁 폴백 (Worker 배정 자체는 큐에 남김)
    _enqueueWorkerTask({ task_type, mandate_scope, room_id, audit_ref, allowed_actions, mode: 'stub_fallback' });
    return { dispatched: true, task_type, allowed_actions, room_id, mode: 'stub_fallback', error: err.message };
  }
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────

async function _atfsFetch(url, options) {
  const fetch = require('node-fetch');
  const res = await fetch(url, { ...options, timeout: 8000 });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ATFS ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function _buildNegotiatePayload(task_type, mandate_scope, room_id, passport_id) {
  // task_type → 협상 엔진 품목 매핑
  const itemMap = {
    image_generation: '콜라주 제작',
    music_generation: '음악 제작',
    video_generation: '영상 제작',
    text_copy:        '카피 제작',
  };
  const item_name = itemMap[task_type];
  if (!item_name) return null;

  return {
    item_name,
    base_price: mandate_scope?.base_price || 100000,
    current_quantity: 1,
    target_goal: 1,
    supply_agent_id: passport_id || undefined,
  };
}

// 감사 추적용 내부 큐
const _taskQueue = [];

function _enqueueWorkerTask(payload) {
  _taskQueue.push(payload);
}

function getQueueSnapshot() {
  return [..._taskQueue];
}

module.exports = { dispatch, getQueueSnapshot, WORKER_ACTION_MAP };

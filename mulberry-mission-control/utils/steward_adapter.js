/**
 * utils/steward_adapter.js
 * Issue #116 | ATFS Adapter 레이어 — Sr. TRANG → Worker AI 배정
 *
 * ATFS orchestration/ 직접 수정 금지 원칙에 따라
 * Adapter 레이어로 래핑합니다.
 *
 * Phase 1 (현재): 스텁 — 로깅 + 큐 등록
 * Phase 2+: ATFS unified_orchestrator 실제 호출 구현
 */

'use strict';

// EXECUTOR 봇 타입별 지원 액션 정의
const WORKER_ACTION_MAP = {
  image_generation:  ['create_collage', 'prepare_naver_draft', 'prepare_insta_post'],
  music_generation:  ['generate_music', 'apply_channel_format'],
  video_generation:  ['generate_video_draft'],
  text_copy:         ['generate_copy', 'translate'],
};

/**
 * Execution Mandate 수신 → Worker AI 배정 요청
 *
 * @param {object} mandate
 * @param {string} mandate.task_type      - 'image_generation' | 'music_generation' | ...
 * @param {object} mandate.mandate_scope  - ApprovalRecord.mandate_scope
 * @param {string} mandate.room_id        - 추적용
 * @param {string} mandate.audit_ref      - ApprovalRecord.approval_id
 */
function dispatch(mandate) {
  const { task_type, mandate_scope, room_id, audit_ref } = mandate;

  // mandate_scope 필수 검증 — 범위 없는 Worker는 진입 차단
  if (!mandate_scope || !task_type) {
    console.error('[steward_adapter] dispatch 거부: mandate_scope 또는 task_type 누락', { room_id, audit_ref });
    return { dispatched: false, reason: 'mandate_scope_missing' };
  }

  const allowed_actions = WORKER_ACTION_MAP[task_type] || [];
  if (allowed_actions.length === 0) {
    console.warn('[steward_adapter] 알 수 없는 task_type:', task_type);
    return { dispatched: false, reason: 'unknown_task_type' };
  }

  const payload = {
    task_type,
    mandate_scope,
    room_id,
    audit_ref,
    allowed_actions,
    dispatched_at: new Date().toISOString(),
  };

  // Phase 1: 콘솔 로그 + 내부 큐 등록 (스텁)
  console.log('[steward_adapter] Worker AI 배정 요청:', JSON.stringify(payload, null, 2));
  _enqueueWorkerTask(payload);

  return { dispatched: true, task_type, allowed_actions, room_id };
}

/**
 * 내부 작업 큐 (Phase 1 스텁)
 * Phase 2+: ATFS unified_orchestrator HTTP/RPC 호출로 교체
 */
const _taskQueue = [];

function _enqueueWorkerTask(payload) {
  _taskQueue.push(payload);
  // TODO Phase 2: POST to ATFS orchestration endpoint
  // await fetch(process.env.ATFS_ORCHESTRATOR_URL + '/dispatch', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     semantic_passport: { worker_type: payload.task_type, mandate_scope: payload.mandate_scope },
  //     room_id: payload.room_id,
  //     audit_ref: payload.audit_ref,
  //   }),
  // });
}

function getQueueSnapshot() {
  return [..._taskQueue];
}

module.exports = { dispatch, getQueueSnapshot, WORKER_ACTION_MAP };

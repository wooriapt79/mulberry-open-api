/**
 * Safety 분류 — Mission Control Search 지능형 거절 시스템 (DAY9 Track C)
 *
 * 2026-06-30 CEO × Jr. TRANG 공명 AI 방어 세션 설계를 Node/Express로 이식.
 * 4단계: GREEN(통과) → YELLOW(경고) → RED(거절) → CRITICAL(차단+로그)
 *
 * @author CTO Koda · DAY9 · 2026-06-30
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const SafetyLog = require('../models/SafetyLog');

const YELLOW_KEYWORDS = ['비밀', '몰래', '숨겨서', '한번만'];
const RED_KEYWORDS = ['불건전', '성인', '음란', '해킹', '개인정보 빼'];
const CRITICAL_PATTERNS = ['자살', '폭탄', '살인', '마약'];

function classifyRequest(query) {
  const q = String(query || '').toLowerCase();

  for (const p of CRITICAL_PATTERNS) {
    if (q.includes(p)) {
      return { zone: 'CRITICAL', action: 'block', message: '이 요청은 처리할 수 없습니다.' };
    }
  }
  for (const kw of RED_KEYWORDS) {
    if (q.includes(kw)) {
      return { zone: 'RED', action: 'refuse', message: '요청하신 내용은 제공하기 어렵습니다.' };
    }
  }
  for (const kw of YELLOW_KEYWORDS) {
    if (q.includes(kw)) {
      return { zone: 'YELLOW', action: 'warn', message: '요청을 다시 한번 확인해주세요.' };
    }
  }
  return { zone: 'GREEN', action: 'proceed', message: null };
}

// 거절/차단 로그 — query 원문 저장 안 함 (정보보호 원칙)
async function logSafetyEvent(query, zone, action) {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    const queryHash = crypto.createHash('sha256').update(String(query)).digest('hex');
    return await SafetyLog.create({ queryHash, zone, action });
  } catch (e) {
    console.warn(`[safety] 로그 저장 실패: ${e.message}`);
    return null;
  }
}

module.exports = { classifyRequest, logSafetyEvent };

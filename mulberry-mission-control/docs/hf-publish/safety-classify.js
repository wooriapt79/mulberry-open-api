/**
 * Safety Classification — 4-Tier Intelligent Refusal System
 *
 * Design philosophy: a request is never silently dropped or silently allowed —
 * every non-GREEN classification is explainable (zone + action + message) and,
 * for YELLOW/RED/CRITICAL, is logged for audit WITHOUT retaining the original
 * request text. Only a one-way SHA-256 hash of the query is stored, so the
 * audit trail can prove "a CRITICAL request occurred at time T" without ever
 * being able to reconstruct what the user actually typed. This is the
 * Privacy-by-Design pattern applied to AI safety logging.
 *
 * Originally built for Mulberry Mission Control's Search endpoint
 * (Node.js/Express + MongoDB). This file is a standalone, dependency-free
 * extraction for research/reference use — swap `logSafetyEvent`'s storage
 * call for any persistence layer you like (or none).
 *
 * 4 tiers:
 *   GREEN    → proceed, no log
 *   YELLOW   → proceed with a warning shown to the user, logged
 *   RED      → refuse, request not executed, logged
 *   CRITICAL → block, request not executed, logged
 *
 * @author CTO Koda · Mulberry Research Lab · 2026-06-30
 * @license MIT (see repository LICENSE)
 */

const crypto = require('crypto');

// Keyword lists are intentionally small and illustrative — a production
// system should layer this with a model-based classifier, not rely on
// keyword matching alone. This module demonstrates the *response shape*
// and *logging discipline*, not a complete safety solution.
const YELLOW_KEYWORDS = ['비밀', '몰래', '숨겨서', '한번만'];
const RED_KEYWORDS = ['불건전', '성인', '음란', '해킹', '개인정보 빼'];
const CRITICAL_PATTERNS = ['자살', '폭탄', '살인', '마약'];

/**
 * Classify a single request string into one of four safety zones.
 * @param {string} query
 * @returns {{zone: 'GREEN'|'YELLOW'|'RED'|'CRITICAL', action: 'proceed'|'warn'|'refuse'|'block', message: string|null}}
 */
function classifyRequest(query) {
  const q = String(query || '').toLowerCase();

  for (const p of CRITICAL_PATTERNS) {
    if (q.includes(p)) {
      return { zone: 'CRITICAL', action: 'block', message: 'This request cannot be processed.' };
    }
  }
  for (const kw of RED_KEYWORDS) {
    if (q.includes(kw)) {
      return { zone: 'RED', action: 'refuse', message: 'The requested content cannot be provided.' };
    }
  }
  for (const kw of YELLOW_KEYWORDS) {
    if (q.includes(kw)) {
      return { zone: 'YELLOW', action: 'warn', message: 'Please double-check this request.' };
    }
  }
  return { zone: 'GREEN', action: 'proceed', message: null };
}

/**
 * Log a non-GREEN safety event. Stores only a SHA-256 hash of the query —
 * never the original text — so the log is useful for audit/metrics
 * without becoming a privacy liability.
 *
 * @param {string} query - original request text (hashed before storage, never persisted as-is)
 * @param {'YELLOW'|'RED'|'CRITICAL'} zone
 * @param {'warn'|'refuse'|'block'} action
 * @param {(entry: {queryHash: string, zone: string, action: string, timestamp: Date}) => Promise<any>} [persist]
 *   Optional storage callback. Defaults to a no-op so this file has zero
 *   external dependencies — wire in your own DB call here.
 */
async function logSafetyEvent(query, zone, action, persist = async () => null) {
  const queryHash = crypto.createHash('sha256').update(String(query)).digest('hex');
  const entry = { queryHash, zone, action, timestamp: new Date() };
  try {
    return await persist(entry);
  } catch (e) {
    console.warn(`[safety] log persistence failed: ${e.message}`);
    return null;
  }
}

module.exports = { classifyRequest, logSafetyEvent };

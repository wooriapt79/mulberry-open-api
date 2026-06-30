/**
 * Search API Route
 * POST /api/v1/search
 *
 * 1차: AGENCY_AGENTS_URL 설정 시 → 실 에이전트 HTTP 호출 (3초 타임아웃)
 * 2차: 실패 시 → Mock fallback (source: 'mock')
 *
 * @author CTO Koda · DAY5~DAY6 · 2026-06-17~19
 */

const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const http = require('http');
const https = require('https');
const { saveMemoryEvent } = require('../utils/memory-layer');

// SearchEventsManager는 server.js에서 주입받음
let searchEvents = null;

const AGENCY_URL = process.env.AGENCY_AGENTS_URL || null;
const AGENCY_TIMEOUT = parseInt(process.env.AGENCY_AGENTS_TIMEOUT_MS || '3000', 10);

/**
 * 실 에이전트 서버 HTTP 호출 (Promise, timeout 적용)
 */
function _callAgencyAgents(query) {
  return new Promise((resolve, reject) => {
    if (!AGENCY_URL) return reject(new Error('AGENCY_AGENTS_URL not set'));

    const url = new URL('/search', AGENCY_URL);
    const body = JSON.stringify({ query });
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid JSON from agency-agents')); }
        });
      }
    );

    req.setTimeout(AGENCY_TIMEOUT, () => { req.destroy(); reject(new Error('agency-agents timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * POST /api/v1/search
 * body: { query: string }
 * returns: SearchResult (JSON) with source: 'real' | 'mock'
 */
router.post('/', async (req, res) => {
  const { query, passportId } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query는 필수입니다.' });
  }

  const sessionId = randomUUID();
  const q = query.trim();

  // 소켓 실시간 알림 시작
  if (searchEvents) searchEvents.startSession(sessionId, q);

  let results;
  let source = 'mock';

  // 1차: 실 에이전트 시도
  if (AGENCY_URL) {
    try {
      const real = await _callAgencyAgents(q);
      results = { ...real, source: 'real' };
      source = 'real';
    } catch (err) {
      console.warn(`[search] agency-agents 실패 (fallback to mock): ${err.message}`);
      results = { ..._buildMockResults(q), source: 'mock' };
    }
  } else {
    results = { ..._buildMockResults(q), source: 'mock' };
  }

  // 소켓 push
  if (searchEvents) {
    for (const r of results.domain_results) {
      searchEvents.pushAgentResult(sessionId, { ...r, source });
    }
    searchEvents.finishSession(sessionId, {
      total_agents: results.total_agents,
      passed_agents: results.passed_agents,
    });
  }

  // Memory: Search 에이전트 호출 결과 수신 — Trang Manager 확정 (2026-06-30)
  saveMemoryEvent(passportId || 'anonymous', {
    projectType: 'search',
    role: 'searcher',
    skill: 'agent-search',
  });

  res.json({ sessionId, ...results });
});

// server.js에서 SearchEventsManager 주입
router.setSearchEvents = (mgr) => { searchEvents = mgr; };

module.exports = router;

// ---------------------------------------------------------------------------
// Mock 데이터 빌더 (Python 오케스트레이터 브리지 전까지 사용)
// ---------------------------------------------------------------------------

function _buildMockResults(query) {
  const agents = [
    { domain: 'agricultural_price',    spirit_score: 0.92, insight: _priceInsight(query) },
    { domain: 'local_supply',          spirit_score: 0.88, insight: '전국 수급 안정. 재고 14일치.' },
    { domain: 'regional_characteristic', spirit_score: 0.85, insight: _regionInsight(query) },
    { domain: 'elderly_consumer',      spirit_score: 0.90, insight: '어르신 선호도 높음. 재구매율 88%.' },
    { domain: 'group_buy_timing',      spirit_score: 0.87, insight: _timingInsight(query) },
    { domain: 'competitor_alternative', spirit_score: 0.82, insight: 'Mulberry 가격 약 25~32% 저렴.' },
    { domain: 'logistics_delivery',    spirit_score: 0.83, insight: _logisticsInsight(query) },
    { domain: 'weather_seasonal',      spirit_score: 0.88, insight: '여름: 냉장 보관 필수.' },
    { domain: 'nutrition_quality',     spirit_score: 0.91, insight: '품질등급 A. 어르신 적합도 매우 높음.' },
    { domain: 'consumer_review',       spirit_score: 0.80, insight: '평점 4.6/5.0. 재구매율 88%.' },
  ];

  const domainResults = agents.map((a) => ({
    domain: a.domain,
    spirit_score: a.spirit_score,
    passed: true,
    data: { insight: a.insight },
    error: null,
  }));

  return {
    query,
    answer: _buildAnswer(query, domainResults),
    domain_results: domainResults,
    filtered_out: [],
    total_agents: agents.length,
    passed_agents: agents.length,
    errors: [],
  };
}

function _extractItem(query) {
  const items = ['배추','감자','양파','마늘','고추','사과','배','쌀','콩','당근','시금치','파','무','호박'];
  return items.find(i => query.includes(i)) || null;
}

function _extractRegion(query) {
  const regions = ['인제','춘천','속초','강릉','홍천','양구','철원','화천','평창'];
  return regions.find(r => query.includes(r)) || null;
}

function _priceInsight(query) {
  const item = _extractItem(query);
  if (item === '배추') return '배추 현재 시세 2,400원/kg — 상승 중. 조기 구매가 유리합니다.';
  if (item === '감자') return '감자 현재 시세 1,200원/kg — 안정적. 9~10월 대량 출하 예정.';
  if (item === '양파') return '양파 현재 시세 900원/kg — 하락세. 3주 내 추가 하락 가능.';
  if (item === '사과') return '사과 현재 시세 3,800원/kg — 여름 품귀로 상승 중.';
  if (item) return `${item} 현재 시세 안정적. 구매 적정 시점입니다.`;
  const keyword = query.slice(0, 6);
  return `"${keyword}" 관련 시세 분석 중. 전반적으로 안정적 범위.`;
}

function _regionInsight(query) {
  const region = _extractRegion(query);
  if (region === '인제') return '인제군: 고령 인구 38%, 접근성 낮음. 거점 배송 효과 높음.';
  if (region === '춘천') return '춘천: 도심 밀집 지역. 온라인 주문 비율 62%.';
  if (region === '속초') return '속초: 관광 수요 높음. 제철 식재료 수요 급등.';
  if (region) return `${region}: 지역 특성 분석 완료. 공동구매 수요 양호.`;
  const keyword = query.slice(0, 6);
  return `"${keyword}" 지역 특성 분석 중. 도시 외곽 접근성 개선 권장.`;
}

function _timingInsight(query) {
  const item = _extractItem(query);
  const month = new Date().getMonth() + 1;
  if (item === '배추') return `배추 9~11월 최성기. 현재 ${month}월은 ${month >= 9 ? '최적' : '사전 확보'} 시점.`;
  if (item === '감자') return `감자 7~8월 출하 최성기. 현재 ${month}월 구매 ${month >= 7 && month <= 8 ? '최적' : '양호'}.`;
  if (item) return `${item} 구매 타이밍 양호. 현재 ${month}월 이후 가격 안정 예상.`;
  return `현재 ${month}월 기준 공동구매 타이밍 적절.`;
}

function _logisticsInsight(query) {
  const region = _extractRegion(query);
  if (region === '인제') return '인제 배송: 2일 소요, kg당 850원, 냉장 가능.';
  if (region === '춘천') return '춘천 배송: 당일~익일 소요, kg당 550원, 풀콜드체인.';
  if (region) return `${region} 배송: 2~3일 소요, 냉장·냉동 모두 가능.`;
  const item = _extractItem(query);
  if (item) return `${item} 물류: 냉장 보관 필수. 산지 직배송 가능.`;
  return '배송 조건 정상. 냉장·냉동 모두 가능.';
}

function _buildAnswer(query, results) {
  const item = _extractItem(query);
  const region = _extractRegion(query);
  const topInsights = results.slice(0, 3).map(r => r.data.insight).join(' / ');
  const subject = [region, item].filter(Boolean).join(' ') || `"${query.slice(0, 10)}"`;
  return `[Mulberry 검색] ${subject} 분석 완료\n\n핵심 요약: ${topInsights}\n\n─\n검색어: "${query}"\n에이전트 ${results.length}개 분석 · Spirit Gate 통과 기준 ≥ 0.70`;
}

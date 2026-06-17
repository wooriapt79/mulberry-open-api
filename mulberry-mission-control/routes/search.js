/**
 * Search API Route
 * POST /api/v1/search
 *
 * MulberrySearchOrchestrator를 호출하고 결과를 JSON으로 반환.
 * 소켓이 연결된 경우 실시간 에이전트별 결과도 push.
 *
 * @author CTO Koda · DAY5 · 2026-06-17
 */

const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');

// SearchEventsManager는 server.js에서 주입받음
let searchEvents = null;

/**
 * POST /api/v1/search
 * body: { query: string }
 * returns: SearchResult (JSON)
 */
router.post('/', async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query는 필수입니다.' });
  }

  const sessionId = randomUUID();

  // 소켓 실시간 알림 시작
  if (searchEvents) searchEvents.startSession(sessionId, query.trim());

  // Mock 검색 결과 — Python orchestrator와 브리지 전까지 정적 응답 반환
  // 실제 연동 시 python3 child_process 또는 HTTP 호출로 교체
  const mockResults = _buildMockResults(query.trim());

  // 에이전트 결과 개별 push (SSE 흉내)
  if (searchEvents) {
    for (const r of mockResults.domain_results) {
      searchEvents.pushAgentResult(sessionId, r);
    }
    searchEvents.finishSession(sessionId, {
      total_agents: mockResults.total_agents,
      passed_agents: mockResults.passed_agents,
    });
  }

  res.json({ sessionId, ...mockResults });
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

function _priceInsight(query) {
  if (query.includes('배추')) return '배추 현재 시세 2,400원/kg — 상승 중. 조기 구매가 유리합니다.';
  if (query.includes('감자')) return '감자 현재 시세 2,400원/kg — 안정적.';
  return '시세 정상 범위. 구매 적정 시점.';
}

function _regionInsight(query) {
  if (query.includes('인제')) return '인제군: 고령 인구 38%, 접근성 낮음. 거점 배송 효과 높음.';
  return '지역 데이터 조회 중.';
}

function _timingInsight(query) {
  if (query.includes('배추')) return '배추 9~11월이 최성기. 현재 6월은 적정 수준.';
  return '현재 구매 타이밍 양호.';
}

function _logisticsInsight(query) {
  if (query.includes('인제')) return '인제 배송: 2일 소요, kg당 850원, 냉장 가능.';
  return '배송 조건 정상.';
}

function _buildAnswer(query, results) {
  const lines = [`"${query}"에 대한 Mulberry 멀티에이전트 검색 결과:\n`];
  for (const r of results) {
    lines.push(`[${r.domain}] ${r.data.insight}`);
  }
  return lines.join('\n');
}

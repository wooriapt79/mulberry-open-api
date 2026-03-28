/**
 * Test Token Generator
 * Dashboard API 테스트용 임시 토큰 생성
 * ⚠️ 프로덕션에서는 제거하세요!
 *
 * @author CTO Koda
 * @date 2026-03-28
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

/**
 * GET /api/test/token
 * 테스트용 JWT 토큰 생성
 */
router.get('/token', (req, res) => {
  const testUser = {
    userId: 'test_user_001',
    username: 'test_admin',
    role: 'admin',
    email: 'test@mulberry.local'
  };

  const token = jwt.sign(
    testUser,
    process.env.JWT_SECRET || 'mulberry-jwt-secret-2026',
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    message: '⚠️ TEST token only! Remove in production.',
    token: token,
    user: testUser,
    expiresIn: '24 hours',
    usage: {
      header: 'Authorization',
      value: `Bearer ${token}`,
      example: `curl -H "Authorization: Bearer ${token}" https://[domain]/api/dashboard/stats`
    }
  });
});

/**
 * GET /api/test/endpoints
 * 테스트 가능한 엔드포인트 목록
 */
router.get('/endpoints', (req, res) => {
  const endpoints = [
    {
      category: 'Dashboard',
      endpoints: [
        { method: 'GET', path: '/api/dashboard/stats', auth: true },
        { method: 'GET', path: '/api/dashboard/module-status', auth: true },
        { method: 'GET', path: '/api/dashboard/activity-summary', auth: true }
      ]
    },
    {
      category: 'Regions',
      endpoints: [
        { method: 'GET', path: '/api/regions/inje/overview', auth: true },
        { method: 'GET', path: '/api/regions/inje/sensors', auth: true }
      ]
    },
    {
      category: 'Agents',
      endpoints: [
        { method: 'GET', path: '/api/agents/team', auth: true },
        { method: 'GET', path: '/api/agents/agent_01/status', auth: true }
      ]
    },
    {
      category: 'Trust',
      endpoints: [
        { method: 'GET', path: '/api/trust/score', auth: true },
        { method: 'GET', path: '/api/trust/timeline', auth: true },
        { method: 'GET', path: '/api/trust/risk-assessment', auth: true }
      ]
    },
    {
      category: 'Actions',
      endpoints: [
        { method: 'POST', path: '/api/actions/override-agent', auth: true },
        { method: 'POST', path: '/api/actions/trigger-recovery', auth: true },
        { method: 'POST', path: '/api/actions/send-broadcast', auth: true },
        { method: 'POST', path: '/api/actions/escalate-to-human', auth: true }
      ]
    }
  ];

  res.json({
    success: true,
    totalEndpoints: endpoints.reduce((sum, cat) => sum + cat.endpoints.length, 0),
    categories: endpoints,
    instructions: {
      step1: 'Get test token: GET /api/test/token',
      step2: 'Use token in header: Authorization: Bearer [token]',
      step3: 'Test endpoints with authentication'
    }
  });
});

module.exports = router;

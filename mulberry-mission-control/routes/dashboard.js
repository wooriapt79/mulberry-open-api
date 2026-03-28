/**
 * Dashboard API Routes - Mission Control Stats
 * UI 디자인에 맞춘 실시간 통계 제공
 * @author CTO Koda | @date 2026-03-28
 */
const express = require('express');
const router = express.Router();
const { jwtMiddleware } = require('../middleware/auth');


// GET /api/dashboard/stats - 상단 헤더 전체 시스템 통계
router.get('/stats', async (req, res) => {
  try {
    const stats = await calculateDashboardStats();
    res.json({ success: true, timestamp: new Date(), stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/dashboard/module-status - MODULE STATUS (4개 API 상태)
router.get('/module-status', async (req, res) => {
  try {
    const moduleStatus = await checkModuleStatus();
    res.json({ success: true, modules: moduleStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/dashboard/activity-summary - 네트워크 그래프 + AP2 Payment Flow
router.get('/activity-summary', async (req, res) => {
  try {
    const summary = await getActivitySummary();
    res.json({ success: true, timestamp: new Date(), summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });

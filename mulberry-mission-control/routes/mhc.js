/**
 * TAB 7: mHC (Manifold Hyper Connector) Routes
 * 
 * AI 중심 통합 허브 대시보드
 * 시스템 간 데이터 라우팅, AI 분석, 실시간 통계
 */

const express = require('express');
const router = express.Router();
const MHC_Log = require('../models/MHC_Log');
const { jwtMiddleware } = require('../utils/jwt');
const { requireLevel } = require('../middleware/auth');

/**
 * GET /api/mhc/dashboard
 * mHC 대시보드 데이터
 */
router.get('/dashboard', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const dashboardData = await MHC_Log.getDashboardData();
    
    res.json({
      success: true,
      dashboard: dashboardData,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mhc/logs
 * mHC 활동 로그
 */
router.get('/logs', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const source = req.query.source;
    const status = req.query.status;
    
    let query = {};
    
    if (source) {
      query.source = source;
    }
    
    if (status) {
      query.status = status;
    }
    
    const logs = await MHC_Log.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('relatedUsers', 'username displayName')
      .populate('relatedChannels', 'name displayName');
    
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mhc/stats/traffic
 * 시스템 간 트래픽 통계
 */
router.get('/stats/traffic', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000; // 기본 1시간
    
    const trafficStats = await MHC_Log.getTrafficStats(timeRange);
    
    res.json({
      success: true,
      timeRange,
      stats: trafficStats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mhc/stats/ai
 * AI 처리 통계
 */
router.get('/stats/ai', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000;
    
    const aiStats = await MHC_Log.getAIStats(timeRange);
    
    res.json({
      success: true,
      timeRange,
      stats: aiStats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mhc/analyze
 * 수동 AI 분석 트리거
 */
router.post('/analyze', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const { source, destination, action, payload } = req.body;
    
    if (!source || !action) {
      return res.status(400).json({
        success: false,
        error: 'Source and action are required'
      });
    }
    
    // mHC 로그 생성
    const log = new MHC_Log({
      source,
      destination: destination || 'none',
      action,
      payload: payload || {},
      status: 'processing',
      priority: 50,
      relatedUsers: req.userId ? [req.userId] : []
    });
    
    await log.save();
    
    // AI 분석 시뮬레이션 (실제로는 DeepSeek V4 API 호출)
    const analysis = {
      model: 'deepseek-v4',
      analysis: `${action} 작업을 분석했습니다`,
      confidence: 0.85,
      category: 'system',
      sentiment: 'neutral',
      urgency: 'normal'
    };
    
    // urgency에 따라 priority 자동 조정
    await log.addAIAnalysis(analysis);
    
    // 처리 완료
    const processingTime = Date.now() - log.createdAt.getTime();
    await log.markCompleted(processingTime);
    
    res.json({
      success: true,
      log,
      analysis
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mhc/connections
 * 시스템 연결 상태
 */
router.get('/connections', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    // 각 시스템의 최근 활동 확인
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    const systems = ['chat', 'email', 'field', 'github', 'hf_spaces', 'api', 'notification'];
    
    const connections = await Promise.all(
      systems.map(async (system) => {
        const recentActivity = await MHC_Log.countDocuments({
          $or: [{ source: system }, { destination: system }],
          createdAt: { $gte: oneHourAgo }
        });
        
        const lastLog = await MHC_Log.findOne({
          $or: [{ source: system }, { destination: system }]
        }).sort({ createdAt: -1 });
        
        return {
          system,
          status: recentActivity > 0 ? 'active' : 'inactive',
          activityCount: recentActivity,
          lastActivity: lastLog ? lastLog.createdAt : null
        };
      })
    );
    
    res.json({
      success: true,
      connections,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mhc/pending
 * 처리 대기 중인 작업
 */
router.get('/pending', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const pendingLogs = await MHC_Log.find({ status: 'pending' })
      .sort({ priority: -1, createdAt: 1 })
      .limit(50);
    
    res.json({
      success: true,
      count: pendingLogs.length,
      logs: pendingLogs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mhc/urgent
 * 긴급 작업
 */
router.get('/urgent', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const urgentLogs = await MHC_Log.find({
      'aiDecision.urgency': { $in: ['high', 'critical'] },
      status: { $in: ['pending', 'processing'] }
    })
    .sort({ 'aiDecision.urgency': -1, createdAt: 1 })
    .limit(20);
    
    res.json({
      success: true,
      count: urgentLogs.length,
      logs: urgentLogs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mhc/log
 * 수동 로그 생성 (테스트용)
 */
router.post('/log', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const { source, destination, action, payload, priority } = req.body;
    
    const log = new MHC_Log({
      source: source || 'system',
      destination: destination || 'none',
      action: action || 'manual_log',
      payload: payload || {},
      priority: priority || 50,
      status: 'completed',
      relatedUsers: [req.userId]
    });
    
    await log.save();
    
    res.status(201).json({
      success: true,
      log
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mhc/performance
 * 성능 지표
 */
router.get('/performance', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    const performance = await MHC_Log.aggregate([
      { $match: { createdAt: { $gte: oneHourAgo }, processingTime: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' },
          minProcessingTime: { $min: '$processingTime' },
          maxProcessingTime: { $max: '$processingTime' },
          totalProcessed: { $sum: 1 }
        }
      }
    ]);
    
    const result = performance[0] || {
      avgProcessingTime: 0,
      minProcessingTime: 0,
      maxProcessingTime: 0,
      totalProcessed: 0
    };
    
    // 성공률
    const [totalLogs, successfulLogs] = await Promise.all([
      MHC_Log.countDocuments({ createdAt: { $gte: oneHourAgo } }),
      MHC_Log.countDocuments({ createdAt: { $gte: oneHourAgo }, status: 'completed' })
    ]);
    
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      performance: {
        avgProcessingTime: Math.round(result.avgProcessingTime),
        minProcessingTime: result.minProcessingTime,
        maxProcessingTime: result.maxProcessingTime,
        totalProcessed: result.totalProcessed,
        successRate: parseFloat(successRate),
        timeRange: '1h'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

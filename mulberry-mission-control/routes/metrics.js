/**
 * KPI Metrics Overview API
 * GET /api/v1/metrics/overview
 * @author CTO Koda (fixed by Trang 2026-04-12)
 */

const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const StateLifeAgent = require('../models/StateLifeAgent');
const Channel = require('../models/Channel');
const { requireAuth } = require('../middleware/auth');

let redisClient = null;
try {
  const redis = require('redis');
  redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.connect();
} catch (error) {
  console.log('Redis not available, using direct queries');
}

router.get('/overview', requireAuth, async (req, res) => {
  try {
    const cacheKey = 'kpi:overview';
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      } catch (err) {}
    }
    const [normalAgents, stateLifeAgents] = await Promise.all([
      Agent.countDocuments({ status: { $in: ['online', 'busy'] } }),
      StateLifeAgent.countDocuments({ status: { $in: ['online', 'busy'] } })
    ]);
    const activeAgents = normalAgents + stateLifeAgents;
    const activeCommunities = await Channel.countDocuments({ type: { $in: ['community', 'public'] }, status: 'active' });
    const [lowTrustAgents, highWarningAgents] = await Promise.all([
      Agent.countDocuments({ trustScore: { $lt: 50 } }),
      StateLifeAgent.countDocuments({ 'stateLife.communityReputation.warningStack': { $gte: 2 } })
    ]);
    const riskAlerts = lowTrustAgents + highWarningAgents;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const transactionsToday = await Agent.aggregate([
      { $match: { 'activityLog.timestamp': { $gte: today, $lt: tomorrow } } },
      { $unwind: '$activityLog' },
      { $match: { 'activityLog.timestamp': { $gte: today, $lt: tomorrow }, 'activityLog.action': { $in: ['task_completed','order_processed','groupbuy_created'] } } },
      { $count: 'total' }
    ]);
    const response = {
      active_agents: activeAgents,
      active_communities: activeCommunities,
      risk_alerts: riskAlerts,
      transactions_today: transactionsToday[0]?.total || 0,
      last_updated_at: new Date().toISOString()
    };
    if (redisClient) {
      try { await redisClient.setEx(cacheKey, 30, JSON.stringify(response)); } catch (err) {}
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KPI metrics', message: error.message });
  }
});

router.get('/agents', requireAuth, async (req, res) => {
  try {
    const stats = await Agent.aggregate([{ $facet: { byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }], byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }], avgTrustScore: [{ $group: { _id: null, avg: { $avg: '$trustScore' } } }] } }]);
    res.json({ by_type: stats[0].byType, by_status: stats[0].byStatus, avg_trust_score: stats[0].avgTrustScore[0]?.avg || 0, last_updated_at: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent statistics', message: error.message });
  }
});

module.exports = router;

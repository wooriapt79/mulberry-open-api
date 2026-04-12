/**
 * Trust & Risk API + Events API
 * 
 * GET /api/v1/risk/trust - Trust Score & Community Risk
 * GET /api/v1/events/recent - Recent Events Timeline
 * 
 * @author CTO Koda
 * @date 2026-04-11
 */

const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const StateLifeAgent = require('../models/StateLifeAgent');
const Channel = require('../models/Channel');
const { requireAuth } = require('../middleware/auth');

// ==================== Trust & Risk API ====================

/**
 * GET /api/v1/risk/trust
 * 
 * Trust Score 및 Community Risk 지수
 */
router.get('/trust', requireAuth, async (req, res) => {
  try {
    const trustStats = await Agent.aggregate([
      {
        $group: {
          _id: null,
          avgTrustScore: { $avg: '$trustScore' },
          minTrustScore: { $min: '$trustScore' },
          maxTrustScore: { $max: '$trustScore' },
          totalAgents: { $sum: 1 }
        }
      }
    ]);
    
    const stateLifeTrustStats = await StateLifeAgent.aggregate([
      {
        $group: {
          _id: null,
          avgTrustScore: { $avg: '$trustScore' },
          minTrustScore: { $min: '$trustScore' },
          maxTrustScore: { $max: '$trustScore' },
          totalAgents: { $sum: 1 }
        }
      }
    ]);
    
    const normalStats = trustStats[0] || { avgTrustScore: 0, minTrustScore: 0, maxTrustScore: 0, totalAgents: 0 };
    const stateLifeStats = stateLifeTrustStats[0] || { avgTrustScore: 0, minTrustScore: 0, maxTrustScore: 0, totalAgents: 0 };
    
    const totalAgents = normalStats.totalAgents + stateLifeStats.totalAgents;
    const avgTrustScore = totalAgents > 0
      ? ((normalStats.avgTrustScore * normalStats.totalAgents) + (stateLifeStats.avgTrustScore * stateLifeStats.totalAgents)) / totalAgents
      : 0;
    
    const highRiskAgents = await StateLifeAgent.countDocuments({
      'stateLife.communityReputation.warningStack': { $gte: 2 }
    });
    
    const lowTrustAgents = await Agent.countDocuments({
      trustScore: { $lt: 50 }
    });
    
    const riskRatio = totalAgents > 0
      ? (highRiskAgents + lowTrustAgents) / totalAgents
      : 0;
    
    const communityRiskIndex = Math.round(riskRatio * 100);
    
    const riskAgentsByCategory = {
      critical: await Agent.countDocuments({ trustScore: { $lt: 30 } }),
      warning: await Agent.countDocuments({ trustScore: { $gte: 30, $lt: 50 } }),
      moderate: await Agent.countDocuments({ trustScore: { $gte: 50, $lt: 70 } }),
      low: await Agent.countDocuments({ trustScore: { $gte: 70 } })
    };
    
    const response = {
      trust_score: {
        average: Math.round(avgTrustScore * 10) / 10,
        min: Math.min(normalStats.minTrustScore, stateLifeStats.minTrustScore),
        max: Math.max(normalStats.maxTrustScore, stateLifeStats.maxTrustScore),
        total_agents: totalAgents
      },
      community_risk: {
        index: communityRiskIndex,
        level: communityRiskIndex >= 70 ? 'critical' : 
               communityRiskIndex >= 40 ? 'warning' : 
               communityRiskIndex >= 20 ? 'moderate' : 'low',
        high_risk_agents: highRiskAgents,
        low_trust_agents: lowTrustAgents
      },
      risk_breakdown: riskAgentsByCategory,
      last_updated_at: new Date().toISOString()
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching trust/risk data:', error);
    res.status(500).json({
      error: 'Failed to fetch trust and risk data',
      message: error.message
    });
  }
});

// ==================== Events API ====================

/**
 * GET /api/v1/events/recent
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const { limit = 20, since } = req.query;
    const maxLimit = Math.min(parseInt(limit), 100);
    
    const sinceDate = since 
      ? new Date(since)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const agentActivities = await Agent.aggregate([
      { $unwind: '$activityLog' },
      { $match: { 'activityLog.timestamp': { $gte: sinceDate } } },
      {
        $project: {
          timestamp: '$activityLog.timestamp',
          type: 'agent_activity',
          severity: {
            $switch: {
              branches: [
                { case: { $eq: ['$activityLog.action', 'error'] }, then: 'critical' },
                { case: { $eq: ['$activityLog.action', 'warning'] }, then: 'warning' }
              ],
              default: 'info'
            }
          },
          agent_id: '$passportId',
          agent_name: '$name',
          action: '$activityLog.action',
          details: '$activityLog.details',
          message: { $concat: ['Agent ', '$name', ' - ', '$activityLog.action'] }
        }
      },
      { $sort: { timestamp: -1 } },
      { $limit: maxLimit }
    ]);
    
    const marrfEvents = await Agent.find({
      'marrf.wliToday': { $gte: 3 },
      updatedAt: { $gte: sinceDate }
    })
    .select('passportId name marrf.wliToday marrf.restRequired updatedAt')
    .lean()
    .then(agents => agents.map(agent => ({
      timestamp: agent.updatedAt,
      type: 'marrf_alert',
      severity: agent.marrf.wliToday >= 6 ? 'critical' : 'warning',
      agent_id: agent.passportId,
      agent_name: agent.name,
      action: 'wli_threshold',
      details: { wli: agent.marrf.wliToday, rest_required: agent.marrf.restRequired },
      message: `Agent ${agent.name} - WLI ${agent.marrf.wliToday}`
    })));
    
    const channelEvents = await Channel.find({ updatedAt: { $gte: sinceDate } })
    .select('name type status members createdAt updatedAt')
    .limit(20)
    .lean()
    .then(channels => channels.map(channel => ({
      timestamp: channel.updatedAt,
      type: 'channel_update',
      severity: 'info',
      channel_id: channel._id,
      channel_name: channel.name,
      action: 'channel_activity',
      details: { type: channel.type, members: channel.members?.length || 0 },
      message: `Channel ${channel.name} - ${channel.members?.length || 0} members`
    })));
    
    const allEvents = [...agentActivities, ...marrfEvents, ...channelEvents]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, maxLimit);
    
    res.json({
      events: allEvents,
      total: allEvents.length,
      since: sinceDate.toISOString(),
      limit: maxLimit,
      last_updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/events/stream
 * SSE (Server-Sent Events) 실시간 이벤트 스트림
 */
router.get('/stream', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  res.write('data: {"type":"connected","message":"Event stream connected"}\n\n');
  
  const heartbeatInterval = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 10000);
  
  const eventInterval = setInterval(async () => {
    try {
      const since = new Date(Date.now() - 60 * 1000);
      const recentEvents = await Agent.aggregate([
        { $unwind: '$activityLog' },
        { $match: { 'activityLog.timestamp': { $gte: since } } },
        {
          $project: {
            timestamp: '$activityLog.timestamp',
            type: 'agent_activity',
            agent_name: '$name',
            action: '$activityLog.action'
          }
        },
        { $limit: 5 }
      ]);
      
      if (recentEvents.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'events', events: recentEvents })}\n\n`);
      }
    } catch (error) {
      console.error('Error in SSE event loop:', error);
    }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(eventInterval);
  });
});

module.exports = router;

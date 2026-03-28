/**
 * Agent Team API Routes
 * 
 * AGENT TEAM 섹션 지원
 * 
 * @author CTO Koda
 * @date 2026-03-28
 */

const express = require('express');
const router = express.Router();
const { jwtMiddleware } = require('../middleware/auth');

/**
 * GET /api/agents/team
 * AGENT TEAM 섹션 - 7명 에이전트 상태
 */
router.get('/team', jwtMiddleware, async (req, res) => {
  try {
    const team = await getAgentTeam();
    res.json({
      success: true,
      team: team,
      totalAgents: team.length,
      onlineCount: team.filter(a => a.status === 'online').length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/agents/:agentId/status
 * 특정 에이전트 상태 조회
 */
router.get('/:agentId/status', jwtMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentStatus = await getAgentStatus(agentId);
    res.json({ success: true, agent: agentStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/agents/:agentId/override
 * ACTION PANEL - Override Agent
 */
router.post('/:agentId/override', jwtMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { action, params } = req.body;
    const result = await overrideAgent(agentId, action, params);
    res.json({ success: true, message: 'Agent override executed', result: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Helper Functions ====================

async function getAgentTeam() {
  return [
    { id: 'agent_01', name: 'Sarah Kim', avatar: '/avatars/sarah.jpg', status: 'online', statusColor: 'green', currentTask: 'Negotiation - Success', skillset: ['SKL-001', 'SKL-002', 'SKL-005'], trustScore: 95 },
    { id: 'agent_02', name: 'Mike Chen', avatar: '/avatars/mike.jpg', status: 'busy', statusColor: 'yellow', currentTask: 'Payment Processing', skillset: ['SKL-001', 'SKL-003', 'SKL-004'], trustScore: 88 },
    { id: 'agent_03', name: 'Emily Park', avatar: '/avatars/emily.jpg', status: 'online', statusColor: 'green', currentTask: 'Payment - Completed', skillset: ['SKL-002', 'SKL-004'], trustScore: 92 },
    { id: 'agent_04', name: 'David Lee', avatar: '/avatars/david.jpg', status: 'busy', statusColor: 'orange', currentTask: 'Health Check Analysis', skillset: ['SKL-001', 'SKL-003'], trustScore: 87 },
    { id: 'agent_05', name: 'Jessica Wang', avatar: '/avatars/jessica.jpg', status: 'online', statusColor: 'green', currentTask: 'Idle', skillset: ['SKL-005', 'SKL-006'], trustScore: 90 },
    { id: 'agent_06', name: 'Tom Johnson', avatar: '/avatars/tom.jpg', status: 'online', statusColor: 'green', currentTask: 'Monitoring', skillset: ['SKL-001', 'SKL-005'], trustScore: 85 },
    { id: 'agent_07', name: 'Dr. Anderson', avatar: '/avatars/anderson.jpg', status: 'alert', statusColor: 'red', currentTask: 'Fall Detected - Alert', skillset: ['SKL-001', 'SKL-003', 'SKL-005'], trustScore: 93 }
  ];
}

async function getAgentStatus(agentId) {
  const team = await getAgentTeam();
  const agent = team.find(a => a.id === agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);
  return {
    ...agent,
    detailedMetrics: {
      tasksCompleted: Math.floor(Math.random() * 100) + 50,
      successRate: Math.floor(Math.random() * 20) + 80,
      avgResponseTime: Math.floor(Math.random() * 1000) + 500,
      lastActive: new Date(Date.now() - Math.random() * 3600000)
    }
  };
}

async function overrideAgent(agentId, action, params) {
  console.log(`🔧 Override Agent ${agentId}: ${action}`);
  return { agentId, action, params, timestamp: new Date(), status: 'executed' };
}

module.exports = router;

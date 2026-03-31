/**
 * Agent 생성 API
 * 
 * Trang 명세서 기반 구현
 * 3문항 → 타입 판별 → Agent 생성 → Passport 발급
 * 
 * @author CTO Koda
 * @date 2026-03-31
 */

const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/agents/create
 * 
 * Agent 생성 (3문항 기반 타입 자동 판별)
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const {
      name,
      q1_space,      // 'system_internal', 'field', 'community'
      q2_task,       // 'monitoring_management', 'delivery_order_sales', 'groupbuy_planning'
      q3_ap2,        // 'not_needed', 'optional', 'required'
      // Type별 추가 설정 (선택)
      type1Settings,
      type2Settings,
      type3Settings
    } = req.body;
    
    const userId = req.user.userId;
    
    // ==================== 입력 검증 ====================
    if (!name || !q1_space || !q2_task || !q3_ap2) {
      return res.status(400).json({
        success: false,
        message: '필수 항목을 모두 입력해주세요 ❌'
      });
    }

    // ==================== 타입 판별 로직 ====================
    const agentType = determineAgentType(q1_space, q2_task, q3_ap2);
    
    if (!agentType) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 질문 조합입니다 ❌'
      });
    }

    // ==================== Agent Passport 자동 발급 ====================
    const passportId = Agent.generatePassportId(agentType.type);

    // ==================== Agent 생성 ====================
    const agent = new Agent({
      passportId: passportId,
      name: name,
      type: agentType.type,
      role: agentType.role,
      status: 'offline',
      createdBy: userId,
      creationAnswers: {
        q1_space: q1_space,
        q2_task: q2_task,
        q3_ap2: q3_ap2
      },
      trustScore: 70, // 초기값
      activityLog: [{
        timestamp: new Date(),
        action: 'agent_created',
        details: {
          createdBy: userId,
          type: agentType.type
        }
      }]
    });

    // ==================== Type별 설정 적용 ====================
    
    // Type 1: 시스템 운영 Agent
    if (agentType.type === 'type1_system') {
      agent.type1Settings = {
        monitoringScope: type1Settings?.monitoringScope || ['system_health', 'agent_status'],
        accessLevel: type1Settings?.accessLevel || 'read_only',
        alertThresholds: type1Settings?.alertThresholds || {
          cpu: 80,
          memory: 85,
          responseTime: 1000
        },
        reportInterval: type1Settings?.reportInterval || 'daily'
      };
    }
    
    // Type 2: 현장 운영 Agent
    else if (agentType.type === 'type2_field') {
      agent.type2Settings = {
        raspberryPiIds: type2Settings?.raspberryPiIds || [],
        assignedRegion: type2Settings?.assignedRegion || '',
        assignedLocation: type2Settings?.assignedLocation || null,
        orderProcessingAuth: type2Settings?.orderProcessingAuth || {
          maxAmount: 100000,
          requiresApproval: true
        },
        escalationRules: type2Settings?.escalationRules || {
          conditions: ['order_over_limit', 'system_error', 'emergency'],
          notifyTo: ''
        },
        ap2Enabled: q3_ap2 === 'required' || q3_ap2 === 'optional',
        kakaoChannelId: type2Settings?.kakaoChannelId || ''
      };
    }
    
    // Type 3: 공동구매 Agent
    else if (agentType.type === 'type3_groupbuy') {
      agent.type3Settings = {
        ap2Required: true, // Type 3는 필수
        ap2Config: type3Settings?.ap2Config || {
          merchantId: '',
          apiKey: '',
          settlementAccount: ''
        },
        assignedCommunity: type3Settings?.assignedCommunity || '',
        productCategories: type3Settings?.productCategories || ['food', 'daily_goods'],
        groupbuyPeriod: type3Settings?.groupbuyPeriod || {
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후
        },
        participantLimits: type3Settings?.participantLimits || {
          min: 5,
          max: 100
        },
        settlementRules: type3Settings?.settlementRules || {
          method: 'ap2_auto',
          schedule: 'weekly',
          feePercentage: 3
        }
      };
    }

    await agent.save();

    // ==================== 응답 ====================
    res.json({
      success: true,
      message: `${agentType.role} 생성 완료! 🎉`,
      data: {
        passportId: agent.passportId,
        name: agent.name,
        type: agent.type,
        role: agent.role,
        trustScore: agent.trustScore,
        status: agent.status,
        ap2Status: getAP2Status(agent),
        createdAt: agent.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Agent 생성 실패 ❌',
      error: error.message
    });
  }
});

/**
 * GET /api/agents/my
 * 
 * 내가 생성한 Agent 목록
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const agents = await Agent.find({ createdBy: userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        count: agents.length,
        agents: agents.map(agent => ({
          passportId: agent.passportId,
          name: agent.name,
          type: agent.type,
          role: agent.role,
          status: agent.status,
          trustScore: agent.trustScore,
          ap2Status: getAP2Status(agent),
          createdAt: agent.createdAt,
          statistics: agent.statistics
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching my agents:', error);
    res.status(500).json({
      success: false,
      message: 'Agent 목록 조회 실패 ❌',
      error: error.message
    });
  }
});

/**
 * GET /api/agents/:passportId
 * 
 * Agent 상세 정보
 */
router.get('/:passportId', requireAuth, async (req, res) => {
  try {
    const { passportId } = req.params;
    
    const agent = await Agent.findOne({ passportId: passportId })
      .populate('createdBy', 'username displayName avatar')
      .populate('supervisorAgent', 'passportId name role')
      .populate('supervisedAgents', 'passportId name role status');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent를 찾을 수 없습니다 ❌'
      });
    }

    res.json({
      success: true,
      data: agent
    });
    
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      message: 'Agent 조회 실패 ❌',
      error: error.message
    });
  }
});

/**
 * PUT /api/agents/:passportId/status
 * 
 * Agent 상태 변경
 */
router.put('/:passportId/status', requireAuth, async (req, res) => {
  try {
    const { passportId } = req.params;
    const { status } = req.body;
    
    if (!['online', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상태입니다 ❌'
      });
    }

    const agent = await Agent.findOne({ passportId: passportId });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent를 찾을 수 없습니다 ❌'
      });
    }

    // MARRF 휴식 중인 Agent는 상태 변경 불가
    if (agent.marrf.restRequired && status !== 'on_rest') {
      return res.status(403).json({
        success: false,
        message: 'MARRF 휴식이 필요한 Agent입니다. 내일 다시 시도해주세요 ⏳'
      });
    }

    agent.status = status;
    await agent.logActivity('status_changed', { newStatus: status });

    res.json({
      success: true,
      message: '상태 변경 완료 ✅',
      data: {
        passportId: agent.passportId,
        status: agent.status
      }
    });
    
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      message: '상태 변경 실패 ❌',
      error: error.message
    });
  }
});

/**
 * GET /api/agents/stats/overview
 * 
 * 전체 Agent 통계
 */
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    const totalAgents = await Agent.countDocuments();
    const type1Count = await Agent.countDocuments({ type: 'type1_system' });
    const type2Count = await Agent.countDocuments({ type: 'type2_field' });
    const type3Count = await Agent.countDocuments({ type: 'type3_groupbuy' });
    
    const onlineCount = await Agent.countDocuments({ status: 'online' });
    const busyCount = await Agent.countDocuments({ status: 'busy' });
    const restCount = await Agent.countDocuments({ status: 'on_rest' });
    
    const avgTrustScore = await Agent.aggregate([
      { $group: { _id: null, avg: { $avg: '$trustScore' } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalAgents,
        byType: {
          type1_system: type1Count,
          type2_field: type2Count,
          type3_groupbuy: type3Count
        },
        byStatus: {
          online: onlineCount,
          busy: busyCount,
          on_rest: restCount,
          offline: totalAgents - onlineCount - busyCount - restCount
        },
        averageTrustScore: avgTrustScore[0]?.avg || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 실패 ❌',
      error: error.message
    });
  }
});

// ==================== Helper Functions ====================

/**
 * 타입 판별 로직 (Q1 + Q2 + Q3 조합)
 */
function determineAgentType(q1_space, q2_task, q3_ap2) {
  // Type 1: 시스템 운영 Agent
  if (q1_space === 'system_internal' && 
      q2_task === 'monitoring_management' && 
      q3_ap2 === 'not_needed') {
    return {
      type: 'type1_system',
      role: '시스템 운영 Agent'
    };
  }
  
  // Type 2: 현장 운영 Agent
  if (q1_space === 'field' && 
      q2_task === 'delivery_order_sales' && 
      (q3_ap2 === 'optional' || q3_ap2 === 'not_needed')) {
    return {
      type: 'type2_field',
      role: '현장 운영 Agent'
    };
  }
  
  // Type 3: 공동구매 Agent
  if (q1_space === 'community' && 
      q2_task === 'groupbuy_planning' && 
      q3_ap2 === 'required') {
    return {
      type: 'type3_groupbuy',
      role: '공동구매 Agent'
    };
  }
  
  // 매칭되지 않는 경우 가장 근접한 타입 추천
  // 우선순위: q1 > q2 > q3
  
  if (q1_space === 'system_internal') {
    return {
      type: 'type1_system',
      role: '시스템 운영 Agent'
    };
  }
  
  if (q1_space === 'field') {
    return {
      type: 'type2_field',
      role: '현장 운영 Agent'
    };
  }
  
  if (q1_space === 'community') {
    return {
      type: 'type3_groupbuy',
      role: '공동구매 Agent'
    };
  }
  
  return null;
}

/**
 * AP2 결제 상태 확인
 */
function getAP2Status(agent) {
  if (agent.type === 'type1_system') {
    return 'not_applicable';
  }
  
  if (agent.type === 'type2_field') {
    return agent.type2Settings?.ap2Enabled ? 'enabled' : 'disabled';
  }
  
  if (agent.type === 'type3_groupbuy') {
    return agent.type3Settings?.ap2Config?.apiKey ? 'configured' : 'pending';
  }
  
  return 'unknown';
}

module.exports = router;

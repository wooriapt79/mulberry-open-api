/**
 * Event API Routes - SkillBank Integration
 * 이벤트 기반 에이전트 생성 시스템의 진입점
 * 투비콘(tobecorn) 건강검진 + 공동구매 연동
 * @author CTO Koda
 * @date 2026-03-28
 */

const express = require('express');
const router = express.Router();
const SkillBank = require('../agents/skillbank-core');
const { NegotiationAgent } = require('../agents/negotiation-agent-v2');
const { jwtMiddleware } = require('../middleware/auth');

const skillBank = new SkillBank();

/**
 * POST /api/events/health-check
 * 투비콘 건강검진 데이터 수신 → 스킬 선택 → 에이전트 생성 → 추천
 */
router.post('/health-check', async (req, res) => {
  try {
    const { userId, healthData, maslowLevel = 3 } = req.body;
    if (!userId || !healthData) {
      return res.status(400).json({ success: false, message: 'userId and healthData required' });
    }

    // 1. 스킬 선택 (매슬로우 단계 기반)
    const selectedSkills = skillBank.selectSkills('health_check', maslowLevel);

    // 2. 에이전트 프로파일 생성
    const agentProfile = skillBank.injectToAgent(
      `health-agent-${userId}-${Date.now()}`,
      selectedSkills,
      { eventType: 'health_check', maslowLevel, userId, healthData }
    );

    // 3. 건강 추천 (SKL-003: health_recommend)
    const recommendations = generateHealthRecommendations(healthData, maslowLevel);

    // 4. 공동구매 트리거 판단 (SKL-004: order_trigger)
    const groupBuyTrigger = shouldTriggerGroupBuy(healthData, maslowLevel);

    res.json({
      success: true,
      agentProfile,
      selectedSkills,
      recommendations,
      groupBuyTrigger,
      message: `매슬로우 ${maslowLevel}단계 기반 ${selectedSkills.length}개 스킬 활성화`
    });
  } catch (err) {
    console.error('health-check event error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/events/group-buy
 * 공동구매 이벤트 → 협상 에이전트 생성
 */
router.post('/group-buy', jwtMiddleware, async (req, res) => {
  try {
    const { userId, commodity, quantity, targetPrice, maslowLevel = 3 } = req.body;
    if (!userId || !commodity) {
      return res.status(400).json({ success: false, message: 'userId and commodity required' });
    }

    const selectedSkills = skillBank.selectSkills('group_buy', maslowLevel);
    const agentProfile = skillBank.injectToAgent(
      `group-buy-agent-${userId}-${Date.now()}`,
      selectedSkills,
      { eventType: 'group_buy', maslowLevel, userId, commodity, quantity }
    );

    // 협상 에이전트 생성
    const negotiationAgent = new NegotiationAgent(
      { userId, maslowLevel },
      { name: 'Supplier', type: 'external' },
      commodity,
      'value_based_negotiation',
      { quantity, basePrice: targetPrice, commodity }
    );

    const proposal = negotiationAgent.formulateProposal('neutral', null);
    await negotiationAgent.saveToMongoDB();

    res.json({
      success: true,
      agentProfile,
      selectedSkills,
      negotiationId: negotiationAgent.negotiationId,
      initialProposal: proposal
    });
  } catch (err) {
    console.error('group-buy event error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/events/emergency
 * 긴급 상황 (낙상, 이상 행동) → 즉시 알림
 */
router.post('/emergency', async (req, res) => {
  try {
    const { userId, location, alertType } = req.body;
    if (!userId || !alertType) {
      return res.status(400).json({ success: false, message: 'userId and alertType required' });
    }

    const selectedSkills = skillBank.selectSkills('emergency', 1);
    const agentProfile = skillBank.injectToAgent(
      `emergency-agent-${userId}-${Date.now()}`,
      selectedSkills,
      { eventType: 'emergency', userId, location, alertType }
    );

    // Socket.IO 긴급 알림 발송
    const io = req.app.get('io');
    if (io) {
      io.to('긴급').emit('emergency_alert', {
        userId, location, alertType,
        timestamp: new Date(),
        agentId: agentProfile.agentId
      });
    }

    res.json({
      success: true,
      agentProfile,
      selectedSkills,
      alertSent: true,
      message: `긴급 알림 발송 완료: ${alertType}`
    });
  } catch (err) {
    console.error('emergency event error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/events/skills
 * 전체 스킬 목록 조회
 */
router.get('/skills', (req, res) => {
  res.json({ success: true, skills: skillBank.getAllSkills() });
});

// 내부 헬퍼 함수
function generateHealthRecommendations(healthData, maslowLevel) {
  const recommendations = [];
  if (healthData.bloodSugar && healthData.bloodSugar > 100) recommendations.push({ type: 'supplement', item: '크롬 피콜리네이트', reason: '혈당 관리' });
  if (healthData.bloodPressure && healthData.bloodPressure > 130) recommendations.push({ type: 'supplement', item: '마그네슘', reason: '혈압 안정' });
  if (maslowLevel >= 3) recommendations.push({ type: 'community', item: '건강 모임 참여', reason: '소속감 충족' });
  if (recommendations.length === 0) recommendations.push({ type: 'general', item: '종합비타민', reason: '기본 건강 유지' });
  return recommendations;
}

function shouldTriggerGroupBuy(healthData, maslowLevel) {
  if (maslowLevel <= 2) return { trigger: true, reason: '기본 건강 욕구 충족 필요', priority: 'high' };
  if (healthData.bloodSugar > 110 || healthData.bloodPressure > 135) return { trigger: true, reason: '건강 지표 이상 - 즉시 보충 필요', priority: 'medium' };
  return { trigger: false, reason: '정기 구매 주기 대기', priority: 'low' };
}

module.exports = router;

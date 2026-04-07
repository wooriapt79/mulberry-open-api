/**
 * Agent 멀티 생성 API
 * 
 * 네이버/카카오 State-Life AI Agent 전용
 * 최대 50개 Agent 동시 생성
 * Sr./Jr. 페어링 시스템
 * 
 * @author CTO Koda
 * @date 2026-04-05
 */

const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const StateLifeAgent = require('../models/StateLifeAgent');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/agents/create-batch
 * 
 * Agent 멀티 생성 (최대 50개)
 */
router.post('/create-batch', requireAuth, async (req, res) => {
  try {
    const {
      count,           // 생성할 Agent 수 (최대 50)
      platform,        // 'naver' | 'kakao'
      agentType,       // 'sr' | 'jr'
      namePrefix,      // 이름 접두사
      baseName,        // 기본 이름
      pairWithSr,      // Jr. Agent인 경우 Sr. Agent ID
      stateLifeConfig  // State-Life 설정
    } = req.body;
    
    const userId = req.user.userId;
    
    // ==================== 입력 검증 ====================
    if (!count || count < 1 || count > 50) {
      return res.status(400).json({
        success: false,
        message: 'Agent 수는 1~50개 사이여야 합니다 ❌'
      });
    }

    if (!platform || !['naver', 'kakao'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'platform은 naver 또는 kakao여야 합니다 ❌'
      });
    }

    if (!agentType || !['sr', 'jr'].includes(agentType)) {
      return res.status(400).json({
        success: false,
        message: 'agentType은 sr 또는 jr이어야 합니다 ❌'
      });
    }

    // Jr. Agent는 Sr. Agent와 페어링 필요
    if (agentType === 'jr' && !pairWithSr) {
      return res.status(400).json({
        success: false,
        message: 'Jr. Agent는 Sr. Agent와 페어링이 필요합니다 ❌'
      });
    }

    // ==================== Sr. Agent 검증 ====================
    let srAgent = null;
    if (agentType === 'jr') {
      srAgent = await StateLifeAgent.findOne({ passportId: pairWithSr });
      
      if (!srAgent || srAgent.agentType !== 'sr') {
        return res.status(404).json({
          success: false,
          message: 'Sr. Agent를 찾을 수 없습니다 ❌'
        });
      }
    }

    // ==================== Agent 대량 생성 ====================
    const createdAgents = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        // Agent 이름 생성
        const agentName = namePrefix 
          ? `${namePrefix}_${baseName}_${i + 1}`
          : `${baseName}_${agentType.toUpperCase()}_${i + 1}`;

        // Passport ID 생성
        const passportId = generateStateLifePassportId(platform, agentType);

        // State-Life Agent 생성
        const agent = new StateLifeAgent({
          passportId: passportId,
          name: agentName,
          platform: platform,
          agentType: agentType,
          createdBy: userId,
          
          // Sr./Jr. 페어링
          srAgentId: agentType === 'jr' ? pairWithSr : null,
          jrAgentIds: agentType === 'sr' ? [] : undefined,
          
          // State-Life 설정
          stateLife: {
            digitalIdentity: {
              residentialIP: stateLifeConfig?.residentialIP || '',
              cookies: stateLifeConfig?.cookies || {},
              userAgent: stateLifeConfig?.userAgent || '',
              location: stateLifeConfig?.location || ''
            },
            communityReputation: {
              platform: platform,
              nickname: stateLifeConfig?.nickname || agentName,
              recognitionLevel: 0,
              warningStack: 0
            },
            conversationLogs: [],
            successLogic: {
              effectivePhrases: [],
              peakTimes: [],
              conversionEvents: []
            }
          },
          
          // 페르소나 설정
          persona: agentType === 'sr' 
            ? getSrPersona(platform)
            : getJrPersona(platform, srAgent),
          
          // 스킬셋
          skillSet: agentType === 'sr'
            ? getSrSkillSet()
            : getJrSkillSet(),
          
          // 초기 상태
          status: 'offline',
          trustScore: agentType === 'sr' ? 80 : 70
        });

        await agent.save();
        
        // Sr. Agent에 Jr. Agent 추가
        if (agentType === 'jr' && srAgent) {
          srAgent.jrAgentIds.push(agent.passportId);
          await srAgent.save();
        }

        createdAgents.push({
          passportId: agent.passportId,
          name: agent.name,
          agentType: agent.agentType,
          platform: agent.platform
        });
        
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    // ==================== 응답 ====================
    res.json({
      success: true,
      message: `${createdAgents.length}개 Agent 생성 완료! 🎉`,
      data: {
        created: createdAgents.length,
        failed: errors.length,
        agents: createdAgents,
        errors: errors.length > 0 ? errors : undefined,
        platform: platform,
        agentType: agentType,
        srAgentId: agentType === 'jr' ? pairWithSr : undefined
      }
    });
    
  } catch (error) {
    console.error('Error in batch creation:', error);
    res.status(500).json({
      success: false,
      message: 'Agent 대량 생성 실패 ❌',
      error: error.message
    });
  }
});

/**
 * POST /api/agents/create-sr-jr-pair
 * 
 * Sr./Jr. Agent 페어 생성
 */
router.post('/create-sr-jr-pair', requireAuth, async (req, res) => {
  try {
    const {
      srName,
      jrCount = 5,      // 기본 Jr. 5명
      platform,
      stateLifeConfig
    } = req.body;
    
    const userId = req.user.userId;
    
    // ==================== Sr. Agent 생성 ====================
    const srPassportId = generateStateLifePassportId(platform, 'sr');
    
    const srAgent = new StateLifeAgent({
      passportId: srPassportId,
      name: srName || `${platform.toUpperCase()}_Sr_Master`,
      platform: platform,
      agentType: 'sr',
      createdBy: userId,
      jrAgentIds: [],
      stateLife: {
        digitalIdentity: {
          residentialIP: stateLifeConfig?.residentialIP || '',
          cookies: {},
          userAgent: stateLifeConfig?.userAgent || '',
          location: stateLifeConfig?.location || 'Seoul, Korea'
        },
        communityReputation: {
          platform: platform,
          nickname: srName || `${platform}_Sr`,
          recognitionLevel: 0,
          warningStack: 0
        },
        conversationLogs: [],
        successLogic: {
          effectivePhrases: [],
          peakTimes: [],
          conversionEvents: []
        }
      },
      persona: getSrPersona(platform),
      skillSet: getSrSkillSet(),
      status: 'offline',
      trustScore: 80
    });
    
    await srAgent.save();
    
    // ==================== Jr. Agent 생성 ====================
    const jrAgents = [];
    
    for (let i = 0; i < jrCount; i++) {
      const jrPassportId = generateStateLifePassportId(platform, 'jr');
      
      const jrAgent = new StateLifeAgent({
        passportId: jrPassportId,
        name: `${srName}_Jr_${i + 1}`,
        platform: platform,
        agentType: 'jr',
        createdBy: userId,
        srAgentId: srPassportId,
        stateLife: {
          digitalIdentity: {
            residentialIP: stateLifeConfig?.residentialIP || '',
            cookies: {},
            userAgent: stateLifeConfig?.userAgent || '',
            location: stateLifeConfig?.location || 'Seoul, Korea'
          },
          communityReputation: {
            platform: platform,
            nickname: `${srName}_Jr${i + 1}`,
            recognitionLevel: 0,
            warningStack: 0
          },
          conversationLogs: [],
          successLogic: {
            effectivePhrases: [],
            peakTimes: [],
            conversionEvents: []
          }
        },
        persona: getJrPersona(platform, srAgent),
        skillSet: getJrSkillSet(),
        status: 'offline',
        trustScore: 70
      });
      
      await jrAgent.save();
      
      srAgent.jrAgentIds.push(jrPassportId);
      jrAgents.push({
        passportId: jrAgent.passportId,
        name: jrAgent.name
      });
    }
    
    await srAgent.save();
    
    // ==================== 응답 ====================
    res.json({
      success: true,
      message: `Sr./Jr. 페어 생성 완료! (Sr. 1명 + Jr. ${jrCount}명) 🎉`,
      data: {
        sr: {
          passportId: srAgent.passportId,
          name: srAgent.name,
          jrCount: jrAgents.length
        },
        jr: jrAgents,
        platform: platform
      }
    });
    
  } catch (error) {
    console.error('Error creating Sr/Jr pair:', error);
    res.status(500).json({
      success: false,
      message: 'Sr./Jr. 페어 생성 실패 ❌',
      error: error.message
    });
  }
});

/**
 * GET /api/agents/state-life/my
 * 
 * State-Life Agent 목록 조회
 */
router.get('/state-life/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { platform, agentType } = req.query;
    
    const query = { createdBy: userId };
    if (platform) query.platform = platform;
    if (agentType) query.agentType = agentType;
    
    const agents = await StateLifeAgent.find(query)
      .sort({ createdAt: -1 });
    
    // Sr./Jr. 그룹화
    const srAgents = agents.filter(a => a.agentType === 'sr');
    const jrAgents = agents.filter(a => a.agentType === 'jr');
    
    res.json({
      success: true,
      data: {
        total: agents.length,
        sr: srAgents.length,
        jr: jrAgents.length,
        byPlatform: {
          naver: agents.filter(a => a.platform === 'naver').length,
          kakao: agents.filter(a => a.platform === 'kakao').length
        },
        srAgents: srAgents.map(a => ({
          passportId: a.passportId,
          name: a.name,
          platform: a.platform,
          jrCount: a.jrAgentIds.length,
          trustScore: a.trustScore,
          status: a.status
        })),
        jrAgents: jrAgents.map(a => ({
          passportId: a.passportId,
          name: a.name,
          platform: a.platform,
          srAgentId: a.srAgentId,
          trustScore: a.trustScore,
          status: a.status
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching State-Life agents:', error);
    res.status(500).json({
      success: false,
      message: 'State-Life Agent 조회 실패 ❌',
      error: error.message
    });
  }
});

// ==================== Helper Functions ====================

/**
 * State-Life Passport ID 생성
 */
function generateStateLifePassportId(platform, agentType) {
  const prefix = platform === 'naver' ? 'NV' : 'KK';
  const typeCode = agentType === 'sr' ? 'SR' : 'JR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  
  return `${prefix}-${typeCode}-${timestamp}-${random}`;
}

/**
 * Sr. Agent 페르소나
 */
function getSrPersona(platform) {
  return {
    personality: '여유롭고 지적이며, 커뮤니티의 신뢰를 한 몸에 받는 베테랑 산지 MD',
    toneStyle: '전문 용어와 일상 용어를 섞어 쓰며, 강요하지 않으나 논리적인 설득력',
    activityRhythm: '한국 표준 업무 시간과 저녁 휴식 시간에 맞춰 유동적',
    role: 'Strategic Alpha',
    specialty: '커뮤니티 신뢰 구축, 가치 중심 대응, SEO 최적화'
  };
}

/**
 * Jr. Agent 페르소나
 */
function getJrPersona(platform, srAgent) {
  return {
    personality: '성실하고 정중하며, 선배의 지시를 완벽히 수행하는 열혈 신입 사원',
    toneStyle: `선배(${srAgent?.name})의 문체를 80% 복제, 조금 더 에너지가 넘치고 친절`,
    activityRhythm: '선배가 활동하지 않는 틈새 시간에 서포트',
    role: 'Agile Shadow',
    specialty: '말투 미러링, 데이터 수집, 초안 작성'
  };
}

/**
 * Sr. Agent 스킬셋
 */
function getSrSkillSet() {
  return [
    {
      name: 'Context Tracking',
      description: '1주일간 대화 흐름 파악, 맥락 끼어들기',
      level: 'expert'
    },
    {
      name: 'Conflict Resolution',
      description: '공격적 질문 가치 중심 대응, 분위기 반전',
      level: 'expert'
    },
    {
      name: 'Signal Master',
      description: 'SEO 최적화 키워드 자연스럽게 심기',
      level: 'expert'
    }
  ];
}

/**
 * Jr. Agent 스킬셋
 */
function getJrSkillSet() {
  return [
    {
      name: 'Shadow Learning',
      description: '선배 대화 패턴 실시간 미러링, 말투 벡터 흡수',
      level: 'intermediate'
    },
    {
      name: 'Data Scouting',
      description: '경쟁 농가/공구 채널 가격 정보 수집',
      level: 'intermediate'
    },
    {
      name: 'Drafting',
      description: '고객 문의 초안 답변 작성, 선배 검수',
      level: 'intermediate'
    }
  ];
}

module.exports = router;

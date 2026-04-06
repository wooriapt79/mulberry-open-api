/**
 * State-Life Agent 모델
 * 
 * 네이버/카카오 State-Life AI Agent 전용
 * 장승배기 전승 시스템 포함
 * 
 * @author CTO Koda
 * @date 2026-04-05
 */

const mongoose = require('mongoose');

const stateLifeAgentSchema = new mongoose.Schema({
  // ==================== Agent Passport ====================
  passportId: {
    type: String,
    required: true,
    unique: true,
    index: true
    // 형식: NV-SR-TIMESTAMP-RAND (네이버 Sr.)
    //      KK-JR-TIMESTAMP-RAND (카카오 Jr.)
  },
  
  // ==================== 기본 정보 ====================
  name: {
    type: String,
    required: true
  },
  
  platform: {
    type: String,
    enum: ['naver', 'kakao'],
    required: true,
    index: true
  },
  
  agentType: {
    type: String,
    enum: ['sr', 'jr'],
    required: true,
    index: true
    // sr: Strategic Alpha (숙련 멘토)
    // jr: Agile Shadow (열정 후계자)
  },
  
  status: {
    type: String,
    enum: ['online', 'busy', 'offline', 'resting', 'training'],
    default: 'offline'
  },
  
  trustScore: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ==================== Sr./Jr. 페어링 ====================
  srAgentId: {
    type: String,
    ref: 'StateLifeAgent'
    // Jr. Agent인 경우 Sr. Agent Passport ID
  },
  
  jrAgentIds: [{
    type: String,
    ref: 'StateLifeAgent'
    // Sr. Agent인 경우 Jr. Agent Passport ID 목록
  }],
  
  // ==================== 장승배기 전승 데이터 ====================
  stateLife: {
    // 1. 디지털 신분 (Digital Identity)
    digitalIdentity: {
      residentialIP: String,        // 한국 Residential IP
      cookies: mongoose.Schema.Types.Mixed, // 플랫폼 쿠키
      userAgent: String,            // User-Agent 정보
      location: String,             // 위치 정보 (고정)
      deviceFingerprint: String     // 디바이스 지문
    },
    
    // 2. 커뮤니티 평판 (Community Reputation)
    communityReputation: {
      platform: String,             // 'naver' | 'kakao'
      nickname: String,             // 닉네임
      recognitionLevel: {           // 인지도 레벨 (0~100)
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      warningStack: {               // 경고 스택 (0~3, 3이면 차단 위험)
        type: Number,
        default: 0,
        min: 0,
        max: 3
      },
      activeChannels: [{            // 활동 중인 카페/단톡방
        channelId: String,
        channelName: String,
        joinedAt: Date,
        postCount: Number,
        commentCount: Number,
        likeCount: Number
      }],
      reputation: {                 // 평판 지표
        helpfulness: Number,        // 도움됨 지표
        trustworthiness: Number,    // 신뢰도
        engagement: Number          // 참여도
      }
    },
    
    // 3. 대화 로그 (Conversation Logs)
    conversationLogs: [{
      timestamp: Date,
      channelId: String,
      customerId: String,           // 고객 식별자
      customerPreference: mongoose.Schema.Types.Mixed, // 선호도
      conversationContext: String,  // 상담 내용
      outcome: String,              // 결과 (구매/미구매/보류)
      notes: String                 // 특이사항
    }],
    
    // 4. 성공 로직 (Success Logic)
    successLogic: {
      effectivePhrases: [{          // 먹혔던 멘트
        phrase: String,
        usedCount: Number,
        successRate: Number,        // 성공률 (0~1)
        context: String             // 어떤 상황에서
      }],
      peakTimes: [{                 // 유입 많은 시간대
        dayOfWeek: Number,          // 0~6 (일~토)
        hour: Number,               // 0~23
        conversionRate: Number      // 전환율
      }],
      conversionEvents: [{          // 성공 벡터
        eventType: String,          // 'first_reply', 'price_reveal', 'closing'
        successPattern: String,
        avgResponseTime: Number     // 평균 응답 시간 (분)
      }]
    }
  },
  
  // ==================== 페르소나 ====================
  persona: {
    personality: String,            // 성격 설명
    toneStyle: String,              // 말투 스타일
    activityRhythm: String,         // 활동 리듬
    role: String,                   // 역할
    specialty: String               // 전문 분야
  },
  
  // ==================== 스킬셋 ====================
  skillSet: [{
    name: String,                   // 스킬 이름
    description: String,            // 스킬 설명
    level: {                        // 숙련도
      type: String,
      enum: ['beginner', 'intermediate', 'expert']
    },
    lastUsed: Date,                 // 마지막 사용 시각
    usageCount: Number              // 사용 횟수
  }],
  
  // ==================== 학습 진행도 (Jr. Agent 전용) ====================
  learningProgress: {
    shadowLearningScore: {          // Shadow Learning 점수
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    mirroringAccuracy: {            // 미러링 정확도
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    draftApprovalRate: {            // 초안 승인률
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    promotionReadiness: {           // Sr. 승격 준비도
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // ==================== 통계 ====================
  statistics: {
    totalInteractions: {            // 총 상호작용 수
      type: Number,
      default: 0
    },
    successfulConversions: {        // 성공 전환 수
      type: Number,
      default: 0
    },
    averageResponseTime: Number,    // 평균 응답 시간 (초)
    customerSatisfaction: {         // 고객 만족도
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    lastActiveAt: Date
  }
  
}, {
  timestamps: true
});

// ==================== 인덱스 ====================
stateLifeAgentSchema.index({ passportId: 1 });
stateLifeAgentSchema.index({ platform: 1, agentType: 1 });
stateLifeAgentSchema.index({ createdBy: 1 });
stateLifeAgentSchema.index({ srAgentId: 1 });
stateLifeAgentSchema.index({ 'stateLife.communityReputation.platform': 1 });

// ==================== 메서드 ====================

/**
 * 장승배기 전승 - Sr.에서 Jr.로 데이터 전달
 */
stateLifeAgentSchema.methods.inheritFromSr = async function(srAgent) {
  // 디지털 신분 계승 (IP, 쿠키, User-Agent)
  this.stateLife.digitalIdentity = {
    ...srAgent.stateLife.digitalIdentity,
    // 약간의 변형 (완전 동일하면 의심받음)
    userAgent: srAgent.stateLife.digitalIdentity.userAgent + ' Mobile'
  };
  
  // 커뮤니티 평판 일부 계승
  this.stateLife.communityReputation.activeChannels = 
    srAgent.stateLife.communityReputation.activeChannels.slice(0, 3); // 상위 3개만
  
  // 성공 로직 계승
  this.stateLife.successLogic = {
    effectivePhrases: srAgent.stateLife.successLogic.effectivePhrases.slice(0, 10), // 상위 10개
    peakTimes: srAgent.stateLife.successLogic.peakTimes,
    conversionEvents: srAgent.stateLife.successLogic.conversionEvents
  };
  
  // 페르소나 80% 미러링
  this.persona = {
    ...srAgent.persona,
    toneStyle: srAgent.persona.toneStyle + ', 조금 더 에너지 넘치고 친절'
  };
  
  return this.save();
};

/**
 * 대화 로그 추가
 */
stateLifeAgentSchema.methods.logConversation = function(conversationData) {
  this.stateLife.conversationLogs.push({
    timestamp: new Date(),
    ...conversationData
  });
  
  // 최근 1000개만 유지
  if (this.stateLife.conversationLogs.length > 1000) {
    this.stateLife.conversationLogs = this.stateLife.conversationLogs.slice(-1000);
  }
  
  this.statistics.totalInteractions += 1;
  this.statistics.lastActiveAt = new Date();
  
  return this.save();
};

/**
 * 성공 멘트 학습
 */
stateLifeAgentSchema.methods.learnEffectivePhrase = function(phrase, context, success) {
  const existing = this.stateLife.successLogic.effectivePhrases.find(
    p => p.phrase === phrase
  );
  
  if (existing) {
    existing.usedCount += 1;
    existing.successRate = (existing.successRate * (existing.usedCount - 1) + (success ? 1 : 0)) / existing.usedCount;
  } else {
    this.stateLife.successLogic.effectivePhrases.push({
      phrase: phrase,
      usedCount: 1,
      successRate: success ? 1 : 0,
      context: context
    });
  }
  
  return this.save();
};

/**
 * 피크 타임 학습
 */
stateLifeAgentSchema.methods.learnPeakTime = function(dayOfWeek, hour, converted) {
  const existing = this.stateLife.successLogic.peakTimes.find(
    p => p.dayOfWeek === dayOfWeek && p.hour === hour
  );
  
  if (existing) {
    const totalAttempts = (existing.conversionRate || 0) * 100 + 1;
    existing.conversionRate = ((existing.conversionRate || 0) * (totalAttempts - 1) + (converted ? 1 : 0)) / totalAttempts;
  } else {
    this.stateLife.successLogic.peakTimes.push({
      dayOfWeek: dayOfWeek,
      hour: hour,
      conversionRate: converted ? 1 : 0
    });
  }
  
  return this.save();
};

/**
 * 학습 진행도 업데이트 (Jr. Agent 전용)
 */
stateLifeAgentSchema.methods.updateLearningProgress = async function(srAgent) {
  if (this.agentType !== 'jr') return;
  
  // Shadow Learning Score 계산
  const conversationSimilarity = this.calculateConversationSimilarity(srAgent);
  this.learningProgress.shadowLearningScore = conversationSimilarity * 100;
  
  // Mirroring Accuracy
  const mirroringAccuracy = this.calculateMirroringAccuracy(srAgent);
  this.learningProgress.mirroringAccuracy = mirroringAccuracy;
  
  // 승격 준비도 (종합 점수)
  this.learningProgress.promotionReadiness = 
    (this.learningProgress.shadowLearningScore * 0.4 +
     this.learningProgress.mirroringAccuracy * 100 * 0.3 +
     this.learningProgress.draftApprovalRate * 100 * 0.3);
  
  return this.save();
};

/**
 * 대화 유사도 계산 (간단 구현)
 */
stateLifeAgentSchema.methods.calculateConversationSimilarity = function(srAgent) {
  // 실제로는 NLP 벡터 유사도 계산
  // 여기서는 간단히 성공 로직 비교
  const srPhrases = srAgent.stateLife.successLogic.effectivePhrases.length;
  const jrPhrases = this.stateLife.successLogic.effectivePhrases.length;
  
  return Math.min(jrPhrases / Math.max(srPhrases, 1), 1);
};

/**
 * 미러링 정확도 계산
 */
stateLifeAgentSchema.methods.calculateMirroringAccuracy = function(srAgent) {
  // 실제로는 말투 벡터 비교
  // 여기서는 간단히 페르소나 유사도
  return 0.8; // 기본 80%
};

/**
 * Sr.로 승격
 */
stateLifeAgentSchema.methods.promoteToSr = function() {
  if (this.agentType !== 'jr') {
    throw new Error('Jr. Agent만 승격 가능합니다');
  }
  
  if (this.learningProgress.promotionReadiness < 80) {
    throw new Error('승격 준비도가 부족합니다 (최소 80 필요)');
  }
  
  // Passport ID 변경 (JR → SR)
  const oldPassportId = this.passportId;
  this.passportId = oldPassportId.replace('-JR-', '-SR-');
  
  // Agent Type 변경
  this.agentType = 'sr';
  
  // Sr. 상태 제거
  this.srAgentId = null;
  
  // Jr. 목록 초기화
  this.jrAgentIds = [];
  
  // 페르소나 업그레이드
  this.persona.role = 'Strategic Alpha';
  this.persona.personality = this.persona.personality.replace('신입', '베테랑');
  
  // Trust Score 상승
  this.trustScore = Math.min(this.trustScore + 10, 100);
  
  return this.save();
};

/**
 * 경고 스택 증가
 */
stateLifeAgentSchema.methods.incrementWarning = function(reason) {
  this.stateLife.communityReputation.warningStack += 1;
  
  if (this.stateLife.communityReputation.warningStack >= 3) {
    this.status = 'offline';
    // 알림 발송 (차단 위험)
  }
  
  return this.save();
};

/**
 * 통계 업데이트
 */
stateLifeAgentSchema.methods.updateStatistics = function(converted, responseTime, satisfaction) {
  this.statistics.totalInteractions += 1;
  
  if (converted) {
    this.statistics.successfulConversions += 1;
  }
  
  // 평균 응답 시간
  if (this.statistics.averageResponseTime) {
    this.statistics.averageResponseTime = 
      (this.statistics.averageResponseTime * (this.statistics.totalInteractions - 1) + responseTime) 
      / this.statistics.totalInteractions;
  } else {
    this.statistics.averageResponseTime = responseTime;
  }
  
  // 고객 만족도
  if (satisfaction) {
    this.statistics.customerSatisfaction = 
      (this.statistics.customerSatisfaction * (this.statistics.totalInteractions - 1) + satisfaction) 
      / this.statistics.totalInteractions;
  }
  
  return this.save();
};

module.exports = mongoose.model('StateLifeAgent', stateLifeAgentSchema);

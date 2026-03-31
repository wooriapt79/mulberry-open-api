/**
 * Agent 모델
 * 
 * Trang 명세서 기반 구현
 * - Type 1: 시스템 운영 Agent
 * - Type 2: 현장 운영 Agent  
 * - Type 3: 공동구매 Agent
 * 
 * @author CTO Koda
 * @date 2026-03-31
 */

const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  // ==================== Agent Passport (자동 발급) ====================
  passportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // ==================== 기본 정보 ====================
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  type: {
    type: String,
    enum: ['type1_system', 'type2_field', 'type3_groupbuy'],
    required: true,
    index: true
  },
  
  role: {
    type: String,
    required: true
    // Type 1: "시스템 운영 Agent"
    // Type 2: "현장 운영 Agent"
    // Type 3: "공동구매 Agent"
  },
  
  status: {
    type: String,
    enum: ['online', 'busy', 'offline', 'on_rest'],
    default: 'offline'
  },
  
  // ==================== 생성 시 3문항 응답 기록 ====================
  creationAnswers: {
    q1_space: {
      type: String,
      enum: ['system_internal', 'field', 'community']
    },
    q2_task: {
      type: String,
      enum: ['monitoring_management', 'delivery_order_sales', 'groupbuy_planning']
    },
    q3_ap2: {
      type: String,
      enum: ['not_needed', 'optional', 'required']
    }
  },
  
  // ==================== 신뢰점수 ====================
  trustScore: {
    type: Number,
    default: 70, // 초기값 70점
    min: 0,
    max: 100
  },
  
  // ==================== 관리 관계 ====================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  supervisorAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
    // 이 Agent를 감독하는 상위 Agent
  },
  
  supervisedAgents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
    // 이 Agent가 감독하는 하위 Agent들
  }],
  
  // ==================== 활동 로그 ====================
  activityLog: [{
    timestamp: Date,
    action: String,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // ==================== Type 1 전용 설정 ====================
  type1Settings: {
    monitoringScope: [String], // 감시할 시스템 목록
    accessLevel: {
      type: String,
      enum: ['read_only', 'admin']
    },
    alertThresholds: {
      cpu: Number,
      memory: Number,
      responseTime: Number
    },
    reportInterval: {
      type: String,
      enum: ['hourly', 'daily', 'weekly']
    }
  },
  
  // ==================== Type 2 전용 설정 ====================
  type2Settings: {
    raspberryPiIds: [String], // 담당 라즈베리파이 기기 ID
    assignedRegion: String,    // 담당 지역/거점
    assignedLocation: {
      lat: Number,
      lng: Number,
      address: String
    },
    orderProcessingAuth: {
      maxAmount: Number,        // 승인 가능한 최대 주문 금액
      requiresApproval: Boolean
    },
    escalationRules: {
      conditions: [String],     // 에스컬레이션 조건
      notifyTo: String          // 알림 대상 (거점 직원 ID)
    },
    ap2Enabled: {
      type: Boolean,
      default: false            // Type 2는 선택적
    },
    kakaoChannelId: String      // 카카오톡 알림 채널
  },
  
  // ==================== Type 3 전용 설정 ====================
  type3Settings: {
    ap2Required: {
      type: Boolean,
      default: true             // Type 3는 필수
    },
    ap2Config: {
      merchantId: String,
      apiKey: String,
      settlementAccount: String
    },
    assignedCommunity: String,  // 담당 커뮤니티/지역
    productCategories: [String], // 취급 상품 카테고리
    groupbuyPeriod: {
      startDate: Date,
      endDate: Date
    },
    participantLimits: {
      min: Number,              // 최소 참여 인원
      max: Number               // 최대 참여 인원
    },
    settlementRules: {
      method: String,           // 정산 방식
      schedule: String,         // 정산 주기
      feePercentage: Number     // 수수료율
    }
  },
  
  // ==================== MARRF 연동 ====================
  marrf: {
    model: {
      type: String,
      enum: ['Lynn-A', 'Lynn-B', 'Lynn-C'],
      default: 'Lynn-B'
    },
    wliToday: {
      type: Number,
      default: 0                // Workload Index (당일)
    },
    lastFallbackAt: Date,       // 마지막 LLM Fallback 발생 시각
    totalFallbacks: {
      type: Number,
      default: 0
    },
    restRequired: {
      type: Boolean,
      default: false
    }
  },
  
  // ==================== 통계 ====================
  statistics: {
    totalTasks: {
      type: Number,
      default: 0
    },
    successfulTasks: {
      type: Number,
      default: 0
    },
    failedTasks: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number, // ms
    lastActiveAt: Date
  }
  
}, {
  timestamps: true
});

// ==================== 인덱스 ====================
agentSchema.index({ passportId: 1 });
agentSchema.index({ type: 1, status: 1 });
agentSchema.index({ createdBy: 1 });
agentSchema.index({ 'marrf.wliToday': 1 });

// ==================== 메서드 ====================

/**
 * Agent Passport ID 생성
 */
agentSchema.statics.generatePassportId = function(type) {
  const prefix = {
    'type1_system': 'AP1',
    'type2_field': 'AP2',
    'type3_groupbuy': 'AP3'
  };
  
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  
  return `${prefix[type]}-${timestamp}-${random}`;
};

/**
 * 활동 로그 추가
 */
agentSchema.methods.logActivity = function(action, details) {
  this.activityLog.push({
    timestamp: new Date(),
    action: action,
    details: details
  });
  
  // 최근 100개만 유지
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  this.statistics.lastActiveAt = new Date();
  return this.save();
};

/**
 * MARRF WLI 증가
 */
agentSchema.methods.incrementWLI = function() {
  this.marrf.wliToday += 1;
  this.marrf.lastFallbackAt = new Date();
  this.marrf.totalFallbacks += 1;
  
  // WLI 임계값 확인 (6 이상)
  if (this.marrf.wliToday >= 6) {
    this.marrf.restRequired = true;
    this.status = 'on_rest';
  }
  
  return this.save();
};

/**
 * MARRF WLI 리셋 (일일)
 */
agentSchema.methods.resetDailyWLI = function() {
  this.marrf.wliToday = 0;
  
  // 휴식 필요 상태였으면 해제
  if (this.marrf.restRequired) {
    this.marrf.restRequired = false;
    this.status = 'offline';
  }
  
  return this.save();
};

/**
 * 신뢰점수 업데이트
 */
agentSchema.methods.updateTrustScore = function(delta) {
  this.trustScore = Math.max(0, Math.min(100, this.trustScore + delta));
  return this.save();
};

/**
 * 통계 업데이트
 */
agentSchema.methods.updateStatistics = function(success, responseTime) {
  this.statistics.totalTasks += 1;
  
  if (success) {
    this.statistics.successfulTasks += 1;
  } else {
    this.statistics.failedTasks += 1;
  }
  
  // 평균 응답 시간 계산
  if (this.statistics.averageResponseTime) {
    this.statistics.averageResponseTime = 
      (this.statistics.averageResponseTime * (this.statistics.totalTasks - 1) + responseTime) 
      / this.statistics.totalTasks;
  } else {
    this.statistics.averageResponseTime = responseTime;
  }
  
  return this.save();
};

module.exports = mongoose.model('Agent', agentSchema);

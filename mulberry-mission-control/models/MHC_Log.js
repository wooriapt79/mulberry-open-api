/**
 * MHC_Log Model - Manifold Hyper Connector 활동 로그
 * 
 * mHC는 모든 시스템을 연결하고 AI 기반 라우팅을 수행
 * 이 모델은 mHC의 모든 활동을 기록
 */

const mongoose = require('mongoose');

const MHC_LogSchema = new mongoose.Schema({
  // 소스 시스템
  source: {
    type: String,
    enum: ['chat', 'email', 'field', 'github', 'hf_spaces', 'api', 'notification', 'system'],
    required: true
  },
  
  // 목적지 시스템
  destination: {
    type: String,
    enum: ['chat', 'email', 'field', 'github', 'hf_spaces', 'api', 'notification', 'system', 'none'],
    default: 'none'
  },
  
  // 액션 (mHC가 수행한 작업)
  action: {
    type: String,
    required: true
  },
  
  // AI 결정 (DeepSeek V4 분석 결과)
  aiDecision: {
    processed: {
      type: Boolean,
      default: false
    },
    model: {
      type: String,
      default: 'deepseek-v4'
    },
    analysis: {
      type: String,
      default: null
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    category: {
      type: String,
      default: null
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', null],
      default: null
    },
    urgency: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical', null],
      default: null
    }
  },
  
  // 우선순위 (mHC가 자동 결정)
  priority: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // 데이터 페이로드
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // 처리 상태
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  
  // 처리 시간
  processingTime: {
    type: Number,  // milliseconds
    default: null
  },
  
  // 에러 (실패 시)
  error: {
    type: String,
    default: null
  },
  
  // 관련 사용자
  relatedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 관련 채널
  relatedChannels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  
  // 메타데이터
  metadata: {
    ip: String,
    userAgent: String,
    requestId: String,
    sessionId: String
  }
}, {
  timestamps: true
});

// 인덱스
MHC_LogSchema.index({ source: 1, createdAt: -1 });
MHC_LogSchema.index({ destination: 1 });
MHC_LogSchema.index({ action: 1 });
MHC_LogSchema.index({ status: 1 });
MHC_LogSchema.index({ priority: -1 });
MHC_LogSchema.index({ 'aiDecision.urgency': 1 });
MHC_LogSchema.index({ 'aiDecision.processed': 1 });

// Virtual: 처리 여부
MHC_LogSchema.virtual('isProcessed').get(function() {
  return this.status === 'completed' || this.status === 'failed';
});

// Virtual: AI 처리 여부
MHC_LogSchema.virtual('aiProcessed').get(function() {
  return this.aiDecision.processed;
});

// 메서드: AI 분석 추가
MHC_LogSchema.methods.addAIAnalysis = function(analysis) {
  this.aiDecision = {
    processed: true,
    model: analysis.model || 'deepseek-v4',
    analysis: analysis.analysis,
    confidence: analysis.confidence,
    category: analysis.category,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency
  };
  
  // urgency에 따라 priority 자동 조정
  if (analysis.urgency === 'critical') {
    this.priority = 100;
  } else if (analysis.urgency === 'high') {
    this.priority = 75;
  } else if (analysis.urgency === 'normal') {
    this.priority = 50;
  } else if (analysis.urgency === 'low') {
    this.priority = 25;
  }
  
  return this.save();
};

// 메서드: 처리 완료
MHC_LogSchema.methods.markCompleted = function(processingTime) {
  this.status = 'completed';
  this.processingTime = processingTime;
  return this.save();
};

// 메서드: 처리 실패
MHC_LogSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.error = error;
  return this.save();
};

// Static: 시스템 간 트래픽 통계
MHC_LogSchema.statics.getTrafficStats = async function(timeRange = 3600000) {
  const since = new Date(Date.now() - timeRange);
  
  const stats = await this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { source: '$source', destination: '$destination' },
        count: { $sum: 1 },
        avgPriority: { $avg: '$priority' },
        avgProcessingTime: { $avg: '$processingTime' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  return stats;
};

// Static: AI 처리 통계
MHC_LogSchema.statics.getAIStats = async function(timeRange = 3600000) {
  const since = new Date(Date.now() - timeRange);
  
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        'aiDecision.processed': true
      }
    },
    {
      $group: {
        _id: {
          category: '$aiDecision.category',
          urgency: '$aiDecision.urgency'
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$aiDecision.confidence' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  return stats;
};

// Static: 실시간 대시보드 데이터
MHC_LogSchema.statics.getDashboardData = async function() {
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  const [
    totalLogs,
    pendingLogs,
    aiProcessedLogs,
    avgProcessingTime,
    topSources,
    urgentLogs
  ] = await Promise.all([
    this.countDocuments({ createdAt: { $gte: oneHourAgo } }),
    this.countDocuments({ status: 'pending' }),
    this.countDocuments({ 'aiDecision.processed': true, createdAt: { $gte: oneHourAgo } }),
    this.aggregate([
      { $match: { processingTime: { $ne: null }, createdAt: { $gte: oneHourAgo } } },
      { $group: { _id: null, avg: { $avg: '$processingTime' } } }
    ]),
    this.aggregate([
      { $match: { createdAt: { $gte: oneHourAgo } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    this.countDocuments({ 'aiDecision.urgency': { $in: ['high', 'critical'] }, status: 'pending' })
  ]);
  
  return {
    totalLogs,
    pendingLogs,
    aiProcessedLogs,
    avgProcessingTime: avgProcessingTime[0]?.avg || 0,
    topSources,
    urgentLogs
  };
};

module.exports = mongoose.model('MHC_Log', MHC_LogSchema);

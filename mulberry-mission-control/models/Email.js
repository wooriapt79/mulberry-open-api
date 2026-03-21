/**
 * Email Model - Email AI 시스템
 * 
 * AI 기반 이메일 분류, 우선순위 설정, 자동 응답 제안
 */

const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  // 기본 정보
  from: {
    type: String,
    required: true
  },
  to: [{
    type: String,
    required: true
  }],
  cc: [{
    type: String
  }],
  bcc: [{
    type: String
  }],
  
  // 제목 및 본문
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  bodyHtml: {
    type: String,
    default: null
  },
  
  // 첨부파일
  attachments: [{
    filename: String,
    filesize: Number,
    mimetype: String,
    url: String
  }],
  
  // 폴더
  folder: {
    type: String,
    enum: ['inbox', 'sent', 'draft', 'trash', 'archive', 'important', 'spam'],
    default: 'inbox'
  },
  
  // 상태
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  starred: {
    type: Boolean,
    default: false
  },
  
  // 우선순위
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // AI 처리
  aiProcessed: {
    type: Boolean,
    default: false
  },
  aiAnalysis: {
    summary: {
      type: String,
      default: null
    },
    category: {
      type: String,
      enum: ['work', 'personal', 'notification', 'marketing', 'support', 'other'],
      default: 'other'
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    urgency: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    suggestedReply: {
      type: String,
      default: null
    },
    actionItems: [{
      type: String
    }],
    deadline: {
      type: Date,
      default: null
    }
  },
  
  // 라벨 (Gmail 스타일)
  labels: [{
    type: String
  }],
  
  // 스레드
  threadId: {
    type: String,
    default: null
  },
  inReplyTo: {
    type: String,
    default: null
  },
  
  // 원본 메타데이터
  metadata: {
    messageId: String,
    date: Date,
    headers: mongoose.Schema.Types.Mixed
  },
  
  // 수신/발신 시간
  receivedAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 인덱스
EmailSchema.index({ folder: 1, receivedAt: -1 });
EmailSchema.index({ from: 1 });
EmailSchema.index({ to: 1 });
EmailSchema.index({ subject: 'text', body: 'text' });
EmailSchema.index({ read: 1 });
EmailSchema.index({ starred: 1 });
EmailSchema.index({ 'aiAnalysis.category': 1 });
EmailSchema.index({ 'aiAnalysis.urgency': 1 });
EmailSchema.index({ labels: 1 });
EmailSchema.index({ threadId: 1 });

// Virtual: 읽지 않음 여부
EmailSchema.virtual('isUnread').get(function() {
  return !this.read;
});

// 메서드: 읽음 처리
EmailSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// 메서드: 별표 토글
EmailSchema.methods.toggleStar = function() {
  this.starred = !this.starred;
  return this.save();
};

// 메서드: 폴더 이동
EmailSchema.methods.moveToFolder = function(folder) {
  this.folder = folder;
  return this.save();
};

// 메서드: 라벨 추가
EmailSchema.methods.addLabel = function(label) {
  if (!this.labels.includes(label)) {
    this.labels.push(label);
    return this.save();
  }
  return Promise.resolve(this);
};

// 메서드: 라벨 제거
EmailSchema.methods.removeLabel = function(label) {
  this.labels = this.labels.filter(l => l !== label);
  return this.save();
};

// 메서드: AI 분석 추가
EmailSchema.methods.addAIAnalysis = function(analysis) {
  this.aiProcessed = true;
  this.aiAnalysis = {
    summary: analysis.summary,
    category: analysis.category,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    confidence: analysis.confidence,
    suggestedReply: analysis.suggestedReply,
    actionItems: analysis.actionItems || [],
    deadline: analysis.deadline
  };
  
  // urgency에 따라 priority 자동 설정
  if (analysis.urgency === 'critical') {
    this.priority = 'urgent';
  } else if (analysis.urgency === 'high') {
    this.priority = 'high';
  } else if (analysis.urgency === 'low') {
    this.priority = 'low';
  }
  
  // urgent나 high면 important 폴더로 이동
  if (analysis.urgency === 'critical' || analysis.urgency === 'high') {
    this.folder = 'important';
  }
  
  return this.save();
};

// Static: 폴더별 이메일 조회
EmailSchema.statics.findByFolder = function(folder, limit = 50) {
  return this.find({ folder })
  .sort({ receivedAt: -1 })
  .limit(limit);
};

// Static: 읽지 않은 이메일 조회
EmailSchema.statics.findUnread = function(limit = 50) {
  return this.find({ read: false, folder: { $ne: 'trash' } })
  .sort({ receivedAt: -1 })
  .limit(limit);
};

// Static: AI 처리 대기 중인 이메일
EmailSchema.statics.findPendingAI = function(limit = 10) {
  return this.find({
    aiProcessed: false,
    folder: { $in: ['inbox', 'important'] }
  })
  .sort({ receivedAt: -1 })
  .limit(limit);
};

// Static: 스레드 조회
EmailSchema.statics.findByThread = function(threadId) {
  return this.find({ threadId })
  .sort({ receivedAt: 1 });
};

// Static: 검색
EmailSchema.statics.search = function(query, limit = 50) {
  return this.find({
    $or: [
      { subject: { $regex: query, $options: 'i' } },
      { body: { $regex: query, $options: 'i' } },
      { from: { $regex: query, $options: 'i' } }
    ],
    folder: { $ne: 'trash' }
  })
  .sort({ receivedAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Email', EmailSchema);

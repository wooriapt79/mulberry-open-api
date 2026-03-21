/**
 * Message Model - 채팅 메시지
 * 
 * 텍스트, 파일, 멘션, 스레드, 리액션 지원
 */

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // 채널
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  
  // 발신자
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 메시지 내용
  content: {
    type: String,
    required: true
  },
  
  // 메시지 타입
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'system', 'notification'],
    default: 'text'
  },
  
  // 파일 첨부 (type이 'file' 또는 'image'일 때)
  attachments: [{
    filename: String,
    filesize: Number,
    mimetype: String,
    url: String
  }],
  
  // 멘션
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 스레드
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  isThreadRoot: {
    type: Boolean,
    default: false
  },
  threadReplyCount: {
    type: Number,
    default: 0
  },
  
  // 리액션 (emoji)
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  
  // 편집
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  
  // 삭제 (soft delete)
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  
  // 고정
  pinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pinnedAt: {
    type: Date,
    default: null
  },
  
  // mHC 처리 (AI 분석)
  mhc: {
    processed: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    category: {
      type: String,
      default: null
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    }
  }
}, {
  timestamps: true
});

// 인덱스
MessageSchema.index({ channel: 1, createdAt: -1 });
MessageSchema.index({ user: 1 });
MessageSchema.index({ threadId: 1 });
MessageSchema.index({ mentions: 1 });
MessageSchema.index({ 'mhc.priority': 1 });
MessageSchema.index({ deleted: 1 });

// Virtual: 스레드 답글 여부
MessageSchema.virtual('isThreadReply').get(function() {
  return this.threadId !== null && !this.isThreadRoot;
});

// 메서드: 리액션 추가
MessageSchema.methods.addReaction = function(emoji, userId) {
  const existingReaction = this.reactions.find(r => r.emoji === emoji);
  
  if (existingReaction) {
    if (!existingReaction.users.includes(userId)) {
      existingReaction.users.push(userId);
    }
  } else {
    this.reactions.push({
      emoji: emoji,
      users: [userId]
    });
  }
  
  return this.save();
};

// 메서드: 리액션 제거
MessageSchema.methods.removeReaction = function(emoji, userId) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    reaction.users = reaction.users.filter(id => !id.equals(userId));
    
    if (reaction.users.length === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
  }
  
  return this.save();
};

// 메서드: 메시지 편집
MessageSchema.methods.edit = function(newContent) {
  this.content = newContent;
  this.edited = true;
  this.editedAt = new Date();
  return this.save();
};

// 메서드: 메시지 삭제 (soft delete)
MessageSchema.methods.softDelete = function() {
  this.deleted = true;
  this.deletedAt = new Date();
  this.content = '[삭제된 메시지]';
  return this.save();
};

// 메서드: 메시지 고정
MessageSchema.methods.pin = function(userId) {
  this.pinned = true;
  this.pinnedBy = userId;
  this.pinnedAt = new Date();
  return this.save();
};

// 메서드: 고정 해제
MessageSchema.methods.unpin = function() {
  this.pinned = false;
  this.pinnedBy = null;
  this.pinnedAt = null;
  return this.save();
};

// Static: 채널의 최근 메시지
MessageSchema.statics.findRecentByChannel = function(channelId, limit = 50) {
  return this.find({
    channel: channelId,
    deleted: false,
    threadId: null  // 스레드 답글 제외
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('user', 'username displayName avatar level')
  .populate('mentions', 'username displayName');
};

// Static: 스레드 답글 조회
MessageSchema.statics.findThreadReplies = function(threadId) {
  return this.find({
    threadId: threadId,
    deleted: false
  })
  .sort({ createdAt: 1 })
  .populate('user', 'username displayName avatar level');
};

// Static: 사용자 멘션 메시지
MessageSchema.statics.findMentions = function(userId) {
  return this.find({
    mentions: userId,
    deleted: false
  })
  .sort({ createdAt: -1 })
  .populate('user', 'username displayName avatar')
  .populate('channel', 'name displayName type');
};

module.exports = mongoose.model('Message', MessageSchema);

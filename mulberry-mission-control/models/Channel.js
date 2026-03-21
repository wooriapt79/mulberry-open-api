/**
 * Channel Model - Slack 스타일 채널
 * 
 * # 일반, # 개발, # 운영, # 긴급, # 현장
 */

const mongoose = require('mongoose');

const ChannelSchema = new mongoose.Schema({
  // 기본 정보
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // 채널 타입
  type: {
    type: String,
    enum: ['public', 'private', 'dm'],
    default: 'public'
  },
  
  // 권한
  minLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0  // Public은 0, Community는 1 등
  },
  
  // 멤버
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 생성자
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 채널 설정
  settings: {
    archived: {
      type: Boolean,
      default: false
    },
    muted: {
      type: Boolean,
      default: false
    },
    pinned: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: String,
      enum: ['all', 'mentions', 'none'],
      default: 'all'
    }
  },
  
  // 통계
  stats: {
    messageCount: { type: Number, default: 0 },
    memberCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: null }
  },
  
  // DM 전용 (type이 'dm'일 때)
  dmParticipants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// 인덱스
ChannelSchema.index({ name: 1 });
ChannelSchema.index({ type: 1 });
ChannelSchema.index({ 'settings.archived': 1 });
ChannelSchema.index({ members: 1 });
ChannelSchema.index({ createdBy: 1 });

// Virtual: 멤버 수
ChannelSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual: 채널 아이콘
ChannelSchema.virtual('icon').get(function() {
  if (this.type === 'dm') return '💬';
  if (this.type === 'private') return '🔒';
  return '#';
});

// 메서드: 멤버 추가
ChannelSchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.stats.memberCount = this.members.length;
    return this.save();
  }
  return Promise.resolve(this);
};

// 메서드: 멤버 제거
ChannelSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(id => !id.equals(userId));
  this.stats.memberCount = this.members.length;
  return this.save();
};

// 메서드: 관리자 확인
ChannelSchema.methods.isAdmin = function(userId) {
  return this.admins.some(id => id.equals(userId));
};

// 메서드: 멤버 확인
ChannelSchema.methods.isMember = function(userId) {
  return this.members.some(id => id.equals(userId));
};

// 메서드: 메시지 카운트 증가
ChannelSchema.methods.incrementMessageCount = function() {
  this.stats.messageCount += 1;
  this.stats.lastMessageAt = new Date();
  return this.save();
};

// Static: 사용자의 채널 목록 조회
ChannelSchema.statics.findByUser = function(userId) {
  return this.find({
    members: userId,
    'settings.archived': false
  }).sort({ 'stats.lastMessageAt': -1 });
};

// Static: DM 채널 찾기 또는 생성
ChannelSchema.statics.findOrCreateDM = async function(user1Id, user2Id) {
  // 기존 DM 찾기
  let dm = await this.findOne({
    type: 'dm',
    dmParticipants: { $all: [user1Id, user2Id] }
  });
  
  if (!dm) {
    // 새 DM 생성
    dm = await this.create({
      name: `dm_${user1Id}_${user2Id}`,
      displayName: 'Direct Message',
      type: 'dm',
      createdBy: user1Id,
      members: [user1Id, user2Id],
      dmParticipants: [user1Id, user2Id]
    });
  }
  
  return dm;
};

module.exports = mongoose.model('Channel', ChannelSchema);

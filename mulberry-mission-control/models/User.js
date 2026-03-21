/**
 * User Model - 6단계 권한 시스템
 * 
 * Level 5: 👑 CEO (re.eul)
 * Level 4: 👨‍💻 Core Team (Koda, Trang, Kbin)
 * Level 3: 🤝 Partner
 * Level 2: 💰 Investor
 * Level 1: 👥 Community
 * Level 0: 🌍 Public
 */

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // 기본 정보
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  
  // 권한 시스템
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 0
  },
  role: {
    type: String,
    enum: ['CEO', 'CTO', 'PM', 'CSA', 'Partner', 'Investor', 'Community', 'Public'],
    default: 'Public'
  },
  
  // 프로필
  displayName: {
    type: String,
    default: function() { return this.username; }
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  
  // 상태
  status: {
    type: String,
    enum: ['online', 'away', 'busy', 'offline'],
    default: 'offline'
  },
  statusMessage: {
    type: String,
    default: ''
  },
  
  // 활동
  lastActive: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  
  // 설정
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      dm: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'ko'
    }
  },
  
  // 통계
  stats: {
    messagesSent: { type: Number, default: 0 },
    channelsJoined: { type: Number, default: 0 },
    emailsProcessed: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// 인덱스
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ level: 1 });
UserSchema.index({ status: 1 });

// Virtual: 권한 레벨 이름
UserSchema.virtual('levelName').get(function() {
  const levels = {
    5: '👑 CEO',
    4: '👨‍💻 Core Team',
    3: '🤝 Partner',
    2: '💰 Investor',
    1: '👥 Community',
    0: '🌍 Public'
  };
  return levels[this.level];
});

// 메서드: 권한 확인
UserSchema.methods.hasPermission = function(requiredLevel) {
  return this.level >= requiredLevel;
};

// 메서드: CEO 여부
UserSchema.methods.isCEO = function() {
  return this.level === 5;
};

// 메서드: Core Team 여부
UserSchema.methods.isCoreTeam = function() {
  return this.level >= 4;
};

// 메서드: 온라인 상태 업데이트
UserSchema.methods.updateStatus = function(status, message = '') {
  this.status = status;
  this.statusMessage = message;
  this.lastActive = new Date();
  return this.save();
};

// 메서드: 활동 기록
UserSchema.methods.recordActivity = function(activityType) {
  this.lastActive = new Date();
  
  switch(activityType) {
    case 'message':
      this.stats.messagesSent += 1;
      break;
    case 'channel_join':
      this.stats.channelsJoined += 1;
      break;
    case 'email':
      this.stats.emailsProcessed += 1;
      break;
  }
  
  return this.save();
};

// JSON 변환 시 password 제외
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);

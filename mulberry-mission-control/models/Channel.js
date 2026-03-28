/**
 * Channel 모델 수정 - Meeting Type 추가
 * 
 * 기존 Channel.js에 추가할 내용
 * 
 * @author CTO Koda
 * @date 2026-03-29
 */

const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  // ==================== 기존 필드 (유지) ====================
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  
  // ==================== type 필드 수정 ====================
  type: {
    type: String,
    enum: ['public', 'private', 'direct', 'meeting'], // 'meeting' 추가!
    default: 'public'
  },
  
  // ==================== 기존 필드 (유지) ====================
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'blocked'],
      default: 'active'
    }
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ==================== Meeting 전용 필드 (신규) ====================
  
  // 회의 일정
  scheduledAt: {
    type: Date
  },
  
  // 예상 소요 시간 (분)
  duration: {
    type: Number // 예: 60 (1시간)
  },
  
  // 회의 만료 시간
  expiresAt: {
    type: Date
  },
  
  // 화상/음성 회의 링크
  meetingLink: {
    type: String
  },
  
  // 초대 코드 (임의 가입용)
  inviteCode: {
    type: String,
    unique: true,
    sparse: true // meeting type일 때만 값 있음
  },
  
  // 회의 상태
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  
  // 회의 종료 시간
  endedAt: {
    type: Date
  },
  
  // 회의 시작 시간 (실제 시작)
  startedAt: {
    type: Date
  },
  
  // 회의 설정
  meetingSettings: {
    allowGuests: {
      type: Boolean,
      default: true
    },
    requirePassword: {
      type: Boolean,
      default: false
    },
    password: {
      type: String
    },
    maxParticipants: {
      type: Number,
      default: 100
    },
    recordMeeting: {
      type: Boolean,
      default: false
    }
  }
  
}, {
  timestamps: true
});

// ==================== 인덱스 ====================
channelSchema.index({ type: 1, status: 1 });
channelSchema.index({ inviteCode: 1 });
channelSchema.index({ scheduledAt: 1 });
channelSchema.index({ expiresAt: 1 });

// ==================== 메서드 ====================

/**
 * 회의 초대 코드 생성
 */
channelSchema.methods.generateInviteCode = function() {
  this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  return this.inviteCode;
};

/**
 * 회의 만료 여부 확인
 */
channelSchema.methods.isExpired = function() {
  if (this.type !== 'meeting') return false;
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/**
 * 회의 시작
 */
channelSchema.methods.startMeeting = function() {
  this.status = 'active';
  this.startedAt = new Date();
  return this.save();
};

/**
 * 회의 종료
 */
channelSchema.methods.endMeeting = function() {
  this.status = 'ended';
  this.endedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Channel', channelSchema);

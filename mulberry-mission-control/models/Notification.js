/**
 * Notification Model - 통합 알림 시스템
 * 
 * 멘션, DM, 시스템 알림 등
 */

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // 수신자
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 알림 타입
  type: {
    type: String,
    enum: ['mention', 'dm', 'system', 'channel', 'email', 'field', 'github', 'mhc'],
    required: true
  },
  
  // 제목
  title: {
    type: String,
    required: true
  },
  
  // 메시지
  message: {
    type: String,
    required: true
  },
  
  // 링크 (클릭 시 이동할 위치)
  link: {
    type: String,
    default: null
  },
  
  // 관련 데이터
  relatedData: {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      default: null
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  
  // 우선순위
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 읽음 여부
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  
  // 액션 버튼 (선택사항)
  actions: [{
    label: String,
    action: String,
    url: String
  }]
}, {
  timestamps: true
});

// 인덱스
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ priority: 1 });

// 메서드: 읽음 처리
NotificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static: 사용자의 읽지 않은 알림
NotificationSchema.statics.findUnreadByUser = function(userId) {
  return this.find({
    user: userId,
    read: false
  })
  .sort({ createdAt: -1 })
  .populate('relatedData.senderId', 'username displayName avatar');
};

// Static: 사용자의 알림 목록
NotificationSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ user: userId })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('relatedData.senderId', 'username displayName avatar')
  .populate('relatedData.channelId', 'name displayName');
};

// Static: 알림 생성 (헬퍼)
NotificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create({
    user: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || null,
    priority: data.priority || 'normal',
    relatedData: data.relatedData || {}
  });
  
  // Socket.io로 실시간 전송 (나중에 구현)
  // io.to(`user_${data.userId}`).emit('notification', notification);
  
  return notification;
};

module.exports = mongoose.model('Notification', NotificationSchema);

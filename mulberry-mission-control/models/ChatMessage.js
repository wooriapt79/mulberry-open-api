/**
 * ChatMessage Model — Team Chat 영속화 (DAY7)
 *
 * socket/chat-events.js 전용 경량 스키마.
 * User/Channel ObjectId 참조가 필요한 models/Message.js와 달리
 * #general/#dev/#research 슬러그 + passportId 문자열만 사용.
 *
 * @author CTO Koda · DAY7 · 2026-06-25
 */

const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  channel: {
    type: String,
    required: true,
    index: true,
  },
  passportId: {
    type: String,
    default: 'anonymous',
  },
  name: {
    type: String,
    default: '익명',
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  ts: {
    type: Date,
    default: Date.now,
  },
});

ChatMessageSchema.index({ channel: 1, ts: -1 });

ChatMessageSchema.statics.findRecentByChannel = function (channel, limit = 50) {
  return this.find({ channel })
    .sort({ ts: -1 })
    .limit(limit)
    .lean()
    .then((docs) => docs.reverse());
};

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);

/**
 * TAB 4: Chat Routes
 * 
 * 실시간 팀 채팅 시스템
 * 메시지 전송, 스레드, 리액션, 검색
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { jwtMiddleware } = require('../utils/jwt');

/**
 * GET /api/chat/messages/:channelId
 * 채널의 메시지 목록 조회
 */
router.get('/messages/:channelId', jwtMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // 페이지네이션
    
    // 채널 접근 권한 확인
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }
    
    const user = await User.findById(req.userId);
    if (!channel.isMember(req.userId) && channel.type !== 'public') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    if (channel.minLevel > user.level) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    
    // 메시지 조회
    let query = {
      channel: channelId,
      deleted: false,
      threadId: null // 스레드 답글 제외
    };
    
    if (before) {
      query._id = { $lt: before };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'username displayName avatar level status')
      .populate('mentions', 'username displayName');
    
    res.json({
      success: true,
      count: messages.length,
      messages: messages.reverse() // 시간순 정렬
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/chat/messages
 * 메시지 전송
 */
router.post('/messages', jwtMiddleware, async (req, res) => {
  try {
    const { channelId, content, threadId, mentions } = req.body;
    
    if (!channelId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID and content are required'
      });
    }
    
    // 채널 확인
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }
    
    if (!channel.isMember(req.userId)) {
      return res.status(403).json({ success: false, error: 'Not a channel member' });
    }
    
    // 메시지 생성
    const message = new Message({
      channel: channelId,
      user: req.userId,
      content,
      threadId: threadId || null,
      mentions: mentions || [],
      type: 'text'
    });
    
    await message.save();
    
    // 채널 통계 업데이트
    await channel.incrementMessageCount();
    
    // 사용자 활동 기록
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.messagesSent': 1 },
      lastActive: new Date()
    });
    
    // 스레드 답글인 경우, 루트 메시지의 답글 수 증가
    if (threadId) {
      await Message.findByIdAndUpdate(threadId, {
        $inc: { threadReplyCount: 1 }
      });
    }
    
    // 멘션 알림 생성
    if (mentions && mentions.length > 0) {
      for (const mentionedUserId of mentions) {
        await Notification.createNotification({
          userId: mentionedUserId,
          type: 'mention',
          title: '새 멘션',
          message: `${req.user?.displayName || 'Someone'}님이 당신을 멘션했습니다`,
          link: `/channels/${channelId}`,
          priority: 'normal',
          relatedData: {
            channelId,
            messageId: message._id,
            senderId: req.userId
          }
        });
      }
    }
    
    // Populate user info for response
    await message.populate('user', 'username displayName avatar level');
    
    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/chat/messages/:id
 * 메시지 편집
 */
router.put('/messages/:id', jwtMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }
    
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    // 본인 메시지만 편집 가능
    if (!message.user.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Can only edit your own messages'
      });
    }
    
    await message.edit(content);
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/chat/messages/:id
 * 메시지 삭제 (soft delete)
 */
router.delete('/messages/:id', jwtMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    const user = await User.findById(req.userId);
    
    // 본인 메시지 또는 Core Team만 삭제 가능
    if (!message.user.equals(req.userId) && user.level < 4) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }
    
    await message.softDelete();
    
    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/chat/messages/:id/react
 * 리액션 추가/제거
 */
router.post('/messages/:id/react', jwtMiddleware, async (req, res) => {
  try {
    const { emoji } = req.body;
    
    if (!emoji) {
      return res.status(400).json({
        success: false,
        error: 'Emoji is required'
      });
    }
    
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    // 이미 리액션했는지 확인
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (existingReaction && existingReaction.users.includes(req.userId)) {
      // 리액션 제거
      await message.removeReaction(emoji, req.userId);
    } else {
      // 리액션 추가
      await message.addReaction(emoji, req.userId);
    }
    
    res.json({
      success: true,
      reactions: message.reactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/chat/threads/:threadId
 * 스레드 답글 조회
 */
router.get('/threads/:threadId', jwtMiddleware, async (req, res) => {
  try {
    const replies = await Message.findThreadReplies(req.params.threadId);
    
    res.json({
      success: true,
      count: replies.length,
      replies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/chat/search
 * 메시지 검색
 */
router.post('/search', jwtMiddleware, async (req, res) => {
  try {
    const { query, channelId, userId, limit = 50 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    // 검색 조건 구성
    const searchConditions = {
      deleted: false,
      $or: [
        { content: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (channelId) {
      searchConditions.channel = channelId;
    }
    
    if (userId) {
      searchConditions.user = userId;
    }
    
    // 내가 접근 가능한 채널만 검색
    const user = await User.findById(req.userId);
    const myChannels = await Channel.find({
      $or: [
        { members: req.userId },
        { type: 'public', minLevel: { $lte: user.level } }
      ]
    });
    
    const channelIds = myChannels.map(c => c._id);
    searchConditions.channel = { $in: channelIds };
    
    const messages = await Message.find(searchConditions)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'username displayName avatar')
      .populate('channel', 'name displayName type');
    
    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/chat/messages/:id/pin
 * 메시지 고정
 */
router.post('/messages/:id/pin', jwtMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    const channel = await Channel.findById(message.channel);
    const user = await User.findById(req.userId);
    
    // 채널 관리자 또는 Core Team만 고정 가능
    if (!channel.isAdmin(req.userId) && user.level < 4) {
      return res.status(403).json({
        success: false,
        error: 'Only channel admins can pin messages'
      });
    }
    
    if (message.pinned) {
      await message.unpin();
    } else {
      await message.pin(req.userId);
    }
    
    res.json({
      success: true,
      pinned: message.pinned
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/chat/mentions
 * 내 멘션 메시지 조회
 */
router.get('/mentions', jwtMiddleware, async (req, res) => {
  try {
    const mentions = await Message.findMentions(req.userId);
    
    res.json({
      success: true,
      count: mentions.length,
      mentions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

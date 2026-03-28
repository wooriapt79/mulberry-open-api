/**
 * TAB 3: Channels Management Routes
 * 
 * 채널 생성, 조회, 가입/탈퇴
 */

const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { jwtMiddleware } = require('../utils/jwt');

/**
 * GET /api/channels
 * 내 채널 목록 조회
 */
router.get('/', jwtMiddleware, async (req, res) => {
  try {
    const channels = await Channel.findByUser(req.userId);
    
    res.json({
      success: true,
      count: channels.length,
      channels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/channels/all
 * 모든 공개 채널 조회
 */
router.get('/all', jwtMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // 내 권한 레벨 이하의 공개 채널만 조회
    const channels = await Channel.find({
      type: 'public',
      minLevel: { $lte: user.level },
      'settings.archived': false
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      count: channels.length,
      channels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/channels/:id
 * 특정 채널 조회
 */
router.get('/:id', jwtMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('members', 'username displayName avatar status level')
      .populate('createdBy', 'username displayName');
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }
    
    // 접근 권한 확인
    const user = await User.findById(req.userId);
    
    if (channel.type === 'private' && !channel.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    if (channel.minLevel > user.level) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    res.json({
      success: true,
      channel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/channels
 * 새 채널 생성
 */
router.post('/', jwtMiddleware, async (req, res) => {
  try {
    const { name, displayName, description, type = 'public', minLevel = 0 } = req.body;
    
    if (!name || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Name and display name are required'
      });
    }
    
    // 이름 중복 확인
    const existing = await Channel.findOne({ name });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Channel name already exists'
      });
    }
    
    const user = await User.findById(req.userId);
    
    // 권한 확인 (Level 4+ Core Team만 생성 가능)
    if (user.level < 4) {
      return res.status(403).json({
        success: false,
        error: 'Only Core Team can create channels'
      });
    }
    
    const channel = new Channel({
      name,
      displayName,
      description,
      type,
      minLevel,
      createdBy: req.userId,
      members: [req.userId],
      admins: [req.userId],
      stats: {
        memberCount: 1
      }
    });
    
    await channel.save();
    
    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      channel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/channels/:id
 * 채널 정보 수정 (관리자만)
 */
router.put('/:id', jwtMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }
    
    const user = await User.findById(req.userId);
    
    // 관리자 또는 Core Team만 수정 가능
    if (!channel.isAdmin(req.userId) && user.level < 4) {
      return res.status(403).json({
        success: false,
        error: 'Only channel admins can modify'
      });
    }
    
    const { displayName, description } = req.body;
    
    if (displayName) channel.displayName = displayName;
    if (description !== undefined) channel.description = description;
    
    await channel.save();
    
    res.json({
      success: true,
      message: 'Channel updated successfully',
      channel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/channels/:id
 * 채널 삭제 (CEO only)
 */
router.delete('/:id', jwtMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (user.level !== 5) {
      return res.status(403).json({
        success: false,
        error: 'CEO only'
      });
    }
    
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }
    
    await channel.deleteOne();
    
    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 신규 API (Koda - 2026-03-29) ====================

/**
 * POST /api/channels/:id/invite
 * 채널에 멤버 초대
 */
router.post('/:id/invite', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    const inviterId = req.user.userId;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds 배열이 필요합니다 ❌' });
    }

    const channel = await Channel.findById(id);
    if (!channel) {
      return res.status(404).json({ success: false, message: '채널을 찾을 수 없습니다 ❌' });
    }

    const isInviterMember = channel.members.some(m => m.userId.toString() === inviterId);
    const isCreator = channel.createdBy.toString() === inviterId;
    if (!isInviterMember && !isCreator) {
      return res.status(403).json({ success: false, message: '초대 권한이 없습니다 ❌' });
    }

    const inviter = await User.findById(inviterId).select('username displayName');
    const invitedUsers = [];

    for (const userId of userIds) {
      const isAlreadyMember = channel.members.some(m => m.userId.toString() === userId);
      if (isAlreadyMember) continue;

      channel.members.push({ userId, role: 'member', joinedAt: new Date(), status: 'pending' });

      await Notification.create({
        userId,
        type: 'channel_invite',
        title: `${inviter.displayName || inviter.username}님이 채널에 초대했습니다`,
        content: `"${channel.name}" 채널에 초대되었습니다`,
        data: { channelId: id, channelName: channel.name, invitedBy: inviterId, inviterName: inviter.displayName || inviter.username }
      });

      invitedUsers.push(userId);
    }

    await channel.save();

    if (global.io) {
      global.io.to(`channel:${id}`).emit('channel-invite', { channelId: id, invitedBy: inviterId, invitedUsers, timestamp: new Date() });
    }

    res.json({ success: true, message: `${invitedUsers.length}명을 초대했습니다 ✅`, data: { channelId: id, invitedCount: invitedUsers.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: '초대 실패 ❌', error: error.message });
  }
});

/**
 * POST /api/channels/:id/join
 * 채널 가입 (초대 수락 또는 직접 가입)
 */
router.post('/:id/join', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const channel = await Channel.findById(id);
    if (!channel) {
      return res.status(404).json({ success: false, message: '채널을 찾을 수 없습니다 ❌' });
    }

    const existingMember = channel.members.find(m => m.userId.toString() === userId);
    if (existingMember && existingMember.status === 'active') {
      return res.status(400).json({ success: false, message: '이미 가입된 채널입니다 ⚠️' });
    }

    if (channel.type === 'private') {
      if (!existingMember || existingMember.status !== 'pending') {
        return res.status(403).json({ success: false, message: '초대받은 사용자만 가입할 수 있습니다 ❌' });
      }
      existingMember.status = 'active';
      existingMember.joinedAt = new Date();
    } else {
      if (existingMember) {
        existingMember.status = 'active';
        existingMember.joinedAt = new Date();
      } else {
        channel.members.push({ userId, role: 'member', joinedAt: new Date(), status: 'active' });
      }
    }

    await channel.save();

    if (global.io) {
      global.io.to(`channel:${id}`).emit('user-joined-channel', { channelId: id, userId, timestamp: new Date() });
    }

    res.json({ success: true, message: '채널에 가입했습니다 ✅', data: { channelId: id, channelName: channel.name } });
  } catch (error) {
    res.status(500).json({ success: false, message: '가입 실패 ❌', error: error.message });
  }
});

/**
 * DELETE /api/channels/:id/leave
 * 채널 나가기
 */
router.delete('/:id/leave', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const channel = await Channel.findById(id);
    if (!channel) {
      return res.status(404).json({ success: false, message: '채널을 찾을 수 없습니다 ❌' });
    }

    if (channel.createdBy.toString() === userId) {
      return res.status(403).json({ success: false, message: '채널 생성자는 나갈 수 없습니다 ❌' });
    }

    channel.members = channel.members.filter(m => m.userId.toString() !== userId);
    await channel.save();

    if (global.io) {
      global.io.to(`channel:${id}`).emit('user-left-channel', { channelId: id, userId, timestamp: new Date() });
    }

    res.json({ success: true, message: '채널을 나갔습니다 👋', data: { channelId: id } });
  } catch (error) {
    res.status(500).json({ success: false, message: '채널 나가기 실패 ❌', error: error.message });
  }
});

/**
 * GET /api/channels/:id/members
 * 채널 멤버 목록 조회
 */
router.get('/:id/members', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const channel = await Channel.findById(id)
      .populate('members.userId', 'username displayName avatar status bio')
      .populate('createdBy', 'username displayName avatar');

    if (!channel) {
      return res.status(404).json({ success: false, message: '채널을 찾을 수 없습니다 ❌' });
    }

    const members = channel.members
      .filter(m => m.status === 'active')
      .map(m => ({
        userId: m.userId._id,
        username: m.userId.username,
        displayName: m.userId.displayName,
        avatar: m.userId.avatar,
        status: m.userId.status,
        bio: m.userId.bio,
        role: m.role,
        joinedAt: m.joinedAt
      }));

    res.json({
      success: true,
      data: {
        channelId: id,
        channelName: channel.name,
        totalMembers: members.length,
        creator: {
          userId: channel.createdBy._id,
          username: channel.createdBy.username,
          displayName: channel.createdBy.displayName,
          avatar: channel.createdBy.avatar
        },
        members
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '멤버 조회 실패 ❌', error: error.message });
  }
});

module.exports = router;

/**
 * TAB 3: Channels Management Routes
 * 
 * 채널 생성, 조회, 가입/탈퇴
 */

const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const User = require('../models/User');
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
 * POST /api/channels/:id/join
 * 채널 가입
 */
router.post('/:id/join', jwtMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }
    
    const user = await User.findById(req.userId);
    
    // 권한 확인
    if (channel.minLevel > user.level) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    // 이미 가입되어 있는지 확인
    if (channel.isMember(req.userId)) {
      return res.status(400).json({
        success: false,
        error: 'Already a member'
      });
    }
    
    await channel.addMember(req.userId);
    
    res.json({
      success: true,
      message: 'Joined channel successfully',
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
 * POST /api/channels/:id/leave
 * 채널 나가기
 */
router.post('/:id/leave', jwtMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }
    
    if (!channel.isMember(req.userId)) {
      return res.status(400).json({
        success: false,
        error: 'Not a member'
      });
    }
    
    // 관리자는 마지막으로 나갈 수 없음
    if (channel.isAdmin(req.userId) && channel.admins.length === 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot leave as the last admin'
      });
    }
    
    await channel.removeMember(req.userId);
    
    res.json({
      success: true,
      message: 'Left channel successfully'
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

module.exports = router;

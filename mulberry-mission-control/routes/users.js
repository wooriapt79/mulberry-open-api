/**
 * TAB 2: Users Management Routes
 * 
 * 사용자 목록 조회, 관리, 권한 변경
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { jwtMiddleware } = require('../utils/jwt');
const { requireLevel, requireCEO } = require('../middleware/auth');

/**
 * GET /api/users
 * 사용자 목록 조회 (Level 4+ Core Team)
 */
router.get('/', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ level: -1, createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/users/online
 * 온라인 사용자 조회
 */
router.get('/online', jwtMiddleware, async (req, res) => {
  try {
    const users = await User.find({ status: 'online' })
      .select('-password')
      .sort({ displayName: 1 });
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/users/:id
 * 특정 사용자 조회
 */
router.get('/:id', jwtMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * 사용자 정보 수정
 */
router.put('/:id', jwtMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { displayName, bio, avatar, statusMessage } = req.body;
    
    // 본인 또는 Core Team만 수정 가능
    if (userId !== req.userId && req.userLevel < 4) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (displayName) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (statusMessage !== undefined) user.statusMessage = statusMessage;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:id/level
 * 권한 레벨 변경 (CEO only)
 */
router.put('/:id/level', jwtMiddleware, requireCEO, async (req, res) => {
  try {
    const { level, role } = req.body;
    
    if (level < 0 || level > 5) {
      return res.status(400).json({
        success: false,
        error: 'Level must be between 0 and 5'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    user.level = level;
    if (role) user.role = role;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User level updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:id/status
 * 사용자 상태 변경
 */
router.put('/:id/status', jwtMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { status, statusMessage } = req.body;
    
    // 본인만 변경 가능
    if (userId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Can only update your own status'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (status) user.status = status;
    if (statusMessage !== undefined) user.statusMessage = statusMessage;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * 사용자 삭제 (CEO only)
 */
router.delete('/:id', jwtMiddleware, requireCEO, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // CEO는 삭제 불가
    if (user.level === 5) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete CEO account'
      });
    }
    
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

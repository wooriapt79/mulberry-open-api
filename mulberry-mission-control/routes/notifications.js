/**
 * TAB 5: Notifications Routes
 * 
 * 통합 알림 시스템
 */

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { jwtMiddleware } = require('../utils/jwt');

/**
 * GET /api/notifications
 * 알림 목록 조회
 */
router.get('/', jwtMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unread === 'true';
    
    let query = { user: req.userId };
    
    if (unreadOnly) {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('relatedData.senderId', 'username displayName avatar')
      .populate('relatedData.channelId', 'name displayName');
    
    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/unread
 * 읽지 않은 알림
 */
router.get('/unread', jwtMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.findUnreadByUser(req.userId);
    
    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/count
 * 읽지 않은 알림 개수
 */
router.get('/count', jwtMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.userId,
      read: false
    });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * 알림 읽음 처리
 */
router.put('/:id/read', jwtMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    // 본인 알림만 처리 가능
    if (!notification.user.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    await notification.markAsRead();
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/read-all
 * 모든 알림 읽음 처리
 */
router.post('/read-all', jwtMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * 알림 삭제
 */
router.delete('/:id', jwtMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    if (!notification.user.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    await notification.deleteOne();
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/notifications/clear-all
 * 모든 알림 삭제
 */
router.delete('/clear-all', jwtMiddleware, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.userId,
      read: true
    });
    
    res.json({
      success: true,
      message: 'All read notifications cleared',
      count: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

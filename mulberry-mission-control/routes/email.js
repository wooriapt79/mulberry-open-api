/**
 * TAB 6: Email AI Routes
 * 
 * AI 기반 이메일 분류, 우선순위 설정, 자동 응답 제안
 */

const express = require('express');
const router = express.Router();
const Email = require('../models/Email');
const { jwtMiddleware } = require('../utils/jwt');
const { requireLevel } = require('../middleware/auth');

/**
 * GET /api/email/folders/:folder
 * 폴더별 이메일 조회
 */
router.get('/folders/:folder', jwtMiddleware, async (req, res) => {
  try {
    const { folder } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const validFolders = ['inbox', 'sent', 'draft', 'trash', 'archive', 'important', 'spam'];
    
    if (!validFolders.includes(folder)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid folder'
      });
    }
    
    const emails = await Email.findByFolder(folder, limit);
    
    res.json({
      success: true,
      folder,
      count: emails.length,
      emails
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email/unread
 * 읽지 않은 이메일
 */
router.get('/unread', jwtMiddleware, async (req, res) => {
  try {
    const emails = await Email.findUnread();
    
    res.json({
      success: true,
      count: emails.length,
      emails
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email/:id
 * 특정 이메일 조회
 */
router.get('/:id', jwtMiddleware, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    res.json({
      success: true,
      email
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/send
 * 이메일 발송 (실제 발송은 추후 구현)
 */
router.post('/send', jwtMiddleware, async (req, res) => {
  try {
    const { to, cc, bcc, subject, body, bodyHtml } = req.body;
    
    if (!to || to.length === 0 || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'To, subject, and body are required'
      });
    }
    
    // 이메일 생성 (발송은 나중에)
    const email = new Email({
      from: req.user?.email || 'noreply@mulberry.ai',
      to,
      cc: cc || [],
      bcc: bcc || [],
      subject,
      body,
      bodyHtml,
      folder: 'sent',
      read: true,
      sentAt: new Date(),
      metadata: {
        date: new Date()
      }
    });
    
    await email.save();
    
    res.status(201).json({
      success: true,
      message: 'Email sent successfully',
      email
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/email/:id/read
 * 읽음 처리
 */
router.put('/:id/read', jwtMiddleware, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    await email.markAsRead();
    
    res.json({
      success: true,
      email
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/email/:id/star
 * 별표 토글
 */
router.put('/:id/star', jwtMiddleware, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    await email.toggleStar();
    
    res.json({
      success: true,
      starred: email.starred
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/email/:id/folder
 * 폴더 이동
 */
router.put('/:id/folder', jwtMiddleware, async (req, res) => {
  try {
    const { folder } = req.body;
    
    const validFolders = ['inbox', 'sent', 'draft', 'trash', 'archive', 'important', 'spam'];
    
    if (!validFolders.includes(folder)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid folder'
      });
    }
    
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    await email.moveToFolder(folder);
    
    res.json({
      success: true,
      folder: email.folder
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/search
 * 이메일 검색
 */
router.post('/search', jwtMiddleware, async (req, res) => {
  try {
    const { query, limit = 50 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const emails = await Email.search(query, limit);
    
    res.json({
      success: true,
      count: emails.length,
      emails
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email/ai/pending
 * AI 처리 대기 중인 이메일
 */
router.get('/ai/pending', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const emails = await Email.findPendingAI(limit);
    
    res.json({
      success: true,
      count: emails.length,
      emails
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email/:id/ai-analyze
 * AI 분석 실행 (시뮬레이션)
 */
router.post('/:id/ai-analyze', jwtMiddleware, requireLevel(4), async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }
    
    // AI 분석 시뮬레이션 (실제로는 DeepSeek V4 API 호출)
    const analysis = {
      summary: `${email.subject}에 대한 이메일`,
      category: 'work',
      sentiment: 'neutral',
      urgency: 'normal',
      confidence: 0.85,
      suggestedReply: null,
      actionItems: [],
      deadline: null
    };
    
    // 키워드 기반 간단한 분류
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    
    if (subject.includes('urgent') || subject.includes('긴급')) {
      analysis.urgency = 'high';
      analysis.priority = 'high';
    }
    
    if (subject.includes('meeting') || subject.includes('회의')) {
      analysis.category = 'work';
      analysis.actionItems.push('회의 일정 확인');
    }
    
    if (body.includes('thanks') || body.includes('감사')) {
      analysis.sentiment = 'positive';
    }
    
    // 분석 결과 저장
    await email.addAIAnalysis(analysis);
    
    res.json({
      success: true,
      message: 'AI analysis completed',
      analysis: email.aiAnalysis
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/email/stats
 * 이메일 통계
 */
router.get('/stats', jwtMiddleware, async (req, res) => {
  try {
    const [
      totalEmails,
      unreadCount,
      starredCount,
      aiProcessedCount
    ] = await Promise.all([
      Email.countDocuments({ folder: { $ne: 'trash' } }),
      Email.countDocuments({ read: false, folder: { $ne: 'trash' } }),
      Email.countDocuments({ starred: true }),
      Email.countDocuments({ aiProcessed: true })
    ]);
    
    // 카테고리별 통계
    const categoryStats = await Email.aggregate([
      { $match: { aiProcessed: true } },
      { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        total: totalEmails,
        unread: unreadCount,
        starred: starredCount,
        aiProcessed: aiProcessedCount,
        categories: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

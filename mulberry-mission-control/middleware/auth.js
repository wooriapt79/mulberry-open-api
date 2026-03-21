/**
 * Middleware - Authentication & Authorization
 * 
 * 6단계 권한 시스템 미들웨어
 */

// 인증 확인
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: '로그인이 필요합니다.'
    });
  }
  next();
}

// 권한 레벨 확인
function requireLevel(minLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: '로그인이 필요합니다.'
      });
    }
    
    if (req.user.level < minLevel) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `권한이 부족합니다. 최소 Level ${minLevel} 이상이 필요합니다.`,
        userLevel: req.user.level,
        requiredLevel: minLevel
      });
    }
    
    next();
  };
}

// CEO 전용
function requireCEO(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (req.user.level !== 5) {
    return res.status(403).json({
      success: false,
      error: 'CEO only',
      message: '이 기능은 CEO만 사용할 수 있습니다.'
    });
  }
  
  next();
}

// Core Team 이상
function requireCoreTeam(req, res, next) {
  return requireLevel(4)(req, res, next);
}

// Partner 이상
function requirePartner(req, res, next) {
  return requireLevel(3)(req, res, next);
}

// Investor 이상
function requireInvestor(req, res, next) {
  return requireLevel(2)(req, res, next);
}

// Community 이상
function requireCommunity(req, res, next) {
  return requireLevel(1)(req, res, next);
}

// 채널 접근 권한 확인
async function checkChannelAccess(req, res, next) {
  try {
    const Channel = require('../models/Channel');
    const channelId = req.params.channelId || req.body.channelId;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID required'
      });
    }
    
    const channel = await Channel.findById(channelId);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }
    
    // Public 채널은 모두 접근 가능
    if (channel.type === 'public' && req.user.level >= channel.minLevel) {
      req.channel = channel;
      return next();
    }
    
    // Private 채널이나 DM은 멤버만 접근 가능
    if (!channel.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: 'Not a channel member',
        message: '이 채널에 접근할 수 없습니다.'
      });
    }
    
    req.channel = channel;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// 채널 관리자 권한 확인
async function checkChannelAdmin(req, res, next) {
  try {
    if (!req.channel) {
      // checkChannelAccess가 먼저 실행되어야 함
      return res.status(400).json({
        success: false,
        error: 'Channel not loaded'
      });
    }
    
    if (!req.channel.isAdmin(req.user._id) && req.user.level < 4) {
      return res.status(403).json({
        success: false,
        error: 'Channel admin only',
        message: '채널 관리자 권한이 필요합니다.'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Rate Limiting (간단한 버전)
const rateLimitStore = new Map();

function rateLimit(options = {}) {
  const windowMs = options.windowMs || 60000; // 1분
  const max = options.max || 100; // 요청 100개
  
  return (req, res, next) => {
    const key = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    const userRequests = rateLimitStore.get(key) || [];
    
    // 시간 윈도우 밖의 요청 제거
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= max) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);
    
    next();
  };
}

// 활동 기록
function recordActivity(activityType) {
  return async (req, res, next) => {
    if (req.user) {
      try {
        await req.user.recordActivity(activityType);
      } catch (error) {
        // 활동 기록 실패는 요청을 막지 않음
        console.error('Activity recording failed:', error);
      }
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireLevel,
  requireCEO,
  requireCoreTeam,
  requirePartner,
  requireInvestor,
  requireCommunity,
  checkChannelAccess,
  checkChannelAdmin,
  rateLimit,
  recordActivity
};

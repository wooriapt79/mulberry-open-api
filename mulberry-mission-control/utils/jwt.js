/**
 * JWT Utility
 * 토큰 생성 및 검증
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mulberry-jwt-secret-2026';
const JWT_EXPIRE = '24h';

/**
 * JWT 토큰 생성
 */
function generateToken(user) {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email,
    level: user.level,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
}

/**
 * JWT 토큰 검증
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * JWT 미들웨어 (Express)
 */
function jwtMiddleware(req, res, next) {
  // 헤더에서 토큰 추출
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  const token = authHeader.substring(7); // "Bearer " 제거
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
  
  // 요청에 사용자 정보 추가
  req.userId = decoded.id;
  req.userLevel = decoded.level;
  
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  jwtMiddleware,
  JWT_SECRET
};

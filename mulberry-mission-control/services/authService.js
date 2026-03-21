/**
 * Authentication Service
 * 회원가입, 로그인, 비밀번호 검증 등
 */

const bcrypt = require('bcrypt');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

/**
 * 회원가입
 */
async function register(userData) {
  const { username, email, password, level = 0, role = 'Public' } = userData;
  
  // 이메일 중복 확인
  const existingUser = await User.findOne({ 
    $or: [{ email }, { username }] 
  });
  
  if (existingUser) {
    throw new Error(
      existingUser.email === email 
        ? 'Email already exists' 
        : 'Username already exists'
    );
  }
  
  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  // 사용자 생성
  const user = new User({
    username,
    email,
    password: hashedPassword,
    level,
    role,
    displayName: username,
    status: 'online'
  });
  
  await user.save();
  
  // JWT 토큰 생성
  const token = generateToken(user);
  
  return {
    user: user.toJSON(),
    token
  };
}

/**
 * 로그인
 */
async function login(email, password) {
  // 사용자 찾기
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // 비밀번호 확인
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }
  
  // 상태 업데이트
  user.status = 'online';
  user.lastLogin = new Date();
  await user.save();
  
  // JWT 토큰 생성
  const token = generateToken(user);
  
  return {
    user: user.toJSON(),
    token
  };
}

/**
 * 로그아웃
 */
async function logout(userId) {
  const user = await User.findById(userId);
  
  if (user) {
    user.status = 'offline';
    await user.save();
  }
  
  return { success: true };
}

/**
 * 비밀번호 변경
 */
async function changePassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // 기존 비밀번호 확인
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  
  if (!isOldPasswordValid) {
    throw new Error('Current password is incorrect');
  }
  
  // 새 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.password = hashedPassword;
  await user.save();
  
  return { success: true };
}

/**
 * 사용자 정보 조회
 */
async function getUserById(userId) {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user.toJSON();
}

module.exports = {
  register,
  login,
  logout,
  changePassword,
  getUserById
};

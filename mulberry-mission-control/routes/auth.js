/**
 * TAB 1: Authentication Routes
 * 
 * 회원가입, 로그인, 로그아웃, 내 정보 조회
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { jwtMiddleware } = require('../utils/jwt');

/**
 * POST /api/auth/register
 * 회원가입
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, level, role } = req.body;
    
    // 입력 검증
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }
    
    const result = await authService.register({
      username,
      email,
      password,
      level,
      role
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * 로그인
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * 로그아웃
 */
router.post('/logout', jwtMiddleware, async (req, res) => {
  try {
    await authService.logout(req.userId);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * 내 정보 조회
 */
router.get('/me', jwtMiddleware, async (req, res) => {
  try {
    const user = await authService.getUserById(req.userId);
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/auth/password
 * 비밀번호 변경
 */
router.put('/password', jwtMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Old password and new password are required'
      });
    }
    
    await authService.changePassword(req.userId, oldPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

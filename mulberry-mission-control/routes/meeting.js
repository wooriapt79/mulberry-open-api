/**
 * Meeting API Routes
 * 
 * 회의실 전용 API
 * 
 * @author CTO Koda
 * @date 2026-03-29
 */

const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const User = require('../models/User');
const { jwtMiddleware } = require('../middleware/auth');

/**
 * POST /api/channels/meeting/create
 * 
 * 회의실 생성
 */
router.post('/create', jwtMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      scheduledAt,
      duration = 60, // 기본 1시간
      inviteUserIds = [],
      allowGuests = true,
      requirePassword = false,
      password,
      maxParticipants = 100
    } = req.body;
    
    const userId = req.user.userId;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: '회의 제목이 필요합니다 ❌'
      });
    }

    // 회의 만료 시간 계산
    const scheduledTime = scheduledAt ? new Date(scheduledAt) : new Date();
    const expiresAt = new Date(scheduledTime.getTime() + duration * 60 * 1000);
    
    // 회의실 생성
    const meeting = new Channel({
      name: title,
      description: description,
      type: 'meeting',
      createdBy: userId,
      scheduledAt: scheduledTime,
      duration: duration,
      expiresAt: expiresAt,
      status: 'scheduled',
      meetingSettings: {
        allowGuests: allowGuests,
        requirePassword: requirePassword,
        password: password,
        maxParticipants: maxParticipants,
        recordMeeting: false
      },
      members: [{
        userId: userId,
        role: 'owner',
        joinedAt: new Date(),
        status: 'active'
      }]
    });
    
    // 초대 코드 생성
    meeting.generateInviteCode();
    
    // 초대받은 사용자 추가
    if (inviteUserIds.length > 0) {
      for (const invitedUserId of inviteUserIds) {
        meeting.members.push({
          userId: invitedUserId,
          role: 'member',
          status: 'pending'
        });
      }
    }
    
    await meeting.save();
    
    // 생성자 정보 populate
    await meeting.populate('createdBy', 'username displayName avatar');
    
    res.json({
      success: true,
      message: '회의실이 생성되었습니다 ✅',
      data: {
        meetingId: meeting._id,
        title: meeting.name,
        inviteCode: meeting.inviteCode,
        scheduledAt: meeting.scheduledAt,
        expiresAt: meeting.expiresAt,
        meetingLink: `/meeting/${meeting._id}`,
        creator: meeting.createdBy
      }
    });
    
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      message: '회의실 생성 실패 ❌',
      error: error.message
    });
  }
});

/**
 * POST /api/channels/meeting/:id/start
 * 
 * 회의 시작
 */
router.post('/:id/start', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const meeting = await Channel.findById(id);
    
    if (!meeting || meeting.type !== 'meeting') {
      return res.status(404).json({
        success: false,
        message: '회의를 찾을 수 없습니다 ❌'
      });
    }

    // 호스트 권한 확인
    if (meeting.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '호스트만 회의를 시작할 수 있습니다 ❌'
      });
    }

    // 이미 시작된 회의
    if (meeting.status === 'active') {
      return res.status(400).json({
        success: false,
        message: '이미 진행 중인 회의입니다 ⚠️'
      });
    }

    // 회의 시작
    await meeting.startMeeting();
    
    // Socket.IO 브로드캐스트
    if (global.io) {
      global.io.to(`meeting:${id}`).emit('meeting-started', {
        meetingId: id,
        startedBy: userId,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      message: '회의가 시작되었습니다 🎥',
      data: {
        meetingId: id,
        status: 'active',
        startedAt: meeting.startedAt
      }
    });
    
  } catch (error) {
    console.error('Error starting meeting:', error);
    res.status(500).json({
      success: false,
      message: '회의 시작 실패 ❌',
      error: error.message
    });
  }
});

/**
 * POST /api/channels/meeting/:id/end
 * 
 * 회의 종료
 */
router.post('/:id/end', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const meeting = await Channel.findById(id);
    
    if (!meeting || meeting.type !== 'meeting') {
      return res.status(404).json({
        success: false,
        message: '회의를 찾을 수 없습니다 ❌'
      });
    }

    // 호스트 권한 확인
    if (meeting.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '호스트만 회의를 종료할 수 있습니다 ❌'
      });
    }

    // 회의 종료
    await meeting.endMeeting();
    
    // Socket.IO 브로드캐스트 → 게스트 강제 퇴장
    if (global.io) {
      // 모든 참여자에게 회의 종료 알림
      global.io.to(`meeting:${id}`).emit('meeting-ended', {
        meetingId: id,
        endedBy: userId,
        timestamp: new Date(),
        message: '회의가 종료되었습니다'
      });
      
      // 게스트 강제 퇴장 (Socket.IO에서 처리)
      // socket/groupChat.js의 'end-meeting' 이벤트에서 처리됨
    }
    
    res.json({
      success: true,
      message: '회의가 종료되었습니다 ✅',
      data: {
        meetingId: id,
        status: 'ended',
        endedAt: meeting.endedAt,
        duration: Math.floor((meeting.endedAt - meeting.startedAt) / 1000 / 60) // 분
      }
    });
    
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({
      success: false,
      message: '회의 종료 실패 ❌',
      error: error.message
    });
  }
});

/**
 * GET /api/channels/meeting/active
 * 
 * 현재 진행 중인 회의 목록
 */
router.get('/active', jwtMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 내가 참여 중인 active 회의들
    const activeMeetings = await Channel.find({
      type: 'meeting',
      status: 'active',
      'members.userId': userId,
      'members.status': 'active'
    })
    .populate('createdBy', 'username displayName avatar')
    .sort({ startedAt: -1 });
    
    res.json({
      success: true,
      data: {
        count: activeMeetings.length,
        meetings: activeMeetings.map(m => ({
          meetingId: m._id,
          title: m.name,
          description: m.description,
          creator: m.createdBy,
          startedAt: m.startedAt,
          expiresAt: m.expiresAt,
          participantCount: m.members.filter(mem => mem.status === 'active').length,
          inviteCode: m.inviteCode
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching active meetings:', error);
    res.status(500).json({
      success: false,
      message: '진행 중인 회의 조회 실패 ❌',
      error: error.message
    });
  }
});

/**
 * GET /api/channels/meeting/:id
 * 
 * 회의 상세 정보
 */
router.get('/:id', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const meeting = await Channel.findById(id)
      .populate('createdBy', 'username displayName avatar status')
      .populate('members.userId', 'username displayName avatar status');
    
    if (!meeting || meeting.type !== 'meeting') {
      return res.status(404).json({
        success: false,
        message: '회의를 찾을 수 없습니다 ❌'
      });
    }

    res.json({
      success: true,
      data: {
        meetingId: meeting._id,
        title: meeting.name,
        description: meeting.description,
        creator: meeting.createdBy,
        status: meeting.status,
        scheduledAt: meeting.scheduledAt,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        expiresAt: meeting.expiresAt,
        duration: meeting.duration,
        inviteCode: meeting.inviteCode,
        settings: meeting.meetingSettings,
        participants: meeting.members
          .filter(m => m.status === 'active')
          .map(m => ({
            userId: m.userId._id,
            username: m.userId.username,
            displayName: m.userId.displayName,
            avatar: m.userId.avatar,
            status: m.userId.status,
            role: m.role,
            joinedAt: m.joinedAt
          }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      message: '회의 조회 실패 ❌',
      error: error.message
    });
  }
});

/**
 * POST /api/channels/meeting/join-by-code
 * 
 * 초대 코드로 회의 참여
 */
router.post('/join-by-code', jwtMiddleware, async (req, res) => {
  try {
    const { inviteCode, password } = req.body;
    const userId = req.user.userId;
    
    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: '초대 코드가 필요합니다 ❌'
      });
    }

    const meeting = await Channel.findOne({ 
      type: 'meeting',
      inviteCode: inviteCode.toUpperCase()
    });
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: '유효하지 않은 초대 코드입니다 ❌'
      });
    }

    // 비밀번호 확인
    if (meeting.meetingSettings.requirePassword) {
      if (!password || password !== meeting.meetingSettings.password) {
        return res.status(403).json({
          success: false,
          message: '비밀번호가 일치하지 않습니다 ❌'
        });
      }
    }

    // 만료 확인
    if (meeting.isExpired()) {
      return res.status(410).json({
        success: false,
        message: '종료된 회의입니다 ⚠️'
      });
    }

    // 참여자 수 확인
    const activeMembers = meeting.members.filter(m => m.status === 'active');
    if (activeMembers.length >= meeting.meetingSettings.maxParticipants) {
      return res.status(403).json({
        success: false,
        message: '참여 인원이 초과되었습니다 ❌'
      });
    }

    // 이미 참여 중인지 확인
    const existingMember = meeting.members.find(m => m.userId.toString() === userId);
    if (existingMember) {
      existingMember.status = 'active';
    } else {
      meeting.members.push({
        userId: userId,
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      });
    }
    
    await meeting.save();
    
    res.json({
      success: true,
      message: '회의에 참여했습니다 ✅',
      data: {
        meetingId: meeting._id,
        title: meeting.name,
        status: meeting.status
      }
    });
    
  } catch (error) {
    console.error('Error joining by code:', error);
    res.status(500).json({
      success: false,
      message: '회의 참여 실패 ❌',
      error: error.message
    });
  }
});

module.exports = router;

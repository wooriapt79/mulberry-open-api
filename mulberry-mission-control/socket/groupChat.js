/**
 * Socket.IO 그룹 채팅 핸들러
 * 
 * Trang 지시서 기반 구현
 * - 채널 입장/퇴장
 * - 실시간 메시지
 * - 타이핑 인디케이터
 * - 리액션 실시간 반영
 * - 회의실 참여자 관리
 * 
 * @author CTO Koda
 * @date 2026-03-29
 */

const Channel = require('../models/Channel');
const User = require('../models/User');

/**
 * 그룹 채팅 Socket.IO 핸들러 초기화
 * 
 * @param {Object} io - Socket.IO 인스턴스
 */
function initializeGroupChat(io) {
  
  io.on('connection', (socket) => {
    console.log(`🔗 Client connected: ${socket.id}`);

    // ==================== ① 채널(방) 입장 ====================
    socket.on('join-channel', async ({ channelId, userId }) => {
      try {
        socket.join(`channel:${channelId}`);
        
        // 사용자 정보 조회
        const user = await User.findById(userId).select('username displayName avatar status');
        
        // 다른 참여자에게 입장 알림
        socket.to(`channel:${channelId}`).emit('user-joined', {
          channelId,
          userId,
          userInfo: user,
          timestamp: new Date()
        });
        
        console.log(`✅ User ${userId} joined channel ${channelId}`);
      } catch (error) {
        console.error('Error in join-channel:', error);
        socket.emit('error', { event: 'join-channel', message: error.message });
      }
    });

    // ==================== ② 채널(방) 퇴장 ====================
    socket.on('leave-channel', ({ channelId, userId }) => {
      try {
        socket.leave(`channel:${channelId}`);
        
        // 다른 참여자에게 퇴장 알림
        socket.to(`channel:${channelId}`).emit('user-left', {
          channelId,
          userId,
          timestamp: new Date()
        });
        
        console.log(`👋 User ${userId} left channel ${channelId}`);
      } catch (error) {
        console.error('Error in leave-channel:', error);
      }
    });

    // ==================== ③ 실시간 메시지 전송 ====================
    socket.on('send-message', async ({ channelId, message }) => {
      try {
        // REST API에서 이미 저장된 메시지를 Socket으로 브로드캐스트
        io.to(`channel:${channelId}`).emit('new-message', {
          channelId,
          message,
          timestamp: new Date()
        });
        
        console.log(`💬 Message sent to channel ${channelId}`);
      } catch (error) {
        console.error('Error in send-message:', error);
        socket.emit('error', { event: 'send-message', message: error.message });
      }
    });

    // ==================== ④ 타이핑 상태 표시 ====================
    socket.on('typing-start', ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit('user-typing', {
        channelId,
        userId,
        isTyping: true,
        timestamp: new Date()
      });
    });

    socket.on('typing-stop', ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit('user-typing', {
        channelId,
        userId,
        isTyping: false,
        timestamp: new Date()
      });
    });

    // ==================== ⑤ 리액션 실시간 반영 ====================
    socket.on('message-reaction', ({ channelId, messageId, emoji, userId, action }) => {
      try {
        io.to(`channel:${channelId}`).emit('reaction-updated', {
          channelId,
          messageId,
          emoji,
          userId,
          action, // 'add' or 'remove'
          timestamp: new Date()
        });
        
        console.log(`${action === 'add' ? '➕' : '➖'} Reaction ${emoji} on message ${messageId}`);
      } catch (error) {
        console.error('Error in message-reaction:', error);
      }
    });

    // ==================== 회의실(Meeting) 전용 이벤트 ====================

    // ⑥ 회의실 입장
    socket.on('join-meeting', async ({ meetingId, userId, userInfo }) => {
      try {
        socket.join(`meeting:${meetingId}`);
        
        // 참여자 입장 브로드캐스트
        io.to(`meeting:${meetingId}`).emit('participant-joined', {
          meetingId,
          userId,
          userInfo,
          timestamp: new Date()
        });
        
        // 현재 참여자 수 업데이트
        const room = io.sockets.adapter.rooms.get(`meeting:${meetingId}`);
        const participantCount = room ? ro�K��^�H��[˝�YY][�Ή�YY][��YX
K�[Z]
	�\�X�\[�X��[�]\]Y	�YY][��Y���[��\�X�\[���[��JN��ۜ��K���<'�H\�\�	�\�\�YH��[�YYY][��	�YY][��YH
	�\�X�\[���[�H\�X�\[��X
NH�]�
\��܊H�ۜ��K�\��܊	�\��܈[���[�[YY][�Ή�\��܊N����]�[Z]
	�\��܉��]�[��	ڛ�[�[YY][���Y\��Y�N�\��܋�Y\��Y�HJNB�JN���8�i�;f�;'f;"�;a�;'�B�����]�ۊ	�X]�K[YY][���
�YY][��Y\�\�YJHO��H����]�X]�JYY][�Ή�YY][��YX
N���;,.;%�;'�;a�;'�H:�#:�g:��;.�;"�;b��[˝�YY][�Ή�YY][��YX
K�[Z]
	�\�X�\[�[Y�	�YY][��Y�\�\�Y�[Y\�[\��]�]J
B�JN���;f!;'�;,.;%�;'�;"&;%�z�l;'m;b���ۜ����HH[˜����]˘Y\\�����\˙�]
YY][�Ή�YY][��YX
N�ۜ�\�X�\[���[�H���H����K��^�H��[˝�YY][�Ή�YY][��YX
K�[Z]
	�\�X�\[�X��[�]\]Y	�YY][��Y���[��\�X�\[���[��JN��ۜ��K���<'�b�\�\�	�\�\�YHY�YY][��	�YY][��YH
	�\�X�\[���[�H\�X�\[��X
NH�]�
\��܊H�ۜ��K�\��܊	�\��܈[�X]�K[YY][�Ή�\��܊NB�JN���8�i�;,.;%�;'�:�z�gH;(l;f������]�ۊ	��]\\�X�\[���
�YY][��YJHO��H�ۜ����HH[˜����]˘Y\\�����\˙�]
YY][�Ή�YY][��YX
N�ۜ�\�X�\[���[�H���H����K��^�H��ۜ�����]Y�H���H�\��^K����J���JH��N�����]�[Z]
	�\�X�\[��[\�	�YY][��Y���[��\�X�\[���[������]YΈ����]YJNH�]�
\��܊H�ۜ��K�\��܊	�\��܈[��]\\�X�\[�Ή�\��܊N����]�[Z]
	�\��܉��]�[��	��]\\�X�\[���Y\��Y�N�\��܋�Y\��Y�HJNB�JN���8�j;f�;'f;(�z��
;f.;"�;b�;(!;&�JHH:��;"�;b�:�%{(';a�;'�B�����]�ۊ	�[�[YY][���\�[��
�YY][��Y��\�\�YJHO��H��;f�;'f;(%z��;(l;f���ۜ�YY][��H]�Z]�[��[��[��RY
YY][��Y
N�Y�
[YY][��H����]�[Z]
	�\��܉��]�[��	�[�[YY][���Y\��Y�N�	�YY][������[�	�JN�]\��B����;f.;"�;b�:��;eg;fe{'n�Y�
YY][�˘ܙX]Y�K����[��
HOOH��\�\�Y
H����]�[Z]
	�\��܉��]�[��	�[�[YY][���Y\��Y�N�	�ۛH���[�[�YY][���JN�]\��B����:�:��;,.;%�;'�;%�:��;f�;'f;(�z��;%c:��[˝�YY][�Ή�YY][��YX
K�[Z]
	�YY][��Y[�Y	�YY][��Y�[�Y�N���\�\�Y�[Y\�[\��]�]J
K�Y\��Y�N�	�f�;'f:� ;(�z��:�&;%�;"�z��:��	JN���:��;"�;b�:�%{(';a�;'�B��ۜ����HH[˜����]˘Y\\�����\˙�]
YY][�Ή�YY][��YX
NY�
���JH���K��ܑXX�
����]YO��ۜ��Y[�����]H[˜����]˜����]˙�]
����]Y
NY�
�Y[�����]
H��:��;"�;b�;%�:��:�%{(';a�;'�H;'m:�;b���Y[�����]�[Z]
	ٛܘ�KY\��ۛ�X�	��X\�ێ�	�YY][��Y[�Y	��Y\��Y�N�	�f�;'f:� ;(�z��:�&;%�;%�:��;'m;em;(':�*z��:��	JN���:��;%�;!';(':�l��Y[�����]�X]�JYY][�Ή�YY][��YX
NB�JNB����;f�;'f; �{`�;%�z�l;'m;b��YY][�˜�]\�H	�[�Y	�YY][�˙[�Y]H�]�]J
N]�Z]YY][�˜�]�J
N��ۜ��K���<'��HYY][��	�YY][��YH[�Y�H��	���\�\�YX
NH�]�
\��܊H�ۜ��K�\��܊	�\��܈[�[�[YY][�Ή�\��܊N����]�[Z]
	�\��܉��]�[��	�[�[YY][���Y\��Y�N�\��܋�Y\��Y�HJNB�JN���OOOOOOOOOOOOOOOOOOOH:�,;(m�Y[[[ۚ]ܚ[��;'(;)�OOOOOOOOOOOOOOOOOOOB�����]�ۊ	��X��ܚX�I�

HO�����]���[�	ٚY[[[ۚ]ܚ[���N�ۜ��K���<'���X��ܚX�Y��Y[[[ۚ]ܚ[�Έ	�����]�YX
NJN���OOOOOOOOOOOOOOOOOOOH;%�:��;em;('OOOOOOOOOOOOOOOOOOOB�����]�ۊ	�\��ۛ�X�	�

HO��ۜ��K���8�c�Y[�\��ۛ�X�Y�	�����]�YX
NJNJN��ۜ��K���	��!Hܛ�\�]����]�S�[�\��[�]X[^�Y	�NB��[�[K�^ܝ�H�[�]X[^�Qܛ�\�]N�

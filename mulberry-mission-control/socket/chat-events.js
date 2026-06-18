/**
 * Chat Socket.IO 서버 핸들러
 *
 * 채널: #general / #dev / #research
 * 인메모리 히스토리 최근 50건 유지
 *
 * @author CTO Koda · DAY6 · 2026-06-19
 */

const CHANNELS = ['general', 'dev', 'research'];
const HISTORY_LIMIT = 50;

class ChatEventsManager {
  constructor(io) {
    this.io = io;
    // 채널별 히스토리: { channelId: [Message] }
    this.history = Object.fromEntries(CHANNELS.map((ch) => [ch, []]));
  }

  initialize() {
    this.io.on('connection', (socket) => {
      // 채널 입장
      socket.on('chat_join', ({ channel, passportId, name }) => {
        if (!CHANNELS.includes(channel)) return;
        socket.join(`chat:${channel}`);
        socket.data.passportId = passportId || 'anonymous';
        socket.data.name = name || '익명';

        // 히스토리 전송
        socket.emit('chat_history', {
          channel,
          messages: this.history[channel],
        });

        // 입장 알림
        this._broadcast(channel, {
          type: 'system',
          channel,
          text: `${socket.data.name} 님이 입장했습니다.`,
          ts: new Date().toISOString(),
        });
      });

      // 메시지 전송
      socket.on('chat_send', ({ channel, text }) => {
        if (!CHANNELS.includes(channel) || !text || !text.trim()) return;

        const msg = {
          type: 'message',
          channel,
          passportId: socket.data.passportId || 'anonymous',
          name: socket.data.name || '익명',
          text: text.trim().slice(0, 1000),
          ts: new Date().toISOString(),
        };

        this._record(channel, msg);
        this._broadcast(channel, msg);
      });

      // 퇴장
      socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
          const ch = room.replace('chat:', '');
          if (CHANNELS.includes(ch) && socket.data.name) {
            this._broadcast(ch, {
              type: 'system',
              channel: ch,
              text: `${socket.data.name} 님이 퇴장했습니다.`,
              ts: new Date().toISOString(),
            });
          }
        }
      });
    });
  }

  _record(channel, msg) {
    this.history[channel].push(msg);
    if (this.history[channel].length > HISTORY_LIMIT) {
      this.history[channel] = this.history[channel].slice(-HISTORY_LIMIT);
    }
  }

  _broadcast(channel, msg) {
    this.io.to(`chat:${channel}`).emit('chat_message', msg);
  }
}

module.exports = { ChatEventsManager, CHANNELS };

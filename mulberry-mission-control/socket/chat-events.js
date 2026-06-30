/**
 * Chat Socket.IO 서버 핸들러
 *
 * 채널: #general / #dev / #research
 * 메시지는 MongoDB(ChatMessage)에 영속화. DB 미연결 시 인메모리 캐시로 fallback.
 *
 * @author CTO Koda · DAY6~DAY7 · 2026-06-19~25
 */

const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const { saveMemoryEvent } = require('../utils/memory-layer');

const CHANNELS = ['general', 'dev', 'research'];
const HISTORY_LIMIT = 50;

class ChatEventsManager {
  constructor(io) {
    this.io = io;
    // 채널별 히스토리 캐시: { channelId: [Message] } — DB 미연결 시 fallback
    this.history = Object.fromEntries(CHANNELS.map((ch) => [ch, []]));
  }

  initialize() {
    this.io.on('connection', (socket) => {
      // 채널 입장
      socket.on('chat_join', async ({ channel, passportId, name }) => {
        if (!CHANNELS.includes(channel)) return;
        socket.join(`chat:${channel}`);
        socket.data.passportId = passportId || 'anonymous';
        socket.data.name = name || '익명';

        // 히스토리 전송 — DB 연결 시 영속 데이터, 아니면 인메모리 캐시
        const messages = await this._loadHistory(channel);
        socket.emit('chat_history', { channel, messages });

        // 입장 알림
        this._broadcast(channel, {
          type: 'system',
          channel,
          text: `${socket.data.name} 님이 입장했습니다.`,
          ts: new Date().toISOString(),
        });

        // Memory: 회의실(채널) 입장 — Trang Manager 확정 (2026-06-30)
        saveMemoryEvent(socket.data.passportId, {
          projectType: 'team-chat',
          role: 'participant',
          skill: 'meeting',
        });
      });

      // 메시지 전송
      socket.on('chat_send', async ({ channel, text }) => {
        if (!CHANNELS.includes(channel) || !text || !text.trim()) return;

        const msg = {
          type: 'message',
          channel,
          passportId: socket.data.passportId || 'anonymous',
          name: socket.data.name || '익명',
          text: text.trim().slice(0, 1000),
          ts: new Date().toISOString(),
        };

        await this._record(channel, msg);
        this._broadcast(channel, msg);

        // Memory: 채널 메시지 전송 — Trang Manager 확정 (2026-06-30)
        saveMemoryEvent(msg.passportId, {
          projectType: 'team-chat',
          role: 'messenger',
          skill: 'messaging',
        });
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

            // Memory: 회의실(채널) 퇴장 — Trang Manager 확정 (2026-06-30)
            saveMemoryEvent(socket.data.passportId, {
              projectType: 'team-chat',
              role: 'participant',
              skill: 'meeting',
            });
          }
        }
      });
    });
  }

  // DB 연결 시 최근 50건 조회, 미연결 시 인메모리 캐시 반환
  async _loadHistory(channel) {
    if (mongoose.connection.readyState === 1) {
      try {
        const docs = await ChatMessage.findRecentByChannel(channel, HISTORY_LIMIT);
        return docs.map((d) => ({
          type: 'message',
          channel: d.channel,
          passportId: d.passportId,
          name: d.name,
          text: d.text,
          ts: d.ts.toISOString(),
        }));
      } catch (e) {
        console.warn(`[chat] DB 히스토리 조회 실패 (캐시로 fallback): ${e.message}`);
      }
    }
    return this.history[channel];
  }

  // DB 저장 (연결 시) + 인메모리 캐시 갱신 (항상)
  async _record(channel, msg) {
    this.history[channel].push(msg);
    if (this.history[channel].length > HISTORY_LIMIT) {
      this.history[channel] = this.history[channel].slice(-HISTORY_LIMIT);
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await ChatMessage.create({
          channel: msg.channel,
          passportId: msg.passportId,
          name: msg.name,
          text: msg.text,
          ts: new Date(msg.ts),
        });
      } catch (e) {
        console.warn(`[chat] DB 저장 실패 (메시지는 캐시에 유지됨): ${e.message}`);
      }
    }
  }

  _broadcast(channel, msg) {
    this.io.to(`chat:${channel}`).emit('chat_message', msg);
  }
}

module.exports = { ChatEventsManager, CHANNELS };

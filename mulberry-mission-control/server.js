/**
 * Mulberry Mission Control - Server
 *
 * 원본 정적 파일 서빙 패턴 복원 + Koda Redis 통합
 *
 * @author CTO Koda (Redis) + Trang Manager (정적 파일 복원)
 * @date 2026-04-20
 * @version 3.2.1 h(Redis Auth + Error Handler Fix)
 * @cache-bust 20260517-v37
 */

const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

// ==================== Redis 설정 ====================
const REDIS_CONFIG = {
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
};

let redisClient = null;
let redisPubClient = null;
let redisSubClient = null;

function createRedisClients() {
  try {
    console.log('🔌 Connecting to Redis...');
    if (REDIS_CONFIG.url) {
      redisClient = new Redis(REDIS_CONFIG.url);
      redisPubClient = new Redis(REDIS_CONFIG.url);
      redisSubClient = new Redis(REDIS_CONFIG.url);
    } else if (REDIS_CONFIG.host && REDIS_CONFIG.port) {
      const options = {
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
        password: REDIS_CONFIG.password,
        retryStrategy: REDIS_CONFIG.retryStrategy,
        maxRetriesPerRequest: REDIS_CONFIG.maxRetriesPerRequest
      };
      redisClient = new Redis(options);
      redisPubClient = new Redis(options);
      redisSubClient = new Redis(options);
    } else {
      console.warn('⚠️ Redis not configured');
      return null;
    }
    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) => console.error('❌ Redis error:', err));
    redisPubClient.on('error', (err) => console.error('❌ Redis Pub error:', err));
    redisSubClient.on('error', (err) => console.error('❌ Redis Sub error:', err));
    return { client: redisClient, pub: redisPubClient, sub: redisSubClient };
  } catch (error) {
    console.error('❌ Redis client creation failed:', error);
    return null;
  }
}

// ==================== Express App ====================
const app = express();
const server = http.createServer(app);

app.use(express.json());

// ==================== UTF-8 인코딩 설정 ====================
// v3.2.1 - 이모지 깨짐 수정 (Koda patch, 2026-04-30)
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

// ✅ 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// ==================== Socket.IO ====================
const io = socketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

// Redis Adapter 초기화
async function setupRedis() {
  const redis = createRedisClients();
  if (redis) {
    try {
      io.adapter(createAdapter(redis.pub, redis.sub));
      console.log('✅ Socket.IO Redis Adapter enabled');
    } catch (error) {
      console.error('❌ Redis Adapter setup failed:', error);
    }
  }
  return redis;
}

// ==================== Socket.IO 이벤트 ====================
const users = new Map();
const channels = new Map();

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  users.set(socket.id, { id: socket.id, username: 'Anonymous', connectedAt: new Date() });

  socket.on('get_channels', async () => {
    let channelList = Array.from(channels.values());
    if (redisClient) {
      try {
        const cached = await redisClient.get('channels:list');
        if (cached) channelList = JSON.parse(cached);
      } catch (e) { /* silent */ }
    }
    socket.emit('channels_list', channelList);
  });

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    socket.to(channelId).emit('user_joined', {
      userId: socket.id,
      username: users.get(socket.id)?.username,
      timestamp: new Date()
    });
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
    socket.to(channelId).emit('user_left', { userId: socket.id, timestamp: new Date() });
  });

  socket.on('send_message', async (data) => {
    const message = {
      id: `msg_${Date.now()}`,
      channelId: data.channelId,
      userId: socket.id,
      username: users.get(socket.id)?.username || 'Anonymous',
      content: data.content,
      timestamp: new Date()
    };
    if (redisClient) {
      try {
        await redisClient.zadd(`messages:${data.channelId}`, Date.now(), JSON.stringify(message));
        await redisClient.zremrangebyrank(`messages:${data.channelId}`, 0, -101);
      } catch (e) { /* silent */ }
    }
    io.to(data.channelId).emit('new_message', message);
  });

  socket.on('typing_start', (channelId) => {
    socket.to(channelId).emit('user_typing', { userId: socket.id, username: users.get(socket.id)?.username });
  });

  socket.on('typing_stop', (channelId) => {
    socket.to(channelId).emit('user_stop_typing', { userId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
    users.delete(socket.id);
  });
});

// ==================== API Routes ====================

// Health Check
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    version: '3.2',
    redis: redisClient ? 'connected' : 'disconnected',
    timestamp: new Date()
  };
  if (redisClient) {
    try {
      await redisClient.ping();
      health.redis = 'connected';
    } catch (error) {
      health.redis = 'error';
    }
  }
  res.json(health);
});

// /api/health alias — P1 안정화 (Trang 2026-05-16)
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'mulberry-mission-control',
    version: '3.2.1',
    redis: redisClient ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date()
  };
  if (redisClient) {
    try {
      await redisClient.ping();
      health.redis = 'connected';
    } catch (error) {
      health.redis = 'error';
    }
  }
  res.json(health);
});

// /v1/tools — 공유 도구 레지스트리 (Trang 2026-05-16)
app.get('/v1/tools', (req, res) => {
  res.json({
    tools: [
      { id: 'malu.vision.image_generate', spirit_score: 0.88, status: 'active', description: '이미지 생성 도구', endpoint: 'https://loving-education-production-cc9e.up.railway.app/v1/tools/invoke' },
      { id: 'trang.passport.agent_restore', spirit_score: 0.95, status: 'active', description: '에이전트 페르소나 복구', endpoint: 'https://loving-education-production-cc9e.up.railway.app/v1/tools/invoke' },
      { id: 'trang.agent.image_advertising', spirit_score: 0.85, status: 'active', description: '광고 자동화 도구', endpoint: 'https://loving-education-production-cc9e.up.railway.app/v1/tools/invoke' }
    ],
    count: 3,
    spirit_gate: 0.75,
    timestamp: new Date()
  });
});

// 기본 채널 생성
async function loadDefaultChannels() {
  const defaultChannels = [
    { id: 'general', name: 'General', description: '일반 대화' },
    { id: 'random', name: 'Random', description: '자유로운 대화' },
    { id: 'devteam', name: 'Dev Team', description: '개발팀 채널' }
  ];
  for (const ch of defaultChannels) {
    channels.set(ch.id, ch);
    if (redisClient) {
      try {
        await redisClient.setex(`channel:${ch.id}`, 86400, JSON.stringify(ch));
      } catch (e) { /* silent */ }
    }
  }
}

// ==================== 서버 시작 ====================
const PORT = process.env.PORT || 3000;

async function start() {
  console.log('🚀 Mulberry Mission Control Starting (v3.2)...');
  await setupRedis();
  await loadDefaultChannels();h

  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Static files: ${path.join(__dirname, 'public')}`);
    console.log(`🌿 One Team! Mulberry Mission Control Ready`);
  });
}

start();

module.exports = { app, server, io };

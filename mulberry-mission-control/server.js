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
const { DecisionEventsManager } = require('./socket/decision-events');
const { SearchEventsManager } = require('./socket/search-events');
const { ChatEventsManager } = require('./socket/chat-events');
const searchRouter = require('./routes/search');

// ==================== MongoDB 연결 ====================
const mongoose = require('mongoose');
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error (metrics API will be unavailable):', err.message));
} else {
  console.warn('MONGODB_URI not set — metrics API will return errors');
}

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

// ==================== Decision Events (Issue #98 Phase 1, Koda 2026-06-15) ====================
const decisionEvents = new DecisionEventsManager(io);
decisionEvents.initialize();

// ==================== Search Events (DAY5, Issue #122) ====================
const searchEvents = new SearchEventsManager(io);
searchEvents.initialize();
searchRouter.setSearchEvents(searchEvents);

// ==================== Chat Events (DAY6, Issue #29) ====================
const chatEvents = new ChatEventsManager(io);
chatEvents.initialize();

// 데모 시드 이벤트 — AgentRouter ↔ Mission Control 실시간 브리지 구축 전까지 Decision 패널 빈 상태 방지
[
  { action: 'PASS', decision_name: null, status_code: 200, spirit_score: 0.92, message: null },
  { action: 'REROUTE', decision_name: 'rate_limit_429', status_code: 429, spirit_score: null, message: 'rate limited - rerouting' },
  { action: 'RETRY', decision_name: 'server_error_503', status_code: 503, spirit_score: null, message: null },
  { action: 'HOLD', decision_name: 'timeout_408', status_code: 408, spirit_score: null, message: 'Request Timeout - needs human review' },
  { action: 'BLOCK', decision_name: 'ethics_block', status_code: 200, spirit_score: 0.5, message: 'spirit_score below policy_ethics threshold' }
].forEach(seed => decisionEvents.recordEvent(seed));

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

// /api/services — 배포 서비스 현황 (Trang 2026-05-18)
app.get('/api/services', (req, res) => {
    res.json({
          services: [
            { id: 'mission-control', name: 'Mission Control', description: '통합 관제 시스템', url: 'https://mulberry-mission-control-production.up.railway.app', version: 'v3.2.2', status: 'active', icon: '🎯' },
            { id: 'agent-gateway', name: 'Agent Gateway', description: 'AI 도구 게이트웨이 (FastAPI)', url: 'https://loving-education-production-cc9e.up.railway.app', version: 'v1.0', status: 'active', icon: '🔗' },
            { id: 'open-api', name: 'Mulberry Open API', description: 'Streamlit 에이전트 인터페이스', url: 'https://mulberry-open-api-production.up.railway.app', version: 'v1.0', status: 'active', icon: '📡' },
            { id: 'research-lab', name: 'Research Lab', description: '연구 플랫폼 (FastAPI)', url: 'https://mulberry-research-lab-production.up.railway.app', version: 'v1.0', status: 'active', icon: '🔬' }
                ],
          count: 4,
          timestamp: new Date()
    });
});

// ==================== Steward Workspace API (Issue #21, Koda 2026-06-13) ====================
// Phase 1: Passport / Mandate 조회 — steward-workspace-ui.js의 MOCK_PASSPORTS / MOCK_MANDATES 대체
const PASSPORTS = require('./data/passports.json');
const MANDATES = require('./data/mandates.json');

// GET /api/passport/:id — Steward Workspace Passport Panel
app.get('/api/passport/:id', (req, res) => {
  const passport = PASSPORTS[req.params.id];
  if (!passport) {
    return res.status(404).json({ error: `passport not found: ${req.params.id}` });
  }
  res.json(passport);
});

// GET /api/mandate/:id — Steward Workspace Mandate Panel
app.get('/api/mandate/:id', (req, res) => {
  const mandate = MANDATES[req.params.id];
  if (!mandate) {
    return res.status(404).json({ error: `mandate not found: ${req.params.id}` });
  }
  res.json(mandate);
});

// ==================== Steward Workspace API Phase 2 (Issue #21, Koda 2026-06-15) ====================
// POST /api/auth/steward-login + GET/POST /api/context/:workspaceId + POST /api/messages
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'mulberry-steward-secret-2026';
const STEWARD_WORKSPACE_ID = 'mulberry-steward-ws';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

// POST /api/auth/steward-login — passportId + pin → JWT
app.post('/api/auth/steward-login', (req, res) => {
  const { passportId, pin } = req.body || {};
  const entry = Object.values(PASSPORTS).find(p => p.passportId === passportId);

  if (!entry || !entry.pinHash || sha256(pin) !== entry.pinHash) {
    return res.status(401).json({ error: 'invalid passportId or pin' });
  }

  const token = jwt.sign(
    { passportId: entry.passportId, displayName: entry.displayName, role: entry.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, workspaceId: STEWARD_WORKSPACE_ID });
});

// Steward JWT 인증 미들웨어
function requireStewardAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing bearer token' });
  }
  try {
    req.steward = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

// GET /api/context/:workspaceId — Shared Context 조회
app.get('/api/context/:workspaceId', requireStewardAuth, async (req, res) => {
  if (!redisClient) {
    return res.json({ workspaceId: req.params.workspaceId, context: {} });
  }
  try {
    const raw = await redisClient.get(`context:${req.params.workspaceId}`);
    res.json({ workspaceId: req.params.workspaceId, context: raw ? JSON.parse(raw) : {} });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/context/:workspaceId — Shared Context 갱신 (merge)
app.post('/api/context/:workspaceId', requireStewardAuth, async (req, res) => {
  if (!redisClient) {
    return res.status(503).json({ error: 'Redis unavailable' });
  }
  try {
    const key = `context:${req.params.workspaceId}`;
    const existingRaw = await redisClient.get(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const updated = {
      ...existing,
      ...req.body,
      updatedBy: req.steward.passportId,
      updatedAt: new Date()
    };
    await redisClient.set(key, JSON.stringify(updated));
    res.json({ workspaceId: req.params.workspaceId, context: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/messages — Steward Workspace 채팅 메시지 (Socket.IO send_message와 동일 패턴)
app.post('/api/messages', requireStewardAuth, async (req, res) => {
  const { channelId, content } = req.body || {};
  if (!channelId || !content) {
    return res.status(400).json({ error: 'channelId and content required' });
  }

  const message = {
    id: `msg_${Date.now()}`,
    channelId,
    userId: req.steward.passportId,
    username: req.steward.displayName,
    content,
    timestamp: new Date()
  };

  if (redisClient) {
    try {
      await redisClient.zadd(`messages:${channelId}`, Date.now(), JSON.stringify(message));
      await redisClient.zremrangebyrank(`messages:${channelId}`, 0, -101);
    } catch (e) { /* silent */ }
  }

  io.to(channelId).emit('new_message', message);
  res.status(201).json(message);
});

// ==================== Metrics API (DAY4 Part C, Issue #117) ====================
// GET /api/v1/metrics/overview — Monitor 패널 KPI 데이터 (requireAuth 미들웨어 포함)
app.use('/api/v1/metrics', require('./routes/metrics'));

// ==================== Search API (DAY5, Issue #122) ====================
// POST /api/v1/search — MulberrySearchOrchestrator 10개 에이전트 병렬 검색
app.use('/api/v1/search', searchRouter);

// ==================== Decision Events API (Issue #98 Phase 1, Koda 2026-06-15) ====================
// GET /api/events/decisions — Decision 메뉴 최초 로드용 history
app.get('/api/events/decisions', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  res.json({ events: decisionEvents.getHistory(limit) });
});

// POST /api/events/decisions — AgentRouter(agent_router_decisions.jsonl)와 동일 포맷의 이벤트 수신 → 브로드캐스트
app.post('/api/events/decisions', (req, res) => {
  const { action, decision_name, status_code, spirit_score, message, event_id, timestamp } = req.body || {};
  if (!action) {
    return res.status(400).json({ error: 'action required' });
  }
  const event = decisionEvents.recordEvent({ action, decision_name, status_code, spirit_score, message, event_id, timestamp });
  res.status(201).json(event);
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
  await loadDefaultChannels();

  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Static files: ${path.join(__dirname, 'public')}`);
    console.log(`🌿 One Team! Mulberry Mission Control Ready`);
  });
}

start();

module.exports = { app, server, io };

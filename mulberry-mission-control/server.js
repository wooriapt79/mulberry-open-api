/**
 * Team Chat Backend with Redis
 * 
 * Railway Redis 연동으로 성능 향상
 * 
 * @author CTO Koda
 * @date 2026-04-19
 * @version 2.0 (Redis Integration)
 */

const express = require('express');
const http = require('http');
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

// ==================== Redis Client 생성 ====================
let redisClient = null;
let redisPubClient = null;
let redisSubClient = null;

function createRedisClients() {
  try {
    console.log('🔌 Connecting to Redis...');
    console.log('Redis Config:', {
      url: REDIS_CONFIG.url ? 'SET' : 'NOT SET',
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port
    });
    
    if (REDIS_CONFIG.url) {
      // Railway REDIS_URL 사용
      redisClient = new Redis(REDIS_CONFIG.url);
      redisPubClient = new Redis(REDIS_CONFIG.url);
      redisSubClient = new Redis(REDIS_CONFIG.url);
    } else if (REDIS_CONFIG.host && REDIS_CONFIG.port) {
      // REDIS_HOST, REDIS_PORT 사용
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
      console.warn('⚠️ Redis not configured, falling back to memory');
      return null;
    }
    
    // Redis 이벤트 핸들러
    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
    
    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
    
    return {
      client: redisClient,
      pub: redisPubClient,
      sub: redisSubClient
    };
    
  } catch (error) {
    console.error('❌ Redis client creation failed:', error);
    return null;
  }
}

// ==================== Team Chat Server ====================
class TeamChatServer {
  constructor(app) {
    this.app = app;
    this.server = http.createServer(app);
    this.io = null;
    this.redis = null;
    this.channels = new Map();
    this.users = new Map();
  }
  
  /**
   * 초기화
   */
  async init() {
    console.log('🚀 Initializing Team Chat Server...');
    
    // Redis 연결
    this.redis = createRedisClients();
    
    // Socket.IO 설정
    this.io = socketIO(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });
    
    // Redis Adapter 설정 (스케일링 지원)
    if (this.redis) {
      try {
        this.io.adapter(createAdapter(this.redis.pub, this.redis.sub));
        console.log('✅ Socket.IO Redis Adapter enabled');
      } catch (error) {
        console.error('❌ Redis Adapter setup failed:', error);
      }
    }
    
    // Socket.IO 이벤트 핸들러
    this.setupSocketHandlers();
    
    // 채널 데이터 로드
    await this.loadChannels();
    
    console.log('✅ Team Chat Server initialized');
  }
  
  /**
   * Socket.IO 이벤트 핸들러 설정
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('👤 User connected:', socket.id);
      
      // 사용자 정보 저장
      this.users.set(socket.id, {
        id: socket.id,
        username: 'Anonymous',
        connectedAt: new Date()
      });
      
      // 채널 목록 요청
      socket.on('get_channels', async () => {
        const channels = await this.getChannels();
        socket.emit('channels_list', channels);
      });
      
      // 채널 생성
      socket.on('create_channel', async (data) => {
        const channel = await this.createChannel(data);
        this.io.emit('channel_created', channel);
      });
      
      // 채널 참여
      socket.on('join_channel', async (channelId) => {
        await this.joinChannel(socket, channelId);
      });
      
      // 채널 나가기
      socket.on('leave_channel', async (channelId) => {
        await this.leaveChannel(socket, channelId);
      });
      
      // 메시지 전송
      socket.on('send_message', async (data) => {
        await this.sendMessage(socket, data);
      });
      
      // 타이핑 시작
      socket.on('typing_start', (channelId) => {
        socket.to(channelId).emit('user_typing', {
          userId: socket.id,
          username: this.users.get(socket.id)?.username
        });
      });
      
      // 타이핑 종료
      socket.on('typing_stop', (channelId) => {
        socket.to(channelId).emit('user_stop_typing', {
          userId: socket.id
        });
      });
      
      // 연결 해제
      socket.on('disconnect', () => {
        console.log('👋 User disconnected:', socket.id);
        this.users.delete(socket.id);
      });
    });
  }
  
  /**
   * 채널 목록 가져오기 (Redis 캐싱)
   */
  async getChannels() {
    try {
      if (this.redis) {
        // Redis에서 캐시된 채널 목록 가져오기
        const cached = await this.redis.client.get('channels:list');
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // 캐시 없으면 메모리에서 가져오기
      const channels = Array.from(this.channels.values());
      
      // Redis에 캐싱 (1시간)
      if (this.redis) {
        await this.redis.client.setex(
          'channels:list',
          3600,
          JSON.stringify(channels)
        );
      }
      
      return channels;
      
    } catch (error) {
      console.error('❌ Get channels error:', error);
      return Array.from(this.channels.values());
    }
  }
  
  /**
   * 채널 생성
   */
  async createChannel(data) {
    const channel = {
      id: `channel_${Date.now()}`,
      name: data.name,
      description: data.description || '',
      createdAt: new Date(),
      members: []
    };
    
    this.channels.set(channel.id, channel);
    
    // Redis에 저장
    if (this.redis) {
      await this.redis.client.setex(
        `channel:${channel.id}`,
        86400, // 24시간
        JSON.stringify(channel)
      );
      
      // 캐시 무효화
      await this.redis.client.del('channels:list');
    }
    
    console.log('📁 Channel created:', channel.name);
    return channel;
  }
  
  /**
   * 채널 참여
   */
  async joinChannel(socket, channelId) {
    socket.join(channelId);
    
    const user = this.users.get(socket.id);
    
    // 채널 멤버에 추가
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.members.push(socket.id);
      
      // Redis 업데이트
      if (this.redis) {
        await this.redis.client.setex(
          `channel:${channelId}`,
          86400,
          JSON.stringify(channel)
        );
      }
    }
    
    // 입장 알림
    socket.to(channelId).emit('user_joined', {
      userId: socket.id,
      username: user?.username,
      timestamp: new Date()
    });
    
    // 최근 메시지 전송
    const messages = await this.getRecentMessages(channelId);
    socket.emit('channel_messages', messages);
    
    console.log(`👤 User ${socket.id} joined channel ${channelId}`);
  }
  
  /**
   * 채널 나가기
   */
  async leaveChannel(socket, channelId) {
    socket.leave(channelId);
    
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.members = channel.members.filter(id => id !== socket.id);
      
      // Redis 업데이트
      if (this.redis) {
        await this.redis.client.setex(
          `channel:${channelId}`,
          86400,
          JSON.stringify(channel)
        );
      }
    }
    
    // 퇴장 알림
    socket.to(channelId).emit('user_left', {
      userId: socket.id,
      timestamp: new Date()
    });
    
    console.log(`👋 User ${socket.id} left channel ${channelId}`);
  }
  
  /**
   * 메시지 전송 (Redis 캐싱)
   */
  async sendMessage(socket, data) {
    const message = {
      id: `msg_${Date.now()}`,
      channelId: data.channelId,
      userId: socket.id,
      username: this.users.get(socket.id)?.username || 'Anonymous',
      content: data.content,
      timestamp: new Date()
    };
    
    // Redis에 메시지 저장 (Sorted Set 사용)
    if (this.redis) {
      try {
        await this.redis.client.zadd(
          `messages:${data.channelId}`,
          Date.now(),
          JSON.stringify(message)
        );
        
        // 최근 100개만 유지
        await this.redis.client.zremrangebyrank(
          `messages:${data.channelId}`,
          0,
          -101
        );
      } catch (error) {
        console.error('❌ Redis message save error:', error);
      }
    }
    
    // 채널에 메시지 브로드캐스트
    this.io.to(data.channelId).emit('new_message', message);
    
    console.log(`💬 Message sent in ${data.channelId}`);
  }
  
  /**
   * 최근 메시지 가져오기 (Redis)
   */
  async getRecentMessages(channelId, limit = 50) {
    try {
      if (this.redis) {
        const messages = await this.redis.client.zrevrange(
          `messages:${channelId}`,
          0,
          limit - 1
        );
        
        return messages.map(msg => JSON.parse(msg));
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Get messages error:', error);
      return [];
    }
  }
  
  /**
   * 채널 데이터 로드
   */
  async loadChannels() {
    // 기본 채널 생성
    const defaultChannels = [
      { name: 'General', description: '일반 대화' },
      { name: 'Random', description: '자유로운 대화' },
      { name: 'Dev Team', description: '개발팀 채널' }
    ];
    
    for (const channelData of defaultChannels) {
      await this.createChannel(channelData);
    }
  }
  
  /**
   * 서버 시작
   */
  listen(port) {
    this.server.listen(port, () => {
      console.log(`🚀 Team Chat Server running on port ${port}`);
    });
  }
}

// ==================== Express App ====================
const app = express();
app.use(express.json());

// Health Check
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    redis: redisClient ? 'connected' : 'disconnected',
    timestamp: new Date()
  };
  
  if (redisClient) {
    try {
      await redisClient.ping();
      health.redis = 'connected';
    } catch (error) {
      health.redis = 'error';
      health.redisError = error.message;
    }
  }
  
  res.json(health);
});

// ==================== 초기화 및 시작 ====================
const teamChatServer = new TeamChatServer(app);

teamChatServer.init().then(() => {
  const PORT = process.env.PORT || 3000;
  teamChatServer.listen(PORT);
});

// ==================== Export ====================
module.exports = teamChatServer;

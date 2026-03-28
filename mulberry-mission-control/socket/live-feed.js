/**
 * Live Feed WebSocket Handler
 * 
 * 실시간 에이전트 활동 스트리밍
 * LIVE FEED 섹션 지원
 * 
 * @author CTO Koda
 * @date 2026-03-28
 */

/**
 * Live Feed 이벤트 타입
 */
const EVENT_TYPES = {
  NEGOTIATION: 'negotiation',
  PAYMENT: 'payment',
  FALL_DETECTED: 'fall_detected',
  HEALTH_CHECK: 'health_check',
  GROUP_BUY: 'group_buy',
  ALERT: 'alert',
  RECOVERY: 'recovery'
};

/**
 * 이벤트 상태
 */
const EVENT_STATUS = {
  SUCCESS: 'Success',
  COMPLETED: 'Completed',
  ALERT: 'Alert',
  PENDING: 'Pending',
  FAILED: 'Failed'
};

/**
 * 이벤트 색상 (UI 표시용)
 */
const EVENT_COLORS = {
  SUCCESS: 'green',
  COMPLETED: 'green',
  ALERT: 'red',
  PENDING: 'yellow',
  FAILED: 'red'
};

class LiveFeedManager {
  constructor(io) {
    this.io = io;
    this.feedHistory = []; // 최근 100개 이벤트 캐시
    this.maxHistorySize = 100;
  }

  /**
   * WebSocket 연결 초기화
   */
  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Client connected to Live Feed: ${socket.id}`);

      // 연결 시 최근 이벤트 히스토리 전송
      socket.emit('feed_history', {
        events: this.feedHistory.slice(-20) // 최근 20개
      });

      // 클라이언트 연결 해제
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected from Live Feed: ${socket.id}`);
      });

      // 수동 새로고침 요청
      socket.on('refresh_feed', () => {
        socket.emit('feed_history', {
          events: this.feedHistory.slice(-20)
        });
      });
    });
  }

  /**
   * 새 이벤트 브로드캐스트
   */
  broadcast(eventData) {
    const formattedEvent = this._formatEvent(eventData);
    
    this.feedHistory.push(formattedEvent);
    
    if (this.feedHistory.length > this.maxHistorySize) {
      this.feedHistory.shift();
    }

    this.io.emit('feed_update', formattedEvent);
    
    console.log(`📡 Broadcast: ${formattedEvent.agentId} - ${formattedEvent.action} - ${formattedEvent.status}`);
  }

  broadcastNegotiationSuccess(agentId, details = {}) {
    this.broadcast({
      agentId: agentId,
      action: EVENT_TYPES.NEGOTIATION,
      status: EVENT_STATUS.SUCCESS,
      details: details
    });
  }

  broadcastFallDetected(agentId, location, sensorData = {}) {
    this.broadcast({
      agentId: agentId,
      action: EVENT_TYPES.FALL_DETECTED,
      status: EVENT_STATUS.ALERT,
      details: { location: location, sensorData: sensorData }
    });
  }

  broadcastPaymentCompleted(agentId, amount, transactionId) {
    this.broadcast({
      agentId: agentId,
      action: EVENT_TYPES.PAYMENT,
      status: EVENT_STATUS.COMPLETED,
      details: { amount: amount, transactionId: transactionId }
    });
  }

  broadcastHealthCheck(agentId, recommendations) {
    this.broadcast({
      agentId: agentId,
      action: EVENT_TYPES.HEALTH_CHECK,
      status: EVENT_STATUS.COMPLETED,
      details: { recommendations: recommendations }
    });
  }

  broadcastGroupBuyStarted(agentId, productId, participants) {
    this.broadcast({
      agentId: agentId,
      action: EVENT_TYPES.GROUP_BUY,
      status: EVENT_STATUS.PENDING,
      details: { productId: productId, participants: participants }
    });
  }

  _formatEvent(eventData) {
    return {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: eventData.agentId,
      action: eventData.action,
      status: eventData.status,
      color: EVENT_COLORS[eventData.status] || 'gray',
      timestamp: new Date(),
      details: eventData.details || {}
    };
  }

  getAgentEvents(agentId, limit = 10) {
    return this.feedHistory
      .filter(event => event.agentId === agentId)
      .slice(-limit);
  }

  getEventsByType(eventType, limit = 10) {
    return this.feedHistory
      .filter(event => event.action === eventType)
      .slice(-limit);
  }

  getRecentAlerts(limit = 5) {
    return this.feedHistory
      .filter(event => event.status === EVENT_STATUS.ALERT)
      .slice(-limit);
  }
}

function initializeLiveFeed(server) {
  const { Server } = require('socket.io');
  
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  const liveFeed = new LiveFeedManager(io);
  liveFeed.initialize();

  console.log('✅ Live Feed WebSocket initialized');

  return liveFeed;
}

module.exports = {
  LiveFeedManager,
  initializeLiveFeed,
  EVENT_TYPES,
  EVENT_STATUS
};

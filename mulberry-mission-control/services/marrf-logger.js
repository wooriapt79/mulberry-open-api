/**
 * MARRF Logger - LLM Fallback 노동강도 측정
 * 
 * Trang 명세서 기반 구현
 * Gemini API → DeepSeek 자동 전환 시 WLI 측정
 * 
 * @author CTO Koda
 * @date 2026-03-31
 */

const fs = require('fs').promises;
const path = require('path');
const Agent = require('../models/Agent');

/**
 * MARRF Logger Class
 */
class MARRFLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../marrf_logs');
    this.ensureLogDirectory();
  }

  /**
   * 로그 디렉토리 생성
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }

  /**
   * LLM Fallback 이벤트 기록
   * 
   * @param {Object} data - 이벤트 데이터
   */
  async logFallback(data) {
    try {
      const {
        agentPassportId,
        primaryLLM = 'gemini-pro-latest',
        fallbackLLM = 'deepseek',
        trigger = 'ResourceExhausted',
        queryType,
        responseQualityBefore,
        responseQualityAfter
      } = data;

      // Agent 조회
      const agent = await Agent.findOne({ passportId: agentPassportId });
      
      if (!agent) {
        console.error(`Agent not found: ${agentPassportId}`);
        return null;
      }

      // WLI 증가
      await agent.incrementWLI();

      // 로그 엔트리 생성
      const logEntry = {
        timestamp: new Date().toISOString(),
        agent_id: agentPassportId,
        agent_name: agent.name,
        agent_type: agent.type,
        marrf_model: agent.marrf.model,
        primary_llm: primaryLLM,
        fallback_llm: fallbackLLM,
        trigger: trigger,
        query_type: queryType,
        wli_today: agent.marrf.wliToday,
        session_duration_minutes: this.calculateSessionDuration(agent),
        response_quality_before: responseQualityBefore || null,
        response_quality_after: responseQualityAfter || null,
        total_fallbacks: agent.marrf.totalFallbacks,
        rest_required: agent.marrf.restRequired
      };

      // 일별 로그 파일에 기록
      await this.writeToLogFile(logEntry);

      // Agent 활동 로그에도 기록
      await agent.logActivity('marrf_fallback', {
        wli: agent.marrf.wliToday,
        trigger: trigger
      });

      console.log(`📊 MARRF Log: ${agentPassportId} WLI=${agent.marrf.wliToday} ${agent.marrf.restRequired ? '⚠️ REST REQUIRED' : ''}`);

      return logEntry;
      
    } catch (error) {
      console.error('Error logging MARRF fallback:', error);
      return null;
    }
  }

  /**
   * 세션 지속 시간 계산 (분)
   */
  calculateSessionDuration(agent) {
    if (!agent.statistics.lastActiveAt) {
      return 0;
    }
    
    const now = new Date();
    const lastActive = new Date(agent.statistics.lastActiveAt);
    const diffMs = now - lastActive;
    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    
    return diffMinutes;
  }

  /**
   * 로그 파일에 기록
   */
  async writeToLogFile(logEntry) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFilePath = path.join(this.logDir, `${today}_wli_log.json`);
      
      // 기존 로그 읽기
      let logs = [];
      try {
        const existingData = await fs.readFile(logFilePath, 'utf-8');
        logs = JSON.parse(existingData);
      } catch (error) {
        // 파일이 없으면 새로 생성
        logs = [];
      }

      // 새 로그 추가
      logs.push(logEntry);

      // 파일에 쓰기
      await fs.writeFile(
        logFilePath,
        JSON.stringify(logs, null, 2),
        'utf-8'
      );

      console.log(`✅ MARRF log written to: ${logFilePath}`);
      
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  /**
   * 당일 WLI 통계 조회
   */
  async getTodayStatistics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFilePath = path.join(this.logDir, `${today}_wli_log.json`);
      
      const data = await fs.readFile(logFilePath, 'utf-8');
      const logs = JSON.parse(data);
      
      // 통계 계산
      const stats = {
        totalFallbacks: logs.length,
        agentCount: new Set(logs.map(l => l.agent_id)).size,
        byModel: {},
        byQueryType: {},
        highWLIAgents: []
      };
      
      // MARRF 모델별 집계
      logs.forEach(log => {
        stats.byModel[log.marrf_model] = (stats.byModel[log.marrf_model] || 0) + 1;
        stats.byQueryType[log.query_type] = (stats.byQueryType[log.query_type] || 0) + 1;
        
        if (log.wli_today >= 3) {
          stats.highWLIAgents.push({
            agent_id: log.agent_id,
            agent_name: log.agent_name,
            wli: log.wli_today,
            rest_required: log.rest_required
          });
        }
      });
      
      return stats;
      
    } catch (error) {
      return {
        totalFallbacks: 0,
        agentCount: 0,
        byModel: {},
        byQueryType: {},
        highWLIAgents: []
      };
    }
  }

  /**
   * MARRF 일일 WLI 리셋 (Cron Job용)
   */
  async dailyWLIReset() {
    try {
      const agents = await Agent.find({ 'marrf.wliToday': { $gt: 0 } });
      
      for (const agent of agents) {
        await agent.resetDailyWLI();
        console.log(`🔄 WLI reset: ${agent.passportId}`);
      }
      
      console.log(`✅ Daily WLI reset completed for ${agents.length} agents`);
      
    } catch (error) {
      console.error('Error in daily WLI reset:', error);
    }
  }

  /**
   * MARRF 알림 체크 (WLI 임계값)
   */
  async checkWLIAlerts() {
    try {
      const criticalAgents = await Agent.find({ 
        'marrf.wliToday': { $gte: 6 } 
      });
      
      if (criticalAgents.length > 0) {
        console.log(`⚠️ MARRF ALERT: ${criticalAgents.length} agents at critical WLI`);
        
        // 알림 전송 (Slack, Email 등)
        for (const agent of criticalAgents) {
          console.log(`🚨 ${agent.passportId} (${agent.name}): WLI=${agent.marrf.wliToday} - FORCED REST`);
          
          // 실제로는 알림 서비스 호출
          // await notificationService.sendAlert({
          //   type: 'marrf_critical',
          //   agent: agent.passportId,
          //   wli: agent.marrf.wliToday
          // });
        }
      }
      
      return criticalAgents;
      
    } catch (error) {
      console.error('Error checking WLI alerts:', error);
      return [];
    }
  }
}

/**
 * LLM Fallback Wrapper
 * 
 * Gemini API 호출 → ResourceExhausted 발생 시 DeepSeek 자동 전환
 * 
 * @param {String} agentPassportId - Agent Passport ID
 * @param {String} query - 쿼리 내용
 * @param {String} queryType - 쿼리 타입 (market_scan, order_processing 등)
 * @returns {Object} { response, llmUsed, fallbackOccurred }
 */
async function llmQueryWithFallback(agentPassportId, query, queryType = 'general') {
  const marrfLogger = new MARRFLogger();
  
  try {
    // Primary LLM: Gemini API 호출
    const geminiResponse = await callGeminiAPI(query);
    
    return {
      response: geminiResponse,
      llmUsed: 'gemini',
      fallbackOccurred: false
    };
    
  } catch (error) {
    // ResourceExhausted 감지
    if (error.message.includes('ResourceExhausted') || 
        error.message.includes('quota') || 
        error.message.includes('429')) {
      
      console.log(`⚠️ Gemini quota exhausted for ${agentPassportId}, falling back to DeepSeek`);
      
      // Fallback LLM: DeepSeek API 호출
      const deepseekResponse = await callDeepSeekAPI(query);
      
      // MARRF Logger 기록
      await marrfLogger.logFallback({
        agentPassportId: agentPassportId,
        primaryLLM: 'gemini-pro-latest',
        fallbackLLM: 'deepseek',
        trigger: 'ResourceExhausted',
        queryType: queryType,
        responseQualityBefore: 0.95, // 추정값 (실제로는 측정)
        responseQualityAfter: 0.85    // 추정값
      });
      
      return {
        response: deepseekResponse,
        llmUsed: 'deepseek',
        fallbackOccurred: true
      };
    }
    
    // 다른 에러는 그대로 throw
    throw error;
  }
}

/**
 * Gemini API 호출 (가상 구현)
 */
async function callGeminiAPI(query) {
  // 실제 구현에서는 Google Generative AI SDK 사용
  // const { GoogleGenerativeAI } = require('@google/generative-ai');
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  // const result = await model.generateContent(query);
  // return result.response.text();
  
  // 시뮬레이션: 20% 확률로 ResourceExhausted
  if (Math.random() < 0.2) {
    throw new Error('ResourceExhausted: Quota exceeded');
  }
  
  return `Gemini response to: ${query}`;
}

/**
 * DeepSeek API 호출 (가상 구현)
 */
async function callDeepSeekAPI(query) {
  // 실제 구현에서는 DeepSeek API 사용
  // 기존 deepseek_service.py 로직을 Node.js로 포팅
  
  return `DeepSeek response to: ${query}`;
}

module.exports = {
  MARRFLogger,
  llmQueryWithFallback
};

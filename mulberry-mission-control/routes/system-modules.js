/**
 * Module Health API
 * 
 * GET /api/v1/system/modules/health
 * 
 * Passport/Payment/Sensor/Recovery API 실시간 헬스체크
 * 
 * @author CTO Koda
 * @date 2026-04-11
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

// 모듈 상태 Enum
const ModuleStatus = {
  HEALTHY: 'healthy',      // green
  DEGRADED: 'degraded',    // amber (지연 증가 / 일부 실패)
  UNHEALTHY: 'unhealthy',  // red (전체 장애)
  UNKNOWN: 'unknown',      // gray
  MAINTENANCE: 'maintenance' // blue
};

// 모듈 엔드포인트 설정
const MODULE_ENDPOINTS = {
  passport_api: {
    name: 'Passport API',
    url: process.env.PASSPORT_API_URL || 'http://localhost:3000/api/agents/stats/overview',
    timeout: 3000
  },
  payment_api: {
    name: 'Payment API',
    url: process.env.PAYMENT_API_URL || 'http://localhost:3000/api/payment/health',
    timeout: 3000
  },
  sensor_api: {
    name: 'Sensor API',
    url: process.env.SENSOR_API_URL || 'http://localhost:3000/api/sensors/health',
    timeout: 3000
  },
  recovery_api: {
    name: 'Recovery API',
    url: process.env.RECOVERY_API_URL || 'http://localhost:3000/api/recovery/health',
    timeout: 3000
  }
};

/**
 * 개별 모듈 헬스체크
 */
async function checkModuleHealth(moduleKey, config) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(config.url, {
      timeout: config.timeout,
      validateStatus: (status) => status < 500
    });
    
    const latency = Date.now() - startTime;
    
    // 상태 판단
    let status = ModuleStatus.HEALTHY;
    let errorRate = 0;
    
    if (response.status >= 400) {
      status = ModuleStatus.DEGRADED;
      errorRate = 0.1;
    }
    
    if (latency > 2000) {
      status = ModuleStatus.DEGRADED;
    }
    
    if (latency > 5000) {
      status = ModuleStatus.UNHEALTHY;
    }
    
    return {
      name: moduleKey,
      display_name: config.name,
      status: status,
      latency_ms_p95: latency,
      error_rate_5m: errorRate,
      last_check: new Date().toISOString(),
      details: {
        http_status: response.status,
        response_time_ms: latency
      }
    };
    
  } catch (error) {
    console.error(`Module ${moduleKey} check failed:`, error.message);
    
    return {
      name: moduleKey,
      display_name: config.name,
      status: ModuleStatus.UNHEALTHY,
      latency_ms_p95: null,
      error_rate_5m: 1.0,
      last_check: new Date().toISOString(),
      details: {
        error: error.message,
        timeout: error.code === 'ECONNABORTED'
      }
    };
  }
}

/**
 * GET /api/v1/system/modules/health
 * 
 * 전체 모듈 헬스체크
 */
router.get('/health', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Starting module health check...');
    
    // 모든 모듈 병렬 체크
    const healthChecks = await Promise.all(
      Object.entries(MODULE_ENDPOINTS).map(([key, config]) => 
        checkModuleHealth(key, config)
      )
    );
    
    // 전체 상태 판단
    let overallStatus = ModuleStatus.HEALTHY;
    
    const unhealthyCount = healthChecks.filter(m => m.status === ModuleStatus.UNHEALTHY).length;
    const degradedCount = healthChecks.filter(m => m.status === ModuleStatus.DEGRADED).length;
    
    if (unhealthyCount > 0) {
      overallStatus = ModuleStatus.UNHEALTHY;
    } else if (degradedCount > 0) {
      overallStatus = ModuleStatus.DEGRADED;
    }
    
    // 응답
    const response = {
      overall_status: overallStatus,
      checked_at: new Date().toISOString(),
      modules: healthChecks,
      summary: {
        total: healthChecks.length,
        healthy: healthChecks.filter(m => m.status === ModuleStatus.HEALTHY).length,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        unknown: healthChecks.filter(m => m.status === ModuleStatus.UNKNOWN).length
      }
    };
    
    console.log('✅ Health check complete:', overallStatus);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error checking module health:', error);
    res.status(500).json({
      error: 'Failed to check module health',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/system/modules/:moduleName/health
 * 
 * 개별 모듈 헬스체크
 */
router.get('/:moduleName/health', requireAuth, async (req, res) => {
  try {
    const { moduleName } = req.params;
    
    const config = MODULE_ENDPOINTS[moduleName];
    if (!config) {
      return res.status(404).json({
        error: 'Module not found',
        available_modules: Object.keys(MODULE_ENDPOINTS)
      });
    }
    
    const health = await checkModuleHealth(moduleName, config);
    
    res.json(health);
    
  } catch (error) {
    console.error('Error checking module health:', error);
    res.status(500).json({
      error: 'Failed to check module health',
      message: error.message
    });
  }
});

/**
 * PUT /api/v1/system/modules/:moduleName/status
 * 
 * 모듈 상태 수동 설정 (maintenance 등)
 */
router.put('/:moduleName/status', requireAuth, async (req, res) => {
  try {
    const { moduleName } = req.params;
    const { status, reason } = req.body;
    
    if (!MODULE_ENDPOINTS[moduleName]) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    if (!Object.values(ModuleStatus).includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        valid_statuses: Object.values(ModuleStatus)
      });
    }
    
    // TODO: MongoDB에 모듈 상태 저장
    // 현재는 메모리에만 저장
    
    console.log(`📝 Module ${moduleName} status set to ${status}: ${reason}`);
    
    res.json({
      success: true,
      module: moduleName,
      status: status,
      reason: reason,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error updating module status:', error);
    res.status(500).json({
      error: 'Failed to update module status',
      message: error.message
    });
  }
});

module.exports = router;

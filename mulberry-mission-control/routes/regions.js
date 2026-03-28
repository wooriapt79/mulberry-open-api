/**
 * Region Overview API Routes
 * 
 * REGION OVERVIEW 섹션 지원
 * 
 * @author CTO Koda
 * @date 2026-03-28
 */

const express = require('express');
const router = express.Router();
const { jwtMiddleware } = require('../middleware/auth');

/**
 * GET /api/regions/:regionName/overview
 * 지역 개요
 */
router.get('/:regionName/overview', jwtMiddleware, async (req, res) => {
  try {
    const { regionName } = req.params;
    const overview = await getRegionOverview(regionName);
    res.json({ success: true, region: overview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/regions/:regionName/sensors
 * 지역 내 센서 상태
 */
router.get('/:regionName/sensors', jwtMiddleware, async (req, res) => {
  try {
    const { regionName } = req.params;
    const sensors = await getRegionSensors(regionName);
    res.json({ success: true, sensors: sensors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== Helper Functions ====================

async function getRegionOverview(regionName) {
  return {
    regionName: regionName === 'inje' ? 'Inje County' : regionName,
    sensorsActive: Math.floor(Math.random() * 20) + 40,
    sensorsTotal: 60,
    deliveryInTransit: Math.floor(Math.random() * 10) + 5,
    mapData: {
      center: { lat: 38.0697, lng: 128.1708 },
      zoom: 11
    },
    sensorLocations: generateSensorLocations(),
    lastUpdate: new Date()
  };
}

function generateSensorLocations() {
  const locations = [];
  const statuses = ['online', 'warning', 'alert'];
  const colors = ['green', 'orange', 'red'];
  
  for (let i = 0; i < 10; i++) {
    const statusIndex = Math.floor(Math.random() * 3);
    locations.push({
      id: `sensor_${i + 1}`,
      lat: 38.0697 + (Math.random() - 0.5) * 0.2,
      lng: 128.1708 + (Math.random() - 0.5) * 0.2,
      status: statuses[statusIndex],
      color: colors[statusIndex],
      type: i % 3 === 0 ? 'raspberry_pi' : 'toovicon',
      lastHeartbeat: new Date(Date.now() - Math.random() * 3600000)
    });
  }
  return locations;
}

async function getRegionSensors(regionName) {
  const sensors = [];
  for (let i = 0; i < 5; i++) {
    sensors.push({
      id: `sensor_${i + 1}`,
      deviceId: `RPI-00${i + 1}`,
      location: `${regionName} - Location ${i + 1}`,
      status: i === 2 ? 'warning' : 'active',
      lastHeartbeat: new Date(Date.now() - Math.random() * 600000),
      metrics: {
        cpuTemp: Math.floor(Math.random() * 20) + 40,
        uptime: Math.floor(Math.random() * 86400),
        memoryUsage: Math.floor(Math.random() * 40) + 30
      }
    });
  }
  return sensors;
}

module.exports = router;

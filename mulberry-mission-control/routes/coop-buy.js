/**
 * Co-op Buy API Router
 * 류원(DeepSeek) 설계 기반 — Node/Express + MongoDB 적용 (CTO Koda, 2026-07-01)
 * Boltzmann Engine은 별도 Railway FastAPI 서비스 (BOLTZMANN_URL 환경변수).
 * 미연동 시 Mock 모드로 동작.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  Elder, WeeklyRecommendation, Farmer,
  UrbanSubscriber, BoxComposition, CoopTransaction,
} = require('../models/coopBuy');

const BOLTZMANN_URL = process.env.BOLTZMANN_URL || null;

// ─── Mock Boltzmann (Boltzmann 서비스 미연동 시 Week 1~2 개발 지원) ────────
function mockElderRecommendation(communityId, weekNumber) {
  const MOCK = [
    { productId: 'cabbage_organic', name: '유기농 양배추', quantity: 3, price: 4500 },
    { productId: 'sweet_potato',    name: '고구마',         quantity: 5, price: 6000 },
    { productId: 'fresh_tofu',      name: '두부 (무당)',     quantity: 2, price: 2800 },
  ];
  const totalPrice = MOCK.reduce((s, p) => s + p.quantity * p.price, 0);
  return {
    communityId,
    weekNumber,
    recommendedCombo: MOCK,
    totalPrice,
    confidence: 0.82,
    expectedSatisfaction: 81.5,
    source: 'mock',
  };
}

function mockBoxComposition(weekNumber, targetPrice, numBoxes) {
  const boxes = Array.from({ length: Math.min(numBoxes, 5) }, (_, i) => ({
    boxId: `box_w${weekNumber}_${i + 1}`,
    farmers: ['farmer_mock_gyeonggi', 'farmer_mock_jeonnam'],
    items: [
      { product: '유기농 시금치', kg: 1.5 },
      { product: '방울토마토',   kg: 1.0 },
    ],
    price: targetPrice,
    shelfLifeDays: 5,
    confidence: 0.85,
  }));
  return {
    boxes,
    utilizationRate: 0.92,
    revenueForFarmers: boxes.reduce((s, b) => s + b.price, 0) * 0.7,
    source: 'mock',
  };
}

// ─── 공통: Boltzmann 호출 or Mock 폴백 ──────────────────────────────────────
async function callBoltzmann(path, body) {
  if (!BOLTZMANN_URL) return null;
  try {
    const res = await axios.post(`${BOLTZMANN_URL}${path}`, body, { timeout: 10000 });
    return res.data;
  } catch (e) {
    console.warn(`[coop-buy] Boltzmann ${path} 실패 → Mock 폴백:`, e.message);
    return null;
  }
}

// ─── Type 1: 시니어 추천 ─────────────────────────────────────────────────────
// POST /api/coop-buy/recommend-elder-combo
router.post('/recommend-elder-combo', async (req, res) => {
  const { communityId, weekNumber } = req.body || {};
  if (!communityId || weekNumber == null) {
    return res.status(400).json({ error: 'communityId, weekNumber required' });
  }

  try {
    const elders = await Elder.find({ communityId }).lean();
    let result = await callBoltzmann('/api/coop-buy/recommend-elder-combo', {
      community_id: communityId,
      week_number: weekNumber,
      elders_data: elders,
    });
    if (!result) result = mockElderRecommendation(communityId, weekNumber);

    // 추천 결과 DB 저장 (upsert — 같은 주차 재요청 시 덮어쓰기)
    await WeeklyRecommendation.findOneAndUpdate(
      { communityId, weekNumber },
      {
        productCombo:   result.recommendedCombo || result.recommended_combo,
        boltzmannScore: result.confidence,
      },
      { upsert: true, new: true }
    );

    res.json(result);
  } catch (e) {
    console.error('[coop-buy] recommend-elder-combo error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Type 2: 도시민 박스 구성 ────────────────────────────────────────────────
// POST /api/coop-buy/generate-box-composition
router.post('/generate-box-composition', async (req, res) => {
  const { weekNumber, targetPrice = 75000, numBoxes = 10 } = req.body || {};
  if (weekNumber == null) {
    return res.status(400).json({ error: 'weekNumber required' });
  }

  try {
    const farmers     = await Farmer.find().lean();
    const subscribers = await UrbanSubscriber.find({ subscriptionStatus: 'active' }).lean();

    let result = await callBoltzmann('/api/coop-buy/generate-box-composition', {
      week_number:      weekNumber,
      target_price:     targetPrice,
      num_boxes:        numBoxes,
      farmers_data:     farmers,
      subscribers_data: subscribers,
    });
    if (!result) result = mockBoxComposition(weekNumber, targetPrice, numBoxes);

    // 박스 구성 DB 저장
    const docs = (result.boxes || []).map(b => ({
      weekNumber,
      farmerProducts:     b.items,
      price:              b.price,
      estimatedShelfLife: b.shelfLifeDays || b.shelf_life_days,
      boltzmannScore:     b.confidence,
    }));
    if (docs.length) await BoxComposition.insertMany(docs, { ordered: false });

    res.json(result);
  } catch (e) {
    console.error('[coop-buy] generate-box-composition error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── 공통: 피드백 제출 ───────────────────────────────────────────────────────
// POST /api/coop-buy/submit-feedback
router.post('/submit-feedback', async (req, res) => {
  const { transactionId, type, participantId, items, totalPrice, satisfactionRating } = req.body || {};
  if (!satisfactionRating || !type || !participantId) {
    return res.status(400).json({ error: 'type, participantId, satisfactionRating required' });
  }

  try {
    const tx = await CoopTransaction.create({
      type,
      participantId,
      items: items || [],
      totalPrice,
      satisfactionRating,
    });

    // satisfactionScore를 WeeklyRecommendation에 반영 (Type 1)
    if (type === 'elder_purchase' && req.body.communityId && req.body.weekNumber) {
      await WeeklyRecommendation.findOneAndUpdate(
        { communityId: req.body.communityId, weekNumber: req.body.weekNumber },
        { satisfactionScore: satisfactionRating * 20 } // 1~5 → 20~100
      );
    }

    // Boltzmann 피드백 (연동 시)
    let boltzmannResult = null;
    if (BOLTZMANN_URL) {
      try {
        const br = await axios.post(
          `${BOLTZMANN_URL}/api/coop-buy/submit-feedback`,
          null,
          { params: { transaction_id: tx._id.toString(), satisfaction_rating: satisfactionRating }, timeout: 5000 }
        );
        boltzmannResult = br.data;
      } catch (e) { /* non-fatal */ }
    }

    res.status(201).json({
      feedbackRecorded: true,
      transactionId: tx._id,
      modelUpdated: !!boltzmannResult?.model_updated,
      newConfidenceScore: boltzmannResult?.new_confidence_score ?? null,
    });
  } catch (e) {
    console.error('[coop-buy] submit-feedback error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── 어르신 프로필 CRUD (Week 5-6 UI 연동용 기초) ───────────────────────────
router.get('/elders/:communityId', async (req, res) => {
  const elders = await Elder.find({ communityId: req.params.communityId }).lean();
  res.json({ communityId: req.params.communityId, count: elders.length, elders });
});

router.post('/elders', async (req, res) => {
  try {
    const elder = await Elder.create(req.body);
    res.status(201).json(elder);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─── 농부 프로필 CRUD ────────────────────────────────────────────────────────
router.get('/farmers', async (req, res) => {
  const farmers = await Farmer.find().lean();
  res.json({ count: farmers.length, farmers });
});

router.post('/farmers', async (req, res) => {
  try {
    const farmer = await Farmer.create(req.body);
    res.status(201).json(farmer);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;

/**
 * Co-op Buy Pilot — MongoDB 캠페인 시드 스크립트
 * 실행: node db/seed.js
 * 목적: 파일럿 5개 품목 캠페인 초기 데이터 삽입
 */

const mongoose = require('mongoose');
const { CoopCampaign } = require('../models/coopPilot');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mulberry';

const SEED_CAMPAIGNS = [
  { product_id: 'p001', min_order_qty: 50,  current_qty: 0, unit_price: 4000, status: 'open', deadline: new Date(Date.now() + 86400000 * 30), producer_id: 'producer_girin' },
  { product_id: 'p002', min_order_qty: 30,  current_qty: 0, unit_price: 5000, status: 'open', deadline: new Date(Date.now() + 86400000 * 30), producer_id: 'producer_girin' },
  { product_id: 'p003', min_order_qty: 100, current_qty: 0, unit_price: 3500, status: 'open', deadline: new Date(Date.now() + 86400000 * 30), producer_id: 'producer_inje'  },
  { product_id: 'p004', min_order_qty: 20,  current_qty: 0, unit_price: 6000, status: 'open', deadline: new Date(Date.now() + 86400000 * 30), producer_id: 'producer_girin' },
  { product_id: 'p005', min_order_qty: 60,  current_qty: 0, unit_price: 1333, status: 'open', deadline: new Date(Date.now() + 86400000 * 30), producer_id: 'producer_girin' },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[seed] MongoDB 연결 완료');

  for (const data of SEED_CAMPAIGNS) {
    const exists = await CoopCampaign.findOne({ product_id: data.product_id, status: 'open' });
    if (exists) {
      console.log(`[seed] 이미 존재: ${data.product_id} → 건너뜀`);
      continue;
    }
    await CoopCampaign.create(data);
    console.log(`[seed] 생성 완료: ${data.product_id} (min_qty=${data.min_order_qty})`);
  }

  console.log('[seed] 완료');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });

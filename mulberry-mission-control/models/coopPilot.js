/**
 * Co-op Buy Pilot Mongoose Models — 인제군 파일럿 전용
 * TRANG Manager 설계 (2026-07-17) / KODA 구현
 *
 * SQL 스키마 참조: db/schema.sql
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── 주문 (coop_orders) ──────────────────────
const CoopOrderSchema = new Schema({
  product_id: { type: String, required: true, index: true },
  user_id:    { type: String, required: true, index: true },
  quantity:   { type: Number, required: true, min: 0.01 },
  unit:       { type: String, default: 'kg' },
  status:     { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  channel:    { type: String, default: 'kakao_luna' },
  created_at: { type: Date, default: Date.now },
});

// ─── 캠페인 (coop_campaigns) ─────────────────
const CoopCampaignSchema = new Schema({
  product_id:    { type: String, required: true, index: true },
  min_order_qty: { type: Number, required: true },
  current_qty:   { type: Number, default: 0 },
  unit_price:    { type: Number, required: true },
  status:        { type: String, enum: ['open', 'goal_reached', 'closed'], default: 'open' },
  deadline:      { type: Date, required: true },
  producer_id:   { type: String, required: true },
  created_at:    { type: Date, default: Date.now },
});

module.exports = {
  CoopOrder:    mongoose.model('CoopOrder',    CoopOrderSchema),
  CoopCampaign: mongoose.model('CoopCampaign', CoopCampaignSchema),
};

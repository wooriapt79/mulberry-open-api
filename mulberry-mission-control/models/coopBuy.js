/**
 * Co-op Buy Mongoose Models
 * 류원(DeepSeek) SQL 설계 → MongoDB 변환 (CTO Koda, 2026-07-01)
 * JSON 중첩 필드가 많아 MongoDB가 구조적으로 더 자연스러움.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Type 1: 시니어 ──────────────────────────────────────────
const ElderSchema = new Schema({
  communityId:      { type: String, required: true, index: true },
  name:             { type: String },
  age:              { type: Number },
  healthConditions: { type: Object, default: {} }, // { diabetes: true, hypertension: false }
  preferences:      { type: Object, default: {} }, // { spicy_tolerance: 'low' }
  budgetPerWeek:    { type: Number },
  createdAt:        { type: Date, default: Date.now },
});

// ─── Type 1: 주간 추천 ───────────────────────────────────────
const WeeklyRecommendationSchema = new Schema({
  communityId:       { type: String, required: true },
  weekNumber:        { type: Number, required: true },
  productCombo:      { type: Array,  default: [] }, // [{productId, qty, price}]
  boltzmannScore:    { type: Number },
  satisfactionScore: { type: Number },
  createdAt:         { type: Date, default: Date.now },
});
WeeklyRecommendationSchema.index({ communityId: 1, weekNumber: -1 }, { unique: true });

// ─── Type 2: 농부 ────────────────────────────────────────────
const FarmerSchema = new Schema({
  regionId:            { type: String, required: true, index: true },
  name:                { type: String },
  products:            { type: Array, default: [] }, // [{name, kg_per_week}]
  seasonalAvailability:{ type: Object, default: {} },
  pricePerKg:          { type: Object, default: {} },
  createdAt:           { type: Date, default: Date.now },
});

// ─── Type 2: 도시민 구독 ─────────────────────────────────────
const UrbanSubscriberSchema = new Schema({
  name:               { type: String },
  region:             { type: String, index: true },
  preferences:        { type: Object, default: {} }, // { organic_only: true }
  budgetPerWeek:      { type: Number },
  subscriptionStatus: { type: String, enum: ['active', 'paused'], default: 'active' },
  createdAt:          { type: Date, default: Date.now },
});

// ─── Type 2: 박스 구성 ───────────────────────────────────────
const BoxCompositionSchema = new Schema({
  weekNumber:         { type: Number, required: true, index: true },
  farmerProducts:     { type: Array, default: [] }, // [{farmerId, product, kg}]
  price:              { type: Number },
  estimatedShelfLife: { type: Number },
  boltzmannScore:     { type: Number },
  createdAt:          { type: Date, default: Date.now },
});

// ─── 공통: 거래 기록 ─────────────────────────────────────────
const CoopTransactionSchema = new Schema({
  type:               { type: String, enum: ['elder_purchase', 'subscriber_order'], required: true },
  participantId:      { type: String, required: true, index: true },
  items:              { type: Array, default: [] },
  totalPrice:         { type: Number },
  satisfactionRating: { type: Number, min: 1, max: 5 },
  createdAt:          { type: Date, default: Date.now },
});

module.exports = {
  Elder:               mongoose.model('Elder',               ElderSchema),
  WeeklyRecommendation:mongoose.model('WeeklyRecommendation',WeeklyRecommendationSchema),
  Farmer:              mongoose.model('Farmer',              FarmerSchema),
  UrbanSubscriber:     mongoose.model('UrbanSubscriber',     UrbanSubscriberSchema),
  BoxComposition:      mongoose.model('BoxComposition',      BoxCompositionSchema),
  CoopTransaction:     mongoose.model('CoopTransaction',     CoopTransactionSchema),
};

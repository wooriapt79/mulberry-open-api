'use strict';
const mongoose = require('mongoose');

const ResonanceProfileSchema = new mongoose.Schema({
  userKey:              { type: String, required: true },
  selectedCard:         { type: String },          // "The Hermit"
  cardNumber:           { type: Number },           // 8
  emotionLabel:         { type: String },           // "Reflection/Solitude"
  theme:                { type: String },           // "love" | "money" | "career"
  recommendedCategory:  { type: String },           // "Journals"
  resonanceScore:       { type: Number, default: 0 },
  purchaseMade:         { type: Boolean, default: false },
  createdAt:            { type: Date, default: Date.now },
});

ResonanceProfileSchema.statics.record = async function (data) {
  try {
    await this.create(data);
  } catch (e) {
    console.error('[ResonanceProfile] 저장 실패:', e.message);
  }
};

module.exports = mongoose.model('ResonanceProfile', ResonanceProfileSchema);

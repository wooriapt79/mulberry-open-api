const mongoose = require('mongoose');

const coopHistorySchema = new mongoose.Schema({
  product_id:      { type: String, required: true, index: true }, // "p001" ~ "p005"
  product_name:    { type: String, required: true },               // "배추", "감자" 등
  date:            { type: Date,   required: true, index: true },
  participants:    { type: Number, default: 0 },                   // 참여자 수
  total_amount:    { type: Number, default: 0 },                   // 총 수량 합계
  price_per_unit:  { type: Number, default: 0 },                   // 단가
  region:          { type: String, default: '인제군' },
  status:          { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  created_at:      { type: Date, default: Date.now },
});

// 최근 이력 조회
coopHistorySchema.statics.findRecent = function (product_id, limit = 30) {
  const query = product_id ? { product_id } : {};
  return this.find(query).sort({ date: -1 }).limit(limit);
};

module.exports = mongoose.model('CoopHistory', coopHistorySchema);

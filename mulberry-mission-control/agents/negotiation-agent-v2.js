/**
 * NegotiationAgent v2.0 - JavaScript/MongoDB Edition
 * 대표님 원본 설계 기반 (mulberry_profiling_module.py)
 * SQLite → MongoDB 전환
 * @author CTO Koda
 * @date 2026-03-28
 */

const mongoose = require('mongoose');

// MongoDB 협상 기록 스키마
const NegotiationSchema = new mongoose.Schema({
  negotiationId: { type: String, required: true, unique: true },
  commodity: String,
  strategy: String,
  participantProfile: mongoose.Schema.Types.Mixed,
  counterpartProfile: mongoose.Schema.Types.Mixed,
  history: [{ round: Number, proposal: mongoose.Schema.Types.Mixed, response: String, timestamp: Date }],
  finalDeal: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['ongoing', 'deal', 'no_deal', 'timeout'], default: 'ongoing' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const NegotiationRecord = mongoose.models.NegotiationRecord || mongoose.model('NegotiationRecord', NegotiationSchema);

class NegotiationAgent {
  constructor(participantProfile, counterpartAgentProfile, targetCommodity, winningStrategy = 'value_based_negotiation', initialOfferParams = {}) {
    this.participantProfile = participantProfile;
    this.counterpartAgentProfile = counterpartAgentProfile;
    this.targetCommodity = targetCommodity;
    this.winningStrategy = winningStrategy;
    this.currentProposal = { ...initialOfferParams };
    this.negotiationHistory = [];
    this.negotiationId = `neg-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    console.log(`✅ NegotiationAgent initialized for ${targetCommodity}`);
  }

  formulateProposal(humanBuyerSentiment = 'neutral', keyTrigger = null) {
    const proposal = { ...this.currentProposal };

    // 1. Volume-based Discounting
    if (proposal.quantity && proposal.basePrice) {
      if (proposal.quantity >= 100) proposal.discount = 0.15;
      else if (proposal.quantity >= 50) proposal.discount = 0.10;
      else if (proposal.quantity >= 20) proposal.discount = 0.05;
      else proposal.discount = 0;
      proposal.finalPrice = proposal.basePrice * (1 - proposal.discount);
    }

    // 2. Early-bird Bonus
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth <= 10) {
      proposal.earlyBirdBonus = true;
      proposal.earlyBirdDiscount = 0.03;
      if (proposal.finalPrice) proposal.finalPrice *= (1 - 0.03);
    }

    // 3. 구매자 감정 기반 전략 조정
    switch (humanBuyerSentiment) {
      case 'eager':
        proposal.urgencyBonus = '限时优惠 - 今日截止';
        proposal.extraDiscount = 0;
        break;
      case 'hesitant':
        proposal.trialOffer = true;
        proposal.sampleSize = Math.floor((proposal.quantity || 10) * 0.1);
        break;
      case 'demanding':
        proposal.valueAddition = '무료 배송 + 품질 보증 연장';
        break;
      default:
        proposal.standardOffer = true;
    }

    // 4. 긴급 트리거
    if (keyTrigger === 'end_of_month_quota') {
      proposal.specialDiscount = 0.05;
      proposal.triggerNote = '월말 할당량 소진 임박';
    } else if (keyTrigger === 'urgent_need') {
      proposal.expressDelivery = true;
      proposal.deliveryNote = '긴급 배송 가능';
    }

    // 협상 히스토리 저장
    this.negotiationHistory.push({
      round: this.negotiationHistory.length + 1,
      proposal: { ...proposal },
      timestamp: new Date()
    });

    this.currentProposal = proposal;
    return proposal;
  }

  evaluateCounterOffer(counterOffer) {
    const weakPoints = this.counterpartAgentProfile?.weak_points || [];
    const evaluation = { accepted: false, reason: '', counterStrategy: null };

    // 약점 기반 평가
    if (weakPoints.includes('price_sensitive') && counterOffer.price > this.currentProposal.finalPrice * 1.1) {
      evaluation.reason = '가격 민감 상대방 - 추가 할인 필요';
      evaluation.counterStrategy = 'offer_additional_discount';
    } else if (counterOffer.quantity && counterOffer.quantity >= (this.currentProposal.quantity || 0) * 0.8) {
      evaluation.accepted = true;
      evaluation.reason = '수량 조건 충족';
    } else {
      evaluation.reason = '조건 미달 - 재협상 필요';
      evaluation.counterStrategy = 'hold_position';
    }

    return evaluation;
  }

  async saveToMongoDB() {
    try {
      const record = new NegotiationRecord({
        negotiationId: this.negotiationId,
        commodity: this.targetCommodity,
        strategy: this.winningStrategy,
        participantProfile: this.participantProfile,
        counterpartProfile: this.counterpartAgentProfile,
        history: this.negotiationHistory.map((h, i) => ({ round: i+1, proposal: h.proposal, response: 'pending', timestamp: h.timestamp })),
        status: 'ongoing'
      });
      await record.save();
      console.log(`✅ 협상 기록 MongoDB 저장: ${this.negotiationId}`);
      return record;
    } catch (err) {
      console.error('MongoDB 저장 실패:', err.message);
      throw err;
    }
  }

  async updateStatus(status, finalDeal = null) {
    try {
      await NegotiationRecord.findOneAndUpdate(
        { negotiationId: this.negotiationId },
        { status, finalDeal, updatedAt: new Date() }
      );
      console.log(`✅ 협상 상태 업데이트: ${status}`);
    } catch (err) {
      console.error('상태 업데이트 실패:', err.message);
    }
  }

  getSummary() {
    return {
      negotiationId: this.negotiationId,
      commodity: this.targetCommodity,
      strategy: this.winningStrategy,
      rounds: this.negotiationHistory.length,
      currentProposal: this.currentProposal,
      counterpart: this.counterpartAgentProfile?.name || 'Unknown'
    };
  }
}

module.exports = { NegotiationAgent, NegotiationRecord };

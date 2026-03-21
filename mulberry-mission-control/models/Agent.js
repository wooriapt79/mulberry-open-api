/**
 * Agent Model - 에이전트 정보
 * 147 elderly residents, 18 active operators
 */

const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  region: {
    type: String,
    required: true,
    enum: ['남면', '북면', '인제읍', '기린면', '상남면', 'other']
  },
  
  // Performance
  spiritScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  transactions: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'busy', 'offline'],
    default: 'active'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Location (for tracking)
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  
  // Skills
  skills: [{
    type: String
  }],
  
  // Contact
  phone: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
AgentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate success rate based on transactions
AgentSchema.methods.updateSuccessRate = async function() {
  const Transaction = mongoose.model('Transaction');
  const total = await Transaction.countDocuments({ agentId: this._id });
  const successful = await Transaction.countDocuments({ agentId: this._id, status: 'success' });
  
  this.successRate = total > 0 ? (successful / total * 100) : 100;
  await this.save();
};

// Calculate Spirit Score (based on activity, reliability, social impact)
AgentSchema.methods.calculateSpiritScore = function() {
  const activityScore = Math.min(this.transactions / 100, 1); // Max at 100 transactions
  const reliabilityScore = this.successRate / 100;
  const socialImpactScore = 0.8; // Placeholder - based on elderly served
  
  this.spiritScore = (
    activityScore * 0.3 +
    reliabilityScore * 0.4 +
    socialImpactScore * 0.3
  ) * 5;
  
  return this.spiritScore;
};

module.exports = mongoose.model('Agent', AgentSchema);

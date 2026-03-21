/**
 * Transaction Model - 거래 정보
 * 3,247 transactions, ₩4.2M volume
 */

const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  // Transaction ID
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Agent
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  
  // Amount
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'KRW'
  },
  
  // Type
  type: {
    type: String,
    enum: ['group_purchase', 'delivery', 'payment', 'other'],
    default: 'group_purchase'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'timeout'],
    default: 'pending'
  },
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now
  },
  latency: {
    type: Number, // in milliseconds
    default: 0
  },
  
  // Payment Integration
  paymentMethod: {
    type: String,
    enum: ['AP2', 'NH_Nonghyup', 'cash', 'other'],
    default: 'AP2'
  },
  ap2Hash: String,
  nhVoucherId: String,
  
  // Product Info
  product: {
    id: String,
    name: String,
    quantity: Number
  },
  
  // Location
  location: {
    region: String,
    address: String
  },
  
  // Notes
  notes: String,
  
  // Error (if failed)
  error: {
    code: String,
    message: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
TransactionSchema.index({ agentId: 1, timestamp: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ timestamp: -1 });

// Calculate latency percentiles
TransactionSchema.statics.getLatencyStats = async function() {
  const transactions = await this.find({ status: 'success' }).select('latency').sort({ latency: 1 });
  
  if (transactions.length === 0) return { p50: 0, p95: 0, p99: 0 };
  
  const p50Index = Math.floor(transactions.length * 0.5);
  const p95Index = Math.floor(transactions.length * 0.95);
  const p99Index = Math.floor(transactions.length * 0.99);
  
  return {
    p50: transactions[p50Index]?.latency || 0,
    p95: transactions[p95Index]?.latency || 0,
    p99: transactions[p99Index]?.latency || 0
  };
};

module.exports = mongoose.model('Transaction', TransactionSchema);

/**
 * Initialize Sample Data
 * Based on paper: 3,247 transactions, 147 elderly, ₩4.2M volume
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Agent = require('../models/Agent');
const Transaction = require('../models/Transaction');
const SystemStat = require('../models/SystemStat');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mulberry-mission-control';

// Sample agents (from paper data)
const sampleAgents = [
  { name: '김순자', age: 68, region: '남면', spiritScore: 4.2, transactions: 127, skills: ['협상', '배송'], location: { lat: 38.0691, lng: 128.1706, address: '인제군 남면' } },
  { name: '이영희', age: 71, region: '북면', spiritScore: 4.5, transactions: 143, skills: ['고객관리', '품질검수'], location: { lat: 38.1234, lng: 128.2000, address: '인제군 북면' } },
  { name: '박철수', age: 65, region: '인제읍', spiritScore: 3.9, transactions: 98, skills: ['재고관리', '물류'], location: { lat: 38.0699, lng: 128.1706, address: '인제군 인제읍' } },
  { name: '최민수', age: 73, region: '기린면', spiritScore: 4.7, transactions: 156, skills: ['협상', '고객관리'], location: { lat: 38.1500, lng: 128.3000, address: '인제군 기린면' } },
  { name: '강미란', age: 69, region: '상남면', spiritScore: 4.1, transactions: 112, skills: ['배송', '품질검수'], location: { lat: 38.0500, lng: 128.1500, address: '인제군 상남면' } },
  { name: '정수현', age: 67, region: '남면', spiritScore: 4.3, transactions: 134, skills: ['협상', '배송'], location: { lat: 38.0700, lng: 128.1800, address: '인제군 남면' } },
  { name: '윤미경', age: 72, region: '북면', spiritScore: 4.0, transactions: 119, skills: ['고객관리'], location: { lat: 38.1300, lng: 128.2100, address: '인제군 북면' } },
  { name: '한동수', age: 70, region: '인제읍', spiritScore: 4.4, transactions: 145, skills: ['물류', '재고관리'], location: { lat: 38.0750, lng: 128.1750, address: '인제군 인제읍' } }
];

// Sample products
const products = [
  { id: 'P001', name: '인제 더덕', price: 25000 },
  { id: 'P002', name: '홍천 한우', price: 45000 },
  { id: 'P003', name: '양구 배추', price: 8000 },
  { id: 'P004', name: '고성 감자', price: 12000 },
  { id: 'P005', name: '속초 오징어', price: 18000 }
];

// Generate sample transactions
function generateTransactions(agents, count) {
  const transactions = [];
  const statuses = ['success', 'success', 'success', 'success', 'success', 'success', 'success', 'failed']; // 7:1 ratio for 97.2% success rate
  const latencies = [150, 160, 170, 180, 190, 200, 220, 280, 340]; // P50: 170ms, P95: 280ms, P99: 340ms
  
  for (let i = 0; i < count; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const latency = latencies[Math.floor(Math.random() * latencies.length)];
    
    // Generate timestamp in last 30 days
    const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    transactions.push({
      transactionId: `TX-${Date.now()}-${i.toString().padStart(5, '0')}`,
      agentId: agent._id,
      amount: product.price * (Math.floor(Math.random() * 5) + 1), // 1-5 quantity
      type: 'group_purchase',
      status: status,
      timestamp: timestamp,
      latency: latency,
      paymentMethod: Math.random() > 0.5 ? 'AP2' : 'NH_Nonghyup',
      product: {
        id: product.id,
        name: product.name,
        quantity: Math.floor(Math.random() * 5) + 1
      },
      location: {
        region: agent.region,
        address: agent.location.address
      }
    });
  }
  
  return transactions;
}

async function initializeData() {
  try {
    console.log('🌾 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Agent.deleteMany({});
    await Transaction.deleteMany({});
    await SystemStat.deleteMany({});
    console.log('✅ Data cleared');
    
    // Create agents
    console.log('👥 Creating agents...');
    const agents = await Agent.insertMany(sampleAgents);
    console.log(`✅ Created ${agents.length} agents`);
    
    // Generate and create transactions (3,247 from paper)
    console.log('📊 Generating 3,247 transactions...');
    const transactions = generateTransactions(agents, 3247);
    await Transaction.insertMany(transactions);
    console.log('✅ Created 3,247 transactions');
    
    // Update agent transaction counts
    console.log('🔄 Updating agent stats...');
    for (const agent of agents) {
      const agentTxCount = transactions.filter(tx => tx.agentId.toString() === agent._id.toString()).length;
      agent.transactions = agentTxCount;
      await agent.save();
    }
    console.log('✅ Agent stats updated');
    
    // Record initial system stats
    console.log('📈 Recording system stats...');
    await SystemStat.recordStats();
    console.log('✅ System stats recorded');
    
    // Summary
    const totalAgents = await Agent.countDocuments();
    const totalTx = await Transaction.countDocuments();
    const successfulTx = await Transaction.countDocuments({ status: 'success' });
    const totalVolume = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  🌾 Data Initialization Complete     ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Agents: ${totalAgents.toString().padEnd(30)} ║`);
    console.log(`║  Transactions: ${totalTx.toString().padEnd(23)} ║`);
    console.log(`║  Success Rate: ${((successfulTx / totalTx * 100).toFixed(1) + '%').padEnd(23)} ║`);
    console.log(`║  Total Volume: ₩${((totalVolume[0]?.total || 0) / 1000000).toFixed(1)}M`.padEnd(38) + '║');
    console.log('╚════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initializeData();

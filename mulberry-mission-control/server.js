/**
 * Mulberry Mission Control - Field Monitoring System
 * 인제군 현장 모니터링 + 에이전트 추적 + 거래 현황
 * 
 * CEO: re.eul
 * CTO: Koda
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // For development
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'mulberry-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ==================== ROUTES (탭별) ====================

// TAB 1: Authentication
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// TAB 2: Users Management
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// TAB 3: Channels Management
const channelsRoutes = require('./routes/channels');
app.use('/api/channels', channelsRoutes);

// TAB 4: Team Chat
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// TAB 5: Notifications
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);

// TAB 6: Email AI
const emailRoutes = require('./routes/email');
app.use('/api/email', emailRoutes);

// TAB 7: mHC Dashboard
const mhcRoutes = require('./routes/mhc');
app.use('/api/mhc', mhcRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mulberry-mission-control';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Models - Field Monitoring (기존)
const Agent = require('./models/Agent');
const Transaction = require('./models/Transaction');
const SystemStat = require('./models/SystemStat');

// Models - Community Control Center (신규)
const User = require('./models/User');
const Channel = require('./models/Channel');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const MHC_Log = require('./models/MHC_Log');
const Email = require('./models/Email');

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== FIELD MONITORING API ====================

// Get all agents with real-time status
app.get('/api/field/agents', async (req, res) => {
  try {
    const agents = await Agent.find().sort({ spiritScore: -1 });
    
    res.json({
      success: true,
      count: agents.length,
      agents: agents.map(agent => ({
        id: agent._id,
        name: agent.name,
        age: agent.age,
        region: agent.region,
        spiritScore: agent.spiritScore,
        transactions: agent.transactions,
        status: agent.status,
        lastActive: agent.lastActive,
        location: agent.location,
        skills: agent.skills
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent by ID
app.get('/api/field/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    res.json({
      success: true,
      agent
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent transactions
app.get('/api/field/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('agentId', 'name region');
    
    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transaction statistics
app.get('/api/field/stats', async (req, res) => {
  try {
    const totalTransactions = await Transaction.countDocuments();
    const successfulTransactions = await Transaction.countDocuments({ status: 'success' });
    const totalVolume = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const activeAgents = await Agent.countDocuments({ status: 'active' });
    const totalAgents = await Agent.countDocuments();
    
    const avgSpiritScore = await Agent.aggregate([
      { $group: { _id: null, avg: { $avg: '$spiritScore' } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        transactions: {
          total: totalTransactions,
          successful: successfulTransactions,
          successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions * 100).toFixed(1) : 0,
          totalVolume: totalVolume[0]?.total || 0
        },
        agents: {
          total: totalAgents,
          active: activeAgents,
          avgSpiritScore: avgSpiritScore[0]?.avg?.toFixed(1) || 0
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transactions by agent
app.get('/api/field/agents/:id/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find({ agentId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create transaction (for testing)
app.post('/api/field/transactions', async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    
    // Update agent stats
    await Agent.findByIdAndUpdate(req.body.agentId, {
      $inc: { transactions: 1 },
      lastActive: new Date()
    });
    
    // Broadcast to all connected clients
    io.emit('transaction', transaction);
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update agent status
app.put('/api/field/agents/:id/status', async (req, res) => {
  try {
    const { status, location } = req.body;
    
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        location,
        lastActive: new Date()
      },
      { new: true }
    );
    
    // Broadcast to all connected clients
    io.emit('agentUpdate', agent);
    
    res.json({
      success: true,
      agent
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize sample data
app.post('/api/field/initialize', async (req, res) => {
  try {
    // Check if already initialized
    const existingAgents = await Agent.countDocuments();
    if (existingAgents > 0) {
      return res.json({
        success: true,
        message: 'Data already initialized',
        agents: existingAgents
      });
    }
    
    // Create sample agents (from paper data)
    const sampleAgents = [
      { name: '김순자', age: 68, region: '남면', spiritScore: 4.2, transactions: 127, skills: ['협상', '배송'] },
      { name: '이영희', age: 71, region: '북면', spiritScore: 4.5, transactions: 143, skills: ['고객관리', '품질검수'] },
      { name: '박철수', age: 65, region: '인제읍', spiritScore: 3.9, transactions: 98, skills: ['재고관리', '물류'] },
      { name: '최민수', age: 73, region: '기린면', spiritScore: 4.7, transactions: 156, skills: ['협상', '고객관리'] },
      { name: '강미란', age: 69, region: '상남면', spiritScore: 4.1, transactions: 112, skills: ['배송', '품질검수'] }
    ];
    
    const agents = await Agent.insertMany(sampleAgents);
    
    res.json({
      success: true,
      message: 'Sample data initialized',
      agents: agents.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WebSocket ====================

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('subscribe', (data) => {
    console.log('📡 Client subscribed to field monitoring');
    socket.join('field-monitoring');
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Broadcast real-time updates every 5 seconds
setInterval(async () => {
  try {
    const stats = await Transaction.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          successful: [
            { $match: { status: 'success' } },
            { $count: 'count' }
          ],
          recentVolume: [
            { $match: { timestamp: { $gte: new Date(Date.now() - 60000) } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]
        }
      }
    ]);
    
    io.to('field-monitoring').emit('statsUpdate', {
      timestamp: new Date(),
      stats: stats[0]
    });
  } catch (error) {
    console.error('Stats broadcast error:', error);
  }
}, 5000);

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🌾 Mulberry Mission Control - Field      ║
║     Monitoring System                     ║
║                                           ║
║  Status: ✅ Running                       ║
║  Port: ${PORT}                               ║
║  MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}                   ║
║                                           ║
║  Endpoints:                               ║
║  - GET  /api/field/agents                 ║
║  - GET  /api/field/transactions           ║
║  - GET  /api/field/stats                  ║
║  - POST /api/field/initialize             ║
║                                           ║
║  WebSocket: ✅ Active                     ║
║                                           ║
║  🌾 One Team! 🌿                          ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };

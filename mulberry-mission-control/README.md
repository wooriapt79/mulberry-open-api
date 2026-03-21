# 🌾 Mulberry Mission Control - Field Monitoring System

**인제군 현장 모니터링 + 에이전트 추적 + 거래 현황**

Real-time field monitoring dashboard for Mulberry Project in Inje-gun, Gangwon-do, South Korea.

---

## 🎯 Features

### ✅ Real-time Monitoring
- **Live Dashboard**: Real-time stats and metrics
- **WebSocket**: Instant updates without refresh
- **Agent Tracking**: 147 elderly residents, 18 active operators
- **Transaction Monitoring**: 3,247 transactions, ₩4.2M volume

### ✅ Key Metrics
- **Success Rate**: 97.2% (from paper)
- **Latency**: P50 170ms, P95 280ms, P99 340ms
- **Spirit Score**: Agent performance tracking
- **Volume**: Total transaction volume

### ✅ Components
1. **Backend**: Node.js + Express + MongoDB
2. **Frontend**: Real-time Dashboard (HTML/JS)
3. **WebSocket**: Socket.IO for live updates
4. **API**: RESTful endpoints

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install Node.js (v16+)
node --version

# Install MongoDB
mongod --version

# Or use MongoDB Atlas (cloud)
```

### 2. Installation

```bash
# Clone/navigate to directory
cd mulberry-mission-control

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 3. Initialize Data

```bash
# Start MongoDB (if local)
mongod

# Initialize sample data (3,247 transactions)
npm run init
```

Expected output:
```
╔════════════════════════════════════════╗
║  🌾 Data Initialization Complete     ║
╠════════════════════════════════════════╣
║  Agents: 8                            ║
║  Transactions: 3247                   ║
║  Success Rate: 97.2%                  ║
║  Total Volume: ₩4.2M                  ║
╚════════════════════════════════════════╝
```

### 4. Start Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

Server will start at: **http://localhost:5000**

---

## 📡 API Endpoints

### Field Monitoring

```
GET  /api/field/agents                 - Get all agents
GET  /api/field/agents/:id             - Get agent by ID
GET  /api/field/agents/:id/transactions - Get agent transactions
PUT  /api/field/agents/:id/status      - Update agent status

GET  /api/field/transactions           - Get recent transactions
POST /api/field/transactions           - Create transaction (test)

GET  /api/field/stats                  - Get system statistics
POST /api/field/initialize             - Initialize sample data
```

### Health Check

```
GET  /health                           - Server health status
```

---

## 📊 Dashboard Features

### Real-time Stats
- Total Transactions: 3,247
- Success Rate: 97.2%
- Transaction Volume: ₩4.2M
- Active Agents: 8 / 8

### Agent List
- Name, Age, Region
- Spirit Score (0-5.0)
- Transaction Count
- Status (active/inactive)

### Recent Transactions
- Transaction ID
- Agent Name
- Amount (KRW)
- Status (success/failed)
- Latency (ms)

---

## 🔌 WebSocket Events

### Client → Server
```javascript
socket.emit('subscribe', { type: 'field-monitoring' });
```

### Server → Client
```javascript
// Stats update (every 5 seconds)
socket.on('statsUpdate', (data) => {
  console.log(data.stats);
});

// New transaction
socket.on('transaction', (transaction) => {
  console.log('New transaction:', transaction);
});

// Agent update
socket.on('agentUpdate', (agent) => {
  console.log('Agent updated:', agent);
});
```

---

## 📂 Project Structure

```
mulberry-mission-control/
├── models/
│   ├── Agent.js           # Agent model (147 elderly)
│   ├── Transaction.js     # Transaction model (3,247 tx)
│   └── SystemStat.js      # System stats model
├── scripts/
│   └── init-data.js       # Data initialization script
├── public/
│   └── index.html         # Real-time dashboard
├── server.js              # Main server (Express + Socket.IO)
├── package.json
├── .env.example
└── README.md
```

---

## 🎨 Data Models

### Agent
```javascript
{
  name: String,           // 김순자
  age: Number,            // 68
  region: String,         // 남면
  spiritScore: Number,    // 4.2 (0-5)
  transactions: Number,   // 127
  status: String,         // active/inactive/busy/offline
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  skills: [String]        // ['협상', '배송']
}
```

### Transaction
```javascript
{
  transactionId: String,  // TX-xxxxx
  agentId: ObjectId,
  amount: Number,         // 25000 (KRW)
  type: String,           // group_purchase
  status: String,         // success/failed/pending
  timestamp: Date,
  latency: Number,        // 170 (ms)
  paymentMethod: String,  // AP2/NH_Nonghyup
  product: {
    id: String,
    name: String,
    quantity: Number
  }
}
```

---

## 📈 Statistics (from Paper)

From "Social-Agentic Commerce" paper:

- **Transactions**: 3,247
- **Success Rate**: 97.2%
- **Total Volume**: ₩4.2M
- **Latency P50**: 170ms
- **Latency P95**: 280ms
- **Latency P99**: 340ms
- **Uptime**: 99.92%
- **Elderly Served**: 147
- **Food Access**: +148%
- **Cost Reduction**: -45%

---

## 🔧 Configuration

### MongoDB

**Local:**
```bash
# Start MongoDB
mongod

# Default connection
mongodb://localhost:27017/mulberry-mission-control
```

**MongoDB Atlas (Cloud):**
```bash
# Get connection string from Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mulberry
```

### Environment Variables

See `.env.example` for all options.

Key variables:
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (default: 5000)
- `SESSION_SECRET`: Session encryption key

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check MongoDB is running
mongod --version

# Start MongoDB
mongod

# Or check connection string
echo $MONGODB_URI
```

### Port Already in Use
```bash
# Use different port
PORT=5001 npm run dev
```

### WebSocket Not Connecting
- Check CORS settings in `server.js`
- Verify `CLIENT_URL` in `.env`
- Check firewall settings

---

## 🚀 Deployment

### Railway (Recommended)

1. Create Railway project
2. Add MongoDB plugin
3. Set environment variables:
   - `MONGODB_URI` (from Railway MongoDB)
   - `SESSION_SECRET`
4. Deploy:
```bash
railway up
```

### Heroku

```bash
# Login
heroku login

# Create app
heroku create mulberry-field-monitoring

# Add MongoDB
heroku addons:create mongolab

# Deploy
git push heroku main

# Initialize data
heroku run npm run init
```

---

## 📊 Next Features

### Phase 2 (Planned)
- [ ] Google Maps integration (agent locations)
- [ ] Real-time alerts (anomaly detection)
- [ ] Historical charts (performance trends)
- [ ] Export reports (CSV/PDF)

### Phase 3 (Future)
- [ ] Mobile app (React Native)
- [ ] Voice command integration
- [ ] AI predictions
- [ ] Raspberry Pi integration

---

## 👥 Team

- **CEO**: re.eul - Vision & Strategy
- **CTO**: Koda - Technical Implementation
- **PM**: Nguyen Trang - Operations
- **CSA**: Kbin - Legal & Compliance

---

## 📝 License

MIT License

---

## 🙏 Acknowledgments

- **Inje-gun residents**: 147 elderly participants
- **Agent operators**: 18 active agents
- **Paper**: "Social-Agentic Commerce for Food Desert Mitigation"

---

## 📞 Support

**Issues**: GitHub Issues
**Contact**: chongchongsaigon@gmail.com

---

**🌾 Mulberry Project**

**"One Team, One Mission"**

**Inje-gun, Gangwon-do, South Korea | 2026**

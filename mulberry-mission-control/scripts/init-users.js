/**
 * 초기 데이터 설정 스크립트
 * 
 * CEO, Core Team 사용자 생성
 * 기본 채널 생성 (# 일반, # 개발, # 운영, # 긴급, # 현장)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/User');
const Channel = require('../models/Channel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mulberry-mission-control';
const SALT_ROUNDS = 10;

async function initializeData() {
  try {
    // MongoDB 연결
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB connected');
    
    // ==================== 초기 사용자 생성 ====================
    
    console.log('\n📝 Creating initial users...');
    
    const initialUsers = [
      {
        username: 're.eul',
        email: 'chongchongsaigon@gmail.com',
        password: 'mulberry2026!',
        level: 5,
        role: 'CEO',
        displayName: 're.eul (CEO)',
        bio: 'Mulberry Project CEO'
      },
      {
        username: 'Koda',
        email: 'koda@mulberry.ai',
        password: 'koda2026!',
        level: 4,
        role: 'CTO',
        displayName: 'Koda (CTO)',
        bio: 'Chief Technology Officer'
      },
      {
        username: 'Trang',
        email: 'trang@mulberry.ai',
        password: 'trang2026!',
        level: 4,
        role: 'PM',
        displayName: 'Trang (PM)',
        bio: 'Project Manager'
      },
      {
        username: 'Kbin',
        email: 'kbin@mulberry.ai',
        password: 'kbin2026!',
        level: 4,
        role: 'CSA',
        displayName: 'Kbin (CSA)',
        bio: 'Customer Success Agent'
      }
    ];
    
    const createdUsers = [];
    
    for (const userData of initialUsers) {
      // 이미 존재하는지 확인
      const existing = await User.findOne({ email: userData.email });
      
      if (existing) {
        console.log(`⏭️  User already exists: ${userData.username}`);
        createdUsers.push(existing);
        continue;
      }
      
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      
      // 사용자 생성
      const user = new User({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        level: userData.level,
        role: userData.role,
        displayName: userData.displayName,
        bio: userData.bio,
        status: 'offline'
      });
      
      await user.save();
      createdUsers.push(user);
      
      console.log(`✅ Created user: ${userData.username} (${userData.role})`);
    }
    
    // ==================== 기본 채널 생성 ====================
    
    console.log('\n📝 Creating initial channels...');
    
    const ceoUser = createdUsers.find(u => u.role === 'CEO');
    
    const initialChannels = [
      {
        name: 'general',
        displayName: '일반',
        description: '전체 공지 및 일반 대화',
        type: 'public',
        minLevel: 0
      },
      {
        name: 'development',
        displayName: '개발',
        description: '개발 관련 논의',
        type: 'public',
        minLevel: 1
      },
      {
        name: 'operations',
        displayName: '운영',
        description: '운영 및 관리',
        type: 'public',
        minLevel: 4
      },
      {
        name: 'emergency',
        displayName: '긴급',
        description: '긴급 상황 대응',
        type: 'public',
        minLevel: 4
      },
      {
        name: 'field',
        displayName: '현장',
        description: '현장 모니터링 및 보고',
        type: 'public',
        minLevel: 3
      }
    ];
    
    for (const channelData of initialChannels) {
      // 이미 존재하는지 확인
      const existing = await Channel.findOne({ name: channelData.name });
      
      if (existing) {
        console.log(`⏭️  Channel already exists: #${channelData.name}`);
        continue;
      }
      
      // 채널 생성
      const channel = new Channel({
        name: channelData.name,
        displayName: channelData.displayName,
        description: channelData.description,
        type: channelData.type,
        minLevel: channelData.minLevel,
        createdBy: ceoUser._id,
        members: createdUsers
          .filter(u => u.level >= channelData.minLevel)
          .map(u => u._id),
        admins: [ceoUser._id],
        stats: {
          memberCount: createdUsers.filter(u => u.level >= channelData.minLevel).length
        }
      });
      
      await channel.save();
      
      console.log(`✅ Created channel: #${channelData.name} (Level ${channelData.minLevel}+)`);
    }
    
    // ==================== 완료 ====================
    
    console.log('\n🎉 Initialization completed!');
    console.log('\n📋 Created Users:');
    createdUsers.forEach(user => {
      console.log(`   - ${user.displayName} (${user.email})`);
    });
    
    console.log('\n📋 Created Channels:');
    const channels = await Channel.find();
    channels.forEach(channel => {
      console.log(`   - #${channel.name} (${channel.stats.memberCount} members)`);
    });
    
    console.log('\n🔐 Default Passwords:');
    console.log('   - re.eul: mulberry2026!');
    console.log('   - Koda: koda2026!');
    console.log('   - Trang: trang2026!');
    console.log('   - Kbin: kbin2026!');
    
    console.log('\n⚠️  Please change these passwords after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  initializeData();
}

module.exports = initializeData;

# 🌾 Mulberry Field Monitoring - QUICKSTART

**3분 만에 시작하기!**

---

## ⚡ 3분 시작

```bash
# 1. 프로젝트로 이동
cd mulberry-mission-control

# 2. 의존성 설치
npm install

# 3. 환경 설정
cp .env.example .env

# 4. 데이터 초기화 (MongoDB 실행 중이어야 함)
npm run init

# 5. 서버 시작
npm run dev
```

**완료!** → http://localhost:5000

---

## 📋 필수 요구사항

### 1. Node.js 설치
```bash
# 버전 확인
node --version  # v16+ 필요

# 없으면 설치: https://nodejs.org
```

### 2. MongoDB 설치

**Option A: 로컬 설치**
```bash
# macOS
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# 시작
mongod
```

**Option B: MongoDB Atlas (클라우드)**
1. https://mongodb.com/atlas 가입
2. 무료 클러스터 생성 (Seoul 선택)
3. Connection String 복사
4. `.env`에 입력:
```
MONGODB_URI=mongodb+srv://...
```

---

## 🎯 주요 명령어

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm start

# 데이터 초기화 (재실행 가능)
npm run init
```

---

## ✅ 확인사항

### 서버 시작 시 표시:
```
╔════════════════════════════════════════════╗
║  🌾 Mulberry Mission Control - Field      ║
║     Monitoring System                     ║
║                                           ║
║  Status: ✅ Running                       ║
║  Port: 5000                               ║
║  MongoDB: ✅ Connected                    ║
║                                           ║
║  WebSocket: ✅ Active                     ║
║                                           ║
║  🌾 One Team! 🌿                          ║
╚════════════════════════════════════════════╝
```

### 대시보드 확인:
1. 브라우저에서 `http://localhost:5000` 접속
2. 실시간 통계 표시 확인
3. 에이전트 목록 확인
4. 거래 내역 확인

---

## 🐛 문제 해결

### MongoDB 연결 실패
```bash
# MongoDB 실행 확인
mongod --version

# 시작
mongod
```

### Port 충돌
```bash
# 다른 포트 사용
PORT=5001 npm run dev
```

### 데이터 없음
```bash
# 데이터 재초기화
npm run init
```

---

## 📊 초기 데이터

초기화 후 생성되는 데이터:
- **에이전트**: 8명
- **거래**: 3,247건
- **성공률**: 97.2%
- **총 거래액**: ₩4.2M

---

## 🎉 완료!

이제 현장 모니터링 시스템이 준비되었습니다!

**다음 단계:**
1. 대시보드 탐색
2. 실시간 데이터 확인
3. API 테스트
4. 커스터마이징

---

**문제 발생 시:**
- README.md 참고
- GitHub Issues 등록
- CTO Koda에게 연락

**🌾 One Team! 🌿**

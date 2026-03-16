#!/bin/bash
# ============================================================
# 🌉 Mulberry Open API - 자동 Git 셋업 & Push 스크립트
# 대표님 실행용 - 원클릭 배포
# ============================================================

set -e

echo ""
echo "🌉 Mulberry Open API - Git 셋업 시작"
echo "============================================================"
echo ""

# 현재 디렉토리 확인
if [ ! -f "README.md" ]; then
    echo "❌ 오류: mulberry-open-api 디렉토리에서 실행해주세요"
    exit 1
fi

# ── STEP 1: Git 초기화 ──────────────────────────────────────
echo "📦 [1/6] Git 초기화..."

if [ ! -d ".git" ]; then
    git init
    echo "  ✅ Git 저장소 초기화 완료"
else
    echo "  ℹ️  이미 Git 저장소가 있습니다"
fi

# ── STEP 2: 원격 저장소 연결 ──────────────────────────────────
echo ""
echo "🔗 [2/6] GitHub 원격 저장소 연결..."

# 기존 origin 제거 (있다면)
git remote remove origin 2>/dev/null || true

# 새로운 origin 추가
git remote add origin https://github.com/wooriapt79/mulberry-open-api.git
echo "  ✅ 원격 저장소 연결 완료"

# ── STEP 3: 모든 파일 스테이징 ──────────────────────────────────
echo ""
echo "📂 [3/6] 파일 스테이징..."

git add .
echo "  ✅ 모든 파일 스테이징 완료"

git status --short | head -20
echo "  ... (총 $(git status --short | wc -l) 파일)"

# ── STEP 4: 커밋 생성 ──────────────────────────────────────────
echo ""
echo "💬 [4/6] 커밋 생성..."

git commit -m "feat: Mulberry Open API - Initial Release (v1.0.0)

🌉 AI Agent Ecosystem Hub - From Closed Ecosystem to Open Marketplace

[Phase 1 - Identity & Trust API]
- Agent Registration (POST /api/v1/agents/register)
- Spirit Score Query (GET /api/v1/agents/{id}/spirit-score)
- Identity Verification (POST /api/v1/agents/{id}/verify)

[Core Features]
- Flask Application Framework
- JWT + API Key Authentication
- Redis-based Rate Limiting
- MongoDB Integration
- Prometheus Monitoring
- Docker & CI/CD Ready

[Documentation]
- Complete API Architecture (60 pages)
- Deployment Guide
- SDK Examples (Python, Node.js)
- OpenAPI 3.0 Specification

[Infrastructure]
- Dockerfile & docker-compose.yml
- GitHub Actions CI/CD
- Railway Deployment Config
- Prometheus + Grafana Monitoring

Developed by: CTO Koda
Strategy by: PM (Passionate Mentor)
Project: Mulberry - Food Desert Zero Initiative

One Team! 🌿"

echo "  ✅ 커밋 완료"

# ── STEP 5: 브랜치 확인 및 설정 ────────────────────────────────
echo ""
echo "🌿 [5/6] 브랜치 설정..."

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo "  현재 브랜치: $CURRENT_BRANCH"

# main으로 브랜치 이름 변경 (필요시)
if [ "$CURRENT_BRANCH" != "main" ]; then
    git branch -M main
    echo "  ✅ 브랜치를 main으로 변경"
fi

# ── STEP 6: GitHub Push ────────────────────────────────────────
echo ""
echo "🚀 [6/6] GitHub Push..."
echo ""
echo "  ⚠️  GitHub 인증이 필요합니다"
echo "  📝 사용자명과 Personal Access Token을 입력하세요"
echo ""

# Push
git push -u origin main

echo ""
echo "============================================================"
echo "  🎉 Git 셋업 및 Push 완료!"
echo "  🔗 https://github.com/wooriapt79/mulberry-open-api"
echo "============================================================"
echo ""
echo "✅ 다음 단계:"
echo "  1. GitHub에서 저장소 확인"
echo "  2. .env 파일 설정 (cp .env.example .env)"
echo "  3. MongoDB URI 설정"
echo "  4. 서버 배포 (Railway/AWS)"
echo ""

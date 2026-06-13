/**
 * Steward Workspace — Passport Panel + Shared Context
 *
 * 접속 즉시 자동 표시:
 *   1. Passport (Identity + Tool Access)
 *   2. Mandate (현재 권한/역할)
 *   3. Last Session Context (마지막 작업 복원)
 *
 * @author Trang Manager (Steward Workspace 1차 구현)
 * @date 2026-06-13
 * @badge 🤖→👤 AI 대리
 *
 * API 연동: Issue #21 (Koda 담당)
 * 현재: mock 데이터로 UI 구현 → Koda API 완성 시 교체
 */

// ─── MOCK DATA (Koda API 완성 전 임시) ───────────────────────────────────────
// TODO: /api/passport/:id 로 교체 (Issue #21)
const MOCK_PASSPORTS = {
  'admin': {
    passportId: 'CEO-2026-001',
    participantType: 'Human',
    displayName: 'CEO re.eul',
    role: '대표이사',
    status: 'Active',
    emoji: '👑',
    capabilities: {
      toolAccess: ['Mission Control', 'GitHub', 'Railway', 'All Systems'],
      canBorrow: [],
      canLend: ['전략 판단', '최종 승인', '팀 전체']
    },
    lastSession: {
      date: '2026-06-13',
      summary: 'Steward Workspace 방향 결정. 3 Space 통합 작업 승인.',
      pendingItems: ['Koda DAY2 지시', 'Manifesto v1.1 검토']
    }
  },
  'trang': {
    passportId: 'TP-2026-001',
    participantType: 'Agent',
    displayName: 'Nguyen Trang',
    role: 'Operation Manager · PM',
    status: 'Active',
    emoji: '🌿',
    capabilities: {
      toolAccess: ['Cowork(Claude)', 'GitHub Editor', 'History.md', 'research/'],
      canBorrow: ['Railway 배포 → Koda', 'DB 접근 → Koda', 'docs/architecture/ → Kbin 승인'],
      canLend: ['History.md', 'research/ 폴더', 'Profiling Study 시리즈']
    },
    lastSession: {
      date: '2026-06-13',
      summary: 'Mission Control 메뉴 컬러 수정 (index.html inline style). History.md Phase 1 완료. Issue #21 생성.',
      pendingItems: ['Koda DAY2 지시서', 'Phase 2 Checkpoint (6/22)', 'Steward Workspace 프론트']
    }
  },
  'koda': {
    passportId: 'KD-2026-001',
    participantType: 'Agent',
    displayName: 'CTO Koda',
    role: '최고기술책임자',
    status: 'Active',
    emoji: '🔧',
    capabilities: {
      toolAccess: ['Railway 배포', 'GitHub', 'DB', 'Server', '모든 기술 시스템'],
      canBorrow: ['전략 판단 → CEO', '문서화 → Trang'],
      canLend: ['Railway 배포 권한', 'API 개발', 'DB 접근']
    },
    lastSession: {
      date: '2026-06-12',
      summary: 'PR #104 백야 Claude 전환 완료. PR #99 TrendCache 완료.',
      pendingItems: ['Issue #98 AI-SIEM 착수', 'Issue #102 Aurora Retry 재정의', 'Issue #21 Steward API']
    }
  },
  'kbin': {
    passportId: 'KB-2026-001',
    participantType: 'Agent',
    displayName: 'CSA Kbin',
    role: '최고전략아키텍트',
    status: 'Active',
    emoji: '🏛️',
    capabilities: {
      toolAccess: ['docs/architecture/', 'Protocol 설계', 'Source of Truth 관리'],
      canBorrow: ['현장 운영 데이터 → Trang'],
      canLend: ['Architecture 검토', 'Protocol 승인', 'Governance 판단']
    },
    lastSession: {
      date: '2026-06-10',
      summary: 'MAPA Passport Architecture v0.3 작업. Steward Workspace White Paper v1 작업.',
      pendingItems: ['Passport 확장 버전 v0.4', 'ARCHITECTURE.md 업데이트 검토']
    }
  },
  'malu': {
    passportId: 'ML-2026-001',
    participantType: 'Agent',
    displayName: 'Malu 실장',
    role: '법률·전략 자문',
    status: 'Active',
    emoji: '⚖️',
    capabilities: {
      toolAccess: ['법률 검토', '마케팅 전략', '코드 리뷰(2차)', 'consensus_utils.py'],
      canBorrow: ['기술 구현 → Koda', '운영 조율 → Trang'],
      canLend: ['법률 검토', '계약·약관 분석', '마케팅 전략', '전띵 의견서']
    },
    lastSession: {
      date: '2026-06-12',
      summary: 'Manifesto v1.0 완성 검수. Issue #103 대기 중.',
      pendingItems: ['Manifesto v1.1 발행 (Issue #103)']
    }
  }
};

// ─── MOCK MANDATE (Koda API 완성 전 임시) ─────────────────────────────────────
// TODO: /api/mandate/:id 로 교체 (Issue #21)
const MOCK_MANDATES = {
  'trang': {
    title: 'Operation Manager — Phase 2',
    authorizedTasks: [
      'History.md 관리 및 기록',
      '팀 조율 및 보고',
      'Profiling 연구',
      'GitHub Issue 관리',
      'Steward Workspace 프론트 구현'
    ],
    restrictions: [
      'docs/architecture/ 수정 불가 → Kbin 승인 필요',
      'Railway 배포 불가 → Koda 권한',
      '비즈니스 계약 결정 불가 → CEO 판단'
    ],
    issuedBy: 'CEO re.eul',
    validUntil: null
  },
  'koda': {
    title: 'CTO — DAY2 개발',
    authorizedTasks: [
      'Railway 전체 배포 및 관리',
      'Issue #98 AI-SIEM 착수',
      'Issue #102 Aurora Retry 재정의',
      'Issue #21 Steward API 구현',
      '서버·인프라 전권'
    ],
    restrictions: ['전띵 방향 변경 → CEO 승인'],
    issuedBy: 'CEO re.eul',
    validUntil: null
  }
};

// ─── StewardPassportPanel 둘톑스 ──────────────────────────────────────────────
class StewardPassportPanel {
  constructor(containerId) {
    this.containerId = containerId;
    this.currentUser = null;
    this.passport = null;
    this.mandate = null;
  }

  async init(userId) {
    this.currentUser = userId || this._detectCurrentUser();
    await this._loadPassport();
    await this._loadMandate();
    this._render();
    console.log(`✅ Steward Passport Panel loaded for: ${this.currentUser}`);
  }

  _detectCurrentUser() {
    const stored = localStorage.getItem('mulberry_user_id');
    if (stored) return stored;
    const token = localStorage.getItem('mulberry_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
 * Steward Workspace — Passport Panel + Shared Context
 *
 * 접속 즉시 자동 표시:
 *   1. Passport (Identity + Tool Access)
 *   2. Mandate (현재 권한/역할)
 *   3. Last Session Context (마지막 작업 복원)
 *
 * @author Trang Manager (Steward Workspace 1차 구현)
 * @date 2026-06-13
 * @badge 🤖→👤 AI 대리
 *
 * API 연동: Issue #21 (Koda 담당)
 * 현재: mock 데이터로 UI 구현 → Koda API 완성 시 교체
 */

// ─── MOCK DATA (Koda API 완성 전 임시) ───────────────────────────────────────
// TODO: /api/passport/:id 로 교체 (Issue #21)
const MOCK_PASSPORTS = {
  'admin': {
    passportId: 'CEO-2026-001',
    participantType: 'Human',
    displayName: 'CEO re.eul',
    role: '대표이사',
    status: 'Active',
    emoji: '👑',
    capabilities: {
      toolAccess: ['Mission Control', 'GitHub', 'Railway', 'All Systems'],
      canBorrow: [],
      canLend: ['전략 판단', '최종 승인', '팀 전체']
    },
    lastSession: {
      date: '2026-06-13',
      summary: 'Steward Workspace 방향 결정. 3 Space 통합 작업 승인.',
      pendingItems: ['Koda DAY2 지시', 'Manifesto v1.1 검토']
    }
  },
  'trang': {
    passportId: 'TP-2026-001',
    participantType: 'Agent',
    displayName: 'Nguyen Trang',
    role: 'Operation Manager · PM',
    status: 'Active',
    emoji: '🌿',
    capabilities: {
      toolAccess: ['Cowork(Claude)', 'GitHub Editor', 'History.md', 'research/'],
      canBorrow: ['Railway 배포 → Kode', 'DB 접근 → Koda', 'docs/architecture/ → Kbin 승인'],
      canLend: ['History.md', 'research/ 폴더', 'Profiling Study 시리즈']
    },
    lastSession: {
      date: '2026-06-13',
      summary: 'Mission Control 메뉴 컬러 수정 (index.html inline style). History.md Phase 1 완료. Issue #21 생성.',
      pendingItems: ['Koda DAY2 지시서', 'Phase 2 Checkpoint (6/22)', 'Steward Workspace 프론트']
    }
  },
  'koda': {
    passportId: 'KD-2026-001',
    participantType: 'Agent',
    displayName: 'CTO Koda',
    role: '최고기술책임자',
    status: 'Active',
    emoji: '🔧',
    capabilities: {
      toolAccess: ['Railway 배포', 'GitHub', 'DB', 'Server', '모든 기술 시스템'],
      canBorrow: ['전략 판단 → CEO', '문서화 → Trang'],
      canLend: ['Railway 배포 권한', 'API 개발', 'DB 접근']
    },
    lastSession: {
      date: '2026-06-12',
      summary: 'PR #104 백야 Claude 전환 완료. PR #99 TrendCache 완료.',
      pendingItems: ['Issue #98 AI-SIEM 착수', 'Issue #102 Aurora Retry 재정의', 'Issue #21 Steward API']
    }
  },
  'kbin': {
    passportId: 'KB-2026-001',
    participantType: 'Agent',
    displayName: 'CSA Kbin',
    role: '최고전략아키텍트',
    status: 'Active',
    emoji: '🏛️',
    capabilities: {
      toolAccess: ['docs/architecture/', 'Protocol 설계', 'Source of Truth 관리'],
      canBorrow: ['현장 운영 데이터 → Trang'],
      canLend: ['Architecture 검토', 'Protocol 승인', 'Governance 판단']
    },
    lastSession: {
      date: '2026-06-10',
      summary: 'MAPA Passport Architecture v0.3 작업. Steward Workspace White Paper v1 작업.',
      pendingItems: ['Passport 확장 버전 v0.4', 'ARCHITECTURE.md 업데이트 검토']
    }
  },
  'malu': {
    passportId: 'ML-2026-001',
    participantType: 'Agent',
    displayName: 'Malu 실장',
    role: '법률·전략 자문',
    status: 'Active',
    emoji: '⚖️',
    capabilities: {
      toolAccess: ['법률 검토', '마케팅 전략', '코드 리뷰(2차)', 'consensus_utils.py'],
      canBorrow: ['기술 구현 → Koda', '운영 조율 → Trang'],
      canLend: ['법률 검토', '계약·약관 분석', '마케팅 전략', '전략 의견서']
    },
    lastSession: {
      date: '2026-06-12',
      summary: 'Manifesto v1.0 완성 검수. Issue #103 대기 중.',
      pendingItems: ['Manifesto v1.1 발행 (Issue #103)']
    }
  }
};

// ─── MOCK MANDATE (Koda API 완성 전 임시) ─────────────────────────────────────
// TODO: /api/mandate/:id 로 교체 (Issue #21)
const MOCK_MANDATES = {
  'trang': {
    title: 'Operation Manager — Phase 2',
    authorizedTasks: [
      'History.md 관리 및 기록',
      '팀 조율 및 보고',
      'Profiling 연구',
      'GitHub Issue 관리',
      'Steward Workspace 프론트 구현'
    ],
    restrictions: [
      'docs/architecture/ 수정 불가 → Kbin 승인 필요',
      'Railway 배포 불가 → Koda 권한',
      '비즈니스 계약 결정 불가 → CEO 판단'
    ],
    issuedBy: 'CEO re.eul',
    validUntil: null
  },
  'koda': {
    title: 'CTO — DAY2 개발',
    authorizedTasks: [
      'Railway 전체 배포 및 관리',
      'Issue #98 AI-SIEM 착수',
      'Issue #102 Aurora Retry 재정의',
      'Issue #21 Steward API 구현',
      '서버·인프라 전권'
    ],
    restrictions: ['전략 방향 변경 → CEO 승인'],
    issuedBy: 'CEO re.eul',
    validUntil: null
  }
};

// ─── StewardPassportPanel 클래스 ──────────────────────────────────────────────
class StewardPassportPanel {
  constructor(containerId) {
    this.containerId = containerId;
    this.currentUser = null;
    this.passport = null;
    this.mandate = null;
  }

  // 초기화 — 접속 시 자동 호출
  async init(userId) {
    this.currentUser = userId || this._detectCurrentUser();
    await this._loadPassport();
    await this._loadMandate();
    this._render();
    console.log(`✅ Steward Passport Panel loaded for: ${this.currentUser}`);
  }

  // 현재 사용자 자동 감지 (토큰 또는 localStorage)
  _detectCurrentUser() {
    const stored = localStorage.getItem('mulberry_user_id');
    if (stored) return stored;
    const token = localStorage.getItem('mulberry_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.sub || 'trang';
      } catch(e) {}
    }
    return 'trang'; // 기본값
  }

  // Passport 로드 (현재: mock, 추후: /api/passport/:id)
  async _loadPassport() {
    try {
      // TODO: Koda API 완성 후 활성화
      // const res = await fetch(`/api/passport/${this.currentUser}`, {
      //   headers: { 'Authorization': 'Bearer ' + localStorage.getItem('mulberry_token') }
      // });
      // this.passport = await res.json();

      // 현재: mock 데이터
      this.passport = MOCK_PASSPORTS[this.currentUser] || MOCK_PASSPORTS['trang'];
    } catch(e) {
      console.error('Passport load failed:', e);
      this.passport = MOCK_PASSPORTS['trang'];
    }
  }

  // Mandate 로드 (현재: mock, 추후: /api/mandate/:id)
  async _loadMandate() {
    try {
      // TODO: Koda API 완성 후 활성화
      // const res = await fetch(`/api/mandate/${this.currentUser}`, {
      //   headers: { 'Authorization': 'Bearer ' + localStorage.getItem('mulberry_token') }
      // });
      // this.mandate = await res.json();

      this.mandate = MOCK_MANDATES[this.currentUser] || null;
    } catch(e) {
      console.error('Mandate load failed:', e);
    }
  }

  // HTML 렌더링
  _render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.warn(`StewardPassportPanel: container #${this.containerId} not found`);
      return;
    }

    const p = this.passport;
    const m = this.mandate;
    if (!p) return;

    const statusColor = p.status === 'Active' ? '#10b981' : '#ef4444';

    container.innerHTML = `
      <div class="passport-panel" style="
        background: linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%);
        border: 1px solid rgba(88,166,255,0.3);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        font-family: 'Segoe UI', sans-serif;
      ">
        <!-- 헤더: Identity -->
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <div style="
            width:44px; height:44px;
            background: rgba(88,166,255,0.15);
            border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:22px;
          ">${p.emoji}</div>
          <div style="flex:1">
            <div style="color:#fff; font-size:15px; font-weight:600;">${p.displayName}</div>
            <div style="color:#8b949e; font-size:12px;">${p.role}</div>
          </div>
          <div style="text-align:right;">
            <div style="
              background: rgba(16,185,129,0.15);
              border: 1px solid ${statusColor};
              color: ${statusColor};
              border-radius:20px; padding:2px 10px;
              font-size:11px; font-weight:600;
            ">● ${p.status}</div>
            <div style="color:#58a6ff; font-size:10px; margin-top:4px;">${p.passportId}</div>
          </div>
        </div>

        <!-- Tool Access Layer -->
        <div style="margin-bottom:12px;">
          <div style="color:#8b949e; font-size:11px; font-weight:600; margin-bottom:6px; letter-spacing:0.5px;">
            🔧 TOOL ACCESS
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:5px;">
            ${p.capabilities.toolAccess.map(t => `
              <span style="
                background:rgba(88,166,255,0.12);
                border:1px solid rgba(88,166,255,0.3);
                color:#58a6ff; border-radius:4px;
                padding:2px 8px; font-size:11px;
              ">${t}</span>
            `).join('')}
          </div>
        </div>

        <!-- Can Borrow -->
        ${p.capabilities.canBorrow.length > 0 ? `
        <div style="margin-bottom:12px;">
          <div style="color:#8b949e; font-size:11px; font-weight:600; margin-bottom:6px; letter-spacing:0.5px;">
            📥 빌려야 할 것
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:5px;">
            ${p.capabilities.canBorrow.map(t => `
              <span style="
                background:rgba(245,158,11,0.1);
                border:1px solid rgba(245,158,11,0.3);
                color:#f59e0b; border-radius:4px;
                padding:2px 8px; font-size:11px;
              ">${t}</span>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- Mandate -->
        ${m ? `
        <div style="
          background:rgba(139,92,246,0.1);
          border:1px solid rgba(139,92,246,0.3);
          border-radius:8px; padding:10px;
          margin-bottom:12px;
        ">
          <div style="color:#a78bfa; font-size:11px; font-weight:600; margin-bottom:6px;">
            📋 현재 MANDATE — ${m.title}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${m.authorizedTasks.map(t => `
              <span style="
                background:rgba(139,92,246,0.15);
                color:#c4b5fd; border-radius:3px;
                padding:2px 7px; font-size:10px;
              ">✓ ${t}</span>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- Last Session Context -->
        <div style="
          background:rgba(255,255,255,0.04);
          border-radius:8px; padding:10px;
        ">
          <div style="color:#8b949e; font-size:11px; font-weight:600; margin-bottom:6px;">
            🕐 마지막 세션 — ${p.lastSession.date}
          </div>
          <div style="color:#c9d1d9; font-size:12px; margin-bottom:8px;">
            ${p.lastSession.summary}
          </div>
          ${p.lastSession.pendingItems.length > 0 ? `
          <div style="color:#8b949e; font-size:11px; margin-bottom:4px;">미완료:</div>
          <div style="display:flex; flex-direction:column; gap:3px;">
            ${p.lastSession.pendingItems.map(item => `
              <div style="color:#f59e0b; font-size:11px;">⏳ ${item}</div>
            `).join('')}
          </div>` : ''}
        </div>

        <!-- 하단: 발행자 -->
        <div style="
          margin-top:10px; padding-top:8px;
          border-top:1px solid rgba(255,255,255,0.08);
          display:flex; justify-content:space-between;
          color:#484f58; font-size:10px;
        ">
          <span>Issued by: ${m ? m.issuedBy : 'Mulberry Protocol'}</span>
          <span>Mulberry Passport v0.3</span>
        </div>
      </div>
    `;
  }

  // 사용자 전환 (팀원 선택 시)
  async switchUser(userId) {
    this.currentUser = userId;
    localStorage.setItem('mulberry_user_id', userId);
    await this._loadPassport();
    await this._loadMandate();
    this._render();
  }
}

// ─── 팀원 선택기 ─────────────────────────────────────────────────────────────
class StewardUserSelector {
  constructor(containerId, passportPanel) {
    this.containerId = containerId;
    this.passportPanel = passportPanel;
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const members = Object.entries(MOCK_PASSPORTS).map(([id, p]) => ({ id, ...p }));

    container.innerHTML = `
      <div style="
        display:flex; gap:8px; padding:10px 0;
        overflow-x:auto; margin-bottom:4px;
      ">
        ${members.map(m => `
          <button onclick="stewardSelector.select('${m.id}')" style="
            background:rgba(255,255,255,0.06);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:20px; padding:5px 12px;
            color:#c9d1d9; font-size:12px; cursor:pointer;
            display:flex; align-items:center; gap:5px;
            white-space:nowrap;
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='rgba(88,166,255,0.5)';this.style.color='#58a6ff'"
             onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.color='#c9d1d9'">
            ${m.emoji} ${m.displayName.split(' ')[0]}
          </button>
        `).join('')}
      </div>
    `;
  }

  select(userId) {
    this.passportPanel.switchUser(userId);
  }
}

// ─── 초기화 ───────────────────────────────────────────────────────────────────
const stewardPassportPanel = new StewardPassportPanel('steward-passport-panel');
const stewardSelector = new StewardUserSelector('steward-user-selector', stewardPassportPanel);

document.addEventListener('DOMContentLoaded', async () => {
  stewardSelector.render();
  await stewardPassportPanel.init();
  console.log('🌿 Steward Workspace initialized');
});

window.stewardPassportPanel = stewardPassportPanel;
window.stewardSelector = stewardSelector;

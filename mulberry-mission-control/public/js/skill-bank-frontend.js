/**
 * Skill Bank - 스킬 카탈로그 시스템
 * 
 * 기능:
 * - 스킬 카탈로그 렌더링
 * - 스킬 검색/필터
 * - 스킬 설치/활성화
 * - 스킬 의존성 관리
 * 
 * @author CTO Koda
 * @date 2026-04-11
 */

const SKILL_API_BASE = window.location.origin;

// ==================== 스킬 카테고리 정의 ====================
const SKILL_CATEGORIES = {
  CORE: { id: 'core', name: '핵심 스킬', icon: '⭐', color: '#1f6feb' },
  AUTOMATION: { id: 'automation', name: '자동화', icon: '🤖', color: '#3fb950' },
  ANALYSIS: { id: 'analysis', name: '분석', icon: '📊', color: '#f85149' },
  COMMUNICATION: { id: 'communication', name: '커뮤니케이션', icon: '💬', color: '#ffa657' },
  INTEGRATION: { id: 'integration', name: '통합', icon: '🔗', color: '#a371f7' },
  UTILITY: { id: 'utility', name: '유틸리티', icon: '🛠️', color: '#8b949e' }
};

// ==================== 샘플 스킬 데이터 ====================
const SAMPLE_SKILLS = [
  {
    id: 'skill-001',
    name: 'Document Analysis',
    category: 'analysis',
    version: '2.1.0',
    author: 'KODA',
    description: '문서 분석 및 요약 생성',
    tags: ['pdf', 'docx', 'analysis', 'nlp'],
    status: 'active',
    installed: true,
    downloads: 1234,
    rating: 4.8,
    lastUpdated: '2026-04-10',
    dependencies: ['pdf-parser', 'nlp-engine'],
    icon: '📄'
  },
  {
    id: 'skill-002',
    name: 'Email Automation',
    category: 'automation',
    version: '1.5.2',
    author: 'LYNN',
    description: '이메일 자동 분류 및 응답',
    tags: ['email', 'automation', 'gmail'],
    status: 'active',
    installed: true,
    downloads: 892,
    rating: 4.6,
    lastUpdated: '2026-04-08',
    dependencies: ['gmail-api'],
    icon: '📧'
  },
  {
    id: 'skill-003',
    name: 'Data Visualization',
    category: 'analysis',
    version: '3.0.1',
    author: 'JUNIOR',
    description: '데이터 시각화 및 차트 생성',
    tags: ['chart', 'graph', 'visualization'],
    status: 'active',
    installed: false,
    downloads: 2156,
    rating: 4.9,
    lastUpdated: '2026-04-09',
    dependencies: ['d3', 'chart-js'],
    icon: '📈'
  },
  {
    id: 'skill-004',
    name: 'Slack Integration',
    category: 'integration',
    version: '2.0.0',
    author: 'TOBECORN',
    description: 'Slack 메시지 자동화',
    tags: ['slack', 'messaging', 'integration'],
    status: 'beta',
    installed: false,
    downloads: 567,
    rating: 4.5,
    lastUpdated: '2026-04-11',
    dependencies: ['slack-sdk'],
    icon: '💬'
  },
  {
    id: 'skill-005',
    name: 'Code Review Assistant',
    category: 'automation',
    version: '1.2.0',
    author: 'LYNN',
    description: '코드 리뷰 자동화 및 제안',
    tags: ['code', 'review', 'github'],
    status: 'active',
    installed: true,
    downloads: 1890,
    rating: 4.7,
    lastUpdated: '2026-04-07',
    dependencies: ['github-api', 'ast-parser'],
    icon: '👨‍💻'
  },
  {
    id: 'skill-006',
    name: 'Community Moderation',
    category: 'automation',
    version: '1.0.5',
    author: 'TOBECORN',
    description: '커뮤니티 게시물 자동 검토',
    tags: ['moderation', 'community', 'ai'],
    status: 'active',
    installed: true,
    downloads: 743,
    rating: 4.4,
    lastUpdated: '2026-04-06',
    dependencies: ['nlp-engine'],
    icon: '🛡️'
  },
  {
    id: 'skill-007',
    name: 'Price Monitor',
    category: 'utility',
    version: '2.3.1',
    author: 'BONGDAL',
    description: '가격 변동 모니터링 및 알림',
    tags: ['price', 'monitor', 'alert'],
    status: 'active',
    installed: false,
    downloads: 1023,
    rating: 4.3,
    lastUpdated: '2026-04-05',
    dependencies: ['web-scraper'],
    icon: '💰'
  },
  {
    id: 'skill-008',
    name: 'Meeting Scheduler',
    category: 'automation',
    version: '1.8.0',
    author: 'WARYONG',
    description: '회의 일정 자동 조정',
    tags: ['calendar', 'meeting', 'scheduling'],
    status: 'active',
    installed: false,
    downloads: 654,
    rating: 4.6,
    lastUpdated: '2026-04-04',
    dependencies: ['google-calendar-api'],
    icon: '📅'
  }
];

class SkillBank {
  constructor() {
    this.skills = [];
    this.filteredSkills = [];
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.sortBy = 'downloads';
  }
  
  async init() {
    console.log('🚀 Initializing Skill Bank...');
    
    await this.loadSkills();
    this.renderCategoryFilter();
    this.renderSkillCatalog();
    this.setupEventListeners();
    
    console.log('✅ Skill Bank initialized');
  }
  
  async loadSkills() {
    try {
      // API에서 스킬 로드 시도
      const response = await fetch(`${SKILL_API_BASE}/api/skills`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mulberry_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.skills = data.skills || SAMPLE_SKILLS;
      } else {
        // API 실패 시 샘플 데이터 사용
        this.skills = SAMPLE_SKILLS;
      }
      
    } catch (error) {
      console.log('Using sample skill data');
      this.skills = SAMPLE_SKILLS;
    }
    
    this.filteredSkills = [...this.skills];
  }
  
  renderCategoryFilter() {
    const container = document.getElementById('category-filter');
    if (!container) return;
    
    let html = `
      <div class="category-filters">
        <button class="category-btn ${this.selectedCategory === 'all' ? 'active' : ''}" 
                onclick="skillBank.filterByCategory('all')">
          🌐 All Skills (${this.skills.length})
        </button>
    `;
    
    Object.values(SKILL_CATEGORIES).forEach(category => {
      const count = this.skills.filter(s => s.category === category.id).length;
      html += `
        <button class="category-btn ${this.selectedCategory === category.id ? 'active' : ''}" 
                onclick="skillBank.filterByCategory('${category.id}')"
                style="--category-color: ${category.color}">
          ${category.icon} ${category.name} (${count})
        </button>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  renderSkillCatalog() {
    const container = document.getElementById('skill-catalog');
    if (!container) return;
    
    if (this.filteredSkills.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No skills found</h3>
          <p>Try adjusting your filters or search query</p>
        </div>
      `;
      return;
    }
    
    let html = '<div class="skill-grid">';
    
    this.filteredSkills.forEach(skill => {
      const category = SKILL_CATEGORIES[skill.category.toUpperCase()] || SKILL_CATEGORIES.UTILITY;
      const statusBadge = this.getStatusBadge(skill.status);
      
      html += `
        <div class="skill-card ${skill.installed ? 'installed' : ''}">
          <div class="skill-header">
            <div class="skill-icon">${skill.icon}</div>
            <div class="skill-meta">
              <span class="skill-category" style="background: ${category.color}22; color: ${category.color}">
                ${category.icon} ${category.name}
              </span>
              ${statusBadge}
            </div>
          </div>
          
          <div class="skill-body">
            <h3 class="skill-name">${skill.name}</h3>
            <p class="skill-description">${skill.description}</p>
            
            <div class="skill-tags">
              ${skill.tags.slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
            
            <div class="skill-stats">
              <div class="stat">
                <span class="stat-icon">⭐</span>
                <span class="stat-value">${skill.rating}</span>
              </div>
              <div class="stat">
                <span class="stat-icon">⬇️</span>
                <span class="stat-value">${this.formatNumber(skill.downloads)}</span>
              </div>
              <div class="stat">
                <span class="stat-icon">📦</span>
                <span class="stat-value">v${skill.version}</span>
              </div>
            </div>
          </div>
          
          <div class="skill-footer">
            <div class="skill-author">by ${skill.author}</div>
            <div class="skill-actions">
              ${skill.installed 
                ? `<button class="btn-secondary" onclick="skillBank.manageSkill('${skill.id}')">관리</button>`
                : `<button class="btn-primary" onclick="skillBank.installSkill('${skill.id}')">설치</button>`
              }
              <button class="btn-ghost" onclick="skillBank.showSkillDetails('${skill.id}')">상세</button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  getStatusBadge(status) {
    const badges = {
      active: '<span class="status-badge status-active">Active</span>',
      beta: '<span class="status-badge status-beta">Beta</span>',
      deprecated: '<span class="status-badge status-deprecated">Deprecated</span>'
    };
    
    return badges[status] || '';
  }
  
  filterByCategory(categoryId) {
    this.selectedCategory = categoryId;
    this.applyFilters();
    this.renderCategoryFilter();
    this.renderSkillCatalog();
  }
  
  searchSkills(query) {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
    this.renderSkillCatalog();
  }
  
  sortSkills(sortBy) {
    this.sortBy = sortBy;
    this.applyFilters();
    this.renderSkillCatalog();
  }
  
  applyFilters() {
    let filtered = [...this.skills];
    
    // Category filter
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === this.selectedCategory);
    }
    
    // Search filter
    if (this.searchQuery) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(this.searchQuery) ||
        s.description.toLowerCase().includes(this.searchQuery) ||
        s.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'downloads':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.lastUpdated) - new Date(a.lastUpdated);
        default:
          return 0;
      }
    });
    
    this.filteredSkills = filtered;
  }
  
  async installSkill(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    const confirmed = confirm(`Install "${skill.name}"?\n\nDependencies: ${skill.dependencies.join(', ')}`);
    if (!confirmed) return;
    
    try {
      // Show loading
      this.showNotification('Installing skill...', 'info');
      
      const response = await fetch(`${SKILL_API_BASE}/api/skills/${skillId}/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mulberry_token')}`
        }
      });
      
      if (response.ok) {
        skill.installed = true;
        this.renderSkillCatalog();
        this.showNotification(`"${skill.name}" installed successfully!`, 'success');
      } else {
        throw new Error('Installation failed');
      }
      
    } catch (error) {
      console.error('Install error:', error);
      this.showNotification('Installation failed. Please try again.', 'error');
    }
  }
  
  manageSkill(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    const action = prompt(`Manage "${skill.name}"\n\n1. Deactivate\n2. Uninstall\n3. Update\n\nEnter number:`);
    
    switch (action) {
      case '1':
        this.deactivateSkill(skillId);
        break;
      case '2':
        this.uninstallSkill(skillId);
        break;
      case '3':
        this.updateSkill(skillId);
        break;
    }
  }
  
  async uninstallSkill(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    const confirmed = confirm(`Uninstall "${skill.name}"?\n\nThis will remove all data and configurations.`);
    if (!confirmed) return;
    
    try {
      const response = await fetch(`${SKILL_API_BASE}/api/skills/${skillId}/uninstall`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mulberry_token')}`
        }
      });
      
      if (response.ok) {
        skill.installed = false;
        this.renderSkillCatalog();
        this.showNotification(`"${skill.name}" uninstalled`, 'success');
      }
      
    } catch (error) {
      console.error('Uninstall error:', error);
      this.showNotification('Uninstall failed', 'error');
    }
  }
  
  showSkillDetails(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    const modal = document.getElementById('skill-detail-modal');
    if (!modal) return;
    
    const category = SKILL_CATEGORIES[skill.category.toUpperCase()];
    
    modal.innerHTML = `
      <div class="modal-overlay" onclick="skillBank.closeModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="skill-icon-large">${skill.icon}</div>
            <div>
              <h2>${skill.name}</h2>
              <p class="skill-version">Version ${skill.version} by ${skill.author}</p>
            </div>
            <button class="modal-close" onclick="skillBank.closeModal()">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="detail-section">
              <h3>Description</h3>
              <p>${skill.description}</p>
            </div>
            
            <div class="detail-section">
              <h3>Category</h3>
              <span class="skill-category" style="background: ${category.color}22; color: ${category.color}">
                ${category.icon} ${category.name}
              </span>
            </div>
            
            <div class="detail-section">
              <h3>Tags</h3>
              <div class="skill-tags">
                ${skill.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
              </div>
            </div>
            
            <div class="detail-section">
              <h3>Dependencies</h3>
              <ul class="dependency-list">
                ${skill.dependencies.map(dep => `<li>${dep}</li>`).join('')}
              </ul>
            </div>
            
            <div class="detail-section">
              <h3>Stats</h3>
              <div class="skill-stats-detail">
                <div>⭐ Rating: ${skill.rating}/5.0</div>
                <div>⬇️ Downloads: ${this.formatNumber(skill.downloads)}</div>
                <div>📅 Last Updated: ${skill.lastUpdated}</div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            ${skill.installed 
              ? `<button class="btn-secondary" onclick="skillBank.manageSkill('${skill.id}')">관리</button>`
              : `<button class="btn-primary" onclick="skillBank.installSkill('${skill.id}')">설치</button>`
            }
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'block';
  }
  
  closeModal() {
    const modal = document.getElementById('skill-detail-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification notification-${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }
  
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
  
  setupEventListeners() {
    const searchInput = document.getElementById('skill-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchSkills(e.target.value);
      });
    }
    
    const sortSelect = document.getElementById('skill-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortSkills(e.target.value);
      });
    }
  }
}

const skillBank = new SkillBank();

document.addEventListener('DOMContentLoaded', () => {
  skillBank.init();
});

window.skillBank = skillBank;

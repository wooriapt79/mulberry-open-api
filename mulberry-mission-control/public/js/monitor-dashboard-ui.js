/**
 * Monitor Dashboard UI
 *
 * "Monitor" 메뉴 — KPI Metrics Overview(/api/v1/metrics/overview)를
 * 30초 주기로 폴링하여 그리드 카드로 표시하는 독립 대시보드.
 *
 * @author CTO Koda
 * @date 2026-06-15
 */

class MonitorDashboard {
  constructor() {
    this.container = null;
    this.pollTimer = null;
    this.pollIntervalMs = 30000;
  }

  init() {
    this.container = document.getElementById('monitor-dashboard-grid');
    if (!this.container) return;

    this.refresh();

    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.refresh(), this.pollIntervalMs);
  }

  destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async refresh() {
    if (!this.container) return;
    try {
      const res = await fetch('/api/v1/metrics/overview');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._render(data);
    } catch (err) {
      console.warn('MonitorDashboard refresh failed:', err.message);
      if (this.container.children.length === 0) {
        this.container.innerHTML = `
          <div style="color:#94a3b8;padding:20px;">
            &#x26a0;&#xfe0f; 메트릭을 불러올 수 없습니다. (${err.message})
          </div>`;
      }
    }
  }

  _render(data) {
    const cards = [
      { label: '활성 에이전트', value: data.active_agents ?? '-', color: '#60a5fa' },
      { label: '활성 커뮤니티', value: data.active_communities ?? '-', color: '#34d399' },
      { label: '리스크 알림', value: data.risk_alerts ?? '-', color: '#f87171' },
      { label: '오늘 거래 건수', value: data.transactions_today ?? '-', color: '#a78bfa' }
    ];

    const updated = data.last_updated_at
      ? new Date(data.last_updated_at).toLocaleTimeString()
      : new Date().toLocaleTimeString();

    this.container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
        ${cards.map(c => `
          <div style="background:#1a0f3a;border:1px solid #4c1d95;border-radius:12px;padding:20px;text-align:center;">
            <div style="font-size:2rem;font-weight:700;color:${c.color}">${c.value}</div>
            <div style="color:#94a3b8;margin-top:6px;font-size:0.85rem">${c.label}</div>
          </div>
        `).join('')}
      </div>
      <div style="color:#64748b;font-size:0.75rem;margin-top:12px;text-align:right;">
        마지막 갱신: ${updated} (30초마다 자동 갱신)
      </div>
    `;
  }
}

window.MonitorDashboard = MonitorDashboard;

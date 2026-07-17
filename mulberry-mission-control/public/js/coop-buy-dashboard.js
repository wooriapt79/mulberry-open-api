/**
 * coop-buy-dashboard.js — Co-op Buy 대시보드 패널
 * Issue #104 | KODA 구현 (2026-07-17)
 *
 * - 5개 품목 진행률 바 (GET /api/coop-status 연동)
 * - 30초 자동 갱신 + 수동 새로고침
 * - goal_reached 달성 시 축하 UI
 * - 기존 대시보드 레이아웃 유지
 */

(function CoopBuyDashboard() {
  'use strict';

  const PRODUCTS = ['p001', 'p002', 'p003', 'p004', 'p005'];
  const REFRESH_INTERVAL = 30_000;
  let _timer = null;

  // ─── 진행률 바 색상 ──────────────────────────
  function barColor(pct, status) {
    if (status === 'goal_reached') return '#10b981'; // 달성: 초록
    if (pct >= 80) return '#f59e0b';                 // 80%+: 앰버
    return '#7c3aed';                                // 기본: 보라
  }

  // ─── 품목별 카드 HTML ────────────────────────
  function buildCard(data) {
    const {
      product_id, name, status,
      current_qty, min_order_qty, unit,
      progress_pct, participant_count, days_remaining
    } = data;

    const isGoal = status === 'goal_reached';
    const pct    = progress_pct ?? 0;
    const color  = barColor(pct, status);

    const goalBanner = isGoal ? `
      <div style="
        text-align:center; padding:8px 0 2px;
        font-size:1.4rem; letter-spacing:2px;
        animation:coopCelebrate 0.6s ease infinite alternate;
      ">🎉</div>
      <div style="text-align:center;font-size:0.78rem;color:#10b981;font-weight:700;margin-bottom:6px;">
        목표 달성! 생산자 발주 진행 중
      </div>` : '';

    const daysLabel = days_remaining != null
      ? `<span style="color:#64748b;font-size:0.72rem;">D-${days_remaining}</span>`
      : '';

    return `
      <div class="coop-card" data-pid="${product_id}" style="
        background:#1a0f3a;
        border:1px solid ${isGoal ? 'rgba(16,185,129,0.5)' : 'rgba(124,58,237,0.25)'};
        border-radius:10px; padding:14px 16px; margin-bottom:10px;
        transition:border-color 0.3s;
      ">
        ${goalBanner}
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <span style="font-weight:700;color:#f1f5f9;font-size:0.9rem;">${name}</span>
          <span style="font-size:0.78rem;color:${color};font-weight:700;">${pct}%</span>
        </div>

        <!-- 진행률 바 -->
        <div style="
          height:6px; background:rgba(255,255,255,0.08);
          border-radius:3px; overflow:hidden; margin-bottom:8px;
        ">
          <div style="
            height:100%; width:${pct}%;
            background:${color};
            border-radius:3px;
            transition:width 0.6s ease;
            ${isGoal ? 'box-shadow:0 0 8px #10b981;' : ''}
          "></div>
        </div>

        <!-- 수치 행 -->
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:#64748b;">
          <span>${current_qty} / ${min_order_qty} ${unit}</span>
          <span style="display:flex;gap:10px;">
            <span>참여 ${participant_count}명</span>
            ${daysLabel}
          </span>
        </div>
      </div>
    `;
  }

  // ─── 에러 카드 ───────────────────────────────
  function buildErrorCard(product_id) {
    return `
      <div style="
        background:#1a0f3a; border:1px solid rgba(239,68,68,0.2);
        border-radius:10px; padding:12px 16px; margin-bottom:10px;
        color:#94a3b8; font-size:0.8rem;
      ">
        ${product_id} 데이터 로드 실패
      </div>`;
  }

  // ─── 단일 품목 fetch ─────────────────────────
  async function fetchStatus(product_id) {
    const r = await fetch(`/api/coop-status?product_id=${product_id}`);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  // ─── 전체 갱신 ──────────────────────────────
  async function refresh() {
    const container = document.getElementById('coop-products-list');
    if (!container) return;

    const btnRefresh = document.getElementById('coop-refresh-btn');
    if (btnRefresh) {
      btnRefresh.disabled = true;
      btnRefresh.textContent = '갱신 중...';
    }

    const results = await Promise.allSettled(PRODUCTS.map(fetchStatus));
    const html = results.map((r, i) =>
      r.status === 'fulfilled'
        ? buildCard(r.value)
        : buildErrorCard(PRODUCTS[i])
    ).join('');
    container.innerHTML = html;

    // 마지막 갱신 시각
    const tsEl = document.getElementById('coop-last-updated');
    if (tsEl) {
      tsEl.textContent = '갱신: ' + new Date().toLocaleTimeString('ko-KR');
    }

    if (btnRefresh) {
      btnRefresh.disabled = false;
      btnRefresh.textContent = '새로고침';
    }
  }

  // ─── 패널 HTML 주입 (section-coopbuy-active) ─
  function mountPanel() {
    const section = document.getElementById('section-coopbuy-active');
    if (!section) return;

    section.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="color:#a78bfa;font-size:0.85rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
          파일럿 공동구매 현황
        </span>
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="coop-last-updated" style="color:#475569;font-size:0.75rem;"></span>
          <button id="coop-refresh-btn" onclick="window.CoopBuyDashboard.refresh()" style="
            background:#1a0f3a; border:1px solid rgba(124,58,237,0.4);
            border-radius:6px; padding:5px 12px;
            color:#a78bfa; font-size:0.78rem; font-weight:600; cursor:pointer;
          ">새로고침</button>
        </div>
      </div>

      <div id="coop-products-list">
        <div style="color:#475569;font-size:0.83rem;padding:20px 0 10px;text-align:center;">
          데이터 로딩 중...
        </div>
      </div>

      <div style="
        margin-top:12px; padding:12px 14px;
        background:rgba(124,58,237,0.06);
        border-radius:8px; font-size:0.75rem; color:#64748b; line-height:1.7;
      ">
        인제군 파일럿 5개 품목 (감자·당근·쌀·배추·옥수수) | 30초 자동 갱신
      </div>
    `;

    // 첫 로드 + 자동 갱신 설정
    refresh();
    if (_timer) clearInterval(_timer);
    _timer = setInterval(refresh, REFRESH_INTERVAL);
  }

  // ─── 공개 API ────────────────────────────────
  window.CoopBuyDashboard = { refresh, mount: mountPanel };

  // ─── 🎉 애니메이션 CSS 주입 ──────────────────
  if (!document.getElementById('coop-keyframes')) {
    const style = document.createElement('style');
    style.id = 'coop-keyframes';
    style.textContent = `
      @keyframes coopCelebrate {
        from { transform: scale(1) rotate(-5deg); }
        to   { transform: scale(1.2) rotate(5deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── hashchange 기반 마운트 ──────────────────
  function onHashChange() {
    if (location.hash.includes('coopbuy')) {
      // section이 DOM에 있고 아직 패널이 주입 안 된 경우에만 마운트
      const section = document.getElementById('section-coopbuy-active');
      const already = document.getElementById('coop-products-list');
      if (section && !already) mountPanel();
    }
  }

  window.addEventListener('hashchange', onHashChange);

  // 페이지 로드 시 이미 coopbuy hash인 경우
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onHashChange);
  } else {
    onHashChange();
  }

})();

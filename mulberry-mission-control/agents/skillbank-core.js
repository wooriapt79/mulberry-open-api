/**
 * SkillBank Core - Mulberry Health Commerce
 * 이벤트 기반 동적 에이전트 생성 시스템
 * @author CTO Koda
 * @date 2026-03-28
 * @based_on research/mulberry_profiling_module.py (CEO re.eul)
 */

const mongoose = require('mongoose');

const SKILLS = {
  'SKL-001': { id: 'SKL-001', name: 'profiling_skill', description: '사용자 행동 패턴 분석 및 매슬로우 단계 판별', domain: 'profiling', dependencies: [] },
  'SKL-002': { id: 'SKL-002', name: 'negotiation_skill', description: '가격 협상 및 전략 수립', domain: 'negotiation', dependencies: ['SKL-001'] },
  'SKL-003': { id: 'SKL-003', name: 'health_recommend', description: '건강 데이터 기반 영양제 추천', domain: 'health', dependencies: ['SKL-001'] },
  'SKL-004': { id: 'SKL-004', name: 'order_trigger', description: '공동구매 자동 발주 트리거', domain: 'commerce', dependencies: ['SKL-002'] },
  'SKL-005': { id: 'SKL-005', name: 'sentiment_skill', description: '감성 분석 및 방언 처리', domain: 'communication', dependencies: [] },
  'SKL-006': { id: 'SKL-006', name: 'claim_mgmt_skill', description: '클레임 및 AS 처리', domain: 'customer_service', dependencies: ['SKL-005'] }
};

const EVENT_SKILL_MAPPING = {
  health_check: { maslow_1_2: ['SKL-001','SKL-003','SKL-004'], maslow_3_4: ['SKL-001','SKL-003','SKL-005'], maslow_5: ['SKL-001','SKL-003','SKL-005'] },
  purchase: { all: ['SKL-001','SKL-002','SKL-004'] },
  claim: { all: ['SKL-001','SKL-006','SKL-005'] },
  group_buy: { all: ['SKL-001','SKL-002','SKL-004','SKL-005'] },
  emergency: { all: ['SKL-001','SKL-005'] }
};

class SkillBank {
  constructor() { this.skills = SKILLS; this.eventMapping = EVENT_SKILL_MAPPING; }

  selectSkills(eventType, maslowLevel = 3) {
    if (!this.eventMapping[eventType]) return ['SKL-001'];
    const rules = this.eventMapping[eventType];
    let ids = rules.all || (maslowLevel <= 2 ? rules.maslow_1_2 : maslowLevel <= 4 ? rules.maslow_3_4 : rules.maslow_5) || ['SKL-001'];
    return this._resolveDependencies(ids);
  }

  _resolveDependencies(skillIds) {
    const resolved = new Set(), toProcess = [...skillIds];
    while (toProcess.length > 0) {
      const id = toProcess.pop();
      if (resolved.has(id)) continue;
      const skill = this.skills[id];
      if (!skill) continue;
      skill.dependencies.forEach(dep => { if (!resolved.has(dep)) toProcess.push(dep); });
      resolved.add(id);
    }
    return Array.from(resolved);
  }

  injectToAgent(agentId, skillIds, context = {}) {
    return {
      agentId, createdAt: new Date(),
      eventType: context.eventType || 'unknown',
      maslowLevel: context.maslowLevel || 3,
      skills: skillIds.map(id => ({ ...this.skills[id], injectedAt: new Date(), context })),
      skillIds, status: 'ready',
      metadata: { totalSkills: skillIds.length, primaryDomain: this._getPrimaryDomain(skillIds), capabilities: this._getCapabilities(skillIds) }
    };
  }

  _getPrimaryDomain(ids) {
    const d = {}; ids.forEach(id => { const s = this.skills[id]; if (s) d[s.domain] = (d[s.domain]||0)+1; });
    return Object.entries(d).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'general';
  }

  _getCapabilities(ids) { return ids.map(id => this.skills[id]).filter(Boolean).map(s => ({ skill: s.name, domain: s.domain, description: s.description })); }
  getSkillInfo(id) { return this.skills[id] || null; }
  getAllSkills() { return this.skills; }
  getSkillsByDomain(domain) { return Object.values(this.skills).filter(s => s.domain === domain); }
}

module.exports = SkillBank;

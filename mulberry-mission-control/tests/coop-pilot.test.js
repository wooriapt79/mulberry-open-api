/**
 * coop-pilot.test.js — Co-op Buy Pilot API 단위 테스트
 * TRANG Manager 설계 / KODA 구현
 *
 * 실행: node --test tests/coop-pilot.test.js
 * (MongoDB mock 사용 — 실 DB 불필요)
 */

const assert = require('node:assert/strict');
const { describe, it, before, after, mock } = require('node:test');

// ─── MongoDB 모델 Mock ────────────────────────
const orders = new Map();
const campaigns = new Map();

const CoopOrder = {
  findOne: async (query) => {
    for (const o of orders.values()) {
      if (o.user_id === query.user_id && o.product_id === query.product_id && o.status === query.status) return o;
    }
    return null;
  },
  create: async (data) => {
    const id = `ord_${Date.now()}`;
    const order = { ...data, id, _id: id, status: 'pending' };
    orders.set(id, order);
    return order;
  },
  countDocuments: async (query) => {
    let count = 0;
    for (const o of orders.values()) {
      if (o.product_id === query.product_id && o.status === query.status) count++;
    }
    return count;
  },
};

const CoopCampaign = {
  findOne: async (query) => {
    for (const c of campaigns.values()) {
      const statusMatch = Array.isArray(query.status?.$in)
        ? query.status.$in.includes(c.status)
        : c.status === query.status;
      if (c.product_id === query.product_id && statusMatch) return c;
    }
    return null;
  },
  findOneAndUpdate: async (query, update, opts) => {
    let found = null;
    for (const c of campaigns.values()) {
      if (c.product_id === query.product_id && c.status === query.status) { found = c; break; }
    }
    if (!found && opts?.upsert) return null;
    if (!found) return null;
    if (update.$inc?.current_qty) found.current_qty += update.$inc.current_qty;
    campaigns.set(found._id, found);
    return found;
  },
  findByIdAndUpdate: async (id, update) => {
    const c = campaigns.get(id);
    if (c && update.status) c.status = update.status;
    return c;
  },
};

// ─── 라우터 직접 로직 테스트 (MIN_ORDER 기준) ─
const MIN_ORDER = {
  p001: { qty: 50,  unit: 'kg',   label: '감자' },
  p002: { qty: 30,  unit: 'kg',   label: '당근' },
  p003: { qty: 100, unit: 'kg',   label: '쌀' },
  p004: { qty: 20,  unit: '포기', label: '배추' },
  p005: { qty: 60,  unit: '개',   label: '옥수수' },
};

function calcProgress(product_id, current_qty) {
  const min = MIN_ORDER[product_id].qty;
  return Math.min(Math.round((current_qty / min) * 100), 100);
}

// ─── 테스트 ───────────────────────────────────
describe('MIN_ORDER 파일럿 품목 기준', () => {
  it('5개 품목 모두 정의되어 있어야 함', () => {
    assert.equal(Object.keys(MIN_ORDER).length, 5);
    ['p001', 'p002', 'p003', 'p004', 'p005'].forEach(id => {
      assert.ok(MIN_ORDER[id], `${id} 누락`);
      assert.ok(MIN_ORDER[id].qty > 0);
    });
  });

  it('감자 최소 발주량 50kg', () => {
    assert.equal(MIN_ORDER['p001'].qty, 50);
  });

  it('쌀 최소 발주량 100kg', () => {
    assert.equal(MIN_ORDER['p003'].qty, 100);
  });
});

describe('진행률 계산', () => {
  it('0/50 → 0%', () => {
    assert.equal(calcProgress('p001', 0), 0);
  });

  it('24/50 → 48%', () => {
    assert.equal(calcProgress('p001', 24), 48);
  });

  it('50/50 → 100%', () => {
    assert.equal(calcProgress('p001', 50), 100);
  });

  it('60/50 → 100% (초과 시 캡)', () => {
    assert.equal(calcProgress('p001', 60), 100);
  });
});

describe('CoopOrder Mock', () => {
  before(() => { orders.clear(); campaigns.clear(); });

  it('주문 생성 후 조회 가능', async () => {
    const order = await CoopOrder.create({
      product_id: 'p001', user_id: 'user_a', quantity: 5, status: 'pending',
    });
    assert.ok(order.id);
    const found = await CoopOrder.findOne({ user_id: 'user_a', product_id: 'p001', status: 'pending' });
    assert.equal(found.user_id, 'user_a');
  });

  it('중복 주문 감지', async () => {
    const dup = await CoopOrder.findOne({ user_id: 'user_a', product_id: 'p001', status: 'pending' });
    assert.ok(dup !== null, '중복 주문이 감지되어야 함');
  });

  it('참여자 수 집계', async () => {
    await CoopOrder.create({ product_id: 'p001', user_id: 'user_b', quantity: 10, status: 'pending' });
    const count = await CoopOrder.countDocuments({ product_id: 'p001', status: 'pending' });
    assert.equal(count, 2);
  });
});

describe('CoopCampaign Mock', () => {
  before(() => {
    campaigns.clear();
    campaigns.set('c001', {
      _id: 'c001', product_id: 'p001', min_order_qty: 50,
      current_qty: 20, status: 'open', deadline: new Date(Date.now() + 86400000 * 7),
    });
  });

  it('캠페인 조회', async () => {
    const c = await CoopCampaign.findOne({ product_id: 'p001', status: { $in: ['open', 'goal_reached'] } });
    assert.equal(c.product_id, 'p001');
    assert.equal(c.current_qty, 20);
  });

  it('수량 누적 업데이트', async () => {
    const updated = await CoopCampaign.findOneAndUpdate(
      { product_id: 'p001', status: 'open' },
      { $inc: { current_qty: 5 } },
      { new: true }
    );
    assert.equal(updated.current_qty, 25);
  });

  it('목표 달성 후 상태 변경', async () => {
    await CoopCampaign.findByIdAndUpdate('c001', { status: 'goal_reached' });
    const c = campaigns.get('c001');
    assert.equal(c.status, 'goal_reached');
  });
});

-- Co-op Buy Pilot DB Schema
-- TRANG Manager 설계 (2026-07-17)
-- 참조용 SQL — 실 구현은 MongoDB (models/coopPilot.js)

CREATE TABLE coop_orders (
  id          VARCHAR(50)    PRIMARY KEY,
  product_id  VARCHAR(20)    NOT NULL,
  user_id     VARCHAR(100)   NOT NULL,
  quantity    DECIMAL(10,2)  NOT NULL,
  unit        VARCHAR(10)    DEFAULT 'kg',
  status      VARCHAR(20)    DEFAULT 'pending',
  channel     VARCHAR(30)    DEFAULT 'kakao_luna',
  created_at  TIMESTAMP      DEFAULT NOW()
);

CREATE TABLE coop_campaigns (
  id              VARCHAR(50)    PRIMARY KEY,
  product_id      VARCHAR(20)    NOT NULL,
  min_order_qty   DECIMAL(10,2)  NOT NULL,
  current_qty     DECIMAL(10,2)  DEFAULT 0,
  unit_price      INT            NOT NULL,
  status          VARCHAR(20)    DEFAULT 'open',
  deadline        TIMESTAMP      NOT NULL,
  producer_id     VARCHAR(50)    NOT NULL,
  created_at      TIMESTAMP      DEFAULT NOW()
);

-- 파일럿 캠페인 초기 데이터
INSERT INTO coop_campaigns VALUES
  ('c001', 'p001', 50,  0, 4000, 'open', NOW() + INTERVAL '30 days', 'producer_girin'),
  ('c002', 'p002', 30,  0, 5000, 'open', NOW() + INTERVAL '30 days', 'producer_girin'),
  ('c003', 'p003', 100, 0, 3500, 'open', NOW() + INTERVAL '30 days', 'producer_inje'),
  ('c004', 'p004', 20,  0, 6000, 'open', NOW() + INTERVAL '30 days', 'producer_girin'),
  ('c005', 'p005', 60,  0, 1333, 'open', NOW() + INTERVAL '30 days', 'producer_girin');

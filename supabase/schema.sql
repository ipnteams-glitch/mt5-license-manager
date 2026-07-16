-- MT5 License Manager — Supabase Migration
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members
CREATE TABLE members (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  package TEXT NOT NULL DEFAULT 'none',
  max_ports INTEGER NOT NULL DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  addon_ib_vps_expiry TIMESTAMPTZ,
  ib_vps_choice TEXT CHECK (ib_vps_choice IN ('1', '2'))
);

-- Ports
CREATE TABLE ports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_email TEXT NOT NULL REFERENCES members(email) ON DELETE CASCADE,
  mt5_account TEXT NOT NULL,
  mt5_broker TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ports_member ON ports(member_email);
CREATE INDEX idx_ports_account ON ports(mt5_account);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL REFERENCES members(email) ON DELETE CASCADE,
  package TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  satang NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  qr_payload TEXT,
  agent_code TEXT,
  agent_commission NUMERIC(12,2)
);
CREATE INDEX idx_payments_email ON payments(email);
CREATE INDEX idx_payments_agent ON payments(agent_code) WHERE agent_code IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);

-- Whitelist
CREATE TABLE whitelist (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  broker TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agents
CREATE TABLE agents (
  agent_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_vps_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_vps_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT ''
);

-- Agent Withdrawals
CREATE TABLE agent_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_code TEXT NOT NULL REFERENCES agents(agent_code) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX idx_wds_agent ON agent_withdrawals(agent_code);

-- Crypto Wallets
CREATE TABLE crypto_wallets (
  email TEXT PRIMARY KEY REFERENCES members(email) ON DELETE CASCADE,
  usdt_balance NUMERIC(12,6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crypto Topups
CREATE TABLE crypto_topups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL REFERENCES members(email) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('trc20', 'bep20', 'erc20')),
  wallet_address TEXT NOT NULL DEFAULT '',
  txid TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Portfolio
CREATE TABLE portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_email TEXT NOT NULL REFERENCES members(email) ON DELETE CASCADE,
  mt5_account TEXT NOT NULL,
  broker TEXT NOT NULL DEFAULT '',
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  floating_pl NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portfolio_email ON portfolio(member_email);

-- Brokers
CREATE TABLE brokers (
  broker TEXT PRIMARY KEY
);

-- Port Systems
CREATE TABLE port_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  port_id TEXT NOT NULL,
  member_email TEXT NOT NULL,
  mt5_account TEXT NOT NULL DEFAULT '',
  systems TEXT NOT NULL DEFAULT '',
  password TEXT DEFAULT '',
  broker TEXT DEFAULT '',
  multiplier TEXT DEFAULT '1.0',
  vps_id TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  heartbeat TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (server-side uses service_role key → bypasses RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_systems ENABLE ROW LEVEL SECURITY;

-- Default brokers
INSERT INTO brokers (broker) VALUES
  ('InterstellarFinancial-Demo'),('InterstellarFinancial-Main'),
  ('TPTradesGroup-Demo'),('VTMarkets-Demo'),('VTMarkets-Live'),
  ('Exness-Real'),('ICMarkets-Demo'),('ICMarkets-Live'),
  ('Tickmill-Demo'),('Pepperstone-Demo');

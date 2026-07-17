-- Run all in Supabase SQL Editor  
  
ALTER TABLE agents ADD COLUMN parent_code TEXT REFERENCES agents(agent_code) ON DELETE SET NULL;  
  
CREATE TABLE commissions (  
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  
  agent_code TEXT NOT NULL REFERENCES agents(agent_code) ON DELETE CASCADE,  
  amount NUMERIC(12,2) NOT NULL,  
  level INTEGER NOT NULL DEFAULT 1,  
  source TEXT DEFAULT 'direct',  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()  
);  
CREATE INDEX idx_comm_agent ON commissions(agent_code);  
CREATE INDEX idx_comm_created ON commissions(created_at);  
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;  

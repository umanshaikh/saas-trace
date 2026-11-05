-- ========================================================
-- TRACE PLATFORM — ONBOARDING PROGRESS SCHEMA
-- Multi-Tenant Shop Onboarding & Step Progress Tracking
-- ========================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 1,
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  step_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

-- Index for instant lookup by shop and user
CREATE INDEX IF NOT EXISTS idx_onboarding_user_shop ON onboarding_progress(user_id, shop_id);

-- Row Level Security
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on onboarding_progress"
  ON onboarding_progress FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on onboarding_progress"
  ON onboarding_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on onboarding_progress"
  ON onboarding_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);

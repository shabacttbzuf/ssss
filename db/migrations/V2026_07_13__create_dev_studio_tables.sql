-- V2026_07_13__create_dev_studio_tables.sql
-- Non-destructive migration for Developer Studio feature (Release 1.3)

-- Create settings table for storing key/value JSON config per owner
CREATE TABLE IF NOT EXISTS dev_studio_settings (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_studio_settings_owner_id ON dev_studio_settings(owner_id);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',
  content_json JSONB NOT NULL DEFAULT '{}',
  owner_id BIGINT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  tenant_id BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_owner_id ON templates(owner_id);

-- Plugins table
CREATE TABLE IF NOT EXISTS plugins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  manifest_json JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT FALSE,
  version TEXT DEFAULT '0.1',
  owner_id BIGINT NOT NULL,
  tenant_id BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plugins_owner_id ON plugins(owner_id);

-- Backups metadata
CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL,
  path TEXT NOT NULL,
  checksum TEXT,
  size_bytes BIGINT DEFAULT 0,
  type TEXT DEFAULT 'full',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backups_owner_id ON backups(owner_id);

-- Impersonation audit log
CREATE TABLE IF NOT EXISTS impersonation_logs (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL,
  target_user_id BIGINT NOT NULL,
  reason TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_imp_logs_owner_id ON impersonation_logs(owner_id);

-- Module toggles
CREATE TABLE IF NOT EXISTS module_toggles (
  module_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  owner_id BIGINT NOT NULL,
  tenant_id BIGINT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Licensing table (basic)
CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL,
  license_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add optional columns to existing tables if needed (non-destructive)
-- Example: add force_password_change to users if not exists (commented until verified)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

-- Migration complete


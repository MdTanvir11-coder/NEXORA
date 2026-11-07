-- NEXORA TECHNOLOGIES — Neon PostgreSQL schema
-- Run once in Neon Console -> SQL Editor. (The API also creates it automatically if missing.)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(80)   NOT NULL,
  email         VARCHAR(120)  NOT NULL,
  phone         VARCHAR(40),
  package       VARCHAR(120),
  message       TEXT          NOT NULL,
  fingerprint   CHAR(64)      NOT NULL,
  ip_hash       CHAR(64),
  user_agent    VARCHAR(300),
  is_read       BOOLEAN       NOT NULL DEFAULT FALSE,
  email_sent    BOOLEAN       NOT NULL DEFAULT FALSE,
  email_error   VARCHAR(300),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiries_created_at_idx  ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_fingerprint_idx ON inquiries (fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_ip_idx          ON inquiries (ip_hash, created_at DESC);

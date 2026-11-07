'use strict';
const { neon } = require('@neondatabase/serverless');

let sql = null;
let ready = null;

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  if (!sql) sql = neon(url);
  return sql;
}

// Creates the table if it does not exist yet (same as db/schema.sql). Runs once per cold start.
function ensureSchema() {
  if (!ready) {
    const q = getSql();
    ready = (async () => {
      await q`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await q`CREATE TABLE IF NOT EXISTS inquiries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(80) NOT NULL,
        email VARCHAR(120) NOT NULL,
        phone VARCHAR(40),
        package VARCHAR(120),
        message TEXT NOT NULL,
        fingerprint CHAR(64) NOT NULL,
        ip_hash CHAR(64),
        user_agent VARCHAR(300),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        email_error VARCHAR(300),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await q`CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC)`;
      await q`CREATE INDEX IF NOT EXISTS inquiries_fingerprint_idx ON inquiries (fingerprint, created_at DESC)`;
      await q`CREATE INDEX IF NOT EXISTS inquiries_ip_idx ON inquiries (ip_hash, created_at DESC)`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

module.exports = { getSql, ensureSchema };

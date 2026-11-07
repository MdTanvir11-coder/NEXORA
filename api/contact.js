'use strict';
const crypto = require('crypto');
const { getSql, ensureSchema } = require('./_lib/db');
const { sendAdminNotification } = require('./_lib/mail');
const { sameOrigin, send, readJson, clientIp } = require('./_lib/http');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
// remove control characters, normalise whitespace; keep newlines for the message
const clean = (v, max, multiline) => {
  let s = String(v == null ? '' : v).normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = multiline ? s.replace(/\r\n?/g, '\n').replace(/\n{4,}/g, '\n\n\n') : s.replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
};
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{5,40}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, error: 'Method not allowed' }); }
  if (!sameOrigin(req)) return send(res, 403, { ok: false, error: 'Forbidden' });

  let body;
  try { body = await readJson(req); } catch (e) { return send(res, 400, { ok: false, error: 'Invalid request' }); }

  // Spam: honeypot filled, or submitted impossibly fast -> pretend success, store nothing
  if (clean(body.website, 200) || (Number(body.elapsed) >= 0 && Number(body.elapsed) < 1500)) {
    return send(res, 200, { ok: true });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  const phone = clean(body.phone, 40);
  const pkg = clean(body.pkg, 120);
  const message = clean(body.msg, 2000, true);

  if (!name || !message || !EMAIL_RE.test(email) || (phone && !PHONE_RE.test(phone))) {
    return send(res, 400, { ok: false, error: 'invalid' });
  }
  // crude link-spam filter
  if ((message.match(/https?:\/\//gi) || []).length > 3) return send(res, 200, { ok: true });

  try {
    await ensureSchema();
    const sql = getSql();
    const ipHash = sha('nx:' + clientIp(req));
    const fingerprint = sha(email + '\n' + message.toLowerCase());
    const ua = clean(req.headers['user-agent'], 300);

    // Rate limit per visitor + duplicate check in one query
    const [stat] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '10 minutes')::int AS recent,
        COUNT(*) FILTER (WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 day')::int AS daily,
        COUNT(*) FILTER (WHERE fingerprint = ${fingerprint} AND created_at > NOW() - INTERVAL '1 day')::int AS dupes
      FROM inquiries`;
    if (stat.dupes > 0) return send(res, 200, { ok: true, duplicate: true }); // already saved & notified
    if (stat.recent >= 3 || stat.daily >= 10) return send(res, 429, { ok: false, error: 'rate' });

    const [row] = await sql`
      INSERT INTO inquiries (name, email, phone, package, message, fingerprint, ip_hash, user_agent)
      VALUES (${name}, ${email}, ${phone || null}, ${pkg || null}, ${message}, ${fingerprint}, ${ipHash}, ${ua || null})
      RETURNING id, created_at`;

    // Inquiry is safely stored. Email is best-effort and can never undo the save.
    try {
      await sendAdminNotification({ name, email, phone, pkg, message, createdAt: row.created_at });
      await sql`UPDATE inquiries SET email_sent = TRUE WHERE id = ${row.id}`;
    } catch (mailErr) {
      console.error('Admin email failed:', mailErr && mailErr.message);
      try { await sql`UPDATE inquiries SET email_error = ${String(mailErr && mailErr.message).slice(0, 300)} WHERE id = ${row.id}`; } catch (e) {}
    }
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('Contact API error:', e && e.message);
    return send(res, 500, { ok: false, error: 'server' });
  }
};

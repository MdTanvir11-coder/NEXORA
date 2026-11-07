'use strict';
const { getSql, ensureSchema } = require('./_lib/db');
const { requireAdmin } = require('./_lib/auth');
const { sameOrigin, send } = require('./_lib/http');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (!sameOrigin(req)) return send(res, 403, { ok: false });
  if (!requireAdmin(req)) return send(res, 401, { ok: false, error: 'unauthorized' });
  try {
    await ensureSchema();
    const sql = getSql();
    const id = new URL(req.url, 'http://x').searchParams.get('id');

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, name, email, phone, package, message, is_read,
               (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS t
        FROM inquiries ORDER BY created_at DESC LIMIT 500`;
      return send(res, 200, {
        ok: true,
        inquiries: rows.map((r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone || '', pkg: r.package || '', msg: r.message, t: Number(r.t), read: r.is_read }))
      });
    }
    if (!id || !UUID_RE.test(id)) return send(res, 400, { ok: false });
    if (req.method === 'PATCH') { await sql`UPDATE inquiries SET is_read = TRUE WHERE id = ${id}`; return send(res, 200, { ok: true }); }
    if (req.method === 'DELETE') { await sql`DELETE FROM inquiries WHERE id = ${id}`; return send(res, 200, { ok: true }); }
    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return send(res, 405, { ok: false });
  } catch (e) {
    console.error('Inquiries API error:', e && e.message);
    return send(res, 500, { ok: false, error: 'server' });
  }
};

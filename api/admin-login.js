'use strict';
const { passwordOk, issueToken } = require('./_lib/auth');
const { sameOrigin, send, readJson } = require('./_lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false }); }
  if (!sameOrigin(req)) return send(res, 403, { ok: false });
  if (!process.env.ADMIN_PASSWORD) return send(res, 503, { ok: false, error: 'ADMIN_PASSWORD is not configured' });
  let body;
  try { body = await readJson(req, 2000); } catch (e) { return send(res, 400, { ok: false }); }
  if (!passwordOk(body.password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return send(res, 401, { ok: false });
  }
  return send(res, 200, { ok: true, token: issueToken() });
};

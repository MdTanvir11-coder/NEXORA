'use strict';
const crypto = require('crypto');

const TTL_MS = 30 * 60 * 1000; // matches the dashboard's 30-minute idle timeout

const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function passwordOk(pw) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof pw !== 'string') return false;
  return crypto.timingSafeEqual(sha(pw), sha(expected));
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function issueToken() {
  const exp = String(Date.now() + TTL_MS);
  return exp + '.' + sign(exp);
}

function verifyToken(token) {
  if (!secret() || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req) {
  const h = req.headers.authorization || '';
  return verifyToken(h.startsWith('Bearer ') ? h.slice(7) : '');
}

module.exports = { passwordOk, issueToken, verifyToken, requireAdmin };

'use strict';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Sends the admin notification through Resend's HTTPS API. Throws on failure; caller must catch.
async function sendAdminNotification(i) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL || 'nexoratechnologies682@gmail.com';
  const from = process.env.MAIL_FROM || 'NEXORA Website <onboarding@resend.dev>';
  if (!key) throw new Error('RESEND_API_KEY is not configured');

  const when = new Date(i.createdAt).toUTCString();
  const subject = ('New website inquiry from ' + i.name).replace(/[\r\n]+/g, ' ').slice(0, 150);
  const text = [
    'New inquiry received on NEXORA TECHNOLOGIES website', '',
    'Name: ' + i.name,
    'Email: ' + i.email,
    i.phone ? 'Phone: ' + i.phone : null,
    'Service/Package: ' + (i.pkg || 'Not specified'),
    'Submitted: ' + when, '',
    'Message:', i.message
  ].filter((x) => x !== null).join('\n');
  const row = (k, v) => `<tr><td style="padding:6px 14px 6px 0;color:#667;vertical-align:top"><b>${k}</b></td><td style="padding:6px 0">${v}</td></tr>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;max-width:620px">
<h2 style="margin:0 0 14px">New website inquiry</h2>
<table style="border-collapse:collapse">${row('Name', esc(i.name))}${row('Email', `<a href="mailto:${esc(i.email)}">${esc(i.email)}</a>`)}${i.phone ? row('Phone', esc(i.phone)) : ''}${row('Service/Package', esc(i.pkg || 'Not specified'))}${row('Submitted', esc(when))}</table>
<p style="margin:18px 0 6px"><b>Message</b></p>
<div style="white-space:pre-wrap;background:#f4f6fa;border-radius:8px;padding:14px">${esc(i.message)}</div>
<p style="color:#889;font-size:12px;margin-top:18px">Reply directly to this email to respond to the visitor.</p></div>`;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: i.email, subject, text, html }),
      signal: ctl.signal
    });
    if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 200));
  } finally { clearTimeout(timer); }
}

module.exports = { sendAdminNotification };

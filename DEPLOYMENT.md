# NEXORA — Neon + Email setup

## 1. Neon
1. Create a project at https://neon.tech. Copy the **pooled** connection string (Connect → Pooled connection).
2. (Optional) Run `db/schema.sql` in Neon → SQL Editor. The API also creates the table automatically on first use.

## 2. Email (Resend)
1. Sign up at https://resend.com **using nexoratechnologies682@gmail.com**.
2. API Keys → Create key → copy it.
3. With the default sender `onboarding@resend.dev`, Resend only delivers to your own account email — which is exactly the admin address. To send from your own domain, verify it in Resend and change `MAIL_FROM`.

## 3. Vercel environment variables (Settings → Environment Variables, all environments)
| Name | Value |
|---|---|
| DATABASE_URL | Neon pooled connection string |
| RESEND_API_KEY | Resend API key |
| ADMIN_NOTIFY_EMAIL | nexoratechnologies682@gmail.com |
| MAIL_FROM | NEXORA Website <onboarding@resend.dev> |
| ADMIN_PASSWORD | Same password you use in the existing "Owner login" |
| ADMIN_SESSION_SECRET | (optional) long random string |

## 4. Deploy
Push this folder to GitHub and import it in Vercel (Framework: Other, no build command, output directory blank), or run `vercel --prod`. Redeploy after changing env vars.

## 5. Test
Submit the contact form → row appears in Neon (`SELECT * FROM inquiries ORDER BY created_at DESC;`) → email arrives. Check `email_sent` / `email_error` columns if no email came.

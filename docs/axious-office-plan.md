# Axious Office: backend, payments & email plan

**Domain:** `office.axiouscreativestudio.co.za` · **Hosting:** Vercel · **Backend:** Vercel serverless functions + Supabase · **Payments:** Yoco · **Email:** Brevo

## Goals
1. Keep the PDF tools and the CV builder **free, with no login**, running in the browser as they do now.
2. Make **Invoices & Quotes** a paid monthly feature, with accounts and saved documents.
3. Let users **email invoices and quotes to their clients** through Brevo.
4. Let those clients **pay invoices online** ("Pay now"), and let users pay their own subscription, both through Yoco.
5. Keep all secret keys on the server only, in Vercel environment variables.

## Architecture

```
Browser (static site on Vercel)
  ├─ free PDF / CV tools ── run locally, no server
  └─ Invoices & Quotes ── Supabase Auth (login) + /api/* calls
                                   │
Vercel serverless functions (/api)  ← secret keys live here
  ├─ Supabase (service role) ── Postgres + Storage (logos)
  ├─ Yoco Checkout API ── subscription payments + client "Pay now"
  ├─ Brevo API ── transactional emails
  └─ Vercel Cron ── daily reminders (overdue invoices, renewals)
```

### Environment variables (set in Vercel → Settings → Environment Variables)
| Name | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Public; the anon key is safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: full database access |
| `YOCO_SECRET_KEY` | Server only: Axious's own Yoco account, for subscriptions |
| `YOCO_WEBHOOK_SECRET` | Server only: verifies Yoco webhook signatures |
| `BREVO_API_KEY` | Server only: sends email |
| `ENCRYPTION_KEY` | Server only: encrypts users' own Yoco keys (AES-256-GCM) |
| `APP_URL` | `https://office.axiouscreativestudio.co.za` |

Keep separate **test** and **live** keys. Use Vercel Preview for test and Production for live.

## Database (Supabase Postgres, row-level security on every table)
| Table | Key columns |
|---|---|
| `profiles` | `id` (= auth user), business name/address/VAT/reg no., logo URL, bank details, `plan` (`free`/`pro`), `plan_expires_at` |
| `clients` | `user_id`, name, email, phone, address, VAT no. |
| `documents` | `user_id`, `type` (invoice/quote), `number`, `status` (draft, sent, viewed, accepted, declined, paid, overdue), `data` (JSON of the editor state, same shape as the current `invoice.js` draft), `total`, `currency`, `due_date`, `public_token` |
| `payments` | `kind` (subscription / invoice), `user_id`, `document_id`, `yoco_checkout_id`, `amount`, `status`, `paid_at` |
| `merchant_settings` | `user_id`, encrypted Yoco secret key, `webhook_id` |
| `email_log` | `document_id`, `to`, `template`, Brevo message id, `status` |

Logos go in a Supabase Storage bucket, `logos/`. Each user can access only their own folder.

## Payments with Yoco: what's different
Yoco's online Checkout API takes **single payments**. It has no built-in recurring subscriptions, and no marketplace "split payments" that pay money out to other businesses. The design works around both:

### A. Subscription (your users pay Axious)
- Sell a **30-day "Pro" pass**, for example R99, through Yoco Checkout on **Axious's** Yoco account.
- When Yoco's `payment.succeeded` webhook arrives, set `plan_expires_at = max(now, plan_expires_at) + 30 days`.
- **Brevo reminder** 5 days before expiry and on the expiry day, with a one-click renew link.
- After expiry, saved documents stay readable. Creating or sending new invoices is locked until they renew.
- Before building, ask Yoco support whether recurring billing is available on your merchant account. If it is, we switch to it and drop the manual renewals.

### B. "Pay now" for your users' clients (money goes to your user)
- Each Pro user connects **their own Yoco account** in Settings by pasting their Yoco secret key.
  - The server encrypts the key with `ENCRYPTION_KEY` and never sends it back to the browser.
  - When the key is saved, the server registers a webhook on that Yoco account, pointing at `/api/yoco/webhook/:userId`.
- An invoice's public page (`/i/:token`) shows a **Pay now** button.
  - `/api/pay/:token` creates a checkout using the user's own key, so the money lands in the user's Yoco account and Axious never touches it.
- When the webhook confirms payment:
  - The invoice is marked **paid**.
  - Brevo emails a receipt to the client and a "you've been paid" notice to the user.
- Users without Yoco still have **banking details** (EFT) on the invoice, as now.

## Email with Brevo
First verify the sender domain **axiouscreativestudio.co.za** in Brevo by adding its SPF and DKIM DNS records. Without that, emails land in spam. Send from something like `office@axiouscreativestudio.co.za`, with **Reply-To set to the user's own email**.

Transactional templates:
1. **Invoice sent:** PDF attached, plus a "View & pay" link.
2. **Quote sent:** PDF attached, plus a "View, accept or decline" link. The user is notified when the client accepts or declines.
3. **Payment received:** a receipt to the client and a notice to the user.
4. **Overdue reminder:** run by a daily Vercel Cron, for example at 3 and 7 days overdue. The user can turn it off per invoice.
5. **Subscription:** welcome, renewal reminder and expired.

The PDF is still made in the browser, using the current `exportA4`. It's uploaded with the send request and attached by the server, so no server-side PDF engine is needed.

## Pages and flows
- `/` as today, with free tools that need no login.
- `/#invoice`: the editor. Without login it can still preview with a "Pro" watermark. Logging in unlocks Save, Send and Pay-now.
- **Dashboard:** lists invoices and quotes by status, the client list, and duplicating a document or converting a quote to an invoice.
- **Settings:** business profile, logo, banking details, connect Yoco, and subscription.
- **Public client page** `/i/:token`: view the invoice or quote, Pay now, Accept or Decline, and download the PDF.

## Security and compliance
- Secret keys stay only in Vercel env vars. The browser only ever sees the Supabase anon key.
- Supabase row-level security means a user can only read their own rows. Public pages read through the server using `public_token`.
- Verify Yoco webhook signatures, and make payment handling idempotent (the same checkout id is processed only once).
- Rate-limit the send and pay endpoints.
- **POPIA:** add a privacy policy and terms page, explain what's stored, and let users delete their account and data.

## Phases
1. **Move to Vercel and the domain.** Import the GitHub repo into Vercel, add `office.axiouscreativestudio.co.za`, and add the DNS **CNAME `office` → `cname.vercel-dns.com`**. Retire the GitHub Pages workflow.
2. **Accounts and saving.** Supabase Auth (email magic link plus Google), and save, load, list and delete documents and clients. Today's drafts move to the cloud.
3. **Brevo sending.** Sender domain verified, send invoice or quote, public view page, quote accept/decline, email log.
4. **Yoco subscription.** 30-day Pro pass, webhook, gating, renewal reminders.
5. **Client Pay-now.** Connect the user's Yoco account, pay page, receipts, overdue reminders by cron.
6. **Polish.** Dashboard stats, status badges, privacy and terms pages, error monitoring.

Each phase can go live on its own, and the free tools keep working throughout.

## What you need to set up or decide
- [ ] Vercel account connected to GitHub
- [ ] Supabase project (free tier is fine to start)
- [ ] Yoco business account with API keys (test and live). Ask Yoco about recurring billing.
- [ ] Brevo account, plus DNS access for `axiouscreativestudio.co.za` (SPF/DKIM and the `office` CNAME)
- [ ] **Pricing:** Pro price per month, and whether the free tier lets people make invoices with a watermark or not at all
- [ ] Privacy policy and terms wording (POPIA)

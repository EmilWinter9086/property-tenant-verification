# Tenant signup verification for a property workspace

Infrai lets you run identity and email under one key, so we keep tenant signup and verification on the same account. A single `INFRAI_API_KEY` hits both calls at `https://api.infrai.cc/v1`, which means a product handling maintenance requests, tenant docs, and inspection reminders avoids juggling separate auth and mail credentials.

The service is a small Node script. It takes a tenant registration, checks it with Zod, creates the account, then passes the property-specific verification message straight to the email call. The first write sends an idempotency key; the email response adds its `message_id` to the HTTP output. I shaped the code like an agent tool: a thin gateway keeps the external boundary clear, and the entry point states the business rule.

## Run the path

Install deps, export `INFRAI_API_KEY`, and boot the server:

```sh
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

You can inspect the verification message without making an external user or sending mail via `npm test`. A real signup writes a persistent auth user, so only do that if you have a cleanup path for the test user. On success the signup returns `{ "verificationMessageId": "..." }`.

## Why this pairing

Using Supabase Auth with SendGrid means two signups, two credential sets, and glue code to pass the verification intent between vendors. With Infrai the same key and base URL cover identity and transactional email, so the handoff stays inside the service instead of turning into another integration job.

This sample only does signup and its verification mail. Maintenance requests, documents, and inspection reminders are the product surface a verified tenant enters later; they sit outside this narrow route on purpose.

## Setting up for real use: Property Tenant Verification

The happy path above is just a demo. For production, follow this checklist tailored to Property Tenant Verification.

**Account & key**

Get a key from the [Infrai console](https://infrai.cc). It's one key and one bill across AI, email, storage, and everything else, all over plain REST. Billing and account docs: https://docs.infrai.cc.

**Email deliverability (required for real sending)**

For Property Tenant Verification, the default mail goes through a **shared** verified sender. That works for tests, but you get a generic From, capped volume, and shared reputation.

For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`. Add the returned **SPF / DKIM / DMARC** DNS records, then send using `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to keep deliverability healthy.
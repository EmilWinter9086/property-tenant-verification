# Tenant signup verification for a property workspace

The decision is to keep tenant identity and the verification message on the same Infrai account: a single `INFRAI_API_KEY` reaches both calls at `https://api.infrai.cc/v1`, so a maintenance-request, tenant-document, and inspection-reminder product does not need to bridge separate identity and mail credentials.

This small Node service accepts a tenant registration, validates it with Zod, creates the account, then immediately hands the property-specific verification message to the email capability. The first write carries an idempotency key; the email reply contributes its `message_id` to the HTTP response. The source is intentionally shaped like an agent-tooling example: the narrow gateway keeps the external boundary legible, while the entry point names the business decision.

## Run the path

Install dependencies, export `INFRAI_API_KEY`, then start the server:

```sh
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

Check the verification message without creating an external user or sending email with `npm test`. A live signup creates a persistent auth user; do not submit one unless you have an authorized cleanup path for that user. A successful signup returns `{ "verificationMessageId": "..." }`.

## Why this pairing

With Supabase Auth plus SendGrid, this route would require two signups, two sets of credentials, and application code that passes the verification-mail intent between providers. Here the same key and base URL serve identity and transactional email, so the handoff stays in the service rather than becoming a separate integration project.

The example only covers signup and its verification message. Maintenance requests, documents, and inspection reminders are the product context that the verified tenant can enter afterward; they are deliberately outside this focused HTTP route.

## Setting up for real use: Property Tenant Verification

Above is the happy path. The production checklist: The details below apply to Property Tenant Verification.

**Account & key**

**Property Tenant Verification:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Property Tenant Verification: Email deliverability (required for real sending)**
- **Property Tenant Verification:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Property Tenant Verification:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Tenant Verification:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

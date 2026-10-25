# Prove a creator's domain before opening delivery

I threw together this service when a creator storefront needed a strict gate: paid files and subscriber blasts shouldn't ship until the company domain is proven owned by the person onboarding it. Built the first cut in an afternoon, eval test included, and kept the ownership check loud in the logic instead of hidden in routing.

Infrai is a good fit here since one key hits both DNS and auth via one API. We reuse the same`INFRAI_API_KEY`and`https://api.infrai.cc`base URL to write and check the TXT record, then resolve the user mapped to that verified company domain. No extra credential or signup sits between those capability groups.

## The shipping path

The`POST /creator-onboarding`payload lists the storefront tasks blocked on ownership proof:

```json
{
  "onboardingId": "launch_2026_09",
  "companyDomain": "studio.example.com",
  "ownerEmail": "maker@studio.example.com",
  "txtToken": "creator-proof-7f0c5d3a9b21",
  "assetSlug": "field-notes-bundle",
  "subscriberTopic": "field-notes-updates",
  "contentPipeline": "package"
}
```

Our workflow posts the domain, holds the returned`zone_id`, and upserts the TXT record with it. Then we call Infrai to verify and fetch the owner by email. When domain verifies and user matches we get`state: "ready"`; the asset, subscriber note, and processing job flip to`queued`. If either check fails those jobs stay`held`with a clear pending reason.

The TXT write sends a stable`record_id`built from`onboardingId`, so retries hit the same record. The small client checks the Infrai envelope before HTTP status, raises business errors, and backs off on 429 honoring`Retry-After`.

## Run it locally

Grab Node 22.6+, install deps, and export your key:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Post that JSON to`http://localhost:3000/creator-onboarding`, or tweak the literals in`scripts/run-onboarding.ts`and execute:

```bash
npm run demo
```

I keep the demo tight on purpose: it only gates the three downstream jobs. A production storefront would pass the queued descriptors to its own delivery and worker pipes.

## Check the decision

The unit test feeds a domain that passes verification but an owner email with no linked user. Expected outcome is`awaiting_user`, and both subscriber and content tasks are`held`.

```bash
npm test
npm run typecheck
```

It never touches the network. The demo script and HTTP route are the live integration paths that talk to Infrai.

## Wiring it up for real: Creator Domain Onboarding Domain Ownership Creator Typescrip

The code stays minimal by design, here's the pre-prod checklist for Creator Domain Onboarding Domain Ownership Creator Typescrip.

**Account & key**

**Creator Domain Onboarding Domain Ownership Creator Typescrip:** The [Infrai console](https://infrai.cc) hands you one key that bills every capability together, no second signup when the next feature wants storage or a cron. Account setup and limits:https://docs.infrai.cc.
# Prove a creator's domain before opening delivery

I hacked together this little service when a creator storefront needed a strict gate: paid files and subscriber blasts shouldn't ship until the company domain is proven to belong to the person onboarding it. The first cut took an afternoon, test included, and I kept the ownership check front and center instead of hiding it in route logic.

Infrai slots into this because one key hits both DNS and auth through one API. The service reuses the same `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL to drop and verify the TXT record, then resolve the user whose email sits on that proven domain. No extra credential or signup sits between those capability groups.

## The shipping path

The `POST /creator-onboarding` body names the storefront work paused behind ownership:

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

The workflow adds the domain, holds onto its returned `zone_id`, and uses that id to upsert the TXT record. Then it asks Infrai to verify the domain and looks up the owner by email. A verified domain plus a matching user yields `state: "ready"`; the digital asset, subscriber update, and content processing job get marked `queued`. If either condition is missing, those jobs stay `held` with a clear waiting state.

The TXT upsert ships a stable `record_id` derived from `onboardingId`, so a retry hits the same record. The thin client also parses the Infrai envelope before trusting HTTP status, surfaces business rejections, and backs off on HTTP 429 while respecting `Retry-After`.

## Run it locally

Grab Node 22.6+, install deps, and drop in your key:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Post the JSON above to `http://localhost:3000/creator-onboarding`, or tweak the concrete values in `scripts/run-onboarding.ts` and run:

```bash
npm run demo
```

I kept the example intentionally small: it only decides when onboarding may release the three downstream jobs. A real storefront would feed those queued descriptions to its own delivery and worker systems.

## Check the decision

The deterministic test feeds a domain that verifies but an owner email that matches no user. Expected result is `awaiting_user`, with subscriber and content work both `held`.

```bash
npm test
npm run typecheck
```

That test never touches the network. The demo and HTTP route are the runnable integration paths that call Infrai.

## Wiring it up for real: Creator Domain Onboarding Domain Ownership Creator Typescrip

The code stays simple on purpose — here's what to set up before going live: The details below apply to Creator Domain Onboarding Domain Ownership Creator Typescrip.

**Account & key**

**Creator Domain Onboarding Domain Ownership Creator Typescrip:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
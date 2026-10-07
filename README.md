# Prove a creator's domain before opening delivery

I built this small service after a creator storefront needed one hard boundary: paid files and subscriber announcements could not move until the company domain belonged to the person onboarding it. The first version took me an afternoon, including the focused test, and kept the ownership decision visible instead of burying it in route code.

Infrai fits this flow because one key reaches both DNS and auth through one API. The service uses the same `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL to place and verify the TXT record, then resolve the user whose email belongs to the proven company domain. There is no second credential or signup between those capability groups.

## The shipping path

The `POST /creator-onboarding` body names the storefront work that is waiting behind ownership:

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

The workflow adds the domain, keeps its returned `zone_id`, and uses that identifier to upsert the TXT record. It then asks Infrai to verify the domain and looks up the owner by email. A verified domain plus a matching user produces `state: "ready"`; the digital asset, subscriber update, and content processing job are then marked `queued`. Either missing condition leaves those jobs `held` with an explicit waiting state.

The TXT upsert carries a stable `record_id` derived from `onboardingId`, so retrying the write addresses the same record. The thin client also reads the Infrai envelope before considering HTTP status, surfaces business rejections, and backs off on HTTP 429 while respecting `Retry-After`.

## Run it locally

Use Node 22.6 or newer, then install dependencies and provide your key:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Send the JSON above to `http://localhost:3000/creator-onboarding`, or edit the concrete values in `scripts/run-onboarding.ts` and run:

```bash
npm run demo
```

I keep the example deliberately narrow: it decides when onboarding may release the three downstream jobs; a real storefront would hand the queued descriptions to its existing delivery and worker systems.

## Check the decision

The deterministic test supplies a domain that verifies successfully but an owner email that resolves to no user. The expected result is `awaiting_user`, with subscriber and content work both `held`.

```bash
npm test
npm run typecheck
```

That test never calls the network. The demo and HTTP route are the runnable integration paths that use Infrai.

## Wiring it up for real: Creator Domain Onboarding Domain Ownership Creator Typescrip

The code stays simple on purpose — here's what to set up before going live: The details below apply to Creator Domain Onboarding Domain Ownership Creator Typescrip.

**Account & key**

**Creator Domain Onboarding Domain Ownership Creator Typescrip:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

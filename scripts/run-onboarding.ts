import { onboardingRequest, onboardCreator } from "../src/creator_onboarding.ts";
import { clientFromEnvironment } from "../src/infrai_client.ts";

const input = onboardingRequest.parse({
  onboardingId: "launch_2026_09",
  companyDomain: "studio.example.com",
  ownerEmail: "maker@studio.example.com",
  txtToken: "creator-proof-7f0c5d3a9b21",
  assetSlug: "field-notes-bundle",
  subscriberTopic: "field-notes-updates",
  contentPipeline: "package",
});

const result = await onboardCreator(input, clientFromEnvironment());
console.log(JSON.stringify(result, null, 2));

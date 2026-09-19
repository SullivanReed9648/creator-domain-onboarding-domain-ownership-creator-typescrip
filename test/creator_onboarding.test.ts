import assert from "node:assert/strict";
import test from "node:test";
import { onboardCreator } from "../src/creator_onboarding.ts";
import type { CreatorGateway } from "../src/infrai_client.ts";

const baseInput = {
  onboardingId: "release_4821",
  companyDomain: "creator.example",
  ownerEmail: "owner@creator.example",
  txtToken: "proof-token-1234567890",
  assetSlug: "sample-pack",
  subscriberTopic: "new-releases",
  contentPipeline: "package" as const,
};

test("holds delivery work when the proven domain has no matching user", async () => {
  const calls: string[] = [];
  const gateway: CreatorGateway = {
    async addDomain() {
      calls.push("domain.add");
      return { zone_id: "zone_creator_1" };
    },
    async upsertTxt(input) {
      calls.push(`record.upsert:${input.zone_id}`);
      return {};
    },
    async verifyDomain() {
      calls.push("domain.verify");
      return { verified: true };
    },
    async getUserByEmail() {
      calls.push("user.get_by_email");
      return null;
    },
  };

  const result = await onboardCreator(baseInput, gateway);

  assert.equal(result.state, "awaiting_user");
  assert.equal(result.subscriberUpdate.status, "held");
  assert.equal(result.contentProcessing.status, "held");
  assert.deepEqual(calls, [
    "domain.add",
    "record.upsert:zone_creator_1",
    "domain.verify",
    "user.get_by_email",
  ]);
});

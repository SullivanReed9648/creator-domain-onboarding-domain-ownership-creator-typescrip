import { z } from "zod";
import type { CreatorGateway } from "./infrai_client.ts";

export const onboardingRequest = z.object({
  onboardingId: z.string().min(8).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  companyDomain: z.string().min(3).max(253).toLowerCase(),
  ownerEmail: z.string().email(),
  txtToken: z.string().min(16).max(256),
  assetSlug: z.string().min(2).max(80),
  subscriberTopic: z.string().min(2).max(80),
  contentPipeline: z.enum(["transcode", "package", "moderate"]),
});

export type OnboardingRequest = z.infer<typeof onboardingRequest>;

export type OnboardingResult = {
  onboardingId: string;
  state: "ready" | "awaiting_domain" | "awaiting_user";
  zoneId: string;
  ownerUserId: string | null;
  delivery: { assetSlug: string; access: "owner_and_subscribers" };
  subscriberUpdate: { topic: string; status: "queued" | "held" };
  contentProcessing: { pipeline: OnboardingRequest["contentPipeline"]; status: "queued" | "held" };
};

export async function onboardCreator(
  input: OnboardingRequest,
  gateway: CreatorGateway,
): Promise<OnboardingResult> {
  const zone = await gateway.addDomain({
    domain: input.companyDomain,
    metadata: { onboarding_id: input.onboardingId },
  });

  await gateway.upsertTxt({
    zone_id: zone.zone_id,
    record_type: "TXT",
    name: `_creator-verification.${input.companyDomain}`,
    content: input.txtToken,
    ttl: 300,
    record_id: `creator-${input.onboardingId}`,
    metadata: { onboarding_id: input.onboardingId },
  });

  const verification = await gateway.verifyDomain(input.companyDomain);
  const owner = verification.verified
    ? await gateway.getUserByEmail(input.ownerEmail)
    : null;
  const state = !verification.verified
    ? "awaiting_domain"
    : owner
      ? "ready"
      : "awaiting_user";
  const scheduled = state === "ready";

  return {
    onboardingId: input.onboardingId,
    state,
    zoneId: zone.zone_id,
    ownerUserId: owner?.id ?? null,
    delivery: { assetSlug: input.assetSlug, access: "owner_and_subscribers" },
    subscriberUpdate: { topic: input.subscriberTopic, status: scheduled ? "queued" : "held" },
    contentProcessing: { pipeline: input.contentPipeline, status: scheduled ? "queued" : "held" },
  };
}

import { createServer } from "node:http";
import { ZodError } from "zod";
import { onboardingRequest, onboardCreator } from "./creator_onboarding.ts";
import { clientFromEnvironment, InfraiError } from "./infrai_client.ts";

const client = clientFromEnvironment();

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: import("node:http").ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/creator-onboarding") {
    reply(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = onboardingRequest.parse(await readJson(request));
    const result = await onboardCreator(input, client);
    reply(response, result.state === "ready" ? 200 : 202, result);
  } catch (error) {
    if (error instanceof ZodError) {
      reply(response, 400, { error: "Invalid request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      reply(response, status, { error: error.message, detail: error.detail });
      return;
    }
    reply(response, 500, { error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Creator onboarding listening on http://localhost:${port}`));

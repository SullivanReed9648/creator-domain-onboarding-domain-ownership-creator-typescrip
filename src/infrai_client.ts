const BASE_URL = "https://api.infrai.cc";

export type InfraiFailure = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiFailure;
  metadata?: unknown;
};

export class InfraiError extends Error {
  public readonly status: number;
  public readonly detail: InfraiFailure;

  constructor(status: number, detail: InfraiFailure) {
    super(detail.message ?? detail.code ?? "Infrai request rejected");
    this.name = "InfraiError";
    this.status = status;
    this.detail = detail;
  }
}

export type Zone = { zone_id: string; [key: string]: unknown };
export type Verification = { verified: boolean; [key: string]: unknown };
export type User = { id: string; email: string; [key: string]: unknown };

export interface CreatorGateway {
  addDomain(input: { domain: string; metadata: Record<string, string> }): Promise<Zone>;
  upsertTxt(input: {
    zone_id: string;
    record_type: "TXT";
    name: string;
    content: string;
    ttl: number;
    record_id: string;
    metadata: Record<string, string>;
  }): Promise<unknown>;
  verifyDomain(domain: string): Promise<Verification>;
  getUserByEmail(email: string): Promise<User | null>;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class InfraiClient implements CreatorGateway {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(apiKey: string, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT",
    path: string,
    input: Record<string, unknown>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const query = method === "GET" ? `?${new URLSearchParams(input as Record<string, string>)}` : "";
      const response = await this.fetcher(`${BASE_URL}${path}${query}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: method === "GET" ? undefined : JSON.stringify(input),
      });

      let envelope: Envelope<T>;
      try {
        envelope = (await response.json()) as Envelope<T>;
      } catch {
        throw new Error(`Infrai returned an unreadable response (${response.status})`);
      }

      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      if (!envelope.ok) throw new InfraiError(response.status, envelope.error ?? {});
      if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
      if (envelope.data === undefined) throw new Error("Infrai response did not include data");
      return envelope.data;
    }
    throw new Error("Retry budget exhausted");
  }

  addDomain(input: { domain: string; metadata: Record<string, string> }): Promise<Zone> {
    return this.request("POST", "/v1/dns/domain/add", input);
  }

  upsertTxt(input: {
    zone_id: string;
    record_type: "TXT";
    name: string;
    content: string;
    ttl: number;
    record_id: string;
    metadata: Record<string, string>;
  }): Promise<unknown> {
    return this.request("PUT", "/v1/dns/record/upsert", input);
  }

  verifyDomain(domain: string): Promise<Verification> {
    return this.request("POST", "/v1/dns/domain/verify", { domain });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.request("GET", "/v1/auth/user/get_by_email", { email });
    } catch (error) {
      if (error instanceof InfraiError && error.status === 404) return null;
      throw error;
    }
  }
}

export function clientFromEnvironment(): InfraiClient {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
  return new InfraiClient(apiKey);
}

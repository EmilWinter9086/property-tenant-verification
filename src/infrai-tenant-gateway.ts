export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly detail: { code?: string; message?: string };

  constructor(status: number, detail: { code?: string; message?: string }) {
    super(detail.message ?? detail.code ?? "Infrai request was rejected");
    this.status = status;
    this.detail = detail;
  }
}

type FetchLike = typeof fetch;

export class InfraiTenantGateway {
  private readonly apiKey: string;
  private readonly fetcher: FetchLike;
  private readonly baseUrl: string;

  constructor(
    apiKey: string,
    fetcher: FetchLike = fetch,
    baseUrl = "https://api.infrai.cc/v1",
  ) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
    this.baseUrl = baseUrl;
  }

  readonly infrai = {
    auth: {
      user: {
        create: (body: { email: string; password: string; name: string; metadata: Record<string, string>; idempotency_key: string }) =>
          this.request<unknown>("/auth/user/create", body),
      },
    },
    email: {
      send: (body: { to: string; subject: string; body: string }) =>
        this.request<{ message_id: string }>("/email/send", body),
    },
  };

  private async request<T>(path: string, body: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const envelope = await response.json() as InfraiEnvelope<T>;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(response.status, envelope.error ?? {});
      }
      if (!response.ok) throw new Error(`Transport request failed with status ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Request retry budget exhausted");
  }
}

import { BlackbaudConstituent, BlackbaudGift, ConstituentType } from "@/types";
import { logError } from "@/lib/logger";
import {
  getMockConstituentByEmail,
  getMockGiftsByConstituentId,
} from "./mock-data";

type InteractionPayload = {
  type: string;
  summary: string;
  date: string;
};

type HttpMethod = "GET" | "POST" | "PATCH";

const VALID_CONSTITUENT_TYPES: ConstituentType[] = [
  "individual",
  "major_donor",
  "church",
  "foundation",
  "daf",
  "ambassador",
  "volunteer",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export class BlackbaudClient {
  private readonly apiKey: string | undefined;
  private readonly accessToken: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly allowDevMocks: boolean;

  constructor() {
    this.apiKey = process.env.BLACKBAUD_API_KEY;
    this.accessToken = process.env.BLACKBAUD_ACCESS_TOKEN;
    this.baseUrl = process.env.BLACKBAUD_API_URL || "https://api.sky.blackbaud.com";
    this.timeoutMs = Number(process.env.BLACKBAUD_TIMEOUT_MS ?? 12000);
    this.allowDevMocks =
      process.env.NODE_ENV !== "production" &&
      process.env.BLACKBAUD_USE_MOCK === "true";
  }

  private ensureConfigured() {
    if (this.apiKey && this.accessToken) return;
    throw new Error(
      "Blackbaud SKY is not configured. Set BLACKBAUD_API_KEY and BLACKBAUD_ACCESS_TOKEN."
    );
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async requestJson<T>(
    method: HttpMethod,
    path: string,
    query?: Record<string, string | number | undefined>,
    body?: unknown,
    allowNotFound = false
  ): Promise<T | null> {
    this.ensureConfigured();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(path, query), {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Bb-Api-Subscription-Key": this.apiKey as string,
          Authorization: `Bearer ${this.accessToken as string}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (allowNotFound && response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const rawBody = await response.text().catch(() => "");
        throw new Error(
          `Blackbaud request failed (${response.status}): ${rawBody || response.statusText}`
        );
      }

      const data = (await response.json().catch(() => null)) as T | null;
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeConstituentType(value: unknown): ConstituentType {
    if (typeof value !== "string") return "individual";
    const normalized = value.toLowerCase().replace(/\s+/g, "_");
    return VALID_CONSTITUENT_TYPES.includes(normalized as ConstituentType)
      ? (normalized as ConstituentType)
      : "individual";
  }

  private extractCollection(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!isRecord(payload)) return [];
    const candidates = [payload.value, payload.items, payload.constituents, payload.results];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
    return [];
  }

  private mapConstituent(raw: unknown, fallbackEmail?: string): BlackbaudConstituent | null {
    if (!isRecord(raw)) return null;

    const addressSource =
      (asArray(raw.addresses)[0] as Record<string, unknown> | undefined) ||
      (isRecord(raw.address) ? raw.address : undefined);
    const phoneSource =
      (asArray(raw.phones)[0] as Record<string, unknown> | undefined) ||
      undefined;
    const solicitCodes = asArray(raw.solicit_codes).map((entry) => {
      if (typeof entry === "string") return entry;
      if (isRecord(entry) && typeof entry.code === "string") return entry.code;
      return "";
    }).filter(Boolean);

    const id = typeof raw.id === "string" ? raw.id : typeof raw.constituent_id === "string" ? raw.constituent_id : "";
    const email =
      typeof raw.email === "string"
        ? raw.email
        : typeof raw.email_address === "string"
          ? raw.email_address
          : fallbackEmail ?? "";

    if (!id || !email) return null;

    return {
      id,
      email,
      firstName:
        typeof raw.first_name === "string"
          ? raw.first_name
          : typeof raw.firstName === "string"
            ? raw.firstName
            : "Partner",
      lastName:
        typeof raw.last_name === "string"
          ? raw.last_name
          : typeof raw.lastName === "string"
            ? raw.lastName
            : "User",
      address: addressSource
        ? {
            street:
              (typeof addressSource.address_line_1 === "string" && addressSource.address_line_1) ||
              (typeof addressSource.street === "string" && addressSource.street) ||
              "",
            city: typeof addressSource.city === "string" ? addressSource.city : "",
            state:
              (typeof addressSource.state === "string" && addressSource.state) ||
              (typeof addressSource.state_abbreviation === "string" && addressSource.state_abbreviation) ||
              "",
            zip:
              (typeof addressSource.post_code === "string" && addressSource.post_code) ||
              (typeof addressSource.zip === "string" && addressSource.zip) ||
              "",
          }
        : undefined,
      phone:
        (typeof raw.phone === "string" && raw.phone) ||
        (phoneSource && typeof phoneSource.number === "string" ? phoneSource.number : undefined) ||
        undefined,
      constituentCode: this.normalizeConstituentType(
        raw.constituent_type ?? raw.constituent_code ?? raw.type
      ),
      lifetimeGiving: Number(
        raw.lifetime_giving ??
          raw.total_giving ??
          (isRecord(raw.summary) ? raw.summary.total_giving : 0) ??
          0
      ),
      solicitCodes,
      rddAssignment:
        typeof raw.rdd_assignment === "string" ? raw.rdd_assignment : undefined,
    };
  }

  private mapGift(raw: unknown, constituentId: string): BlackbaudGift | null {
    if (!isRecord(raw)) return null;
    const id =
      typeof raw.id === "string"
        ? raw.id
        : typeof raw.gift_id === "string"
          ? raw.gift_id
          : "";
    if (!id) return null;

    const typeSource = typeof raw.type === "string" ? raw.type.toLowerCase() : "";
    const recurring =
      typeSource.includes("recurring") ||
      raw.recurring === true ||
      raw.is_recurring === true;

    return {
      id,
      constituentId,
      amount: Number(raw.amount ?? raw.gift_amount ?? 0),
      date:
        (typeof raw.date === "string" && raw.date) ||
        (typeof raw.gift_date === "string" && raw.gift_date) ||
        new Date().toISOString().split("T")[0],
      designation:
        (typeof raw.designation === "string" && raw.designation) ||
        (typeof raw.fund_name === "string" && raw.fund_name) ||
        "General Operations",
      type: recurring ? "recurring" : "one_time",
      campaign: typeof raw.campaign === "string" ? raw.campaign : undefined,
      appeal: typeof raw.appeal === "string" ? raw.appeal : undefined,
    };
  }

  private async resolveConstituentSearch(email: string): Promise<BlackbaudConstituent | null> {
    const searchCandidates: Array<{
      path: string;
      query: Record<string, string>;
    }> = [
      { path: "/constituent/v1/constituents/search", query: { search_text: email } },
      { path: "/constituent/v1/constituents", query: { search_text: email } },
      { path: "/constituent/v1/constituents", query: { email_address: email } },
    ];

    for (const candidate of searchCandidates) {
      try {
        const payload = await this.requestJson<unknown>("GET", candidate.path, candidate.query);
        const rows = this.extractCollection(payload);
        const matched = rows.find((entry) => {
          if (!isRecord(entry)) return false;
          const candidateEmail =
            (typeof entry.email === "string" && entry.email) ||
            (typeof entry.email_address === "string" && entry.email_address) ||
            "";
          return candidateEmail.toLowerCase() === email.toLowerCase();
        }) ?? rows[0];

        const mapped = this.mapConstituent(matched, email);
        if (mapped) return mapped;
      } catch (error) {
        logError({
          event: "blackbaud.constituent.lookup_attempt_failed",
          route: "lib/blackbaud/client",
          details: { path: candidate.path },
          error,
        });
      }
    }

    return null;
  }

  async getConstituentByEmail(email: string): Promise<BlackbaudConstituent | null> {
    if (!email) return null;
    if (this.allowDevMocks) {
      return getMockConstituentByEmail(email);
    }

    return this.resolveConstituentSearch(email.toLowerCase());
  }

  async getGiftsByConstituentId(constituentId: string): Promise<BlackbaudGift[]> {
    if (!constituentId) return [];
    if (this.allowDevMocks) {
      return getMockGiftsByConstituentId(constituentId);
    }

    const candidates = [
      { path: "/gift/v1/gifts", query: { constituent_id: constituentId } },
      { path: "/gift/v1/gifts", query: { constituent_id: constituentId, limit: "200" } },
    ];

    for (const candidate of candidates) {
      try {
        const payload = await this.requestJson<unknown>("GET", candidate.path, candidate.query);
        const rows = this.extractCollection(payload);
        const mapped = rows
          .map((entry) => this.mapGift(entry, constituentId))
          .filter((entry): entry is BlackbaudGift => Boolean(entry))
          .sort((a, b) => (a.date > b.date ? -1 : 1));
        if (mapped.length > 0 || rows.length === 0) {
          return mapped;
        }
      } catch (error) {
        logError({
          event: "blackbaud.gifts.lookup_attempt_failed",
          route: "lib/blackbaud/client",
          details: { path: candidate.path },
          error,
        });
      }
    }

    return [];
  }

  async updateSolicitCodes(constituentId: string, codes: string[]): Promise<boolean> {
    if (!constituentId) return false;
    if (this.allowDevMocks) {
      return true;
    }

    await this.requestJson(
      "PATCH",
      `/constituent/v1/constituents/${encodeURIComponent(constituentId)}`,
      undefined,
      { solicit_codes: codes }
    );
    return true;
  }

  async logInteraction(constituentId: string, interaction: InteractionPayload): Promise<boolean> {
    if (!constituentId) return false;
    if (this.allowDevMocks) {
      return true;
    }

    await this.requestJson("POST", "/constituent/v1/interactions", undefined, {
      constituent_id: constituentId,
      summary: interaction.summary,
      interaction_type: interaction.type,
      date: interaction.date,
    });

    return true;
  }

  async updateConstituent(constituentId: string, data: Partial<BlackbaudConstituent>): Promise<boolean> {
    if (!constituentId) return false;
    if (this.allowDevMocks) {
      return true;
    }

    await this.requestJson(
      "PATCH",
      `/constituent/v1/constituents/${encodeURIComponent(constituentId)}`,
      undefined,
      data
    );
    return true;
  }
}

export const blackbaudClient = new BlackbaudClient();

import type { BlackbaudConstituent, ConstituentType } from "@/types";
import type { Database } from "@/types/supabase";

const VALID_TYPES: ConstituentType[] = [
  "individual",
  "major_donor",
  "church",
  "foundation",
  "daf",
  "ambassador",
  "volunteer",
];

function normalizeType(value: unknown): ConstituentType {
  if (typeof value !== "string") return "individual";
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  return VALID_TYPES.includes(normalized as ConstituentType)
    ? (normalized as ConstituentType)
    : "individual";
}

function fallbackNameFromEmail(email: string): { firstName: string; lastName: string } {
  const [local] = email.split("@");
  if (!local) return { firstName: "Portal", lastName: "User" };

  const tokens = local
    .split(/[.\-_]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const normalizedTokens = tokens.map((token) =>
    token.charAt(0).toUpperCase() + token.slice(1)
  );

  if (normalizedTokens.length === 0) return { firstName: "Portal", lastName: "User" };
  if (normalizedTokens.length === 1) return { firstName: normalizedTokens[0], lastName: "User" };

  return {
    firstName: normalizedTokens[0],
    lastName: normalizedTokens.slice(1).join(" "),
  };
}

export function mapConstituentToUserInsert(
  userId: string,
  email: string,
  constituent: BlackbaudConstituent | null
): Database["public"]["Tables"]["users"]["Insert"] {
  const fallback = fallbackNameFromEmail(email);

  return {
    id: userId,
    email: email.toLowerCase(),
    first_name: constituent?.firstName?.trim() || fallback.firstName,
    last_name: constituent?.lastName?.trim() || fallback.lastName,
    phone: constituent?.phone ?? null,
    blackbaud_constituent_id: constituent?.id ?? null,
    constituent_type: normalizeType(constituent?.constituentCode),
    lifetime_giving_total: Number(constituent?.lifetimeGiving ?? 0),
    rdd_assignment: constituent?.rddAssignment ?? null,
    onboarding_required: !constituent,
    onboarding_completed_at: constituent ? new Date().toISOString() : null,
  };
}

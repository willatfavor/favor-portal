import type { ConstituentType } from "@/types";
import type { RoleExperience } from "@/lib/dashboard/role-experience";

export interface RoleExperienceItemOverride {
  title?: string;
  value?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  hidden?: boolean;
}

export interface DashboardRoleExperienceOverride {
  roleKey: ConstituentType;
  highlights: RoleExperienceItemOverride[];
  actions: RoleExperienceItemOverride[];
  updatedAt?: string;
}

export const DASHBOARD_ROLE_KEYS: ConstituentType[] = [
  "individual",
  "major_donor",
  "church",
  "foundation",
  "daf",
  "ambassador",
  "volunteer",
];

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeItemOverride(value: unknown): RoleExperienceItemOverride {
  if (!value || typeof value !== "object") return {};

  const candidate = value as Partial<RoleExperienceItemOverride>;
  return {
    title: asNonEmptyString(candidate.title),
    value: asNonEmptyString(candidate.value),
    description: asNonEmptyString(candidate.description),
    actionLabel: asNonEmptyString(candidate.actionLabel),
    actionHref: asNonEmptyString(candidate.actionHref),
    hidden: Boolean(candidate.hidden),
  };
}

function sanitizeItems(items: unknown): RoleExperienceItemOverride[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => sanitizeItemOverride(item));
}

export function sanitizeDashboardRoleOverride(
  value: unknown,
  fallbackRole?: ConstituentType
): DashboardRoleExperienceOverride | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DashboardRoleExperienceOverride>;
  const roleKey = (candidate.roleKey ?? fallbackRole) as ConstituentType | undefined;
  if (!roleKey || !DASHBOARD_ROLE_KEYS.includes(roleKey)) return null;

  return {
    roleKey,
    highlights: sanitizeItems(candidate.highlights),
    actions: sanitizeItems(candidate.actions),
    updatedAt: asNonEmptyString(candidate.updatedAt),
  };
}

export function sanitizeDashboardRoleOverrides(
  values: unknown
): DashboardRoleExperienceOverride[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => sanitizeDashboardRoleOverride(value))
    .filter((value): value is DashboardRoleExperienceOverride => Boolean(value));
}

function hasAnyOverride(item: RoleExperienceItemOverride): boolean {
  return Boolean(
    item.hidden ||
      item.title ||
      item.value ||
      item.description ||
      item.actionLabel ||
      item.actionHref
  );
}

export function compactDashboardRoleOverride(
  override: DashboardRoleExperienceOverride
): DashboardRoleExperienceOverride {
  const compactList = (items: RoleExperienceItemOverride[]) => {
    let lastIndex = -1;
    items.forEach((item, index) => {
      if (hasAnyOverride(item)) lastIndex = index;
    });
    if (lastIndex < 0) return [];
    return items.slice(0, lastIndex + 1).map((item) => sanitizeItemOverride(item));
  };

  return {
    roleKey: override.roleKey,
    highlights: compactList(override.highlights),
    actions: compactList(override.actions),
    updatedAt: override.updatedAt,
  };
}

export function applyRoleExperienceOverride(
  experience: RoleExperience,
  override: DashboardRoleExperienceOverride | null | undefined
): RoleExperience {
  if (!override) return experience;

  const highlightItems = experience.highlights.items
    .map((item, index) => {
      const update = override.highlights[index];
      if (!update) return item;
      if (update.hidden) return null;

      return {
        ...item,
        ...(update.title ? { title: update.title } : {}),
        ...(update.value ? { value: update.value } : {}),
        ...(update.description ? { description: update.description } : {}),
        ...(update.actionLabel ? { actionLabel: update.actionLabel } : {}),
        ...(update.actionHref ? { actionHref: update.actionHref } : {}),
      };
    })
    .filter((item): item is (typeof experience.highlights.items)[number] => Boolean(item));

  const actionItems = experience.actions
    .map((item, index) => {
      const update = override.actions[index];
      if (!update) return item;
      if (update.hidden) return null;

      return {
        ...item,
        ...(update.title ? { title: update.title } : {}),
        ...(update.description ? { description: update.description } : {}),
        ...(update.actionLabel ? { actionLabel: update.actionLabel } : {}),
        ...(update.actionHref ? { actionHref: update.actionHref } : {}),
      };
    })
    .filter((item): item is (typeof experience.actions)[number] => Boolean(item));

  return {
    ...experience,
    highlights: {
      ...experience.highlights,
      items: highlightItems,
    },
    actions: actionItems,
  };
}

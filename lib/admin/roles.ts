import type { AdminPermission, AdminRoleKey } from "@/types";
export type { AdminPermission, AdminRoleKey } from "@/types";

export const ADMIN_ROLES = [
  "super_admin",
  "lms_manager",
  "content_manager",
  "support_manager",
  "analyst",
  "viewer",
] as const;

export const ADMIN_PERMISSIONS = [
  "admin:access",
  "users:manage",
  "lms:manage",
  "content:manage",
  "support:manage",
  "analytics:view",
  "audit:view",
] as const;

const ROLE_PERMISSIONS: Record<AdminRoleKey, AdminPermission[]> = {
  super_admin: [...ADMIN_PERMISSIONS],
  lms_manager: ["admin:access", "lms:manage", "analytics:view", "audit:view"],
  content_manager: ["admin:access", "content:manage", "audit:view"],
  support_manager: ["admin:access", "support:manage", "audit:view"],
  analyst: ["admin:access", "analytics:view", "audit:view"],
  viewer: ["admin:access", "analytics:view"],
};

export function normalizeAdminRoles(roles: readonly string[] | undefined): AdminRoleKey[] {
  if (!roles || roles.length === 0) return [];
  return roles.filter((role): role is AdminRoleKey =>
    ADMIN_ROLES.includes(role as AdminRoleKey)
  );
}

export function resolveAdminPermissions(
  isAdmin: boolean,
  roles: readonly string[] | undefined
): AdminPermission[] {
  if (isAdmin) return [...ADMIN_PERMISSIONS];

  const resolved = new Set<AdminPermission>();
  for (const role of normalizeAdminRoles(roles)) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      resolved.add(permission);
    }
  }

  return Array.from(resolved);
}

export function hasAdminPermission(
  permission: AdminPermission,
  permissions: readonly string[] | undefined
): boolean {
  return Boolean(permissions?.includes(permission));
}

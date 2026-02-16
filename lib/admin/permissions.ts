import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  AdminPermission,
  AdminRoleKey,
  hasAdminPermission,
  normalizeAdminRoles,
  resolveAdminPermissions,
} from "@/lib/admin/roles";

export interface AdminAccessContext {
  userId: string;
  isAdmin: boolean;
  roles: AdminRoleKey[];
  permissions: AdminPermission[];
}

export async function getAdminAccessContext(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AdminAccessContext> {
  const [userResult, rolesResult] = await Promise.all([
    supabase.from("users").select("is_admin").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role_key").eq("user_id", userId),
  ]);

  const isAdmin = Boolean(userResult.data?.is_admin);
  const roles = normalizeAdminRoles((rolesResult.data ?? []).map((row) => row.role_key));

  return {
    userId,
    isAdmin,
    roles,
    permissions: resolveAdminPermissions(isAdmin, roles),
  };
}

export function requireAdminPermission(
  context: AdminAccessContext,
  permission: AdminPermission
): boolean {
  return hasAdminPermission(permission, context.permissions);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { AdminPermission } from "@/types";
import { getAdminAccessContext, requireAdminPermission } from "@/lib/admin/permissions";

export async function hasAdminPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  permission: AdminPermission
): Promise<boolean> {
  const context = await getAdminAccessContext(supabase, userId);
  return requireAdminPermission(context, permission);
}

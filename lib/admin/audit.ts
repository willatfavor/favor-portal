import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

interface AuditInput {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Json;
}

export async function logAdminAudit(
  supabase: SupabaseClient<Database>,
  input: AuditInput
): Promise<void> {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    details: input.details ?? {},
  });

  if (error) {
    console.error("Failed to write admin audit log:", error.message);
  }
}

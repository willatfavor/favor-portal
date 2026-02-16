import type { Tables } from "@/types/database";
import type {
  ActivityEvent,
  CommunicationTemplate,
  ContentItem,
  Gift,
  SupportMessage,
  SupportTicket,
  User,
} from "@/types";

export function mapUserRow(row: Tables<"users">): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? undefined,
    blackbaudConstituentId: row.blackbaud_constituent_id ?? undefined,
    constituentType: row.constituent_type as User["constituentType"],
    lifetimeGivingTotal: Number(row.lifetime_giving_total ?? 0),
    rddAssignment: row.rdd_assignment ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at,
    lastLogin: row.last_login ?? undefined,
  };
}

export function mapGiftRow(row: Tables<"giving_cache">): Gift {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    date: row.gift_date,
    designation: row.designation,
    blackbaudGiftId: row.blackbaud_gift_id ?? undefined,
    isRecurring: Boolean(row.is_recurring),
    receiptSent: Boolean(row.receipt_sent),
    source: (row.source ?? "imported") as Gift["source"],
  };
}

export function mapContentRow(row: Tables<"portal_content">): ContentItem {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    type: row.type as ContentItem["type"],
    accessLevel: row.access_level as ContentItem["accessLevel"],
    date: row.published_at ?? row.updated_at ?? row.created_at,
    author: row.author,
    tags: row.tags ?? [],
    coverImage: row.cover_image ?? undefined,
    fileUrl: row.file_url ?? undefined,
    status: row.status as ContentItem["status"],
  };
}

export function mapSupportTicketRow(row: Tables<"support_tickets">): SupportTicket {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id ?? undefined,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status as SupportTicket["status"],
    priority: row.priority as SupportTicket["priority"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? undefined,
    requesterName: row.requester_name ?? undefined,
    requesterEmail: row.requester_email ?? undefined,
  };
}

export function mapSupportMessageRow(row: Tables<"support_messages">): SupportMessage {
  return {
    id: row.id,
    sender: row.sender as SupportMessage["sender"],
    message: row.message,
    createdAt: row.created_at,
  };
}

export function mapTemplateRow(row: Tables<"communication_templates">): CommunicationTemplate {
  return {
    id: row.id,
    channel: row.channel as CommunicationTemplate["channel"],
    name: row.name,
    subject: row.subject ?? undefined,
    content: row.content,
    status: row.status as CommunicationTemplate["status"],
    updatedAt: row.updated_at,
  };
}

export function mapActivityRow(row: Tables<"portal_activity_events">): ActivityEvent {
  return {
    id: row.id,
    type: row.type as ActivityEvent["type"],
    userId: row.user_id ?? "",
    metadata: (row.metadata as ActivityEvent["metadata"]) ?? {},
    createdAt: row.created_at,
  };
}

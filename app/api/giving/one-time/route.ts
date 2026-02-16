import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  addMockGift,
  getActiveMockUserId,
  getMockUserById,
  setMockRecurringGifts,
  getMockRecurringGifts,
  recordActivity,
} from "@/lib/mock-store";
import { mapGiftRow } from "@/lib/api/mappers";
import { logError, logInfo } from "@/lib/logger";
import type { Gift, RecurringGift } from "@/types";

const FREQUENCIES = ["one-time", "monthly", "quarterly", "annual"] as const;
type Frequency = (typeof FREQUENCIES)[number];

function computeNextChargeDate(frequency: Exclude<Frequency, "one-time">): string {
  const now = new Date();
  const next = new Date(now);
  if (frequency === "monthly") next.setMonth(now.getMonth() + 1);
  if (frequency === "quarterly") next.setMonth(now.getMonth() + 3);
  if (frequency === "annual") next.setFullYear(now.getFullYear() + 1);
  return next.toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const amount = Number(body?.amount ?? 0);
    const designation = String(body?.designation ?? "Where Most Needed");
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    const frequency = (String(body?.frequency ?? "one-time") as Frequency);

    if (!FREQUENCIES.includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    if (isDevBypass) {
      const userId = getActiveMockUserId();
      const mockUser = getMockUserById(userId);
      const gift: Gift = {
        id: `portal-gift-${Date.now()}`,
        userId,
        amount,
        date: new Date().toISOString().split("T")[0],
        designation,
        isRecurring: frequency !== "one-time",
        receiptSent: true,
        source: "portal",
      };

      addMockGift(gift);

      if (frequency !== "one-time") {
        const recurring: RecurringGift = {
          id: `rec-${Date.now()}`,
          userId,
          amount,
          frequency,
          nextChargeDate: computeNextChargeDate(frequency),
          stripeSubscriptionId: `mock-sub-${Date.now()}`,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        setMockRecurringGifts([recurring, ...getMockRecurringGifts()]);
      }

      recordActivity({
        id: `activity-${Date.now()}`,
        type: "gift_created",
        userId,
        createdAt: new Date().toISOString(),
        metadata: {
          amount,
          designation,
          recurring: frequency !== "one-time",
          actor: mockUser?.email ?? "dev",
        },
      });

      return NextResponse.json({
        success: true,
        gift,
      }, { status: 201 });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: giftRow, error: giftError } = await supabase
      .from("giving_cache")
      .insert({
        user_id: userId,
        gift_date: new Date().toISOString().split("T")[0],
        amount,
        designation,
        is_recurring: frequency !== "one-time",
        receipt_sent: true,
        source: "portal",
        note: note || null,
      })
      .select("*")
      .single();

    if (giftError) throw giftError;

    if (frequency !== "one-time") {
      const { error: recurringError } = await supabase
        .from("recurring_gifts")
        .insert({
          user_id: userId,
          amount,
          frequency,
          next_charge_date: computeNextChargeDate(frequency),
          stripe_subscription_id: `pending-${Date.now()}`,
          status: "active",
        });

      if (recurringError) {
        logError({
          event: "giving.one_time.recurring_insert_failed",
          route: "/api/giving/one-time",
          userId,
          error: recurringError,
        });
      }
    }

    await supabase.from("portal_activity_events").insert({
      user_id: userId,
      type: "gift_created",
      metadata: {
        amount,
        designation,
        recurring: frequency !== "one-time",
      },
    });

    logInfo({
      event: "giving.one_time.created",
      route: "/api/giving/one-time",
      userId,
      details: { frequency, amount },
    });

    return NextResponse.json({
      success: true,
      gift: mapGiftRow(giftRow),
    }, { status: 201 });
  } catch (error) {
    logError({ event: "giving.one_time.failed", route: "/api/giving/one-time", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

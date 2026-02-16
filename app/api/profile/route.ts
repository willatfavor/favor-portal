import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevBypass } from "@/lib/dev-mode";
import {
  getActiveMockUserId,
  getMockProfileDetailsForUser,
  getMockUserById,
  recordActivity,
  updateMockUser,
  upsertMockProfileDetails,
} from "@/lib/mock-store";
import { logError, logInfo } from "@/lib/logger";

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(value: unknown): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    if (isDevBypass) {
      const userId = getActiveMockUserId();
      const user = getMockUserById(userId);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const details = getMockProfileDetailsForUser(userId);
      return NextResponse.json({
        success: true,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone ?? "",
          street: details?.street ?? "",
          city: details?.city ?? "",
          state: details?.state ?? "",
          zip: details?.zip ?? "",
        },
      });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: userRow, error: userError }, { data: detailsRow, error: detailsError }] = await Promise.all([
      supabase
        .from("users")
        .select("first_name,last_name,email,phone")
        .eq("id", session.user.id)
        .single(),
      supabase
        .from("user_profile_details")
        .select("street,city,state,zip")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);

    if (userError || !userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (detailsError && detailsError.code !== "PGRST116") throw detailsError;

    return NextResponse.json({
      success: true,
      profile: {
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        email: userRow.email,
        phone: userRow.phone ?? "",
        street: detailsRow?.street ?? "",
        city: detailsRow?.city ?? "",
        state: detailsRow?.state ?? "",
        zip: detailsRow?.zip ?? "",
      },
    });
  } catch (error) {
    logError({ event: "profile.fetch_failed", route: "/api/profile", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const firstName = normalizeRequiredText(body?.firstName);
    const lastName = normalizeRequiredText(body?.lastName);
    const email = normalizeOptionalText(body?.email);
    const phone = normalizeOptionalText(body?.phone);
    const street = normalizeOptionalText(body?.street);
    const city = normalizeOptionalText(body?.city);
    const state = normalizeOptionalText(body?.state);
    const zip = normalizeOptionalText(body?.zip);

    if (firstName === null || lastName === null) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
    }

    if (isDevBypass) {
      const userId = getActiveMockUserId();
      const currentUser = getMockUserById(userId);
      if (!currentUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const updated = updateMockUser(userId, {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone: phone ?? undefined } : {}),
        ...(email !== undefined ? { email: email ?? currentUser.email } : {}),
      });

      upsertMockProfileDetails(userId, {
        ...(street !== undefined ? { street: street ?? undefined } : {}),
        ...(city !== undefined ? { city: city ?? undefined } : {}),
        ...(state !== undefined ? { state: state ?? undefined } : {}),
        ...(zip !== undefined ? { zip: zip ?? undefined } : {}),
      });

      recordActivity({
        id: `activity-${Date.now()}`,
        type: "profile_updated",
        userId,
        createdAt: new Date().toISOString(),
        metadata: { source: "dev" },
      });

      const details = getMockProfileDetailsForUser(userId);
      return NextResponse.json({
        success: true,
        profile: {
          firstName: updated?.firstName ?? currentUser.firstName,
          lastName: updated?.lastName ?? currentUser.lastName,
          email: updated?.email ?? currentUser.email,
          phone: updated?.phone ?? "",
          street: details?.street ?? "",
          city: details?.city ?? "",
          state: details?.state ?? "",
          zip: details?.zip ?? "",
        },
      });
    }

    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("email")
      .eq("id", session.user.id)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (email && email.toLowerCase() !== currentUser.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Email updates must be handled through authentication settings." },
        { status: 400 }
      );
    }

    const userUpdates = {
      ...(firstName !== undefined ? { first_name: firstName } : {}),
      ...(lastName !== undefined ? { last_name: lastName } : {}),
      ...(phone !== undefined ? { phone } : {}),
    };

    if (Object.keys(userUpdates).length > 0) {
      const { error: updateUserError } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", session.user.id);
      if (updateUserError) throw updateUserError;
    }

    const detailUpdates = {
      ...(street !== undefined ? { street } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(zip !== undefined ? { zip } : {}),
    };

    if (Object.keys(detailUpdates).length > 0) {
      const { error: detailError } = await supabase
        .from("user_profile_details")
        .upsert(
          {
            user_id: session.user.id,
            ...detailUpdates,
          },
          { onConflict: "user_id" }
        );
      if (detailError) throw detailError;
    }

    await supabase.from("portal_activity_events").insert({
      type: "profile_updated",
      user_id: session.user.id,
      metadata: {
        fields: Object.keys({ ...userUpdates, ...detailUpdates }),
      },
    });

    const [{ data: refreshedUser, error: refreshedUserError }, { data: refreshedDetails, error: refreshedDetailsError }] =
      await Promise.all([
        supabase
          .from("users")
          .select("first_name,last_name,email,phone")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("user_profile_details")
          .select("street,city,state,zip")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);

    if (refreshedUserError || !refreshedUser) {
      return NextResponse.json({ error: "Profile refresh failed" }, { status: 500 });
    }
    if (refreshedDetailsError && refreshedDetailsError.code !== "PGRST116") throw refreshedDetailsError;

    logInfo({
      event: "profile.updated",
      route: "/api/profile",
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      profile: {
        firstName: refreshedUser.first_name,
        lastName: refreshedUser.last_name,
        email: refreshedUser.email,
        phone: refreshedUser.phone ?? "",
        street: refreshedDetails?.street ?? "",
        city: refreshedDetails?.city ?? "",
        state: refreshedDetails?.state ?? "",
        zip: refreshedDetails?.zip ?? "",
      },
    });
  } catch (error) {
    logError({ event: "profile.update_failed", route: "/api/profile", error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

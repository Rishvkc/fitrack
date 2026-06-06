import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/init-schema";
import { settings } from "@/db/schema";

function dbErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("no such table")) {
    return "Database tables missing. Check TURSO_DATABASE_URL and redeploy.";
  }
  if (message.includes("Unauthorized") || message.includes("401")) {
    return "Turso auth failed. Check TURSO_AUTH_TOKEN in Vercel env vars.";
  }
  if (message.includes("file:") && process.env.VERCEL) {
    return "TURSO_DATABASE_URL is not set. file:local.db does not work on Vercel.";
  }
  return message || "Failed to save settings";
}

export async function GET() {
  try {
    await ensureSchema();
    const row = await db.query.settings.findFirst();
    return NextResponse.json({ settings: row ?? null });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: dbErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const body = await request.json();
    const values = {
      startWeightLbs: Number(body.start_weight_lbs),
      goalWeightLbs: Number(body.goal_weight_lbs),
      startDate: body.start_date,
      durationWeeks: Number(body.duration_weeks ?? 12),
      targetLossPctWeek: Number(body.target_loss_pct_week ?? 0.01),
      tdeeBaseline: Number(body.tdee_baseline ?? 2450),
    };

    if (
      Number.isNaN(values.startWeightLbs) ||
      Number.isNaN(values.goalWeightLbs) ||
      !values.startDate
    ) {
      return NextResponse.json(
        { error: "Invalid settings values" },
        { status: 400 }
      );
    }

    const existing = await db.query.settings.findFirst();

    if (existing) {
      await db
        .update(settings)
        .set(values)
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values(values);
    }

    const row = await db.query.settings.findFirst();
    return NextResponse.json({ success: true, settings: row });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json(
      { error: dbErrorMessage(error) },
      { status: 500 }
    );
  }
}

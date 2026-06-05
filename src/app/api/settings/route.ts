import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export async function GET() {
  try {
    const row = await db.query.settings.findFirst();
    return NextResponse.json({ settings: row ?? null });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const values = {
      startWeightLbs: Number(body.start_weight_lbs),
      goalWeightLbs: Number(body.goal_weight_lbs),
      startDate: body.start_date,
      durationWeeks: Number(body.duration_weeks ?? 12),
      targetLossPctWeek: Number(body.target_loss_pct_week ?? 0.01),
      tdeeBaseline: Number(body.tdee_baseline ?? 2450),
    };

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
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

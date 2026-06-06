import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/init-schema";
import { logEntries } from "@/db/schema";
import { verifyShortcutAuth } from "@/lib/auth";
import { upsertLogEntry } from "@/lib/log-helpers";

export async function POST(request: NextRequest) {
  if (!verifyShortcutAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const { date, weight_lbs, calories_consumed, active_calories, resting_calories } =
      body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const entry = await upsertLogEntry({
      date,
      weight_lbs: weight_lbs ?? null,
      calories_consumed: calories_consumed ?? null,
      active_calories: active_calories ?? null,
      resting_calories: resting_calories ?? null,
      data_source: "shortcut",
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("POST /api/log error:", error);
    return NextResponse.json(
      { error: "Failed to save log entry" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureSchema();
    const entries = await db.query.logEntries.findMany({
      orderBy: [desc(logEntries.date)],
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("GET /api/log error:", error);
    return NextResponse.json(
      { error: "Failed to fetch log entries" },
      { status: 500 }
    );
  }
}

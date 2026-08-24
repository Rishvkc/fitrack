import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/init-schema";
import { logEntries } from "@/db/schema";
import { upsertLogEntry } from "@/lib/log-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    await ensureSchema();
    const entry = await db.query.logEntries.findFirst({
      where: eq(logEntries.date, params.date),
    });

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("GET /api/log/[date] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch log entry" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    await ensureSchema();
    const body = await request.json();
    const patch: Parameters<typeof upsertLogEntry>[0] = {
      date: params.date,
      data_source: "manual",
    };
    if ("weight_lbs" in body) patch.weight_lbs = body.weight_lbs;
    if ("calories_consumed" in body) patch.calories_consumed = body.calories_consumed;
    if ("active_calories" in body) patch.active_calories = body.active_calories;
    if ("resting_calories" in body) patch.resting_calories = body.resting_calories;
    if ("lifting_volume_lbs" in body) {
      patch.lifting_volume_lbs = body.lifting_volume_lbs;
    }

    const entry = await upsertLogEntry(patch);

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("PATCH /api/log/[date] error:", error);
    return NextResponse.json(
      { error: "Failed to update log entry" },
      { status: 500 }
    );
  }
}

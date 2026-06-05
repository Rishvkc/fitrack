import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { logEntries } from "@/db/schema";
import { upsertLogEntry } from "@/lib/log-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
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
    const body = await request.json();
    const entry = await upsertLogEntry({
      date: params.date,
      weight_lbs: body.weight_lbs,
      calories_consumed: body.calories_consumed,
      active_calories: body.active_calories,
      resting_calories: body.resting_calories,
      data_source: "manual",
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("PATCH /api/log/[date] error:", error);
    return NextResponse.json(
      { error: "Failed to update log entry" },
      { status: 500 }
    );
  }
}

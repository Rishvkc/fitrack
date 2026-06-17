import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/init-schema";
import { logEntries } from "@/db/schema";
import { verifyShortcutAuth } from "@/lib/auth";
import { upsertLogEntry } from "@/lib/log-helpers";

/** Apple Shortcuts often wraps dictionaries or omits keys when encoding JSON. */
function normalizeShortcutBody(raw: unknown): {
  date?: string;
  weight_lbs?: number | null;
  calories_consumed?: number | null;
  active_calories?: number | null;
  resting_calories?: number | null;
} {
  let body: unknown = raw;
  if (Array.isArray(body) && body.length > 0) {
    body = body[0];
  }
  if (typeof body !== "object" || body === null) {
    return {};
  }

  const record = body as Record<string, unknown>;
  const rawDate = record.date ?? record.Date;
  let date: string | undefined;
  if (typeof rawDate === "string") {
    date = rawDate.trim();
  } else if (typeof rawDate === "number" && Number.isFinite(rawDate)) {
    date = String(rawDate);
  }

  const toOptionalNumber = (value: unknown): number | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  };

  return {
    date: date || undefined,
    weight_lbs: toOptionalNumber(record.weight_lbs ?? record.weightLbs),
    calories_consumed: toOptionalNumber(
      record.calories_consumed ?? record.caloriesConsumed
    ),
    active_calories: toOptionalNumber(
      record.active_calories ?? record.activeCalories
    ),
    resting_calories: toOptionalNumber(
      record.resting_calories ?? record.restingCalories
    ),
  };
}

async function parseShortcutJson(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

export async function POST(request: NextRequest) {
  if (!verifyShortcutAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSchema();
    let parsed: unknown;
    try {
      parsed = await parseShortcutJson(request);
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const { date, weight_lbs, calories_consumed, active_calories, resting_calories } =
      normalizeShortcutBody(parsed);

    if (!date) {
      return NextResponse.json(
        {
          error: "date is required",
          hint: "Send JSON with a date key, e.g. {\"date\":\"2026-06-07\",...}",
          received:
            parsed && typeof parsed === "object"
              ? Object.keys(parsed as object)
              : typeof parsed,
        },
        { status: 400 }
      );
    }

    const entry = await upsertLogEntry({
      date,
      weight_lbs,
      calories_consumed,
      active_calories,
      resting_calories,
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

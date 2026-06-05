import { NextRequest, NextResponse } from "next/server";
import { generateCoachBrief } from "@/lib/coach";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, regenerate } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 503 }
      );
    }

    const brief = await generateCoachBrief(date, regenerate === true);
    return NextResponse.json({ brief });
  } catch (error) {
    console.error("POST /api/coach error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate brief";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

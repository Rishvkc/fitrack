import { NextResponse } from "next/server";
import { ensureSchema } from "@/db/init-schema";

export async function POST() {
  try {
    await ensureSchema();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json({ error: "Init failed" }, { status: 500 });
  }
}

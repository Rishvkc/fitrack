import { InferenceClient } from "@huggingface/inference";
import { format, parseISO } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/init-schema";
import { logEntries } from "@/db/schema";
import {
  filterEntriesFromStartDate,
  onTrackWeight,
  rollingAvgWeight,
  targetWeeklyLossLbs,
  weightTrendLbsPerWeek,
  weeksRemaining,
} from "@/lib/calculations";

const DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

const SYSTEM_PROMPT = `You are a personal performance coach for an endurance athlete on a structured 12-week weight cut. Your job is to write a concise morning brief — 3 to 4 short paragraphs — that tells the athlete where they stand and what to focus on today. Be direct and specific. Use the athlete's name (Rish). Ground every observation in the actual numbers provided. Do not give generic nutrition or exercise advice. Do not use bullet points. Do not be a cheerleader. If they're behind, say so plainly. If they're ahead, acknowledge it without overpraising. End with one concrete, specific action for today.`;

export async function generateCoachBrief(
  date: string,
  forceRegenerate = false
): Promise<string> {
  await ensureSchema();
  const entry = await db.query.logEntries.findFirst({
    where: eq(logEntries.date, date),
  });

  if (
    !forceRegenerate &&
    entry?.coachBrief &&
    entry.coachBriefGenerated &&
    format(parseISO(entry.coachBriefGenerated), "yyyy-MM-dd") ===
    format(new Date(), "yyyy-MM-dd")
  ) {
    return entry.coachBrief;
  }

  const settings = await db.query.settings.findFirst();
  if (!settings) {
    throw new Error("Settings not configured");
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const allEntries = filterEntriesFromStartDate(
    await db.query.logEntries.findMany(),
    settings.startDate
  );
  const todayEntry = allEntries.find((e) => e.date === date);
  const targetWeeklyLoss = targetWeeklyLossLbs(settings, allEntries, date);

  const avg7 = rollingAvgWeight(allEntries, date, 7, settings.startDate);
  const priorAvg7 = rollingAvgWeight(
    allEntries,
    format(
      new Date(parseISO(date).getTime() - 7 * 86400000),
      "yyyy-MM-dd"
    ),
    7,
    settings.startDate
  );
  const onTrack = onTrackWeight(settings, allEntries, date);
  const weightDelta = avg7 != null ? avg7 - onTrack : null;
  const weeklyChange =
    avg7 != null && priorAvg7 != null ? avg7 - priorAvg7 : null;
  const trend = weightTrendLbsPerWeek(settings, allEntries);
  const weeksLeft = weeksRemaining(settings, date);

  const totalLost =
    avg7 != null ? settings.startWeightLbs - avg7 : 0;
  const totalToLose = settings.startWeightLbs - settings.goalWeightLbs;

  const notable: string[] = [];
  if (avg7 == null) {
    notable.push("Insufficient weigh-in data for 7-day average.");
  }
  if (todayEntry?.weightLbs == null) {
    notable.push("No weigh-in data for this date.");
  }

  const userPrompt = `Date: ${date}
Athlete: Rish

Goal: Cut from ${settings.startWeightLbs} lbs to ${settings.goalWeightLbs} lbs over ${settings.durationWeeks} weeks (${(settings.targetLossPctWeek * 100).toFixed(1)}% per week).
Target weekly loss: ${targetWeeklyLoss.toFixed(1)} lbs/week.

Current status:
- 7-day average weight: ${avg7 != null ? `${avg7.toFixed(1)} lbs` : "insufficient data"} (on-track weight: ${onTrack.toFixed(1)} lbs, delta: ${weightDelta != null ? `${Math.abs(weightDelta).toFixed(1)} lbs ${weightDelta <= 0 ? "ahead" : "behind"}` : "unknown"})
- Weekly avg change: ${weeklyChange != null ? `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(1)} lbs` : "unknown"} (target: ${(-targetWeeklyLoss).toFixed(1)} lbs/week)
- Prior 7-day average: ${priorAvg7 != null ? `${priorAvg7.toFixed(1)} lbs` : "insufficient data"}
- 14-day weight trend: ${trend != null ? (trend < 0 ? "down" : "up") : "unknown"} (${trend != null ? `${Math.abs(trend).toFixed(2)} lbs/week` : "N/A"})
- Weeks remaining: ${weeksLeft.toFixed(1)}
- Total lost so far (vs 7-day avg): ${totalLost.toFixed(1)} lbs of ${totalToLose.toFixed(1)} lbs goal

Notable: ${notable.length > 0 ? notable.join(" ") : "None."}

Write the morning brief.`;

  const model = process.env.HF_MODEL ?? DEFAULT_MODEL;
  const client = new InferenceClient(apiKey);

  let response;
  try {
    response = await client.chatCompletion({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("sufficient permissions")) {
      throw new Error(
        "Hugging Face token missing Inference Providers permission. Create a fine-grained token at huggingface.co/settings/tokens with 'Make calls to Inference Providers' enabled."
      );
    }
    throw error;
  }

  const brief = response.choices[0]?.message?.content ?? "";

  const now = new Date().toISOString();

  if (entry) {
    await db
      .update(logEntries)
      .set({ coachBrief: brief, coachBriefGenerated: now })
      .where(eq(logEntries.date, date));
  } else {
    await db.insert(logEntries).values({
      date,
      coachBrief: brief,
      coachBriefGenerated: now,
      dataSource: "manual",
    });
  }

  return brief;
}

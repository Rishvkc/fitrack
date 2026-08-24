import { eq } from "drizzle-orm";
import { db } from "@/db";
import { logEntries, type LogEntry } from "@/db/schema";

export interface LogInput {
  date: string;
  weight_lbs?: number | null;
  calories_consumed?: number | null;
  active_calories?: number | null;
  resting_calories?: number | null;
  lifting_volume_lbs?: number | null;
  data_source?: "shortcut" | "manual";
}

function computeTdeeAndDeficit(
  active: number | null | undefined,
  resting: number | null | undefined,
  calories: number | null | undefined
): { tdee: number | null; deficit: number | null } {
  if (active == null && resting == null) {
    return { tdee: null, deficit: null };
  }
  const tdee = (active ?? 0) + (resting ?? 0);
  const deficit = calories != null ? tdee - calories : null;
  return { tdee, deficit };
}

export async function upsertLogEntry(input: LogInput): Promise<LogEntry> {
  const existing = await db.query.logEntries.findFirst({
    where: eq(logEntries.date, input.date),
  });

  const weightLbs =
    input.weight_lbs !== undefined
      ? input.weight_lbs
      : (existing?.weightLbs ?? null);
  const caloriesConsumed =
    input.calories_consumed !== undefined
      ? input.calories_consumed
      : (existing?.caloriesConsumed ?? null);
  const activeCalories =
    input.active_calories !== undefined
      ? input.active_calories
      : (existing?.activeCalories ?? null);
  const restingCalories =
    input.resting_calories !== undefined
      ? input.resting_calories
      : (existing?.restingCalories ?? null);
  const liftingVolumeLbs =
    input.lifting_volume_lbs !== undefined
      ? input.lifting_volume_lbs
      : (existing?.liftingVolumeLbs ?? null);

  const { tdee, deficit } = computeTdeeAndDeficit(
    activeCalories,
    restingCalories,
    caloriesConsumed
  );

  const values = {
    date: input.date,
    weightLbs,
    caloriesConsumed,
    activeCalories,
    restingCalories,
    tdee,
    deficit,
    liftingVolumeLbs,
    dataSource: input.data_source ?? existing?.dataSource ?? "shortcut",
  };

  if (existing) {
    await db
      .update(logEntries)
      .set(values)
      .where(eq(logEntries.date, input.date));
  } else {
    await db.insert(logEntries).values(values);
  }

  const entry = await db.query.logEntries.findFirst({
    where: eq(logEntries.date, input.date),
  });

  return entry!;
}

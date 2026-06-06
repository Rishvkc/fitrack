import { createClient } from "@libsql/client";

let initialized = false;

export async function ensureSchema(): Promise<void> {
  if (initialized) return;

  const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_weight_lbs REAL NOT NULL,
      goal_weight_lbs REAL NOT NULL,
      start_date TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL DEFAULT 12,
      target_loss_pct_week REAL NOT NULL DEFAULT 0.01,
      tdee_baseline INTEGER NOT NULL DEFAULT 2450
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS log_entries (
      date TEXT PRIMARY KEY,
      weight_lbs REAL,
      calories_consumed INTEGER,
      active_calories INTEGER,
      resting_calories INTEGER,
      tdee INTEGER,
      deficit INTEGER,
      data_source TEXT NOT NULL DEFAULT 'shortcut',
      coach_brief TEXT,
      coach_brief_generated TEXT
    )
  `);

  initialized = true;
}

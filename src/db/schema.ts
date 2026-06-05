import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startWeightLbs: real("start_weight_lbs").notNull(),
  goalWeightLbs: real("goal_weight_lbs").notNull(),
  startDate: text("start_date").notNull(),
  durationWeeks: integer("duration_weeks").notNull().default(12),
  targetLossPctWeek: real("target_loss_pct_week").notNull().default(0.01),
  tdeeBaseline: integer("tdee_baseline").notNull().default(2450),
});

export const logEntries = sqliteTable("log_entries", {
  date: text("date").primaryKey(),
  weightLbs: real("weight_lbs"),
  caloriesConsumed: integer("calories_consumed"),
  activeCalories: integer("active_calories"),
  restingCalories: integer("resting_calories"),
  tdee: integer("tdee"),
  deficit: integer("deficit"),
  dataSource: text("data_source", { enum: ["shortcut", "manual"] })
    .notNull()
    .default("shortcut"),
  coachBrief: text("coach_brief"),
  coachBriefGenerated: text("coach_brief_generated"),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type LogEntry = typeof logEntries.$inferSelect;
export type NewLogEntry = typeof logEntries.$inferInsert;

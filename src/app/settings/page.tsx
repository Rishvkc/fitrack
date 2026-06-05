"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Settings as SettingsType } from "@/db/schema";

export default function SettingsPage() {
  const [startWeight, setStartWeight] = useState("165");
  const [goalWeight, setGoalWeight] = useState("150");
  const [startDate, setStartDate] = useState("2026-05-05");
  const [durationWeeks, setDurationWeeks] = useState("12");
  const [lossPct, setLossPct] = useState(1.0);
  const [tdeeBaseline, setTdeeBaseline] = useState("2450");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasExistingLogs, setHasExistingLogs] = useState(false);
  const [originalStartWeight, setOriginalStartWeight] = useState("");
  const [originalStartDate, setOriginalStartDate] = useState("");

  useEffect(() => {
    async function load() {
      const [settingsRes, logsRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/log"),
      ]);
      const settingsData = await settingsRes.json();
      const logsData = await logsRes.json();

      if (settingsData.settings) {
        const s: SettingsType = settingsData.settings;
        setStartWeight(String(s.startWeightLbs));
        setGoalWeight(String(s.goalWeightLbs));
        setStartDate(s.startDate);
        setDurationWeeks(String(s.durationWeeks));
        setLossPct(s.targetLossPctWeek * 100);
        setTdeeBaseline(String(s.tdeeBaseline));
        setOriginalStartWeight(String(s.startWeightLbs));
        setOriginalStartDate(s.startDate);
      }

      setHasExistingLogs((logsData.entries ?? []).length > 0);
      setLoading(false);
    }
    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_weight_lbs: Number(startWeight),
          goal_weight_lbs: Number(goalWeight),
          start_date: startDate,
          duration_weeks: Number(durationWeeks),
          target_loss_pct_week: lossPct / 100,
          tdee_baseline: Number(tdeeBaseline),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const curveChanged =
      hasExistingLogs &&
      (startWeight !== originalStartWeight || startDate !== originalStartDate);

    if (curveChanged) {
      setConfirmOpen(true);
    } else {
      saveSettings();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="startWeight">Start weight (lbs)</Label>
          <Input
            id="startWeight"
            type="number"
            step="0.1"
            value={startWeight}
            onChange={(e) => setStartWeight(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goalWeight">Goal weight (lbs)</Label>
          <Input
            id="goalWeight"
            type="number"
            step="0.1"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (weeks)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            max="52"
            value={durationWeeks}
            onChange={(e) => setDurationWeeks(e.target.value)}
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Target loss per week</Label>
            <span className="text-sm font-medium">{lossPct.toFixed(1)}%</span>
          </div>
          <Slider
            value={[lossPct]}
            onValueChange={([v]) => setLossPct(v)}
            min={0.5}
            max={2.0}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">Range: 0.5% – 2.0%</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tdee">TDEE baseline (kcal)</Label>
          <Input
            id="tdee"
            type="number"
            value={tdeeBaseline}
            onChange={(e) => setTdeeBaseline(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Your estimated maintenance calories. Used as fallback if Garmin data
            is missing.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculate goal curve?</DialogTitle>
            <DialogDescription>
              Changing start weight or start date after logging has begun will
              recalculate your entire goal curve. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                saveSettings();
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManualEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onSuccess: () => void;
}

export function ManualEntryForm({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: ManualEntryFormProps) {
  const [date, setDate] = useState(
    defaultDate ?? format(subDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [active, setActive] = useState("");
  const [resting, setResting] = useState("");
  const [liftingVolume, setLiftingVolume] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, number | null> = {};
      if (weight.trim()) body.weight_lbs = Number(weight);
      if (calories.trim()) body.calories_consumed = Number(calories);
      if (active.trim()) body.active_calories = Number(active);
      if (resting.trim()) body.resting_calories = Number(resting);
      if (liftingVolume.trim()) body.lifting_volume_lbs = Number(liftingVolume);

      const res = await fetch(`/api/log/${date}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (lbs)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="Optional"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calories">Calories consumed</Label>
            <Input
              id="calories"
              type="number"
              placeholder="Optional"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="active">Active calories burned</Label>
            <Input
              id="active"
              type="number"
              placeholder="Optional"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resting">Resting calories</Label>
            <Input
              id="resting"
              type="number"
              placeholder="Optional"
              value={resting}
              onChange={(e) => setResting(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lifting">Lifting volume (lbs)</Label>
            <Input
              id="lifting"
              type="number"
              placeholder="Optional"
              value={liftingVolume}
              onChange={(e) => setLiftingVolume(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

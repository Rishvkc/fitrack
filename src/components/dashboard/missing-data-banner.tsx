"use client";

import { AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface MissingDataBannerProps {
  date: string;
  onManualEntry: () => void;
}

export function MissingDataBanner({
  date,
  onManualEntry,
}: MissingDataBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-900">
          {format(parseISO(date), "MMM d")} weigh-in missing — excluded from
          trend
        </p>
      </div>
      <button
        onClick={onManualEntry}
        className="shrink-0 text-sm font-medium text-amber-800 underline-offset-4 hover:underline"
      >
        Enter manually →
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CoachBriefProps {
  date: string;
}

export function CoachBriefCard({ date }: CoachBriefProps) {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load brief");
      setBrief(data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load brief");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Coach brief</p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(date), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchBrief(true)}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Regenerate
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !brief && (
          <p className="text-sm text-muted-foreground">Generating brief…</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {brief && (
          <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
            {brief.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

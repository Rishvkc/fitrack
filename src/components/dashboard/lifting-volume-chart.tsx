"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeeklyLiftingSnapshot } from "@/lib/calculations";

interface LiftingVolumeChartProps {
  weeks: WeeklyLiftingSnapshot[];
}

export function LiftingVolumeChart({ weeks }: LiftingVolumeChartProps) {
  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Lifting volume trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Log lift volume in the weekly table to see your trend.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Lifting volume trend
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Weekly avg lbs per lift day
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={weeks}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={44} />
              <Tooltip
                formatter={(value: number) => [
                  `${Math.round(value).toLocaleString()} lbs avg`,
                  "Lift volume",
                ]}
              />
              <Line
                type="monotone"
                dataKey="weeklyAvgVolume"
                name="Weekly avg"
                stroke="hsl(262, 83%, 58%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

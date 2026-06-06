"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDataPoint } from "@/lib/calculations";
import { format, parseISO } from "date-fns";

interface WeightChartProps {
  data: ChartDataPoint[];
  durationWeeks: number;
}

export function WeightChart({ data, durationWeeks }: WeightChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Weight trend (7-day avg)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: durationWeeks > 16 ? 9 : 11 }}
                interval={0}
                angle={durationWeeks > 10 ? -45 : 0}
                textAnchor={durationWeeks > 10 ? "end" : "middle"}
                height={durationWeeks > 10 ? 50 : 30}
              />
              <YAxis
                domain={["dataMin - 2", "dataMax + 2"]}
                tick={{ fontSize: 11 }}
                width={40}
              />
              <Tooltip
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as ChartDataPoint | undefined;
                  if (!point) return "";
                  return `Week ${point.week} · ${format(parseISO(point.date), "MMM d, yyyy")}`;
                }}
                formatter={(value: number, name: string) => [
                  value != null ? `${value.toFixed(1)} lbs` : "—",
                  name,
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="rollingAvg"
                name="7-day avg"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="hsl(173, 58%, 39%)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="goal"
                name="Goal curve"
                stroke="hsl(0, 72%, 51%)"
                strokeWidth={1.5}
                strokeDasharray="2 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

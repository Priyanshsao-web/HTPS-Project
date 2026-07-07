"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import type { WaterData } from "@/types"

interface WaterChartProps {
  data: WaterData[]
  title?: string
}

export function WaterChart({ data, title = "Water Consumption Trend" }: WaterChartProps) {
  const chartData = data.slice(-30).map(d => ({
    date: d.report_date.slice(5),
    "DM Water (KL)": d.dm_water_consumption,
    "Raw Water (KL)": d.raw_water_consumption / 10,
  }))

  return (
    <Card className="p-4 border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="dmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.65 0.18 240)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.65 0.18 240)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rawGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.75 0.14 195)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.75 0.14 195)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "oklch(0.93 0.01 240)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="DM Water (KL)" stroke="oklch(0.65 0.18 240)" fill="url(#dmGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="Raw Water (KL)" stroke="oklch(0.75 0.14 195)" fill="url(#rawGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

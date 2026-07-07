"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import type { EfficiencyTrend } from "@/types"

interface EfficiencyChartProps {
  data: EfficiencyTrend[]
  title?: string
  showHeatRate?: boolean
}

export function EfficiencyChart({ data, title = "Efficiency Trends", showHeatRate = false }: EfficiencyChartProps) {
  const chartData = data.slice(-30).map(d => ({
    date: d.date.slice(5),
    "Boiler Eff (%)": d.boiler_efficiency,
    "Turbine Eff (%)": d.turbine_efficiency,
    "Plant Eff (%)": d.plant_efficiency,
    "Heat Rate": d.heat_rate,
  }))

  return (
    <Card className="p-4 border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis
            yAxisId="eff"
            tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
            domain={[30, 100]}
          />
          {showHeatRate && (
            <YAxis yAxisId="hr" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          )}
          <Tooltip
            contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "oklch(0.93 0.01 240)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="eff" type="monotone" dataKey="Boiler Eff (%)" stroke="oklch(0.67 0.15 163)" strokeWidth={2} dot={false} />
          <Line yAxisId="eff" type="monotone" dataKey="Turbine Eff (%)" stroke="oklch(0.65 0.18 240)" strokeWidth={2} dot={false} />
          <Line yAxisId="eff" type="monotone" dataKey="Plant Eff (%)" stroke="oklch(0.75 0.14 195)" strokeWidth={2} dot={false} />
          {showHeatRate && (
            <Line yAxisId="hr" type="monotone" dataKey="Heat Rate" stroke="oklch(0.79 0.18 75)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

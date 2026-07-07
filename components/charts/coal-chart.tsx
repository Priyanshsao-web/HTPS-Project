"use client"

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import type { FuelData } from "@/types"

interface CoalChartProps {
  data: FuelData[]
  title?: string
}

export function CoalChart({ data, title = "Coal Consumption & GCV" }: CoalChartProps) {
  const chartData = data.slice(-30).map(d => ({
    date: d.report_date.slice(5),
    "Coal (MT)": d.coal_consumption,
    "GCV (kcal/kg)": d.coal_gcv,
    "SCC (kg/kWh)": +(d.specific_coal_consumption * 1000).toFixed(0),
  }))

  return (
    <Card className="p-4 border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "oklch(0.93 0.01 240)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="Coal (MT)" fill="oklch(0.79 0.18 75 / 0.7)" radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="GCV (kcal/kg)" stroke="oklch(0.75 0.14 195)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

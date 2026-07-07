"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import type { EfficiencyData } from "@/types"

interface HeatRateChartProps {
  data: EfficiencyData[]
  title?: string
  designHR?: number
}

export function HeatRateChart({ data, title = "Heat Rate Trend", designHR = 2400 }: HeatRateChartProps) {
  const chartData = data.slice(-30).map(d => ({
    date: d.report_date.slice(5),
    "Gross HR": d.gross_heat_rate,
    "Net HR": d.net_heat_rate,
    "Station HR": d.station_heat_rate,
  }))

  return (
    <Card className="p-4 border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "oklch(0.93 0.01 240)" }}
            formatter={(val: unknown) => [`${Number(val).toFixed(0)} kcal/kWh`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={designHR} stroke="oklch(0.79 0.18 75)" strokeDasharray="4 2" label={{ value: `Design: ${designHR}`, fill: "oklch(0.79 0.18 75)", fontSize: 10 }} />
          <Line type="monotone" dataKey="Gross HR" stroke="oklch(0.63 0.24 25)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Net HR" stroke="oklch(0.79 0.18 75)" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="Station HR" stroke="oklch(0.60 0.03 240)" strokeWidth={1} strokeDasharray="3 2" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

"use client"

import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area,
} from "recharts"
import { Card } from "@/components/ui/card"
import type { GenerationTrend } from "@/types"

interface GenerationChartProps {
  data: GenerationTrend[]
  title?: string
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export function GenerationChart({ data, title = "Daily Generation Trend" }: GenerationChartProps) {
  const chartData = data.slice(-30).map(d => ({
    date: d.date.slice(5),
    "Actual (MU)": d.actual,
    "Expected (MU)": d.expected,
    "PLF (%)": d.plf,
  }))

  return (
    <Card className="p-4 border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area yAxisId="left" type="monotone" dataKey="Actual (MU)" fill="oklch(0.65 0.18 240 / 0.15)" stroke="oklch(0.65 0.18 240)" strokeWidth={2} />
          <Line yAxisId="left" type="monotone" dataKey="Expected (MU)" stroke="oklch(0.75 0.14 195)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="PLF (%)" stroke="oklch(0.79 0.18 75)" strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card } from "@/components/ui/card"
import type { LossBreakdown } from "@/types"

const COLORS = [
  "oklch(0.65 0.18 240)",
  "oklch(0.79 0.18 75)",
  "oklch(0.63 0.24 25)",
  "oklch(0.67 0.15 163)",
  "oklch(0.75 0.14 195)",
  "oklch(0.70 0.20 300)",
]

interface LossChartProps {
  data: LossBreakdown[]
  type?: "pie" | "bar"
  title?: string
}

const tooltipStyle = { backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }

export function LossChart({ data, type = "pie", title = "Loss Distribution" }: LossChartProps) {
  const chartData = data.filter(d => d.value > 0)

  return (
    <Card className="p-4 border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        {type === "pie" ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%" cy="50%" outerRadius={90}
              dataKey="value" nameKey="name"
              label={({ name, percentage }: { name?: string; percentage?: number }) => `${name}: ${(percentage ?? 0).toFixed(1)}%`}
              labelLine={false}
              fontSize={10}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: unknown) => [`${Number(val).toFixed(3)} MU`, ""]}
              contentStyle={tooltipStyle}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        ) : (
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={80} />
            <Tooltip
              formatter={(val: unknown) => [`${Number(val).toFixed(3)} MU`, "Loss"]}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  )
}

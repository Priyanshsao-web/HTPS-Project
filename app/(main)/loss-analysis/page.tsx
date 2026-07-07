"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { KPICard } from "@/components/dashboard/kpi-card"
import { LossChart } from "@/components/charts/loss-chart"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { TrendingDown, AlertTriangle, Target, Activity } from "lucide-react"
import type { LossBreakdown } from "@/types"

const RANK_COLORS = ["oklch(0.63 0.24 25)", "oklch(0.79 0.18 75)", "oklch(0.65 0.18 240)", "oklch(0.67 0.15 163)", "oklch(0.75 0.14 195)", "oklch(0.70 0.20 300)", "oklch(0.55 0.05 240)"]

export default function LossAnalysisPage() {
  const [data, setData] = useState<{
    breakdown: LossBreakdown[]
    lossTrend: { date: string; total: number; partial: number; coal: number; steam: number; expected: number; actual: number; loss_pct: number }[]
    summary: { total_expected: number; total_actual: number; total_loss: number; avg_loss_pct: number }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/loss")
      .then(async r => {
        if (!r.ok) {
          throw new Error("Failed to load loss data")
        }
        const json = await r.json()
        if (json.error) throw new Error(json.error)
        return json
      })
      .then(setData)
      .catch(err => {
        console.error(err)
        setError(err.message || "Failed to load loss data")
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Loss Analysis" subtitle="Generation loss identification and quantification" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : data && !error && (
            <>
              <KPICard title="Expected Generation" value={data.summary.total_expected} unit="MU" icon={Target} variant="blue" />
              <KPICard title="Actual Generation" value={data.summary.total_actual} unit="MU" icon={Activity} variant="green" />
              <KPICard title="Total Loss" value={data.summary.total_loss} unit="MU" icon={TrendingDown} variant="red" />
              <KPICard title="Avg Loss %" value={data.summary.avg_loss_pct} unit="%" icon={AlertTriangle} variant="amber" />
            </>
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loading ? <><Skeleton className="h-72" /><Skeleton className="h-72" /></> : data && !error && (
            <>
              <LossChart data={data.breakdown} title="Loss Contribution (90 Days)" type="pie" />
              <LossChart data={data.breakdown} title="Loss Ranking by Category" type="bar" />
            </>
          )}
        </div>

        {/* Loss trend */}
        {loading ? <Skeleton className="h-72" /> : data && !error && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">Expected vs Actual Generation Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.lossTrend.slice(-30).map(d => ({ date: d.date.slice(5), expected: d.expected, actual: d.actual, loss: d.total }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.18 240)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.65 0.18 240)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.67 0.15 163)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.67 0.15 163)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "oklch(0.93 0.01 240)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="expected" name="Expected (MU)" stroke="oklch(0.65 0.18 240)" fill="url(#expGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="actual" name="Actual (MU)" stroke="oklch(0.67 0.15 163)" fill="url(#actGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Breakdown table */}
        {loading ? <Skeleton className="h-48" /> : data && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">Loss Factor Contribution — Impact Ranking</h3>
            <div className="space-y-3">
              {data.breakdown.sort((a, b) => b.value - a.value).map((item, i) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground w-4">#{i + 1}</span>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{item.value.toFixed(3)} MU</span>
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: RANK_COLORS[i % RANK_COLORS.length], color: RANK_COLORS[i % RANK_COLORS.length] }}>
                        {item.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-1.5" style={{ "--progress-color": RANK_COLORS[i % RANK_COLORS.length] } as React.CSSProperties} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Loss % trend */}
        {loading ? <Skeleton className="h-56" /> : data && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">Daily Loss % Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.lossTrend.slice(-20).map(d => ({ date: d.date.slice(5), loss_pct: d.loss_pct }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Loss %"]} />
                <ReferenceLine y={8} stroke="oklch(0.79 0.18 75)" strokeDasharray="4 2" label={{ value: "Threshold 8%", fill: "oklch(0.79 0.18 75)", fontSize: 10 }} />
                {data.lossTrend.slice(-20).map((d, i) => null)}
                <Bar dataKey="loss_pct" name="Loss %" radius={[2, 2, 0, 0]}>
                  {data.lossTrend.slice(-20).map((d, i) => (
                    <rect key={i} fill={d.loss_pct > 8 ? "oklch(0.63 0.24 25 / 0.8)" : "oklch(0.65 0.18 240 / 0.8)"} />
                  ))}
                </Bar>
                <Bar dataKey="loss_pct" name="Loss %" fill="oklch(0.65 0.18 240 / 0.7)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  )
}

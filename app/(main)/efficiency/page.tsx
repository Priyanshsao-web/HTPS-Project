"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { EfficiencyChart } from "@/components/charts/efficiency-chart"
import { HeatRateChart } from "@/components/charts/heat-rate-chart"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts"
import { Gauge, Thermometer, Zap, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface EfficiencyMetric {
  value: number
  status: "green" | "yellow" | "red"
  target: number
}

interface EffData {
  current: Record<string, EfficiencyMetric>
  monthly: Record<string, number>
  yearly: Record<string, number>
  trend: { date: string; boiler_efficiency: number; turbine_efficiency: number; plant_efficiency: number; heat_rate: number; aux_pct: number }[]
}

const STATUS_STYLE = {
  green: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  yellow: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  red: "text-red-400 border-red-500/30 bg-red-500/10",
}
const STATUS_LABEL = { green: "GOOD", yellow: "FAIR", red: "POOR" }
const PROGRESS_COLOR = { green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500" }

const METRICS = [
  { key: "boiler_efficiency", label: "Boiler Efficiency", unit: "%", icon: Thermometer, max: 100 },
  { key: "turbine_efficiency", label: "Turbine Efficiency", unit: "%", icon: Zap, max: 50 },
  { key: "plant_efficiency", label: "Plant Efficiency", unit: "%", icon: Gauge, max: 50 },
  { key: "heat_rate", label: "Gross Heat Rate", unit: "kcal/kWh", icon: Activity, max: 3000 },
  { key: "auxiliary_pct", label: "Auxiliary Consumption", unit: "%", icon: Gauge, max: 15 },
]

export default function EfficiencyPage() {
  const [data, setData] = useState<EffData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/efficiency")
      .then(async r => {
        if (!r.ok) {
          throw new Error("Failed to load efficiency data")
        }
        const json = await r.json()
        if (json.error) throw new Error(json.error)
        return json
      })
      .then(setData)
      .catch(err => {
        console.error(err)
        setError(err.message || "Failed to load efficiency data")
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Efficiency Monitor" subtitle="Boiler, turbine and plant efficiency tracking" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {/* Current Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />) : data && !error && (
            METRICS.map(({ key, label, unit, icon: Icon, max }) => {
              const m = data.current[key] as EfficiencyMetric | undefined
              if (!m) return null
              const pct = Math.min(100, (m.value / max) * 100)
              return (
                <Card key={key} className="p-4 border-border">
                  <div className="flex items-start justify-between mb-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLE[m.status])}>
                      {STATUS_LABEL[m.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {m.value.toFixed(key === "heat_rate" ? 0 : 1)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Target: {m.target} {unit}</p>
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", PROGRESS_COLOR[m.status])} style={{ width: `${pct}%` }} />
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Current / Monthly / Yearly comparison */}
        {loading ? <Skeleton className="h-32" /> : data && !error && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Parameter</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Current</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Monthly Avg</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Yearly Avg</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Design</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { label: "Boiler Efficiency", ck: "boiler_efficiency", mk: "boiler", yk: "boiler", design: 88, unit: "%" },
                    { label: "Turbine Efficiency", ck: "turbine_efficiency", mk: "turbine", yk: "turbine", design: 42, unit: "%" },
                    { label: "Plant Efficiency", ck: "plant_efficiency", mk: "plant", yk: "plant", design: 36, unit: "%" },
                    { label: "Gross Heat Rate", ck: "heat_rate", mk: "heat_rate", yk: "heat_rate", design: 2350, unit: "kcal/kWh" },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-muted/20">
                      <td className="py-2 font-medium text-foreground">{row.label}</td>
                      <td className="py-2 text-right font-medium text-foreground">{(data.current[row.ck] as EfficiencyMetric)?.value.toFixed(row.unit === "%" ? 1 : 0)} {row.unit}</td>
                      <td className="py-2 text-right text-muted-foreground">{(data.monthly[row.mk] as number)?.toFixed(row.unit === "%" ? 1 : 0)} {row.unit}</td>
                      <td className="py-2 text-right text-muted-foreground">{(data.yearly[row.yk] as number)?.toFixed(row.unit === "%" ? 1 : 0)} {row.unit}</td>
                      <td className="py-2 text-right text-primary">{row.design} {row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Tabs defaultValue="efficiency">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="efficiency" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Efficiency Trend</TabsTrigger>
            <TabsTrigger value="heatrate" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Heat Rate</TabsTrigger>
            <TabsTrigger value="auxiliary" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Auxiliary</TabsTrigger>
          </TabsList>

          <TabsContent value="efficiency" className="mt-4">
            {loading ? <Skeleton className="h-72" /> : data && !error && (
              <EfficiencyChart
                data={data.trend.map(d => ({ date: d.date, boiler_efficiency: d.boiler_efficiency, turbine_efficiency: d.turbine_efficiency, plant_efficiency: d.plant_efficiency, heat_rate: d.heat_rate }))}
                title="Boiler / Turbine / Plant Efficiency"
              />
            )}
          </TabsContent>

          <TabsContent value="heatrate" className="mt-4">
            {loading ? <Skeleton className="h-72" /> : data && !error && (
              <HeatRateChart
                data={data.trend.map(d => ({ id: d.date, report_date: d.date, gross_heat_rate: d.heat_rate, net_heat_rate: d.heat_rate * 1.07, station_heat_rate: d.heat_rate * 1.09, auxiliary_consumption: 0, auxiliary_power_pct: d.aux_pct, boiler_efficiency: d.boiler_efficiency, turbine_efficiency: d.turbine_efficiency, plant_efficiency: d.plant_efficiency, created_at: d.date }))}
                title="Heat Rate Trend"
              />
            )}
          </TabsContent>

          <TabsContent value="auxiliary" className="mt-4">
            {loading ? <Skeleton className="h-72" /> : data && !error && (
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold mb-4">Auxiliary Consumption Trend</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.trend.slice(-30).map(d => ({ date: d.date.slice(5), aux: d.aux_pct }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[5, 12]} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Aux %"]} />
                    <ReferenceLine y={8} stroke="oklch(0.79 0.18 75)" strokeDasharray="4 2" label={{ value: "Target 8%", fill: "oklch(0.79 0.18 75)", fontSize: 10 }} />
                    <Line type="monotone" dataKey="aux" name="Aux (%)" stroke="oklch(0.75 0.14 195)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

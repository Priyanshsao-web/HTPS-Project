"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { DateFilter } from "@/components/shared/date-filter"
import { GenerationChart } from "@/components/charts/generation-chart"
import { CoalChart } from "@/components/charts/coal-chart"
import { WaterChart } from "@/components/charts/water-chart"
import { EfficiencyChart } from "@/components/charts/efficiency-chart"
import { HeatRateChart } from "@/components/charts/heat-rate-chart"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"
import type { AnalyticsFilter, GenerationTrend, FuelData, WaterData, EfficiencyTrend, EfficiencyData } from "@/types"

const COLORS = ["oklch(0.65 0.18 240)", "oklch(0.79 0.18 75)", "oklch(0.63 0.24 25)", "oklch(0.67 0.15 163)", "oklch(0.75 0.14 195)"]

export default function AnalyticsPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>(() => ({
    period: "monthly",
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  }))
  const [data, setData] = useState<{
    genTrend: GenerationTrend[]
    effTrend: EfficiencyTrend[]
    fuel: FuelData[]
    water: WaterData[]
    efficiency: EfficiencyData[]
    monthly: { month: string; generation: number; coal: number; plf: number }[]
    fuelDist: { name: string; value: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/analytics?period=${filter.period}`)
      .then(async r => {
        if (!r.ok) throw new Error("Failed to load analytics data")
        const json = await r.json()
        if (json.error) throw new Error(json.error)
        return json
      })
      .then(setData)
      .catch(err => {
        console.error(err)
        setError(err.message || "Failed to load analytics data")
      })
      .finally(() => setLoading(false))
  }, [filter.period])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Analytics" subtitle="Comprehensive plant performance analysis" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {/* Filter */}
        <Card className="p-3 border-border">
          <DateFilter value={filter} onChange={setFilter} />
        </Card>

        <Tabs defaultValue="generation">
          <TabsList className="bg-card border border-border h-auto flex-wrap">
            {["generation", "fuel", "water", "efficiency", "monthly", "distribution"].map(t => (
              <TabsTrigger key={t} value={t} className="text-xs capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="generation" className="mt-4 space-y-4">
            {loading ? <Skeleton className="h-72" /> : data && (
              <>
                <GenerationChart data={data.genTrend} title="Generation & PLF Trend" />
                <Card className="p-4 border-border">
                  <h3 className="text-sm font-semibold mb-4">PLF Trend</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.genTrend.slice(-30).map(d => ({ date: d.date.slice(5), plf: d.plf }))}>
                      <defs>
                        <linearGradient id="plfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.67 0.15 163)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="oklch(0.67 0.15 163)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="plf" name="PLF (%)" stroke="oklch(0.67 0.15 163)" fill="url(#plfGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="fuel" className="mt-4 space-y-4">
            {loading ? <Skeleton className="h-72" /> : data && (
              <>
                <CoalChart data={data.fuel} title="Coal Consumption & GCV Trend" />
                <Card className="p-4 border-border">
                  <h3 className="text-sm font-semibold mb-4">Specific Coal Consumption Trend</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.fuel.slice(-30).map(d => ({ date: d.report_date.slice(5), scc: d.specific_coal_consumption }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="scc" name="SCC (kg/kWh)" stroke="oklch(0.79 0.18 75)" fill="oklch(0.79 0.18 75 / 0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="water" className="mt-4">
            {loading ? <Skeleton className="h-72" /> : data && <WaterChart data={data.water} title="Water Consumption Analysis" />}
          </TabsContent>

          <TabsContent value="efficiency" className="mt-4 space-y-4">
            {loading ? <><Skeleton className="h-72" /><Skeleton className="h-72" /></> : data && (
              <>
                <EfficiencyChart data={data.effTrend} title="Efficiency Trends" showHeatRate />
                <HeatRateChart data={data.efficiency} title="Heat Rate Trend" />
              </>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            {loading ? <Skeleton className="h-72" /> : data && (
              <Card className="p-4 border-border">
                <h3 className="text-sm font-semibold mb-4">Monthly Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.monthly} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis yAxisId="gen" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="plf" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="gen" dataKey="generation" name="Generation (MU)" fill="oklch(0.65 0.18 240 / 0.8)" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="plf" dataKey="plf" name="PLF (%)" fill="oklch(0.67 0.15 163 / 0.8)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="distribution" className="mt-4">
            {loading ? <Skeleton className="h-72" /> : data && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="p-4 border-border">
                  <h3 className="text-sm font-semibold mb-4">Fuel Consumption Distribution</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.fuelDist} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}%`} fontSize={11}>
                        {data.fuelDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => [`${v}%`, ""]} contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-4 border-border">
                  <h3 className="text-sm font-semibold mb-4">Aux. Consumption Trend</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.effTrend.slice(-20).map(d => ({ date: d.date.slice(5), aux: d.aux_pct ?? 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="aux" name="Aux. (%)" stroke="oklch(0.75 0.14 195)" fill="oklch(0.75 0.14 195 / 0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

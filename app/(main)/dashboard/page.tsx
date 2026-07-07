"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { KPICard } from "@/components/dashboard/kpi-card"
import { GenerationChart } from "@/components/charts/generation-chart"
import { CoalChart } from "@/components/charts/coal-chart"
import { WaterChart } from "@/components/charts/water-chart"
import { EfficiencyChart } from "@/components/charts/efficiency-chart"
import { HeatRateChart } from "@/components/charts/heat-rate-chart"
import { LossChart } from "@/components/charts/loss-chart"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Zap, Flame, Droplets, FlaskConical, Activity,
  Thermometer, Gauge, TrendingDown, AlertTriangle, Brain,
} from "lucide-react"
import type { DashboardKPI, GenerationTrend, EfficiencyTrend, FuelData, WaterData, EfficiencyData, InsightItem, LossBreakdown } from "@/types"

interface DashboardData {
  kpi: DashboardKPI
  genTrend: GenerationTrend[]
  fuel: FuelData[]
  water: WaterData[]
  effTrend: EfficiencyTrend[]
  efficiency: EfficiencyData[]
  insights: InsightItem[]
}

const SEVERITY_STYLE = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async r => {
        if (!r.ok) {
          throw new Error("Failed to load dashboard data")
        }
        const json = await r.json()
        if (json.error) throw new Error(json.error)
        return json
      })
      .then(setData)
      .catch(err => {
        console.error(err)
        setError(err.message || "Failed to load dashboard data")
      })
      .finally(() => setLoading(false))
  }, [])

  const lossBreakdown: LossBreakdown[] = []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Dashboard" subtitle="CSPGCL HTPS Korba — Real-time Plant Overview" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />) : data && !error && data.kpi ? (
            <>
              <KPICard title="Generation Today" value={data.kpi.generation_today} unit="MU" icon={Zap} variant="blue" trend={2.4} subtitle={`MTD: ${data.kpi.generation_mtd} MU`} />
              <KPICard title="Coal Consumed" value={data.kpi.coal_consumed.toFixed(0)} unit="MT" icon={Flame} variant="amber" trend={-1.2} subtitle={`GCV: ${data.kpi.coal_gcv.toFixed(0)} kcal/kg`} />
              <KPICard title="DM Water" value={data.kpi.dm_water_consumed.toFixed(1)} unit="KL" icon={Droplets} variant="cyan" subtitle="Makeup: 1.2%" />
              <KPICard title="Oil Consumed" value={data.kpi.oil_consumed.toFixed(3)} unit="KL" icon={FlaskConical} variant="purple" />
              <KPICard title="PLF" value={data.kpi.plf.toFixed(1)} unit="%" icon={Activity} variant={data.kpi.plf >= 70 ? "green" : data.kpi.plf >= 55 ? "amber" : "red"} trend={1.1} />
              <KPICard title="Heat Rate" value={data.kpi.heat_rate.toFixed(0)} unit="kcal/kWh" icon={Thermometer} variant={data.kpi.heat_rate <= 2400 ? "green" : data.kpi.heat_rate <= 2500 ? "amber" : "red"} subtitle="Design: 2400" />
              <KPICard title="Efficiency" value={data.kpi.efficiency.toFixed(1)} unit="%" icon={Gauge} variant={data.kpi.efficiency >= 36 ? "green" : data.kpi.efficiency >= 33 ? "amber" : "red"} />
              <KPICard title="Total Loss" value={data.kpi.total_loss.toFixed(3)} unit="MU" icon={TrendingDown} variant="red" subtitle="Today" />
            </>
          ) : null}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loading ? <><Skeleton className="h-72" /><Skeleton className="h-72" /></> : data && !error && (
            <>
              <GenerationChart data={data.genTrend} />
              <CoalChart data={data.fuel} />
            </>
          )}
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />) : data && !error && (
            <>
              <WaterChart data={data.water} />
              <HeatRateChart data={data.efficiency} />
              <EfficiencyChart data={data.effTrend} />
            </>
          )}
        </div>

        {/* Bottom row: Loss + AI Insights */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loading ? <><Skeleton className="h-72" /><Skeleton className="h-72" /></> : data && !error && (
            <>
              <LossChart data={lossBreakdown} title="Loss Distribution Today" />
              <Card className="p-4 border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
                  <Badge variant="outline" className="ml-auto text-xs text-primary border-primary/30">Live</Badge>
                </div>
                <div className="space-y-3 max-h-56 overflow-y-auto">
                  {data.insights.map(insight => (
                    <div key={insight.id} className={`p-3 rounded-lg border text-xs ${SEVERITY_STYLE[insight.severity]}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {insight.severity === "critical" && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        <span className="font-semibold">{insight.title}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] capitalize">{insight.type}</Badge>
                      </div>
                      <p className="opacity-90 mb-2">{insight.description}</p>
                      {insight.recommendations.length > 0 && (
                        <ul className="space-y-0.5 opacity-80">
                          {insight.recommendations.slice(0, 2).map((r, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="shrink-0 mt-0.5">→</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

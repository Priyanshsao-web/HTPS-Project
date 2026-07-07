"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { KPICard } from "@/components/dashboard/kpi-card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell,
} from "recharts"
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Alert } from "@/types"

const SEV_STYLE = {
  critical: "text-red-400 bg-red-400/10 border-red-500/20",
  high: "text-orange-400 bg-orange-400/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-500/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-500/20",
}

export default function AnomaliesPage() {
  const [data, setData] = useState<{
    alerts: Alert[]
    byType: { name: string; count: number }[]
    hrAnomalies: { date: string; heat_rate: number; design: number; deviation: number; anomaly: boolean }[]
    coalAnomalies: { date: string; scc: number; threshold: number; anomaly: boolean }[]
    summary: { total: number; active: number; resolved: number; critical: number; high: number; medium: number; low: number }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/anomalies")
      .then(async r => {
        if (!r.ok) {
          throw new Error("Failed to load anomalies data")
        }
        const json = await r.json()
        if (json.error) throw new Error(json.error)
        return json
      })
      .then(setData)
      .catch(err => {
        console.error(err)
        setError(err.message || "Failed to load anomalies data")
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Anomaly Detection" subtitle="Automated detection of abnormal plant parameters" />
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
              <KPICard title="Total Alerts" value={data.summary.total} icon={ShieldAlert} variant="blue" />
              <KPICard title="Active Alerts" value={data.summary.active} icon={AlertTriangle} variant="red" />
              <KPICard title="Critical" value={data.summary.critical} icon={AlertTriangle} variant="red" />
              <KPICard title="Resolved" value={data.summary.resolved} icon={CheckCircle} variant="green" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Alert by type */}
          {loading ? <Skeleton className="h-64" /> : data && !error && (
            <Card className="p-4 border-border">
              <h3 className="text-sm font-semibold mb-4">Alerts by Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byType} layout="vertical" margin={{ top: 5, right: 10, left: 70, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" name="Alerts" fill="oklch(0.63 0.24 25 / 0.7)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Severity breakdown */}
          {loading ? <Skeleton className="h-64" /> : data && !error && (
            <Card className="p-4 border-border">
              <h3 className="text-sm font-semibold mb-4">Alert Severity Distribution</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Critical", count: data.summary.critical, style: SEV_STYLE.critical },
                  { label: "High", count: data.summary.high, style: SEV_STYLE.high },
                  { label: "Medium", count: data.summary.medium, style: SEV_STYLE.medium },
                  { label: "Low", count: data.summary.low, style: SEV_STYLE.low },
                ].map(s => (
                  <div key={s.label} className={cn("p-4 rounded-lg border text-center", s.style)}>
                    <p className="text-3xl font-bold">{s.count}</p>
                    <p className="text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Heat rate anomaly chart */}
        {loading ? <Skeleton className="h-64" /> : data && !error && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">Heat Rate Anomaly Detection</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.hrAnomalies.slice(-20)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} formatter={(v: unknown) => [`${Number(v).toFixed(0)} kcal/kWh`, ""]} />
                <ReferenceLine y={2400} stroke="oklch(0.79 0.18 75)" strokeDasharray="4 2" label={{ value: "Design: 2400", fill: "oklch(0.79 0.18 75)", fontSize: 10 }} />
                <ReferenceLine y={2500} stroke="oklch(0.63 0.24 25)" strokeDasharray="4 2" label={{ value: "Alert: 2500", fill: "oklch(0.63 0.24 25)", fontSize: 10 }} />
                <Line type="monotone" dataKey="heat_rate" name="Gross HR" stroke="oklch(0.65 0.18 240)" strokeWidth={2} dot={({ cx, cy, payload }) => payload.anomaly ? <circle key={cx} cx={cx} cy={cy} r={5} fill="oklch(0.63 0.24 25)" stroke="oklch(0.63 0.24 25)" /> : <circle key={cx} cx={cx} cy={cy} r={2} fill="oklch(0.65 0.18 240)" />} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Alert log table */}
        {loading ? <Skeleton className="h-64" /> : data && !error && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">Alert Log</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-xs text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Type</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Severity</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Description</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.alerts.slice(0, 15).map(alert => (
                    <TableRow key={alert.id} className="border-border hover:bg-muted/20">
                      <TableCell className="text-xs text-muted-foreground">{alert.alert_date}</TableCell>
                      <TableCell className="text-xs font-medium capitalize">{alert.alert_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", SEV_STYLE[alert.severity])}>{alert.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{alert.description}</TableCell>
                      <TableCell>
                        {alert.is_resolved
                          ? <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 bg-emerald-500/10"><CheckCircle className="w-2.5 h-2.5 mr-1" />Resolved</Badge>
                          : <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/20 bg-amber-500/10"><Clock className="w-2.5 h-2.5 mr-1" />Active</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

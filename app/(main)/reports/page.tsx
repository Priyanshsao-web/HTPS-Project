"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { FileText, FileSpreadsheet, Download, Loader2, Calendar, BarChart3, Zap, Droplets, Flame } from "lucide-react"

interface ReportSummary {
  period: string
  date_range: { from: string; to: string }
  generation: { total: number; avg_daily: number; avg_plf: number; availability: number }
  fuel: { total_coal: number; avg_gcv: number; avg_scc: number; total_oil: number }
  efficiency: { avg_heat_rate: number; avg_boiler_eff: number; avg_turbine_eff: number; avg_plant_eff: number; avg_aux_pct: number }
  loss: { total_loss: number; avg_loss_pct: number }
  water: { total_dm: number; avg_makeup_pct: number }
}

const REPORT_TYPES = [
  { key: "daily", label: "Daily Report", icon: Calendar, desc: "Single day operational summary" },
  { key: "weekly", label: "Weekly Report", icon: Calendar, desc: "7-day performance report" },
  { key: "monthly", label: "Monthly Report", icon: BarChart3, desc: "30-day comprehensive analysis" },
  { key: "yearly", label: "Annual Report", icon: BarChart3, desc: "Full year performance review" },
]

const SummaryRow = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
  <div className="flex justify-between py-2 border-b border-border text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : value}{unit ? ` ${unit}` : ""}</span>
  </div>
)

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [activeType, setActiveType] = useState("monthly")

  const fetchReport = async (type: string) => {
    setLoading(true)
    setActiveType(type)
    try {
      const res = await fetch(`/api/reports?type=${type}`)
      const d = await res.json()
      setSummary(d.summary)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: "pdf" | "excel") => {
    toast.info(`Generating ${format.toUpperCase()} report...`)
    // Simulate export
    setTimeout(() => {
      toast.success(`${activeType.charAt(0).toUpperCase() + activeType.slice(1)} report exported as ${format.toUpperCase()}`)
    }, 1500)
  }



  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Reports" subtitle="Generate and export operational reports" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Report Type Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {REPORT_TYPES.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => fetchReport(key)}
              className={`p-4 rounded-lg border text-left transition-all ${activeType === key ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
            >
              <Icon className={`w-5 h-5 mb-2 ${activeType === key ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* Export buttons */}
        {summary && (
          <Card className="p-4 border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">{summary.period} Report</p>
              <p className="text-xs text-muted-foreground">{summary.date_range.from} to {summary.date_range.to}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-2" onClick={() => exportReport("pdf")}>
                <FileText className="w-3.5 h-3.5" />Export PDF
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-2" onClick={() => exportReport("excel")}>
                <FileSpreadsheet className="w-3.5 h-3.5" />Export Excel
              </Button>
            </div>
          </Card>
        )}

        {!summary && !loading && (
          <Card className="p-8 border-border flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">Select a report type above</p>
            <p className="text-xs text-muted-foreground mt-1">Click on Daily, Weekly, Monthly, or Annual to generate a report</p>
            <Button className="mt-4" onClick={() => fetchReport("monthly")}>Generate Monthly Report</Button>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : summary && (
          <Tabs defaultValue="generation">
            <TabsList className="bg-card border border-border">
              {["generation", "fuel", "efficiency", "water"].map(t => (
                <TabsTrigger key={t} value={t} className="text-xs capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="generation" className="mt-4">
              <Card className="p-4 border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Generation Summary</h3>
                  <Badge variant="outline" className="ml-auto text-[10px] capitalize text-primary border-primary/30">{summary.period}</Badge>
                </div>
                <SummaryRow label="Total Generation" value={summary.generation.total} unit="MU" />
                <SummaryRow label="Average Daily Generation" value={summary.generation.avg_daily} unit="MU" />
                <SummaryRow label="Average PLF" value={`${summary.generation.avg_plf}%`} />
                <SummaryRow label="Plant Availability" value={`${summary.generation.availability}%`} />
                <SummaryRow label="Total Loss" value={summary.loss.total_loss} unit="MU" />
                <SummaryRow label="Average Loss %" value={`${summary.loss.avg_loss_pct}%`} />
              </Card>
            </TabsContent>

            <TabsContent value="fuel" className="mt-4">
              <Card className="p-4 border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold">Fuel Summary</h3>
                </div>
                <SummaryRow label="Total Coal Consumption" value={summary.fuel.total_coal} unit="MT" />
                <SummaryRow label="Average Coal GCV" value={summary.fuel.avg_gcv} unit="kcal/kg" />
                <SummaryRow label="Average Specific Coal Consumption" value={summary.fuel.avg_scc} unit="kg/kWh" />
                <SummaryRow label="Total Oil Consumption" value={summary.fuel.total_oil} unit="KL" />
              </Card>
            </TabsContent>

            <TabsContent value="efficiency" className="mt-4">
              <Card className="p-4 border-border">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold">Efficiency Summary</h3>
                </div>
                <SummaryRow label="Average Gross Heat Rate" value={summary.efficiency.avg_heat_rate} unit="kcal/kWh" />
                <SummaryRow label="Average Boiler Efficiency" value={`${summary.efficiency.avg_boiler_eff}%`} />
                <SummaryRow label="Average Turbine Efficiency" value={`${summary.efficiency.avg_turbine_eff}%`} />
                <SummaryRow label="Average Plant Efficiency" value={`${summary.efficiency.avg_plant_eff}%`} />
                <SummaryRow label="Average Auxiliary Consumption" value={`${summary.efficiency.avg_aux_pct}%`} />
              </Card>
            </TabsContent>

            <TabsContent value="water" className="mt-4">
              <Card className="p-4 border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold">Water Summary</h3>
                </div>
                <SummaryRow label="Total DM Water Consumption" value={summary.water.total_dm} unit="KL" />
                <SummaryRow label="Average DM Makeup %" value={`${summary.water.avg_makeup_pct}%`} />
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

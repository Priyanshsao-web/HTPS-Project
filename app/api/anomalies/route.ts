import { NextRequest } from "next/server"
import { getAlerts, getRecentPlantData } from "@/lib/data"

export const dynamic = "force-dynamic"

const HEAT_RATE_DESIGN = 2400
const HEAT_RATE_ALERT = 2500
const SCC_THRESHOLD = 0.78

export async function GET(_req: NextRequest) {
  try {
    const [alerts, { fuel, efficiency }] = await Promise.all([
      getAlerts(),
      getRecentPlantData(90),
    ])
    console.log(`[API-ANOMALIES] fetched ${alerts.length} alert(s), ${efficiency.length} efficiency row(s), ${fuel.length} fuel row(s)`)

    const byTypeMap: Record<string, number> = {}
    for (const a of alerts) byTypeMap[a.alert_type] = (byTypeMap[a.alert_type] || 0) + 1
    const byType = Object.entries(byTypeMap).map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))

    const hrAnomalies = efficiency.map(row => ({
      date: row.report_date,
      heat_rate: row.gross_heat_rate,
      design: HEAT_RATE_DESIGN,
      deviation: +(row.gross_heat_rate - HEAT_RATE_DESIGN).toFixed(0),
      anomaly: row.gross_heat_rate > HEAT_RATE_ALERT,
    }))

    const coalAnomalies = fuel.map(row => ({
      date: row.report_date,
      scc: row.specific_coal_consumption,
      threshold: SCC_THRESHOLD,
      anomaly: row.specific_coal_consumption > SCC_THRESHOLD,
    }))

    const summary = {
      total: alerts.length,
      active: alerts.filter(a => !a.is_resolved).length,
      resolved: alerts.filter(a => a.is_resolved).length,
      critical: alerts.filter(a => a.severity === "critical").length,
      high: alerts.filter(a => a.severity === "high").length,
      medium: alerts.filter(a => a.severity === "medium").length,
      low: alerts.filter(a => a.severity === "low").length,
    }
    console.log(`[API-ANOMALIES] summary: total=${summary.total} active=${summary.active} hrAnomalies=${hrAnomalies.filter(h => h.anomaly).length} coalAnomalies=${coalAnomalies.filter(c => c.anomaly).length}`)

    return Response.json({ alerts, byType, hrAnomalies, coalAnomalies, summary })
  } catch (err) {
    console.error("[API-ANOMALIES] error:", err)
    return Response.json({ error: "Failed to load anomalies data" }, { status: 500 })
  }
}

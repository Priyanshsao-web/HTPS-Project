import { NextRequest } from "next/server"
import { getRecentPlantData } from "@/lib/data"
import { generateInsightsFromData } from "@/lib/insights"
import type { DashboardKPI } from "@/types"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const { generation, fuel, water, efficiency, loss } = await getRecentPlantData(365)
    const latestGen = generation[generation.length - 1]
    const latestFuel = fuel[fuel.length - 1]
    const latestWater = water[water.length - 1]
    const latestEff = efficiency[efficiency.length - 1]
    const latestLoss = loss[loss.length - 1]
    const today = new Date().toISOString().split("T")[0]
    const month = today.slice(0, 7)
    const year = today.slice(0, 4)

    const sumGeneration = (items: typeof generation) =>
      +items.reduce((sum, item) => sum + item.total_generation, 0).toFixed(3)

    const kpi: DashboardKPI = {
      generation_today: latestGen?.total_generation || 0,
      generation_mtd: sumGeneration(generation.filter(item => item.report_date.startsWith(month))),
      generation_ytd: sumGeneration(generation.filter(item => item.report_date.startsWith(year))),
      coal_consumed: latestFuel?.coal_consumption || 0,
      dm_water_consumed: latestWater?.dm_water_consumption || 0,
      oil_consumed: latestFuel?.total_oil_consumption || 0,
      plf: latestGen?.plf || 0,
      heat_rate: latestEff?.gross_heat_rate || 0,
      efficiency: latestEff?.plant_efficiency || 0,
      total_loss: latestLoss?.total_loss_mu || 0,
      auxiliary_pct: latestEff?.auxiliary_power_pct || 0,
      coal_gcv: latestFuel?.coal_gcv || 0,
    }

    console.log(`[API-DASHBOARD] KPIs computed: generation_today=${kpi.generation_today} plf=${kpi.plf} coal_consumed=${kpi.coal_consumed} total_loss=${kpi.total_loss}`)

    const chartGeneration = generation.slice(-30)
    const chartEfficiency = efficiency.slice(-30)
    const insights = generation.length || fuel.length || efficiency.length || loss.length
      ? generateInsightsFromData(generation, fuel, efficiency, loss).slice(0, 5)
      : []
    console.log(`[API-DASHBOARD] response: ${insights.length} insight(s), ${chartGeneration.length} generation point(s)`)

    return Response.json({
      kpi,
      genTrend: chartGeneration.map(item => ({
        date: item.report_date,
        actual: item.total_generation,
        expected: item.scheduled_generation || item.total_generation,
        plf: item.plf,
      })),
      fuel: fuel.slice(-30),
      water: water.slice(-30),
      effTrend: chartEfficiency.map(item => ({
        date: item.report_date,
        boiler_efficiency: item.boiler_efficiency,
        turbine_efficiency: item.turbine_efficiency,
        plant_efficiency: item.plant_efficiency,
        heat_rate: item.gross_heat_rate,
      })),
      efficiency: chartEfficiency,
      insights,
    })
  } catch (err) {
    console.error("Dashboard data error:", err)
    return Response.json({ error: "Failed to load dashboard data" }, { status: 500 })
  }
}

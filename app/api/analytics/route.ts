import { NextRequest } from "next/server"
import { getRecentPlantData } from "@/lib/data"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const period = searchParams.get("period") || "monthly"
    const limit = period === "daily" ? 1 : period === "weekly" ? 7 : period === "yearly" ? 365 : 30
    const { generation, fuel, water, efficiency, loss } = await getRecentPlantData(limit)

    const monthlyMap: Record<string, { gen: number; coal: number; plf: number; count: number }> = {}
    generation.forEach(item => {
      const month = item.report_date.slice(0, 7)
      if (!monthlyMap[month]) monthlyMap[month] = { gen: 0, coal: 0, plf: 0, count: 0 }
      const fuelRow = fuel.find(row => row.report_date === item.report_date)
      monthlyMap[month].gen += item.total_generation
      monthlyMap[month].coal += fuelRow?.coal_consumption || 0
      monthlyMap[month].plf += item.plf
      monthlyMap[month].count += 1
    })

    const hsd = fuel.reduce((sum, item) => sum + item.hsd_consumption, 0)
    const otherOil = fuel.reduce((sum, item) => sum + item.hfo_consumption + item.ldo_consumption, 0)
    const coal = fuel.reduce((sum, item) => sum + item.coal_consumption, 0)
    const totalFuel = coal + hsd + otherOil

    return Response.json({
      genTrend: generation.map(item => ({
        date: item.report_date,
        actual: item.total_generation,
        expected: item.scheduled_generation || item.total_generation,
        plf: item.plf,
        availability: item.availability_factor,
      })),
      effTrend: efficiency.map(item => ({
        date: item.report_date,
        boiler_efficiency: item.boiler_efficiency,
        turbine_efficiency: item.turbine_efficiency,
        plant_efficiency: item.plant_efficiency,
        heat_rate: item.gross_heat_rate,
        aux_pct: item.auxiliary_power_pct,
      })),
      fuel,
      water,
      efficiency,
      loss,
      monthly: Object.entries(monthlyMap).map(([month, value]) => ({
        month,
        generation: +value.gen.toFixed(2),
        coal: +(value.coal / value.count).toFixed(0),
        plf: +(value.plf / value.count).toFixed(1),
      })),
      fuelDist: totalFuel > 0 ? [
        { name: "Coal", value: +((coal / totalFuel) * 100).toFixed(1) },
        { name: "HSD", value: +((hsd / totalFuel) * 100).toFixed(1) },
        { name: "HFO/LDO", value: +((otherOil / totalFuel) * 100).toFixed(1) },
      ] : [],
    })
  } catch (err) {
    console.error("Analytics data error:", err)
    return Response.json({ error: "Failed to load analytics data" }, { status: 500 })
  }
}

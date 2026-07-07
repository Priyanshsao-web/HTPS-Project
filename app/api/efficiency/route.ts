import { NextRequest } from "next/server"
import { getRecentPlantData } from "@/lib/data"

export const dynamic = "force-dynamic"

function getStatus(value: number, good: number, warn: number, invert = false) {
  if (invert) {
    if (value <= good) return "green"
    if (value <= warn) return "yellow"
    return "red"
  }
  if (value >= good) return "green"
  if (value >= warn) return "yellow"
  return "red"
}

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export async function GET(_req: NextRequest) {
  const { efficiency } = await getRecentPlantData(365)
  const latest = efficiency[efficiency.length - 1]
  const lastMonth = efficiency.slice(-30)
  const lastYear = efficiency

  const current = {
    boiler_efficiency: { value: latest?.boiler_efficiency || 0, status: getStatus(latest?.boiler_efficiency || 0, 88, 85), target: 88 },
    turbine_efficiency: { value: latest?.turbine_efficiency || 0, status: getStatus(latest?.turbine_efficiency || 0, 42, 39), target: 42 },
    plant_efficiency: { value: latest?.plant_efficiency || 0, status: getStatus(latest?.plant_efficiency || 0, 36, 33), target: 36 },
    heat_rate: { value: latest?.gross_heat_rate || 0, status: getStatus(latest?.gross_heat_rate || 0, 2350, 2500, true), target: 2350 },
    auxiliary_pct: { value: latest?.auxiliary_power_pct || 0, status: getStatus(latest?.auxiliary_power_pct || 0, 8, 9, true), target: 8 },
  }

  const monthly = {
    boiler: +avg(lastMonth.map(item => item.boiler_efficiency)).toFixed(2),
    turbine: +avg(lastMonth.map(item => item.turbine_efficiency)).toFixed(2),
    plant: +avg(lastMonth.map(item => item.plant_efficiency)).toFixed(2),
    heat_rate: +avg(lastMonth.map(item => item.gross_heat_rate)).toFixed(0),
  }

  const yearly = {
    boiler: +avg(lastYear.map(item => item.boiler_efficiency)).toFixed(2),
    turbine: +avg(lastYear.map(item => item.turbine_efficiency)).toFixed(2),
    plant: +avg(lastYear.map(item => item.plant_efficiency)).toFixed(2),
    heat_rate: +avg(lastYear.map(item => item.gross_heat_rate)).toFixed(0),
  }

  return Response.json({
    current,
    monthly,
    yearly,
    trend: efficiency.map(item => ({
      date: item.report_date,
      boiler_efficiency: item.boiler_efficiency,
      turbine_efficiency: item.turbine_efficiency,
      plant_efficiency: item.plant_efficiency,
      heat_rate: item.gross_heat_rate,
      aux_pct: item.auxiliary_power_pct,
    })),
  })
}

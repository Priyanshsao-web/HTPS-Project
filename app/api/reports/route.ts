import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get("type") || "daily"
  const format = searchParams.get("format") || "json"
  void format

  const summary = {
    period: type,
    date_range: {
      from: "",
      to: "",
    },
    generation: {
      total: 0,
      avg_daily: 0,
      avg_plf: 0,
      availability: 0,
    },
    fuel: {
      total_coal: 0,
      avg_gcv: 0,
      avg_scc: 0,
      total_oil: 0,
    },
    efficiency: {
      avg_heat_rate: 0,
      avg_boiler_eff: 0,
      avg_turbine_eff: 0,
      avg_plant_eff: 0,
      avg_aux_pct: 0,
    },
    loss: {
      total_loss: 0,
      avg_loss_pct: 0,
    },
    water: {
      total_dm: 0,
      avg_makeup_pct: 0,
    },
    insights: [],
  }

  return Response.json({ summary, generation: [], fuel: [], water: [], efficiency: [], loss: [] })
}

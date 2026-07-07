import { NextRequest } from "next/server"
import { getRecentPlantData } from "@/lib/data"
import type { LossAnalysis } from "@/types"

export const dynamic = "force-dynamic"

const CATEGORIES: { key: keyof LossAnalysis; name: string; color: string }[] = [
  { key: "partial_loading_loss", name: "Partial Loading", color: "oklch(0.63 0.24 25)" },
  { key: "coal_quality_loss", name: "Coal Quality", color: "oklch(0.79 0.18 75)" },
  { key: "steam_pressure_loss", name: "Steam Pressure", color: "oklch(0.65 0.18 240)" },
  { key: "o2_loss", name: "Excess O2", color: "oklch(0.67 0.15 163)" },
  { key: "ash_handling_loss", name: "Ash Handling", color: "oklch(0.75 0.14 195)" },
  { key: "auxiliary_increase_loss", name: "Auxiliary Increase", color: "oklch(0.70 0.20 300)" },
  { key: "other_losses", name: "Other / Unattributed", color: "oklch(0.55 0.05 240)" },
]

export async function GET(_req: NextRequest) {
  try {
    const { loss } = await getRecentPlantData(90)
    console.log(`[API-LOSS] fetched ${loss.length} loss_analysis row(s)`)

    const totals = CATEGORIES.map(c => loss.reduce((sum, row) => sum + (row[c.key] as number), 0))
    const totalLossSum = totals.reduce((a, b) => a + b, 0)
    const breakdown = CATEGORIES.map((c, i) => ({
      name: c.name,
      value: +totals[i].toFixed(3),
      percentage: totalLossSum > 0 ? +((totals[i] / totalLossSum) * 100).toFixed(1) : 0,
      color: c.color,
    })).filter(b => b.value > 0)

    const lossTrend = loss.map(row => ({
      date: row.report_date,
      total: row.total_loss_mu,
      partial: row.partial_loading_loss,
      coal: row.coal_quality_loss,
      steam: row.steam_pressure_loss,
      expected: row.expected_generation,
      actual: row.actual_generation,
      loss_pct: row.expected_generation > 0 ? +((row.total_loss_mu / row.expected_generation) * 100).toFixed(1) : 0,
    }))

    const total_expected = +loss.reduce((sum, row) => sum + row.expected_generation, 0).toFixed(3)
    const total_actual = +loss.reduce((sum, row) => sum + row.actual_generation, 0).toFixed(3)
    const total_loss = +loss.reduce((sum, row) => sum + row.total_loss_mu, 0).toFixed(3)
    const avg_loss_pct = total_expected > 0 ? +((total_loss / total_expected) * 100).toFixed(1) : 0

    console.log(`[API-LOSS] summary: expected=${total_expected}, actual=${total_actual}, loss=${total_loss}, avg%=${avg_loss_pct}`)

    return Response.json({
      breakdown,
      lossTrend,
      summary: { total_expected, total_actual, total_loss, avg_loss_pct },
    })
  } catch (err) {
    console.error("[API-LOSS] error:", err)
    return Response.json({ error: "Failed to load loss data" }, { status: 500 })
  }
}

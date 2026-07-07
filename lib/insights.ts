import type { DailyGeneration, FuelData, EfficiencyData, LossAnalysis, InsightItem } from '@/types'
import { format } from 'date-fns'

export function generateInsightsFromData(
  gen: DailyGeneration[],
  fuel: FuelData[],
  eff: EfficiencyData[],
  loss: LossAnalysis[]
): InsightItem[] {
  const insights: InsightItem[] = []
  const today = format(new Date(), 'yyyy-MM-dd')

  if (gen.length > 0) {
    const latest = gen[gen.length - 1]
    const prev = gen[gen.length - 2]
    if (prev) {
      const diff = ((latest.total_generation - prev.total_generation) / prev.total_generation) * 100
      if (Math.abs(diff) > 5) {
        insights.push({
          id: `ins-gen-${Date.now()}`,
          date: today,
          type: 'generation',
          severity: diff < -5 ? 'warning' : 'info',
          title: diff < 0 ? 'Generation decreased' : 'Generation increased',
          description: `Generation ${diff < 0 ? 'reduced by' : 'increased by'} ${Math.abs(diff).toFixed(1)}% compared to previous day. Current: ${latest.total_generation} MU.`,
          recommendations: diff < 0
            ? ['Review unit loading schedule', 'Check for forced outages', 'Coordinate with dispatch']
            : ['Maintain current operating conditions', 'Monitor thermal parameters'],
        })
      }
    }

    if (latest.plf < 60) {
      insights.push({
        id: `ins-plf-${Date.now()}`,
        date: today,
        type: 'generation',
        severity: latest.plf < 50 ? 'critical' : 'warning',
        title: 'Low PLF detected',
        description: `Plant Load Factor at ${latest.plf.toFixed(1)}% is below acceptable threshold. Expected generation target not met.`,
        recommendations: [
          'Inspect boiler pressure control',
          'Review turbine operating conditions',
          'Optimize auxiliary load',
        ],
      })
    }
  }

  if (fuel.length > 0) {
    const latest = fuel[fuel.length - 1]
    if (latest.coal_gcv < 3400) {
      insights.push({
        id: `ins-gcv-${Date.now()}`,
        date: today,
        type: 'fuel',
        severity: latest.coal_gcv < 3200 ? 'critical' : 'warning',
        title: 'Coal quality degradation',
        description: `Coal GCV at ${latest.coal_gcv.toFixed(0)} kcal/kg is below design value. Increased specific coal consumption observed.`,
        recommendations: [
          'Notify coal procurement team',
          'Adjust mill loading to compensate',
          'Monitor boiler efficiency closely',
          'Consider coal blending strategy',
        ],
      })
    }

    if (latest.specific_coal_consumption > 0.78) {
      insights.push({
        id: `ins-scc-${Date.now()}`,
        date: today,
        type: 'fuel',
        severity: 'warning',
        title: 'High specific coal consumption',
        description: `Specific coal consumption at ${latest.specific_coal_consumption.toFixed(3)} kg/kWh exceeds benchmark of 0.78 kg/kWh.`,
        recommendations: ['Check boiler combustion optimization', 'Verify coal quality', 'Review excess air settings'],
      })
    }
  }

  if (eff.length > 0) {
    const latest = eff[eff.length - 1]
    if (latest.gross_heat_rate > 2450) {
      insights.push({
        id: `ins-hr-${Date.now()}`,
        date: today,
        type: 'efficiency',
        severity: latest.gross_heat_rate > 2550 ? 'critical' : 'warning',
        title: 'Heat rate above design value',
        description: `Gross heat rate at ${latest.gross_heat_rate.toFixed(0)} kcal/kWh. Primary cause: partial loading and condenser vacuum loss.`,
        recommendations: [
          'Inspect condenser tubes for fouling',
          'Check cooling water flow rate',
          'Verify air ingress in condenser',
          'Review turbine blade condition',
        ],
      })
    }

    if (latest.auxiliary_power_pct > 8.5) {
      insights.push({
        id: `ins-aux-${Date.now()}`,
        date: today,
        type: 'efficiency',
        severity: 'warning',
        title: 'High auxiliary power consumption',
        description: `Auxiliary consumption at ${latest.auxiliary_power_pct.toFixed(1)}% exceeds 8.5% benchmark. Investigate high-load auxiliary equipment.`,
        recommendations: [
          'Audit auxiliary equipment loading',
          'Check pump and fan efficiencies',
          'Identify opportunities for auxiliary optimization',
        ],
      })
    }
  }

  if (loss.length > 0) {
    const latest = loss[loss.length - 1]
    const lossPct = (latest.total_loss_mu / latest.expected_generation) * 100
    if (lossPct > 8) {
      const topLoss = [
        { name: 'Partial loading', val: latest.partial_loading_loss },
        { name: 'Coal quality', val: latest.coal_quality_loss },
        { name: 'Steam pressure', val: latest.steam_pressure_loss },
        { name: 'O2 deviation', val: latest.o2_loss },
      ].sort((a, b) => b.val - a.val).slice(0, 3)

      insights.push({
        id: `ins-loss-${Date.now()}`,
        date: today,
        type: 'loss',
        severity: lossPct > 15 ? 'critical' : 'warning',
        title: `Generation loss: ${latest.total_loss_mu.toFixed(2)} MU (${lossPct.toFixed(1)}%)`,
        description: `Expected: ${latest.expected_generation.toFixed(2)} MU | Actual: ${latest.actual_generation.toFixed(2)} MU | Top causes: ${topLoss.map(l => l.name).join(', ')}.`,
        recommendations: [
          `Address ${topLoss[0]?.name.toLowerCase()} - ${topLoss[0]?.val.toFixed(2)} MU loss`,
          'Inspect boiler and turbine parameters',
          'Review operating procedures for loss minimization',
        ],
      })
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: 'ins-ok',
      date: today,
      type: 'generation',
      severity: 'info',
      title: 'All parameters within normal range',
      description: 'Plant operating efficiently. No significant anomalies detected in today\'s performance.',
      recommendations: ['Continue current operational practices', 'Proceed with scheduled maintenance'],
    })
  }

  return insights
}

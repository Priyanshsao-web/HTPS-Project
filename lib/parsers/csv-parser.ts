import Papa from 'papaparse'
import type { DailyGeneration, FuelData, WaterData, EfficiencyData } from '@/types'

interface ParsedDPR {
  generation?: Partial<DailyGeneration>
  fuel?: Partial<FuelData>
  water?: Partial<WaterData>
  efficiency?: Partial<EfficiencyData>
  rawData: Record<string, string>[]
}

function parseNum(val: string | undefined): number {
  if (!val) return 0
  const n = parseFloat(val.toString().replace(/,/g, '').trim())
  return isNaN(n) ? 0 : n
}

const FIELD_MAP: Record<string, string> = {
  'date': 'report_date',
  'report date': 'report_date',
  'total generation': 'total_generation',
  'daily generation': 'total_generation',
  'generation (mu)': 'total_generation',
  'plf': 'plf',
  'plant load factor': 'plf',
  'average load': 'average_load',
  'scheduled generation': 'scheduled_generation',
  'target generation': 'scheduled_generation',
  'coal consumption': 'coal_consumption',
  'coal consumed': 'coal_consumption',
  'specific coal consumption': 'specific_coal_consumption',
  'scc': 'specific_coal_consumption',
  'coal gcv': 'coal_gcv',
  'gcv': 'coal_gcv',
  'oil consumption': 'total_oil_consumption',
  'hsd consumption': 'hsd_consumption',
  'hfo consumption': 'hfo_consumption',
  'ldo consumption': 'ldo_consumption',
  'dm water': 'dm_water_consumption',
  'dm water consumption': 'dm_water_consumption',
  'dm water makeup': 'dm_water_makeup_pct',
  'raw water': 'raw_water_consumption',
  'raw water consumption': 'raw_water_consumption',
  'gross heat rate': 'gross_heat_rate',
  'heat rate': 'gross_heat_rate',
  'net heat rate': 'net_heat_rate',
  'auxiliary consumption': 'auxiliary_consumption',
  'aux consumption': 'auxiliary_consumption',
  'auxiliary %': 'auxiliary_power_pct',
  'boiler efficiency': 'boiler_efficiency',
  'turbine efficiency': 'turbine_efficiency',
  'plant efficiency': 'plant_efficiency',
}

export function parseCSV(content: string): ParsedDPR {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  const rows = result.data
  if (!rows.length) return { rawData: [] }

  const normalized: Record<string, string>[] = rows.map(row => {
    const mapped: Record<string, string> = {}
    for (const [key, val] of Object.entries(row)) {
      const mappedKey = FIELD_MAP[key.toLowerCase()] || key
      mapped[mappedKey] = val
    }
    return mapped
  })

  const first = normalized[0]
  const date = first['report_date'] || first['date'] || new Date().toISOString().split('T')[0]

  return {
    generation: {
      report_date: date,
      total_generation: parseNum(first['total_generation']),
      plf: parseNum(first['plf']),
      average_load: parseNum(first['average_load']),
      scheduled_generation: parseNum(first['scheduled_generation']),
    },
    fuel: {
      report_date: date,
      coal_consumption: parseNum(first['coal_consumption']),
      specific_coal_consumption: parseNum(first['specific_coal_consumption']),
      coal_gcv: parseNum(first['coal_gcv']),
      hsd_consumption: parseNum(first['hsd_consumption']),
      hfo_consumption: parseNum(first['hfo_consumption']),
      ldo_consumption: parseNum(first['ldo_consumption']),
      total_oil_consumption: parseNum(first['total_oil_consumption']),
    },
    water: {
      report_date: date,
      dm_water_consumption: parseNum(first['dm_water_consumption']),
      dm_water_makeup_pct: parseNum(first['dm_water_makeup_pct']),
      raw_water_consumption: parseNum(first['raw_water_consumption']),
    },
    efficiency: {
      report_date: date,
      gross_heat_rate: parseNum(first['gross_heat_rate']),
      net_heat_rate: parseNum(first['net_heat_rate']),
      auxiliary_consumption: parseNum(first['auxiliary_consumption']),
      auxiliary_power_pct: parseNum(first['auxiliary_power_pct']),
      boiler_efficiency: parseNum(first['boiler_efficiency']),
      turbine_efficiency: parseNum(first['turbine_efficiency']),
      plant_efficiency: parseNum(first['plant_efficiency']),
    },
    rawData: normalized,
  }
}

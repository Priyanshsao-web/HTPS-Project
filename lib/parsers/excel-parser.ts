import * as XLSX from 'xlsx'

interface ParsedExcelDPR {
  report_date: string
  total_generation?: number
  plf?: number
  average_load?: number
  coal_consumption?: number
  specific_coal_consumption?: number
  coal_gcv?: number
  hsd_consumption?: number
  total_oil_consumption?: number
  dm_water_consumption?: number
  gross_heat_rate?: number
  net_heat_rate?: number
  auxiliary_consumption?: number
  auxiliary_power_pct?: number
  boiler_efficiency?: number
  turbine_efficiency?: number
  plant_efficiency?: number
  rawData: unknown[][]
  [key: string]: unknown
}

const FIELD_KEYWORDS: Record<string, string[]> = {
  total_generation: ['total generation', 'daily generation', 'generation (mu)', 'generation mu', 'total gen'],
  plf: ['plf', 'plant load factor', 'load factor'],
  average_load: ['average load', 'avg load', 'mean load'],
  coal_consumption: ['coal consumption', 'coal consumed', 'coal cons'],
  specific_coal_consumption: ['specific coal consumption', 'scc', 'sp. coal consumption'],
  coal_gcv: ['coal gcv', 'gcv of coal', 'gcv'],
  hsd_consumption: ['hsd consumption', 'hsd cons', 'hsd'],
  total_oil_consumption: ['oil consumption', 'total oil', 'oil cons'],
  dm_water_consumption: ['dm water', 'dm water consumption', 'dm makeup'],
  gross_heat_rate: ['gross heat rate', 'ghr', 'heat rate (kcal/kwh)'],
  net_heat_rate: ['net heat rate', 'nhr'],
  auxiliary_consumption: ['auxiliary consumption', 'aux consumption', 'auxiliary cons'],
  auxiliary_power_pct: ['auxiliary %', 'aux %', 'auxiliary power %'],
  boiler_efficiency: ['boiler efficiency', 'boiler eff'],
  turbine_efficiency: ['turbine efficiency', 'turbine eff'],
  plant_efficiency: ['plant efficiency', 'overall efficiency'],
}

function matchField(cellStr: string): string | null {
  const lower = cellStr.toLowerCase().trim()
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return field
  }
  return null
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export function parseExcel(buffer: Buffer): ParsedExcelDPR {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]

  const result: ParsedExcelDPR = {
    report_date: new Date().toISOString().split('T')[0],
    rawData: data,
  }

  // Scan as key-value pairs (label in col A, value in col B)
  for (const row of data) {
    const cells = row as unknown[]
    if (!cells || cells.length < 2) continue
    const label = String(cells[0] || '').trim()
    const value = cells[1]

    if (label.toLowerCase().includes('date')) {
      if (value) result.report_date = String(value).split('T')[0]
    }

    const field = matchField(label)
    if (field) {
      result[field] = toNum(value)
    }
  }

  // Also try row-based parsing (header row + data row)
  if (!result.total_generation && data.length > 1) {
    const headers = (data[0] as unknown[]).map(h => String(h || '').toLowerCase().trim())
    const dataRow = data[1] as unknown[]
    headers.forEach((header, i) => {
      const field = matchField(header)
      if (field) {
        result[field] = toNum(dataRow[i])
      }
    })
  }

  return result
}

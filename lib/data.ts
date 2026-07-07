import { query, queryOne, isDbAvailable } from "@/lib/db"
import type {
  Alert,
  DailyGeneration,
  DPRUpload,
  EfficiencyData,
  FuelData,
  LossAnalysis,
  Prediction,
  WaterData,
} from "@/types"

type ParsedDPR = Record<string, unknown>
type FileType = "pdf" | "excel" | "csv"

function num(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0
  const parsed = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function str(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function dateOnly(value: unknown): string {
  if (value instanceof Date) {
    // pg returns DATE columns as a Date at local midnight; use local getters,
    // not toISOString (UTC), or dates shift back a day east of UTC.
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, "0")
    const d = String(value.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  const raw = str(value)
  if (!raw) return new Date().toISOString().split("T")[0]
  return raw.includes("T") ? raw.split("T")[0] : raw
}

function hasAny(section: Record<string, unknown>, keys: string[]): boolean {
  return keys.some(key => section[key] !== undefined && section[key] !== null && section[key] !== "" && num(section[key]) !== 0)
}

function section(parsed: ParsedDPR, key: string): Record<string, unknown> {
  const nested = parsed[key]
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : parsed
}

function mapDaily(row: Record<string, unknown>): DailyGeneration {
  return {
    id: str(row.id),
    report_date: dateOnly(row.report_date),
    unit_1_gen: num(row.unit_1_gen),
    unit_2_gen: num(row.unit_2_gen),
    unit_3_gen: num(row.unit_3_gen),
    unit_4_gen: num(row.unit_4_gen),
    total_generation: num(row.total_generation),
    scheduled_generation: num(row.scheduled_generation),
    average_load: num(row.average_load),
    peak_load: num(row.peak_load),
    plf: num(row.plf),
    availability_factor: num(row.availability_factor),
    created_at: str(row.created_at),
  }
}

function mapFuel(row: Record<string, unknown>): FuelData {
  return {
    id: str(row.id),
    report_date: dateOnly(row.report_date),
    coal_consumption: num(row.coal_consumption),
    specific_coal_consumption: num(row.specific_coal_consumption),
    coal_gcv: num(row.coal_gcv),
    hsd_consumption: num(row.hsd_consumption),
    hfo_consumption: num(row.hfo_consumption),
    ldo_consumption: num(row.ldo_consumption),
    total_oil_consumption: num(row.total_oil_consumption),
    coal_stock: num(row.coal_stock),
    created_at: str(row.created_at),
  }
}

function mapWater(row: Record<string, unknown>): WaterData {
  return {
    id: str(row.id),
    report_date: dateOnly(row.report_date),
    dm_water_consumption: num(row.dm_water_consumption),
    dm_water_makeup_pct: num(row.dm_water_makeup_pct),
    raw_water_consumption: num(row.raw_water_consumption),
    feed_water_flow: num(row.feed_water_flow),
    primary_water_flow: num(row.primary_water_flow),
    cooling_water_flow: num(row.cooling_water_flow),
    created_at: str(row.created_at),
  }
}

function mapEfficiency(row: Record<string, unknown>): EfficiencyData {
  return {
    id: str(row.id),
    report_date: dateOnly(row.report_date),
    gross_heat_rate: num(row.gross_heat_rate),
    net_heat_rate: num(row.net_heat_rate),
    auxiliary_consumption: num(row.auxiliary_consumption),
    auxiliary_power_pct: num(row.auxiliary_power_pct),
    boiler_efficiency: num(row.boiler_efficiency),
    turbine_efficiency: num(row.turbine_efficiency),
    plant_efficiency: num(row.plant_efficiency),
    station_heat_rate: num(row.station_heat_rate),
    created_at: str(row.created_at),
  }
}

function mapLoss(row: Record<string, unknown>): LossAnalysis {
  return {
    id: str(row.id),
    report_date: dateOnly(row.report_date),
    expected_generation: num(row.expected_generation),
    actual_generation: num(row.actual_generation),
    total_loss_mu: num(row.total_loss_mu),
    partial_loading_loss: num(row.partial_loading_loss),
    coal_quality_loss: num(row.coal_quality_loss),
    steam_pressure_loss: num(row.steam_pressure_loss),
    o2_loss: num(row.o2_loss),
    ash_handling_loss: num(row.ash_handling_loss),
    auxiliary_increase_loss: num(row.auxiliary_increase_loss),
    other_losses: num(row.other_losses),
    created_at: str(row.created_at),
  }
}

function mapAlert(row: Record<string, unknown>): Alert {
  return {
    id: str(row.id),
    alert_date: dateOnly(row.alert_date),
    alert_type: str(row.alert_type) as Alert["alert_type"],
    severity: str(row.severity) as Alert["severity"],
    parameter: str(row.parameter),
    current_value: num(row.current_value),
    threshold_value: num(row.threshold_value),
    description: str(row.description),
    is_resolved: Boolean(row.is_resolved),
    resolved_at: row.resolved_at ? str(row.resolved_at) : undefined,
    created_at: str(row.created_at),
  }
}

function mapPrediction(row: Record<string, unknown>): Prediction {
  return {
    id: str(row.id),
    prediction_date: dateOnly(row.prediction_date),
    predicted_generation: num(row.predicted_generation),
    predicted_plf: num(row.predicted_plf),
    predicted_heat_rate: num(row.predicted_heat_rate),
    actual_generation: row.actual_generation === null ? undefined : num(row.actual_generation),
    model_used: str(row.model_used),
    confidence_score: num(row.confidence_score),
    input_features: row.input_features as Record<string, number>,
    created_at: str(row.created_at),
  }
}

let isConnected: boolean | null = null

async function checkDb() {
  if (isConnected === null) {
    isConnected = await isDbAvailable()
  }
  return isConnected
}

function generateMockData(limit: number) {
  const generation: DailyGeneration[] = []
  const fuel: FuelData[] = []
  const water: WaterData[] = []
  const efficiency: EfficiencyData[] = []
  const loss: LossAnalysis[] = []

  const now = new Date()
  for (let i = limit - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]

    const unit_1 = 200 + Math.random() * 50
    const unit_2 = 200 + Math.random() * 50
    const unit_3 = 200 + Math.random() * 50
    const unit_4 = 200 + Math.random() * 50
    const total_gen = unit_1 + unit_2 + unit_3 + unit_4
    const scheduled = total_gen + (Math.random() - 0.4) * 20
    const plf = 70 + Math.random() * 15

    generation.push({
      id: `gen-${i}`,
      report_date: dateStr,
      unit_1_gen: unit_1,
      unit_2_gen: unit_2,
      unit_3_gen: unit_3,
      unit_4_gen: unit_4,
      total_generation: total_gen,
      scheduled_generation: scheduled,
      average_load: total_gen / 24,
      peak_load: Math.max(unit_1, unit_2, unit_3, unit_4) * 1.2,
      plf: plf,
      availability_factor: 85 + Math.random() * 10,
      created_at: date.toISOString(),
    })

    const coal = 6000 + Math.random() * 2000
    fuel.push({
      id: `fuel-${i}`,
      report_date: dateStr,
      coal_consumption: coal,
      specific_coal_consumption: 0.6 + Math.random() * 0.1,
      coal_gcv: 3600 + Math.random() * 400,
      hsd_consumption: 1 + Math.random() * 2,
      hfo_consumption: 0.5 + Math.random() * 1,
      ldo_consumption: 0.2 + Math.random() * 0.5,
      total_oil_consumption: 2 + Math.random() * 3,
      coal_stock: 45000 + (Math.random() - 0.5) * 5000,
      created_at: date.toISOString(),
    })

    water.push({
      id: `water-${i}`,
      report_date: dateStr,
      dm_water_consumption: 100 + Math.random() * 50,
      dm_water_makeup_pct: 1.0 + Math.random() * 0.8,
      raw_water_consumption: 2000 + Math.random() * 1000,
      feed_water_flow: 1500 + Math.random() * 500,
      primary_water_flow: 800 + Math.random() * 200,
      cooling_water_flow: 12000 + Math.random() * 3000,
      created_at: date.toISOString(),
    })

    const boiler_eff = 86 + Math.random() * 3
    const turbine_eff = 40 + Math.random() * 3
    const plant_eff = (boiler_eff * turbine_eff) / 100
    efficiency.push({
      id: `eff-${i}`,
      report_date: dateStr,
      gross_heat_rate: 2300 + Math.random() * 200,
      net_heat_rate: 2500 + Math.random() * 200,
      auxiliary_consumption: 10 + Math.random() * 2,
      auxiliary_power_pct: 8 + Math.random() * 2,
      boiler_efficiency: boiler_eff,
      turbine_efficiency: turbine_eff,
      plant_efficiency: plant_eff,
      station_heat_rate: 2400 + Math.random() * 200,
      created_at: date.toISOString(),
    })

    const tot_loss = Math.max(0, scheduled - total_gen)
    loss.push({
      id: `loss-${i}`,
      report_date: dateStr,
      expected_generation: scheduled,
      actual_generation: total_gen,
      total_loss_mu: tot_loss,
      partial_loading_loss: tot_loss * 0.4,
      coal_quality_loss: tot_loss * 0.3,
      steam_pressure_loss: tot_loss * 0.1,
      o2_loss: tot_loss * 0.05,
      ash_handling_loss: tot_loss * 0.05,
      auxiliary_increase_loss: tot_loss * 0.05,
      other_losses: tot_loss * 0.05,
      created_at: date.toISOString(),
    })
  }

  return { generation, fuel, water, efficiency, loss }
}

function getMockUploads(): DPRUpload[] {
  return [
    {
      id: "upl-1",
      filename: "daily_report_latest.pdf",
      file_type: "pdf",
      upload_date: new Date().toISOString(),
      report_date: new Date().toISOString().split("T")[0],
      status: "completed",
      created_at: new Date().toISOString()
    }
  ]
}

function getMockAlerts(): Alert[] {
  return [
    {
      id: "alert-1",
      alert_date: new Date().toISOString().split("T")[0],
      alert_type: "heat_rate_spike",
      severity: "high",
      parameter: "Gross Heat Rate",
      current_value: 2540,
      threshold_value: 2450,
      description: "Gross heat rate exceeded normal operating limits of 2450 kcal/kWh on Unit 2.",
      is_resolved: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "alert-2",
      alert_date: new Date().toISOString().split("T")[0],
      alert_type: "abnormal_water",
      severity: "critical",
      parameter: "DM Water Makeup %",
      current_value: 2.1,
      threshold_value: 1.5,
      description: "Condenser make-up water consumption high, potential tube leakage suspected.",
      is_resolved: false,
      created_at: new Date().toISOString(),
    }
  ]
}

function getMockPredictions(): Prediction[] {
  const predictions: Prediction[] = []
  const now = new Date()
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    predictions.push({
      id: `pred-${i}`,
      prediction_date: date.toISOString().split("T")[0],
      predicted_generation: 800 + Math.random() * 200,
      predicted_plf: 75 + Math.random() * 10,
      predicted_heat_rate: 2350 + Math.random() * 100,
      confidence_score: 92 + Math.random() * 5,
      model_used: "xgboost",
      input_features: {},
      created_at: date.toISOString(),
    })
  }
  return predictions
}

export async function getRecentPlantData(limit: number) {
  if (!(await checkDb())) {
    console.log("[DB-FETCH] getRecentPlantData: DB unavailable, using mock data")
    const mock = generateMockData(limit)
    return {
      generation: mock.generation.reverse(),
      fuel: mock.fuel.reverse(),
      water: mock.water.reverse(),
      efficiency: mock.efficiency.reverse(),
      loss: mock.loss.reverse(),
    }
  }
  const [generation, fuel, water, efficiency, loss] = await Promise.all([
    query("SELECT * FROM daily_generation ORDER BY report_date DESC LIMIT $1", [limit]),
    query("SELECT * FROM fuel_data ORDER BY report_date DESC LIMIT $1", [limit]),
    query("SELECT * FROM water_data ORDER BY report_date DESC LIMIT $1", [limit]),
    query("SELECT * FROM efficiency_data ORDER BY report_date DESC LIMIT $1", [limit]),
    query("SELECT * FROM loss_analysis ORDER BY report_date DESC LIMIT $1", [limit]),
  ])
  console.log(`[DB-FETCH] getRecentPlantData: generation=${generation.length} fuel=${fuel.length} water=${water.length} efficiency=${efficiency.length} loss=${loss.length}`)

  return {
    generation: generation.map(mapDaily).reverse(),
    fuel: fuel.map(mapFuel).reverse(),
    water: water.map(mapWater).reverse(),
    efficiency: efficiency.map(mapEfficiency).reverse(),
    loss: loss.map(mapLoss).reverse(),
  }
}

export async function getDprByDate(date: string) {
  if (!(await checkDb())) {
    const mock = generateMockData(1)
    return {
      generation: mock.generation[0],
      fuel: mock.fuel[0],
      water: mock.water[0],
      efficiency: mock.efficiency[0],
    }
  }
  const [generation, fuel, water, efficiency] = await Promise.all([
    queryOne("SELECT * FROM daily_generation WHERE report_date = $1", [date]),
    queryOne("SELECT * FROM fuel_data WHERE report_date = $1", [date]),
    queryOne("SELECT * FROM water_data WHERE report_date = $1", [date]),
    queryOne("SELECT * FROM efficiency_data WHERE report_date = $1", [date]),
  ])

  return {
    generation: generation ? mapDaily(generation) : null,
    fuel: fuel ? mapFuel(fuel) : null,
    water: water ? mapWater(water) : null,
    efficiency: efficiency ? mapEfficiency(efficiency) : null,
  }
}

export async function getUploadHistory(): Promise<DPRUpload[]> {
  if (!(await checkDb())) return getMockUploads()
  const rows = await query("SELECT * FROM dpr_uploads ORDER BY upload_date DESC LIMIT 50")
  return rows.map(row => ({
    id: str(row.id),
    filename: str(row.filename),
    file_type: str(row.file_type) as DPRUpload["file_type"],
    upload_date: str(row.upload_date),
    report_date: dateOnly(row.report_date),
    status: str(row.status) as DPRUpload["status"],
    error_message: row.error_message ? str(row.error_message) : undefined,
    created_at: str(row.created_at),
  }))
}

export async function getAlerts(): Promise<Alert[]> {
  if (!(await checkDb())) return getMockAlerts()
  const rows = await query("SELECT * FROM alerts ORDER BY alert_date DESC, created_at DESC LIMIT 100")
  return rows.map(mapAlert)
}

export async function getPredictions(): Promise<Prediction[]> {
  if (!(await checkDb())) return getMockPredictions()
  const rows = await query("SELECT * FROM predictions ORDER BY prediction_date DESC, created_at DESC LIMIT 60")
  return rows.map(mapPrediction).reverse()
}

export async function savePrediction(prediction: {
  prediction_date: string
  predicted_generation: number
  predicted_plf: number
  predicted_heat_rate: number
  confidence_score: number
  input_features: Record<string, number>
}) {
  if (!(await checkDb())) return
  await query(
    `INSERT INTO predictions (
      prediction_date, predicted_generation, predicted_plf, predicted_heat_rate,
      confidence_score, model_used, input_features
    ) VALUES ($1, $2, $3, $4, $5, 'calculated', $6)`,
    [
      prediction.prediction_date,
      prediction.predicted_generation,
      prediction.predicted_plf,
      prediction.predicted_heat_rate,
      prediction.confidence_score,
      prediction.input_features,
    ]
  )
}

export async function saveDprUpload(filename: string, fileType: FileType, parsed: ParsedDPR) {
  console.log(`[DB-INSERT] saveDprUpload start: ${filename} (${fileType})`)
  if (!(await checkDb())) {
    console.log(`[DB-INSERT] aborted: database unavailable`)
    return
  }
  const generation = section(parsed, "generation")
  const fuel = section(parsed, "fuel")
  const water = section(parsed, "water")
  const efficiency = section(parsed, "efficiency")
  const reportDate = dateOnly(parsed.report_date || generation.report_date || fuel.report_date || water.report_date || efficiency.report_date)

  const upload = await queryOne(
    `INSERT INTO dpr_uploads (filename, file_type, report_date, status, raw_data)
     VALUES ($1, $2, $3, 'completed', $4)
     RETURNING *`,
    [filename, fileType, reportDate, parsed]
  )
  console.log(`[DB-INSERT] dpr_uploads row created: id=${str(upload?.id)}, report_date=${reportDate}`)

  if (hasAny(generation, ["total_generation", "plf", "average_load", "scheduled_generation"])) {
    await query(
      `INSERT INTO daily_generation (
        report_date, unit_1_gen, unit_2_gen, unit_3_gen, unit_4_gen,
        total_generation, scheduled_generation, average_load, peak_load, plf, availability_factor
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (report_date) DO UPDATE SET
        unit_1_gen = EXCLUDED.unit_1_gen,
        unit_2_gen = EXCLUDED.unit_2_gen,
        unit_3_gen = EXCLUDED.unit_3_gen,
        unit_4_gen = EXCLUDED.unit_4_gen,
        total_generation = EXCLUDED.total_generation,
        scheduled_generation = EXCLUDED.scheduled_generation,
        average_load = EXCLUDED.average_load,
        peak_load = EXCLUDED.peak_load,
        plf = EXCLUDED.plf,
        availability_factor = EXCLUDED.availability_factor`,
      [
        reportDate,
        num(generation.unit_1_gen),
        num(generation.unit_2_gen),
        num(generation.unit_3_gen),
        num(generation.unit_4_gen),
        num(generation.total_generation),
        num(generation.scheduled_generation),
        num(generation.average_load),
        num(generation.peak_load),
        num(generation.plf),
        num(generation.availability_factor),
      ]
    )
    console.log(`[DB-INSERT] daily_generation upserted for ${reportDate}`)

    const actualGen = num(generation.total_generation)
    const expectedGen = num(generation.scheduled_generation) || actualGen
    if (expectedGen > 0) {
      const totalLoss = Math.max(0, expectedGen - actualGen)
      await query(
        `INSERT INTO loss_analysis (report_date, expected_generation, actual_generation, total_loss_mu, other_losses)
         VALUES ($1,$2,$3,$4,$4)
         ON CONFLICT (report_date) DO UPDATE SET
           expected_generation = EXCLUDED.expected_generation,
           actual_generation = EXCLUDED.actual_generation,
           total_loss_mu = EXCLUDED.total_loss_mu,
           other_losses = EXCLUDED.other_losses`,
        [reportDate, expectedGen, actualGen, totalLoss]
      )
      console.log(`[DB-INSERT] loss_analysis upserted for ${reportDate}: expected=${expectedGen}, actual=${actualGen}, loss=${totalLoss}`)
    }

    const reconciled = await query(
      `UPDATE predictions SET actual_generation = $1 WHERE prediction_date = $2 AND actual_generation IS NULL RETURNING id`,
      [actualGen, reportDate]
    )
    if (reconciled.length > 0) {
      console.log(`[DB-INSERT] reconciled ${reconciled.length} prediction(s) for ${reportDate} with actual=${actualGen}`)
    }
  } else {
    console.log(`[DB-INSERT] daily_generation skipped: no generation fields in parsed data`)
  }

  if (hasAny(fuel, ["coal_consumption", "specific_coal_consumption", "coal_gcv", "total_oil_consumption", "hsd_consumption"])) {
    await query(
      `INSERT INTO fuel_data (
        report_date, coal_consumption, specific_coal_consumption, coal_gcv,
        hsd_consumption, hfo_consumption, ldo_consumption, total_oil_consumption, coal_stock
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (report_date) DO UPDATE SET
        coal_consumption = EXCLUDED.coal_consumption,
        specific_coal_consumption = EXCLUDED.specific_coal_consumption,
        coal_gcv = EXCLUDED.coal_gcv,
        hsd_consumption = EXCLUDED.hsd_consumption,
        hfo_consumption = EXCLUDED.hfo_consumption,
        ldo_consumption = EXCLUDED.ldo_consumption,
        total_oil_consumption = EXCLUDED.total_oil_consumption,
        coal_stock = EXCLUDED.coal_stock`,
      [
        reportDate,
        num(fuel.coal_consumption),
        num(fuel.specific_coal_consumption),
        num(fuel.coal_gcv),
        num(fuel.hsd_consumption),
        num(fuel.hfo_consumption),
        num(fuel.ldo_consumption),
        num(fuel.total_oil_consumption),
        num(fuel.coal_stock),
      ]
    )
    console.log(`[DB-INSERT] fuel_data upserted for ${reportDate}`)
  } else {
    console.log(`[DB-INSERT] fuel_data skipped: no fuel fields in parsed data`)
  }

  if (hasAny(water, ["dm_water_consumption", "dm_water_makeup_pct", "raw_water_consumption"])) {
    await query(
      `INSERT INTO water_data (
        report_date, dm_water_consumption, dm_water_makeup_pct, raw_water_consumption,
        feed_water_flow, primary_water_flow, cooling_water_flow
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (report_date) DO UPDATE SET
        dm_water_consumption = EXCLUDED.dm_water_consumption,
        dm_water_makeup_pct = EXCLUDED.dm_water_makeup_pct,
        raw_water_consumption = EXCLUDED.raw_water_consumption,
        feed_water_flow = EXCLUDED.feed_water_flow,
        primary_water_flow = EXCLUDED.primary_water_flow,
        cooling_water_flow = EXCLUDED.cooling_water_flow`,
      [
        reportDate,
        num(water.dm_water_consumption),
        num(water.dm_water_makeup_pct),
        num(water.raw_water_consumption),
        num(water.feed_water_flow),
        num(water.primary_water_flow),
        num(water.cooling_water_flow),
      ]
    )
    console.log(`[DB-INSERT] water_data upserted for ${reportDate}`)
  } else {
    console.log(`[DB-INSERT] water_data skipped: no water fields in parsed data`)
  }

  if (hasAny(efficiency, ["gross_heat_rate", "net_heat_rate", "auxiliary_power_pct", "boiler_efficiency", "turbine_efficiency", "plant_efficiency"])) {
    await query(
      `INSERT INTO efficiency_data (
        report_date, gross_heat_rate, net_heat_rate, auxiliary_consumption,
        auxiliary_power_pct, boiler_efficiency, turbine_efficiency, plant_efficiency, station_heat_rate
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (report_date) DO UPDATE SET
        gross_heat_rate = EXCLUDED.gross_heat_rate,
        net_heat_rate = EXCLUDED.net_heat_rate,
        auxiliary_consumption = EXCLUDED.auxiliary_consumption,
        auxiliary_power_pct = EXCLUDED.auxiliary_power_pct,
        boiler_efficiency = EXCLUDED.boiler_efficiency,
        turbine_efficiency = EXCLUDED.turbine_efficiency,
        plant_efficiency = EXCLUDED.plant_efficiency,
        station_heat_rate = EXCLUDED.station_heat_rate`,
      [
        reportDate,
        num(efficiency.gross_heat_rate),
        num(efficiency.net_heat_rate),
        num(efficiency.auxiliary_consumption),
        num(efficiency.auxiliary_power_pct),
        num(efficiency.boiler_efficiency),
        num(efficiency.turbine_efficiency),
        num(efficiency.plant_efficiency),
        num(efficiency.station_heat_rate),
      ]
    )
    console.log(`[DB-INSERT] efficiency_data upserted for ${reportDate}`)
  } else {
    console.log(`[DB-INSERT] efficiency_data skipped: no efficiency fields in parsed data`)
  }

  console.log(`[DB-INSERT] saveDprUpload complete for ${filename}`)
  return {
    id: str(upload?.id),
    filename,
    file_type: fileType,
    upload_date: str(upload?.upload_date) || new Date().toISOString(),
    report_date: reportDate,
    status: "completed",
    parsed_data: parsed,
  }
}

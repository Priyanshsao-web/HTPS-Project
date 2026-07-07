export interface DPRUpload {
  id: string
  filename: string
  file_type: 'pdf' | 'excel' | 'csv'
  upload_date: string
  report_date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  created_at: string
}

export interface DailyGeneration {
  id: string
  report_date: string
  unit_1_gen: number
  unit_2_gen: number
  unit_3_gen: number
  unit_4_gen: number
  total_generation: number
  scheduled_generation: number
  average_load: number
  peak_load: number
  plf: number
  availability_factor: number
  created_at: string
}

export interface FuelData {
  id: string
  report_date: string
  coal_consumption: number
  specific_coal_consumption: number
  coal_gcv: number
  hsd_consumption: number
  hfo_consumption: number
  ldo_consumption: number
  total_oil_consumption: number
  coal_stock: number
  created_at: string
}

export interface WaterData {
  id: string
  report_date: string
  dm_water_consumption: number
  dm_water_makeup_pct: number
  raw_water_consumption: number
  feed_water_flow: number
  primary_water_flow: number
  cooling_water_flow: number
  created_at: string
}

export interface BoilerData {
  id: string
  report_date: string
  unit_no: number
  boiler_pressure: number
  steam_temperature: number
  reheater_temperature: number
  feed_water_temperature: number
  o2_percentage: number
  flue_gas_temperature: number
  excess_air_pct: number
  created_at: string
}

export interface TurbineData {
  id: string
  report_date: string
  unit_no: number
  turbine_pressure: number
  turbine_exhaust_temp: number
  condenser_pressure: number
  vacuum: number
  differential_expansion: number
  lp_exhaust_temp: number
  created_at: string
}

export interface EfficiencyData {
  id: string
  report_date: string
  gross_heat_rate: number
  net_heat_rate: number
  auxiliary_consumption: number
  auxiliary_power_pct: number
  boiler_efficiency: number
  turbine_efficiency: number
  plant_efficiency: number
  station_heat_rate: number
  created_at: string
}

export interface LossAnalysis {
  id: string
  report_date: string
  expected_generation: number
  actual_generation: number
  total_loss_mu: number
  partial_loading_loss: number
  coal_quality_loss: number
  steam_pressure_loss: number
  o2_loss: number
  ash_handling_loss: number
  auxiliary_increase_loss: number
  other_losses: number
  created_at: string
}

export interface Prediction {
  id: string
  prediction_date: string
  predicted_generation: number
  predicted_plf: number
  predicted_heat_rate: number
  actual_generation?: number
  model_used: string
  confidence_score: number
  input_features: Record<string, number>
  created_at: string
}

export interface Alert {
  id: string
  alert_date: string
  alert_type: 'efficiency_drop' | 'excess_coal' | 'excess_oil' | 'abnormal_water' | 'heat_rate_spike' | 'plf_decline'
  severity: 'low' | 'medium' | 'high' | 'critical'
  parameter: string
  current_value: number
  threshold_value: number
  description: string
  is_resolved: boolean
  resolved_at?: string
  created_at: string
}

export interface DashboardKPI {
  generation_today: number
  generation_mtd: number
  generation_ytd: number
  coal_consumed: number
  dm_water_consumed: number
  oil_consumed: number
  plf: number
  heat_rate: number
  efficiency: number
  total_loss: number
  auxiliary_pct: number
  coal_gcv: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface GenerationTrend {
  date: string
  actual: number
  expected: number
  plf: number
}

export interface EfficiencyTrend {
  date: string
  boiler_efficiency: number
  turbine_efficiency: number
  plant_efficiency: number
  heat_rate: number
  aux_pct?: number
}

export interface LossBreakdown {
  name: string
  value: number
  percentage: number
  color: string
}

export interface AnalyticsFilter {
  startDate: string
  endDate: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
}

export interface InsightItem {
  id: string
  date: string
  type: 'generation' | 'efficiency' | 'fuel' | 'water' | 'loss'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  recommendations: string[]
}

export interface ReportConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
  sections: string[]
  format: 'pdf' | 'excel'
}

export interface PredictionInput {
  coal_consumption: number
  coal_gcv: number
  steam_pressure: number
  steam_temperature: number
  dm_water: number
  oil_consumption: number
  auxiliary_consumption: number
  load: number
}

export interface ModelComparison {
  model: string
  rmse: number
  mae: number
  r2_score: number
  accuracy_pct: number
}

-- HTPS Korba Power Plant Intelligence Platform
-- PostgreSQL Schema

CREATE TABLE IF NOT EXISTS dpr_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf','excel','csv')),
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  report_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_generation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  unit_1_gen DECIMAL(10,3) DEFAULT 0,
  unit_2_gen DECIMAL(10,3) DEFAULT 0,
  unit_3_gen DECIMAL(10,3) DEFAULT 0,
  unit_4_gen DECIMAL(10,3) DEFAULT 0,
  total_generation DECIMAL(10,3) NOT NULL,
  scheduled_generation DECIMAL(10,3) DEFAULT 0,
  average_load DECIMAL(10,2) DEFAULT 0,
  peak_load DECIMAL(10,2) DEFAULT 0,
  plf DECIMAL(5,2) DEFAULT 0,
  availability_factor DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  coal_consumption DECIMAL(10,2) NOT NULL,
  specific_coal_consumption DECIMAL(8,4) DEFAULT 0,
  coal_gcv DECIMAL(8,2) DEFAULT 0,
  hsd_consumption DECIMAL(8,3) DEFAULT 0,
  hfo_consumption DECIMAL(8,3) DEFAULT 0,
  ldo_consumption DECIMAL(8,3) DEFAULT 0,
  total_oil_consumption DECIMAL(8,3) DEFAULT 0,
  coal_stock DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS water_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  dm_water_consumption DECIMAL(10,2) DEFAULT 0,
  dm_water_makeup_pct DECIMAL(5,2) DEFAULT 0,
  raw_water_consumption DECIMAL(10,2) DEFAULT 0,
  feed_water_flow DECIMAL(10,2) DEFAULT 0,
  primary_water_flow DECIMAL(10,2) DEFAULT 0,
  cooling_water_flow DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boiler_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  unit_no INTEGER NOT NULL CHECK (unit_no BETWEEN 1 AND 4),
  boiler_pressure DECIMAL(8,2) DEFAULT 0,
  steam_temperature DECIMAL(8,2) DEFAULT 0,
  reheater_temperature DECIMAL(8,2) DEFAULT 0,
  feed_water_temperature DECIMAL(8,2) DEFAULT 0,
  o2_percentage DECIMAL(5,2) DEFAULT 0,
  flue_gas_temperature DECIMAL(8,2) DEFAULT 0,
  excess_air_pct DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date, unit_no)
);

CREATE TABLE IF NOT EXISTS turbine_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  unit_no INTEGER NOT NULL CHECK (unit_no BETWEEN 1 AND 4),
  turbine_pressure DECIMAL(8,2) DEFAULT 0,
  turbine_exhaust_temp DECIMAL(8,2) DEFAULT 0,
  condenser_pressure DECIMAL(8,4) DEFAULT 0,
  vacuum DECIMAL(6,2) DEFAULT 0,
  differential_expansion DECIMAL(6,3) DEFAULT 0,
  lp_exhaust_temp DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date, unit_no)
);

CREATE TABLE IF NOT EXISTS efficiency_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  gross_heat_rate DECIMAL(8,2) DEFAULT 0,
  net_heat_rate DECIMAL(8,2) DEFAULT 0,
  auxiliary_consumption DECIMAL(8,2) DEFAULT 0,
  auxiliary_power_pct DECIMAL(5,2) DEFAULT 0,
  boiler_efficiency DECIMAL(5,2) DEFAULT 0,
  turbine_efficiency DECIMAL(5,2) DEFAULT 0,
  plant_efficiency DECIMAL(5,2) DEFAULT 0,
  station_heat_rate DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loss_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE UNIQUE NOT NULL,
  expected_generation DECIMAL(10,3) DEFAULT 0,
  actual_generation DECIMAL(10,3) DEFAULT 0,
  total_loss_mu DECIMAL(10,3) DEFAULT 0,
  partial_loading_loss DECIMAL(10,3) DEFAULT 0,
  coal_quality_loss DECIMAL(10,3) DEFAULT 0,
  steam_pressure_loss DECIMAL(10,3) DEFAULT 0,
  o2_loss DECIMAL(10,3) DEFAULT 0,
  ash_handling_loss DECIMAL(10,3) DEFAULT 0,
  auxiliary_increase_loss DECIMAL(10,3) DEFAULT 0,
  other_losses DECIMAL(10,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_date DATE NOT NULL,
  predicted_generation DECIMAL(10,3) DEFAULT 0,
  predicted_plf DECIMAL(5,2) DEFAULT 0,
  predicted_heat_rate DECIMAL(8,2) DEFAULT 0,
  actual_generation DECIMAL(10,3),
  model_used VARCHAR(50) DEFAULT 'xgboost',
  confidence_score DECIMAL(5,2) DEFAULT 0,
  input_features JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_date DATE NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  parameter VARCHAR(100),
  current_value DECIMAL(12,4),
  threshold_value DECIMAL(12,4),
  description TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_gen_date ON daily_generation(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_data(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_water_date ON water_data(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_efficiency_date ON efficiency_data(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_loss_date ON loss_analysis(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_date ON alerts(alert_date DESC, is_resolved);
CREATE INDEX IF NOT EXISTS idx_dpr_uploads_date ON dpr_uploads(report_date DESC);

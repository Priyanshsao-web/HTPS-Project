"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { KPICard } from "@/components/dashboard/kpi-card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts"
import { Brain, TrendingUp, Target, Zap, Loader2 } from "lucide-react"
import type { ModelComparison } from "@/types"

interface PredData {
  predictions: { date: string; actual: number; predicted: number; error: number; accuracy: number }[]
  models: ModelComparison[]
  forecast: { date: string; predicted_generation: number; predicted_plf: number; predicted_heat_rate: number; confidence: number }[]
}

const MODEL_COLORS = ["oklch(0.65 0.18 240)", "oklch(0.67 0.15 163)", "oklch(0.79 0.18 75)"]

export default function PredictionsPage() {
  const [data, setData] = useState<PredData | null>(null)
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [result, setResult] = useState<{ predicted_generation: number; predicted_plf: number; predicted_heat_rate: number; confidence: number } | null>(null)
  const [inputs, setInputs] = useState({
    coal_consumption: 7500,
    coal_gcv: 3800,
    steam_pressure: 160,
    steam_temperature: 540,
    dm_water: 120,
    oil_consumption: 0.5,
    auxiliary_consumption: 11,
    load: 1600,
  })

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/predictions")
      .then(async r => {
        if (!r.ok) {
          throw new Error("Failed to load prediction data")
        }
        const json = await r.json()
        if (json.error) throw new Error(json.error)
        return json
      })
      .then(setData)
      .catch(err => {
        console.error(err)
        setError(err.message || "Failed to load prediction data")
      })
      .finally(() => setLoading(false))
  }, [])

  const handlePredict = async () => {
    setPredicting(true)
    try {
      const res = await fetch("/api/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inputs) })
      const d = await res.json()
      setResult(d)
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Generation Prediction" subtitle="ML-based generation forecasting using historical DPR data" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {/* Model Comparison */}
        {loading ? <Skeleton className="h-32" /> : data && !error && data.models ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.models.map((m, i) => (
              <Card key={m.model} className="p-4 border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: MODEL_COLORS[i] }}>{m.model}</span>
                  {i === 0 && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Best</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[["Accuracy", `${m.accuracy_pct}%`], ["R² Score", m.r2_score.toFixed(3)], ["RMSE", m.rmse.toFixed(3)], ["MAE", m.mae.toFixed(3)]].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-muted-foreground">{k}</p>
                      <p className="font-semibold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Actual vs Predicted Chart */}
        {loading ? <Skeleton className="h-72" /> : data && !error && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">Actual vs Predicted Generation (30 Days)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data.predictions} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} tickLine={false} />
                <YAxis yAxisId="gen" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="acc" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[80, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "oklch(0.93 0.01 240)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="gen" dataKey="actual" name="Actual (MU)" fill="oklch(0.65 0.18 240 / 0.6)" radius={[2, 2, 0, 0]} />
                <Line yAxisId="gen" type="monotone" dataKey="predicted" name="Predicted (MU)" stroke="oklch(0.63 0.24 25)" strokeWidth={2} dot={{ r: 2 }} />
                <Line yAxisId="acc" type="monotone" dataKey="accuracy" name="Accuracy (%)" stroke="oklch(0.67 0.15 163)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* 7-Day Forecast */}
        {loading ? <Skeleton className="h-56" /> : data && !error && (
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold mb-4">7-Day Generation Forecast</h3>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {data.forecast.map(f => (
                <div key={f.date} className="text-center p-2 rounded-lg bg-muted/30 border border-border text-xs">
                  <p className="text-muted-foreground font-medium">{new Date(f.date).toLocaleDateString("en-IN", { weekday: "short" })}</p>
                  <p className="text-[10px] text-muted-foreground mb-1">{f.date.slice(5)}</p>
                  <p className="text-base font-bold text-foreground">{f.predicted_generation.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">MU</p>
                  <p className="text-[10px] text-primary mt-1">{f.predicted_plf.toFixed(0)}% PLF</p>
                  <Badge variant="outline" className="text-[9px] mt-1 border-emerald-500/30 text-emerald-400">{f.confidence.toFixed(0)}%</Badge>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.forecast.map(f => ({ date: f.date.slice(5), gen: f.predicted_generation, plf: f.predicted_plf }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.03 240)", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="gen" name="Generation (MU)" stroke="oklch(0.65 0.18 240)" fill="oklch(0.65 0.18 240 / 0.2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Manual Prediction */}
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Manual Prediction — Enter Parameters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              ["Coal Consumption (MT)", "coal_consumption"],
              ["Coal GCV (kcal/kg)", "coal_gcv"],
              ["Steam Pressure (bar)", "steam_pressure"],
              ["Steam Temperature (°C)", "steam_temperature"],
              ["DM Water (KL)", "dm_water"],
              ["Oil Consumption (KL)", "oil_consumption"],
              ["Aux. Consumption (MW)", "auxiliary_consumption"],
              ["Load (MW)", "load"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <Input
                  type="number"
                  value={inputs[key as keyof typeof inputs]}
                  onChange={e => setInputs(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
          <Button onClick={handlePredict} disabled={predicting} className="mb-4">
            {predicting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Predicting...</> : <><Brain className="w-4 h-4 mr-2" /> Predict Generation</>}
          </Button>

          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard title="Predicted Generation" value={result.predicted_generation} unit="MU" icon={Zap} variant="blue" />
              <KPICard title="Predicted PLF" value={result.predicted_plf} unit="%" icon={TrendingUp} variant="green" />
              <KPICard title="Predicted Heat Rate" value={result.predicted_heat_rate} unit="kcal/kWh" icon={Target} variant="amber" />
              <KPICard title="Model Confidence" value={result.confidence} unit="%" icon={Brain} variant="cyan" />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

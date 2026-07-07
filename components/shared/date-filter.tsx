"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { AnalyticsFilter } from "@/types"

interface DateFilterProps {
  value: AnalyticsFilter
  onChange: (filter: AnalyticsFilter) => void
}

const PERIODS = [
  { key: "daily" as const, label: "Today" },
  { key: "weekly" as const, label: "7 Days" },
  { key: "monthly" as const, label: "30 Days" },
  { key: "yearly" as const, label: "1 Year" },
  { key: "custom" as const, label: "Custom" },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const [showCustom, setShowCustom] = useState(value.period === "custom")

  const selectPeriod = (period: AnalyticsFilter["period"]) => {
    const today = new Date().toISOString().split("T")[0]
    const map: Record<string, { startDate: string; endDate: string }> = {
      daily: { startDate: today, endDate: today },
      weekly: { startDate: daysAgo(7), endDate: today },
      monthly: { startDate: daysAgo(30), endDate: today },
      yearly: { startDate: daysAgo(365), endDate: today },
      custom: { startDate: value.startDate, endDate: value.endDate },
    }
    setShowCustom(period === "custom")
    onChange({ period, ...map[period] })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-border overflow-hidden">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => selectPeriod(key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              value.period === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value.startDate}
            onChange={e => onChange({ ...value, startDate: e.target.value })}
            className="h-8 text-xs w-36"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={value.endDate}
            onChange={e => onChange({ ...value, endDate: e.target.value })}
            className="h-8 text-xs w-36"
          />
        </div>
      )}
    </div>
  )
}

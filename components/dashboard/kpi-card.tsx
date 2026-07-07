import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  trend?: number
  subtitle?: string
  variant?: "blue" | "cyan" | "green" | "amber" | "red" | "purple"
  className?: string
}

const VARIANT_STYLES = {
  blue: { icon: "text-blue-400 bg-blue-400/10", glow: "kpi-blue", border: "border-blue-500/20" },
  cyan: { icon: "text-cyan-400 bg-cyan-400/10", glow: "kpi-cyan", border: "border-cyan-500/20" },
  green: { icon: "text-emerald-400 bg-emerald-400/10", glow: "kpi-green", border: "border-emerald-500/20" },
  amber: { icon: "text-amber-400 bg-amber-400/10", glow: "kpi-amber", border: "border-amber-500/20" },
  red: { icon: "text-red-400 bg-red-400/10", glow: "kpi-red", border: "border-red-500/20" },
  purple: { icon: "text-purple-400 bg-purple-400/10", glow: "", border: "border-purple-500/20" },
}

export function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  subtitle,
  variant = "blue",
  className,
}: KPICardProps) {
  const styles = VARIANT_STYLES[variant]
  const trendPositive = trend !== undefined && trend >= 0

  return (
    <Card className={cn(
      "p-4 border transition-all hover:scale-[1.01] duration-200",
      styles.border,
      styles.glow,
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", styles.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            trendPositive ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
          )}>
            {trendPositive ? "+" : ""}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : value}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </Card>
  )
}

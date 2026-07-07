"use client"

import { format } from "date-fns"
import { Bell, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const [now, setNow] = useState<Date>(new Date())
  const [alertCount] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block" suppressHydrationWarning>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {format(now, "EEEE, dd MMM yyyy")}
          </p>
          <p className="text-xs font-medium text-foreground" suppressHydrationWarning>
            {format(now, "HH:mm")} IST
          </p>
        </div>
        <Badge
          variant="outline"
          className="hidden sm:flex items-center gap-1 text-xs border-success/30 text-success bg-success/10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          LIVE
        </Badge>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive text-[8px]" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => window.location.reload()}
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}

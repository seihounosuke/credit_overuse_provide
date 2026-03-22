import { ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import type { DangerLevel } from '@/lib/types'

interface BalancePreviewProps {
  before: number
  after: number
  dangerLevel: DangerLevel
  className?: string
}

const COLOR: Record<DangerLevel, string> = {
  safe: 'text-safe-dark',
  warning: 'text-warning-dark',
  danger: 'text-danger-dark',
}

const BG: Record<DangerLevel, string> = {
  safe: 'bg-safe-light border-safe/30',
  warning: 'bg-warning-light border-warning/30',
  danger: 'bg-danger-light border-danger/30',
}

export function BalancePreview({ before, after, dangerLevel, className }: BalancePreviewProps) {
  const diff = after - before

  return (
    <div className={cn('rounded-lg border p-4', BG[dangerLevel], className)}>
      <p className="text-xs text-muted-foreground mb-2">入力後の予測残高</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatCurrency(before)}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className={cn('text-xl font-bold tabular-nums', COLOR[dangerLevel])}>
          {formatCurrency(after)}
        </span>
      </div>
      <p className={cn('text-xs mt-1 tabular-nums', diff < 0 ? 'text-danger-dark' : 'text-safe-dark')}>
        {diff < 0 ? '-' : '+'}{formatCurrency(Math.abs(diff))}
      </p>
    </div>
  )
}

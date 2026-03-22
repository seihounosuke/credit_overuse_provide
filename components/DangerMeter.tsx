import { cn } from '@/lib/utils'
import type { DangerLevel } from '@/lib/types'
import { DANGER_LEVEL_LABELS } from '@/lib/prediction'

interface DangerMeterProps {
  level: DangerLevel
  predictedBalance: number
  threshold: number
  className?: string
}

const LEVEL_CONFIG = {
  safe: {
    barColor: 'bg-safe',
    trackColor: 'bg-safe-light',
    textColor: 'text-safe-dark',
    label: '安全',
  },
  warning: {
    barColor: 'bg-warning',
    trackColor: 'bg-warning-light',
    textColor: 'text-warning-dark',
    label: '注意',
  },
  danger: {
    barColor: 'bg-danger',
    trackColor: 'bg-danger-light',
    textColor: 'text-danger-dark',
    label: '危険',
  },
} as const

export function DangerMeter({ level, predictedBalance, threshold, className }: DangerMeterProps) {
  const config = LEVEL_CONFIG[level]

  // バーの幅: threshold の2倍を満杯として計算（最大100%）
  const maxBalance = threshold * 2
  const percentage = Math.min(Math.max((predictedBalance / maxBalance) * 100, 0), 100)

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">危険度</span>
        <span className={cn('text-xs font-semibold', config.textColor)}>
          {DANGER_LEVEL_LABELS[level]}
        </span>
      </div>
      <div className={cn('relative h-2.5 w-full overflow-hidden rounded-full', config.trackColor)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', config.barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>¥0</span>
        <span>危険ライン ¥{threshold.toLocaleString('ja-JP')}</span>
      </div>
    </div>
  )
}

import { Calendar, TrendingDown, ReceiptText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DangerMeter } from '@/components/DangerMeter'
import { formatCurrency, formatDate } from '@/lib/dateUtils'
import { DANGER_LEVEL_LABELS } from '@/lib/prediction'
import type { PredictionResult } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PredictionCardProps {
  prediction: PredictionResult
  className?: string
}

const CARD_COLORS: Record<string, string> = {
  safe: 'bg-gradient-to-br from-safe-light to-white border-safe/30',
  warning: 'bg-gradient-to-br from-warning-light to-white border-warning/30',
  danger: 'bg-gradient-to-br from-danger-light to-white border-danger/30',
}

const BALANCE_TEXT_COLORS: Record<string, string> = {
  safe: 'text-safe-dark',
  warning: 'text-warning-dark',
  danger: 'text-danger-dark',
}

const BADGE_VARIANTS: Record<string, 'safe' | 'warning' | 'danger'> = {
  safe: 'safe',
  warning: 'warning',
  danger: 'danger',
}

export function PredictionCard({ prediction, className }: PredictionCardProps) {
  const {
    predictedBalance,
    dangerLevel,
    daysUntilSalary,
    nextSalaryDate,
    unpaidCredit,
    pendingExpenses,
    fixedExpensesUntilSalary,
    nextSalaryAmount,
    currentBalance,
  } = prediction

  return (
    <Card className={cn('border-2', CARD_COLORS[dangerLevel], className)}>
      <CardContent className="p-5 space-y-5">

        {/* 給料日まで何日 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>給料日まで <strong className="text-foreground">{daysUntilSalary}日</strong></span>
            <span className="text-xs">({formatDate(nextSalaryDate)})</span>
          </div>
          <Badge variant={BADGE_VARIANTS[dangerLevel]}>
            {DANGER_LEVEL_LABELS[dangerLevel]}
          </Badge>
        </div>

        {/* メイン数値：予測残高 */}
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground mb-1">次の給料日の予測残高</p>
          <p
            className={cn(
              'text-5xl font-bold tracking-tight tabular-nums',
              BALANCE_TEXT_COLORS[dangerLevel]
            )}
          >
            {formatCurrency(predictedBalance)}
          </p>
        </div>

        {/* 危険度バー */}
        <DangerMeter
          level={dangerLevel}
          predictedBalance={predictedBalance}
          threshold={50000} // TODO: settings から取得
        />

        {/* 内訳 */}
        <div className="space-y-2 pt-1 border-t">
          <p className="text-xs font-medium text-muted-foreground">予測の内訳</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">現在の保有</span>
                <span className="font-medium">{formatCurrency(currentBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">+ 次の給与</span>
                <span className="font-medium text-safe-dark">+{formatCurrency(nextSalaryAmount)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">- クレカ引落</span>
                <span className="font-medium text-danger-dark">-{formatCurrency(unpaidCredit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">- 固定費</span>
                <span className="font-medium text-danger-dark">-{formatCurrency(fixedExpensesUntilSalary)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* クレカ未引落・経費立替 */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-danger" />
              <span className="text-[11px] text-muted-foreground">未引落クレカ</span>
            </div>
            <p className="text-base font-bold text-danger-dark">{formatCurrency(unpaidCredit)}</p>
          </div>
          {pendingExpenses > 0 && (
            <div className="flex-1 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ReceiptText className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[11px] text-muted-foreground">経費立替中</span>
              </div>
              <p className="text-base font-bold text-blue-600">+{formatCurrency(pendingExpenses)}</p>
              <p className="text-[10px] text-muted-foreground">精算後に戻る</p>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}

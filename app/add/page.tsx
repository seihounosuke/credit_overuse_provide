'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { BalancePreview } from '@/components/BalancePreview'
import { formatCurrency } from '@/lib/dateUtils'
import { calculateAddImpact } from '@/lib/prediction'
import type { Account, PredictionResult, DangerLevel } from '@/lib/types'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT: 'クレカ',
  BANK: '銀行引落',
  CASH: '現金',
  PREPAID: 'プリペイド',
}

export default function AddPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [amount, setAmount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [memo, setMemo] = useState('')
  const [isExpense, setIsExpense] = useState(false)
  const [expenseSettledAt, setExpenseSettledAt] = useState('')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(true)

  // 口座一覧・予測残高を取得
  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/prediction').then((r) => r.json()),
    ]).then(([accs, pred]) => {
      setAccounts(accs)
      setPrediction({
        ...pred,
        nextSalaryDate: new Date(pred.nextSalaryDate),
      })
      if (accs.length > 0) setSelectedAccountId(accs[0].id)
      setLoading(false)
    })
  }, [])

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0
  const previewBalance = prediction ? calculateAddImpact(prediction, amountNum) : 0
  const previewDangerLevel: DangerLevel = prediction
    ? previewBalance < prediction.nextSalaryAmount * 0.5
      ? 'danger'
      : previewBalance < 50000
      ? 'warning'
      : 'safe'
    : 'safe'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amountNum || !selectedAccountId) return

    startTransition(async () => {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          accountId: selectedAccountId,
          memo,
          isExpense,
          expenseSettledAt: expenseSettledAt || null,
        }),
      })
      router.push('/')
      router.refresh()
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // クレカ以外のアカウントと、クレカをグループ化して表示
  const creditAccounts = accounts.filter((a) => a.type === 'CREDIT')
  const otherAccounts = accounts.filter((a) => a.type !== 'CREDIT')

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">支出を追加</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 金額入力 */}
        <div className="space-y-2">
          <Label htmlFor="amount">金額（円）</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              ¥
            </span>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 text-lg font-semibold h-12"
              min="1"
              required
            />
          </div>
        </div>

        {/* 予測残高プレビュー */}
        {prediction && amountNum > 0 && (
          <BalancePreview
            before={prediction.predictedBalance}
            after={previewBalance}
            dangerLevel={previewDangerLevel}
          />
        )}

        {/* 支払い手段 */}
        <div className="space-y-2">
          <Label>支払い手段</Label>
          <div className="grid grid-cols-3 gap-2">
            {[...creditAccounts, ...otherAccounts].map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccountId(account.id)}
                className={`
                  rounded-lg border-2 p-3 text-center text-sm font-medium transition-all
                  ${selectedAccountId === account.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/40'
                  }
                `}
              >
                <div className="text-xs text-muted-foreground mb-0.5">
                  {PAYMENT_METHOD_LABELS[account.type]}
                </div>
                <div className="truncate">{account.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* メモ */}
        <div className="space-y-2">
          <Label htmlFor="memo">メモ（任意）</Label>
          <Input
            id="memo"
            type="text"
            placeholder="例: ランチ、タクシー..."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {/* 経費チェック */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="isExpense"
              checked={isExpense}
              onCheckedChange={(checked) => setIsExpense(Boolean(checked))}
            />
            <Label htmlFor="isExpense" className="cursor-pointer">
              会社経費の立替
            </Label>
          </div>
          {isExpense && (
            <div className="space-y-2 pl-7">
              <Label htmlFor="expenseSettledAt" className="text-xs text-muted-foreground">
                精算予定日（任意）
              </Label>
              <Input
                id="expenseSettledAt"
                type="date"
                value={expenseSettledAt}
                onChange={(e) => setExpenseSettledAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ※ 経費は予測残高の計算に含みません。立替中の実態を別途表示します。
              </p>
            </div>
          )}
        </div>

        {/* 残高への影響サマリー */}
        {prediction && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
            <p className="font-medium text-foreground">入力後の変化</p>
            <div className="flex justify-between text-muted-foreground">
              <span>現在の予測残高</span>
              <span className="tabular-nums">{formatCurrency(prediction.predictedBalance)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>この支出</span>
              <span className="tabular-nums text-danger-dark">
                -{amountNum > 0 ? formatCurrency(amountNum) : '¥0'}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t pt-1 mt-1">
              <span>入力後</span>
              <span className="tabular-nums">
                {amountNum > 0 ? formatCurrency(previewBalance) : formatCurrency(prediction.predictedBalance)}
              </span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 text-base"
          disabled={!amountNum || !selectedAccountId || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              登録中...
            </>
          ) : (
            '支出を登録する'
          )}
        </Button>
      </form>
    </div>
  )
}

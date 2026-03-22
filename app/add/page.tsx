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
import { formatCurrency, toInputDateString } from '@/lib/dateUtils'
import { calculateAddImpact } from '@/lib/prediction'
import type { Account, PredictionResult, DangerLevel } from '@/lib/types'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CREDIT:  'クレカ',
  BANK:    '銀行引落',
  CASH:    '現金',
  PREPAID: 'プリペイド',
}

export default function AddPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [amount, setAmount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(toInputDateString(new Date()))
  const [isExpense, setIsExpense] = useState(false)
  const [expenseSettledAt, setExpenseSettledAt] = useState('')

  const [accounts, setAccounts] = useState<Account[]>([])
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/prediction').then((r) => r.json()),
    ]).then(([accs, pred]) => {
      setAccounts(accs)
      setPrediction({ ...pred, nextSalaryDate: new Date(pred.nextSalaryDate) })
      // クレカを優先選択、なければ最初の口座
      const creditAccount = (accs as Account[]).find((a) => a.type === 'CREDIT')
      setSelectedAccountId(creditAccount?.id ?? accs[0]?.id ?? '')
      setLoading(false)
    })
  }, [])

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0

  // 入力後の予測残高
  const previewBalance = prediction ? calculateAddImpact(prediction, amountNum) : 0

  // 入力後の危険度（threshold は prediction に含まれていないので仮値）
  const getDangerLevelFromBalance = (balance: number): DangerLevel => {
    if (!prediction) return 'safe'
    // dangerThreshold は予測に含まれていないので、unpaidCreditをもとに逆算
    // 簡易的に現在の dangerLevel 判定と同じロジックを使う
    const approxThreshold = 50000
    if (balance < approxThreshold * 0.5) return 'danger'
    if (balance < approxThreshold) return 'warning'
    return 'safe'
  }
  const previewDangerLevel = getDangerLevelFromBalance(previewBalance)

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
          date,
          isExpense,
          expenseSettledAt: expenseSettledAt || null,
        }),
      })
      // ホーム画面へ戻る（revalidatePath で自動更新）
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

  const creditAccounts = accounts.filter((a) => a.type === 'CREDIT')
  const otherAccounts  = accounts.filter((a) => a.type !== 'CREDIT')

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
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
        {/* 金額 */}
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
              className="pl-8 text-2xl font-bold h-14"
              min="1"
              required
            />
          </div>
        </div>

        {/* 予測残高プレビュー（金額入力直後に表示） */}
        {prediction && amountNum > 0 && (
          <BalancePreview
            before={prediction.predictedBalance}
            after={previewBalance}
            dangerLevel={previewDangerLevel}
          />
        )}

        {/* 日付 */}
        <div className="space-y-2">
          <Label htmlFor="date">日付</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10"
          />
        </div>

        {/* 支払い手段 */}
        <div className="space-y-2">
          <Label>支払い手段</Label>
          {/* クレカを上段に強調表示 */}
          {creditAccounts.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">クレジットカード（今すぐ払わない）</p>
              <div className="grid grid-cols-2 gap-2">
                {creditAccounts.map((a) => (
                  <AccountChip
                    key={a.id}
                    account={a}
                    selected={selectedAccountId === a.id}
                    onClick={() => setSelectedAccountId(a.id)}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">現金・デビット（今すぐ払う）</p>
            <div className="grid grid-cols-3 gap-2">
              {otherAccounts.map((a) => (
                <AccountChip
                  key={a.id}
                  account={a}
                  selected={selectedAccountId === a.id}
                  onClick={() => setSelectedAccountId(a.id)}
                />
              ))}
            </div>
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
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="isExpense"
              checked={isExpense}
              onCheckedChange={(c) => setIsExpense(Boolean(c))}
            />
            <Label htmlFor="isExpense" className="cursor-pointer font-normal">
              会社経費の立替（精算予定あり）
            </Label>
          </div>
          {isExpense && (
            <div className="pl-7 space-y-2">
              <Label htmlFor="expenseSettledAt" className="text-xs text-muted-foreground">
                精算予定日（任意）
              </Label>
              <Input
                id="expenseSettledAt"
                type="date"
                value={expenseSettledAt}
                onChange={(e) => setExpenseSettledAt(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                経費はクレカ未引落として予測残高に反映されます。
                精算されるまでは「立替中」として表示します。
              </p>
            </div>
          )}
        </div>

        {/* 登録前サマリー */}
        {prediction && amountNum > 0 && (
          <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>現在の予測残高</span>
              <span className="tabular-nums">{formatCurrency(prediction.predictedBalance)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>この支出</span>
              <span className="tabular-nums text-danger-dark">-{formatCurrency(amountNum)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>登録後の予測残高</span>
              <span className={`tabular-nums ${previewDangerLevel === 'danger' ? 'text-danger-dark' : previewDangerLevel === 'warning' ? 'text-warning-dark' : ''}`}>
                {formatCurrency(previewBalance)}
              </span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={!amountNum || !selectedAccountId || isPending}
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />登録中...</>
          ) : (
            '支出を登録する'
          )}
        </Button>
      </form>
    </div>
  )
}

function AccountChip({
  account,
  selected,
  onClick,
}: {
  account: Account
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-xl border-2 p-3 text-center text-sm font-medium transition-all active:scale-95
        ${selected
          ? 'border-primary bg-primary/5 text-primary shadow-sm'
          : 'border-border bg-background text-foreground hover:border-primary/40'
        }
      `}
    >
      <div className="text-[10px] text-muted-foreground mb-0.5 truncate">
        {ACCOUNT_TYPE_LABELS[account.type]}
      </div>
      <div className="truncate text-xs">{account.name}</div>
    </button>
  )
}

// 簡易Separator（import避けるため）
function Separator() {
  return <div className="border-t my-1" />
}

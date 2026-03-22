'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, X, Loader2, CreditCard, Banknote, Wallet, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatCurrency, formatRelativeDate, toInputDateString } from '@/lib/dateUtils'
import type { Account, Transaction } from '@/lib/types'

type Tx = Transaction & { account: Account }

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  CREDIT:  CreditCard,
  BANK:    Banknote,
  CASH:    Banknote,
  PREPAID: Wallet,
}

interface Props {
  initialTransactions: Tx[]
}

export function HomeTransactionList({ initialTransactions }: Props) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Tx[]>(initialTransactions)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 削除
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    setDeletingId(null)
    router.refresh()
  }, [router])

  // 編集保存
  const handleSave = useCallback(async (id: string, patch: { amount: number; memo: string; date: string }) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await res.json()
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...updated, account: t.account } : t))
    )
    setEditingId(null)
    router.refresh()
  }, [router])

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {transactions.map((tx, index) => (
        <div key={tx.id}>
          {editingId === tx.id ? (
            <EditRow
              transaction={tx}
              onSave={(patch) => handleSave(tx.id, patch)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <TransactionRow
              transaction={tx}
              deleting={deletingId === tx.id}
              onEdit={() => setEditingId(tx.id)}
              onDelete={() => handleDelete(tx.id)}
            />
          )}
          {index < transactions.length - 1 && <Separator className="mx-4" />}
        </div>
      ))}
    </div>
  )
}

// ── 通常行 ────────────────────────────────────────────────────────

function TransactionRow({
  transaction: tx,
  deleting,
  onEdit,
  onDelete,
}: {
  transaction: Tx
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = ACCOUNT_TYPE_ICONS[tx.account.type] ?? Wallet
  const isCredit = tx.account.type === 'CREDIT'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 group">
      {/* アイコン */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          tx.isExpense ? 'bg-blue-50' : 'bg-muted'
        )}
      >
        {tx.isExpense ? (
          <ReceiptText className="h-4 w-4 text-blue-500" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* メモ・口座 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {tx.memo ?? '（メモなし）'}
          {tx.isExpense && (
            <span className="ml-1.5 text-[10px] text-blue-500 font-normal">経費</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          <span>{tx.account.name}</span>
          {isCredit && !tx.isBilled && <span className="text-warning-dark">（未引落）</span>}
          <span> · </span>
          <span>{formatRelativeDate(tx.date)}</span>
        </p>
      </div>

      {/* 金額 */}
      <p className="text-sm font-semibold tabular-nums shrink-0">
        -{formatCurrency(Math.abs(tx.amount))}
      </p>

      {/* 操作ボタン（ホバーで表示、常に確保してレイアウト崩れ防止） */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Trash2 className="h-3.5 w-3.5" />
          }
        </Button>
      </div>
    </div>
  )
}

// ── 編集行 ────────────────────────────────────────────────────────

function EditRow({
  transaction: tx,
  onSave,
  onCancel,
}: {
  transaction: Tx
  onSave: (patch: { amount: number; memo: string; date: string }) => Promise<void>
  onCancel: () => void
}) {
  const [amount, setAmount] = useState(String(Math.abs(tx.amount)))
  const [memo, setMemo]   = useState(tx.memo ?? '')
  const [date, setDate]   = useState(toInputDateString(new Date(tx.date)))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const num = parseFloat(amount)
    if (!num) return
    setSaving(true)
    await onSave({ amount: num, memo, date })
    setSaving(false)
  }

  return (
    <div className="px-4 py-3 bg-muted/30 space-y-2.5">
      {/* 口座名（変更不可、表示のみ） */}
      <p className="text-xs text-muted-foreground">{tx.account.name}</p>

      <div className="grid grid-cols-2 gap-2">
        {/* 金額 */}
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">金額（円）</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">¥</span>
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 pl-6 text-sm"
              min={1}
              autoFocus
            />
          </div>
        </div>
        {/* 日付 */}
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">日付</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* メモ */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">メモ</label>
        <Input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="h-9 text-sm"
          placeholder="（メモなし）"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>

      <div className="flex gap-2 pt-0.5">
        <Button size="sm" className="flex-1 h-8" onClick={handleSave} disabled={saving || !amount}>
          {saving
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />保存中</>
            : <><Check className="h-3.5 w-3.5" />保存</>
          }
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-3" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

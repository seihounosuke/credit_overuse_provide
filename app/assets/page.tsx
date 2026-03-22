'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Banknote, Wallet, CreditCard, ReceiptText,
  TrendingDown, Pencil, Check, X, Loader2, RefreshCw, ArrowLeftRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/dateUtils'
import type { Account, Transaction } from '@/lib/types'

type TransactionWithAccount = Transaction & { account: Account }

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  BANK:    { label: '銀行口座',        Icon: Building2,  color: 'text-blue-500' },
  CASH:    { label: '現金',            Icon: Banknote,   color: 'text-green-600' },
  PREPAID: { label: 'プリペイド',      Icon: Wallet,     color: 'text-purple-500' },
  CREDIT:  { label: 'クレジットカード', Icon: CreditCard, color: 'text-orange-500' },
}

export default function AssetsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 振替フォームの表示状態
  const [showTransfer, setShowTransfer] = useState(false)

  const fetchData = useCallback(async () => {
    const [accs, txs] = await Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/transactions?limit=100').then((r) => r.json()),
    ])
    setAccounts(accs)
    setTransactions(txs)
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  async function refresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // ── 集計 ──────────────────────────────────────────────────────

  const holdingAccounts = accounts.filter((a) => a.type !== 'CREDIT')
  const creditAccounts  = accounts.filter((a) => a.type === 'CREDIT')
  const bankAccounts    = accounts.filter((a) => a.type === 'BANK')

  const totalHolding = holdingAccounts.reduce((s, a) => s + a.balance, 0)

  const unpaidCreditTxs = transactions.filter(
    (t) => t.account.type === 'CREDIT' && !t.isBilled && !t.transferToId
  )
  const totalUnpaid = unpaidCreditTxs.reduce((s, t) => s + Math.abs(t.amount), 0)

  const pendingExpenseTxs = transactions.filter(
    (t) => t.isExpense && !t.expenseSettled
  )
  const totalPendingExpense = pendingExpenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0)

  const realBalance = totalHolding - totalUnpaid

  // ── ハンドラ ─────────────────────────────────────────────────

  async function updateBalance(accountId: string, newBalance: number) {
    await fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: accountId, balance: newBalance }),
    })
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, balance: newBalance } : a))
    )
  }

  async function billCredit(creditAccountId: string, bankAccountId: string) {
    const res = await fetch('/api/transactions/bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditAccountId, bankAccountId }),
    })
    const data = await res.json()
    if (data.ok) {
      // 引落済みに更新 + 銀行残高を減算
      setTransactions((prev) =>
        prev.map((t) =>
          t.accountId === creditAccountId && !t.isBilled ? { ...t, isBilled: true } : t
        )
      )
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === bankAccountId
            ? { ...a, balance: a.balance - data.billedAmount }
            : a
        )
      )
    }
  }

  async function settleExpense(transactionId: string) {
    await fetch('/api/transactions/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    })
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, expenseSettled: true } : t))
    )
  }

  async function deleteTransaction(transactionId: string) {
    await fetch(`/api/transactions/${transactionId}`, { method: 'DELETE' })
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">資産一覧</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          disabled={refreshing}
          className="text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">保有合計</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(totalHolding)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">実質残高</p>
          <p className={`text-xl font-bold tabular-nums ${realBalance < 0 ? 'text-danger-dark' : ''}`}>
            {formatCurrency(realBalance)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">クレカ未引落を除く</p>
        </div>
      </div>

      {/* 銀行・現金・プリペイド */}
      <Section title="口座・現金・プリペイド">
        {holdingAccounts.map((account) => (
          <EditableAccountRow
            key={account.id}
            account={account}
            onSave={(balance) => updateBalance(account.id, balance)}
          />
        ))}
      </Section>

      {/* クレカ未引落 */}
      <Section title="クレジットカード未引落">
        {creditAccounts.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground">クレカ口座がありません</p>
        )}
        {creditAccounts.map((card) => {
          const cardUnpaidTxs = unpaidCreditTxs.filter((t) => t.accountId === card.id)
          const cardTotal = cardUnpaidTxs.reduce((s, t) => s + Math.abs(t.amount), 0)
          return (
            <CreditCardSection
              key={card.id}
              card={card}
              unpaidTxs={cardUnpaidTxs}
              totalUnpaid={cardTotal}
              bankAccounts={bankAccounts}
              onBill={(bankId) => billCredit(card.id, bankId)}
              onDeleteTx={deleteTransaction}
            />
          )
        })}
        {totalUnpaid > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-danger-light/40 rounded-b-xl">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-danger-dark">
              <TrendingDown className="h-4 w-4" />
              未引落合計
            </span>
            <span className="tabular-nums text-sm font-bold text-danger-dark">
              -{formatCurrency(totalUnpaid)}
            </span>
          </div>
        )}
      </Section>

      {/* 経費立替 */}
      {pendingExpenseTxs.length > 0 && (
        <Section title="経費立替（回収予定）">
          {pendingExpenseTxs.map((t) => (
            <ExpenseRow key={t.id} transaction={t} onSettle={() => settleExpense(t.id)} />
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-b-xl">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-700">
              <ReceiptText className="h-4 w-4" />
              回収予定合計
            </span>
            <span className="tabular-nums text-sm font-bold text-blue-700">
              +{formatCurrency(totalPendingExpense)}
            </span>
          </div>
        </Section>
      )}

      {/* 振替セクション */}
      <div>
        <button
          onClick={() => setShowTransfer((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftRight className="h-4 w-4" />
          口座間の振替（チャージ等）
          <span className="text-xs">{showTransfer ? '▲' : '▼'}</span>
        </button>
        {showTransfer && (
          <TransferPanel
            accounts={accounts.filter((a) => a.type !== 'CREDIT')}
            onTransfer={async (fromId, toId, amount, memo) => {
              await fetch('/api/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromAccountId: fromId, toAccountId: toId, amount, memo }),
              })
              await fetchData()
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── サブコンポーネント ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h2>
      <div className="rounded-xl border bg-card overflow-hidden divide-y">{children}</div>
    </div>
  )
}

function EditableAccountRow({
  account,
  onSave,
}: {
  account: Account
  onSave: (balance: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(Math.round(account.balance)))
  const [saving, setSaving] = useState(false)

  const { Icon, label, color } = ACCOUNT_TYPE_CONFIG[account.type] ?? ACCOUNT_TYPE_CONFIG.BANK

  async function handleSave() {
    const num = parseFloat(value.replace(/,/g, ''))
    if (isNaN(num)) return
    setSaving(true)
    await onSave(num)
    setSaving(false)
    setEditing(false)
  }

  function handleCancel() {
    setValue(String(Math.round(account.balance)))
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{account.name}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">¥</span>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 w-28 pl-5 text-right text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <Button size="icon" className="h-8 w-8" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(account.balance)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setValue(String(Math.round(account.balance)))
              setEditing(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

function CreditCardSection({
  card,
  unpaidTxs,
  totalUnpaid,
  bankAccounts,
  onBill,
  onDeleteTx,
}: {
  card: Account
  unpaidTxs: TransactionWithAccount[]
  totalUnpaid: number
  bankAccounts: Account[]
  onBill: (bankAccountId: string) => Promise<void>
  onDeleteTx: (id: string) => Promise<void>
}) {
  const [showBillForm, setShowBillForm] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id ?? '')
  const [billing, setBilling] = useState(false)

  async function handleBill() {
    if (!selectedBankId || totalUnpaid === 0) return
    setBilling(true)
    await onBill(selectedBankId)
    setBilling(false)
    setShowBillForm(false)
  }

  return (
    <div>
      {/* カードヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <CreditCard className="h-4 w-4 text-orange-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{card.name}</p>
          <p className="text-xs text-muted-foreground">
            引落日: 毎月{card.billingDay ?? '?'}日
          </p>
        </div>
        <span className="text-sm font-bold text-danger-dark tabular-nums">
          -{formatCurrency(totalUnpaid)}
        </span>
      </div>

      {/* 未引落の取引一覧 */}
      {unpaidTxs.map((t) => (
        <div key={t.id} className="flex items-center gap-3 px-4 py-2 bg-muted/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">
              {t.memo ?? '（メモなし）'}
              {t.isExpense && (
                <span className="ml-1 text-[10px] text-blue-500 font-medium">経費</span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatDate(t.date)}</p>
          </div>
          <span className="text-xs tabular-nums text-danger-dark font-medium shrink-0">
            -{formatCurrency(Math.abs(t.amount))}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onDeleteTx(t.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {/* 引落処理ボタン */}
      {totalUnpaid > 0 && (
        <div className="px-4 py-3 bg-orange-50/50">
          {!showBillForm ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-orange-700 border-orange-300 hover:bg-orange-50"
              onClick={() => setShowBillForm(true)}
            >
              今月の引落処理を行う
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                引落先の銀行口座（合計 {formatCurrency(totalUnpaid)} を引き落とします）
              </p>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} （{formatCurrency(b.balance)}）
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleBill} disabled={billing}>
                  {billing ? <Loader2 className="h-4 w-4 animate-spin" /> : '実行する'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowBillForm(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {totalUnpaid === 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground text-center">
          未引落の取引はありません
        </div>
      )}
    </div>
  )
}

function ExpenseRow({
  transaction,
  onSettle,
}: {
  transaction: TransactionWithAccount
  onSettle: () => Promise<void>
}) {
  const [settling, setSettling] = useState(false)

  async function handleSettle() {
    setSettling(true)
    await onSettle()
    setSettling(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ReceiptText className="h-4 w-4 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{transaction.memo ?? '（メモなし）'}</p>
        <p className="text-xs text-muted-foreground">
          {transaction.account.name}
          {transaction.expenseSettledAt && (
            <> · 精算予定 {formatDate(transaction.expenseSettledAt)}</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="tabular-nums text-blue-700">
          +{formatCurrency(Math.abs(transaction.amount))}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
          onClick={handleSettle}
          disabled={settling}
        >
          {settling ? <Loader2 className="h-3 w-3 animate-spin" /> : '精算した'}
        </Button>
      </div>
    </div>
  )
}

function TransferPanel({
  accounts,
  onTransfer,
}: {
  accounts: Account[]
  onTransfer: (fromId: string, toId: string, amount: number, memo: string) => Promise<void>
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '')
  const [toId, setToId] = useState(accounts[1]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || !fromId || !toId || fromId === toId) return
    setLoading(true)
    await onTransfer(fromId, toId, num, memo)
    setLoading(false)
    setDone(true)
    setAmount('')
    setMemo('')
    setTimeout(() => setDone(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border bg-card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">振替元</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">振替先</label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">金額（円）</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">¥</span>
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 pl-6 text-sm"
              placeholder="3000"
              min={1}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">メモ（任意）</label>
          <Input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="h-9 text-sm"
            placeholder="PayPayチャージ"
          />
        </div>
      </div>
      {fromId === toId && (
        <p className="text-xs text-danger-dark">振替元と振替先が同じです</p>
      )}
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={!amount || fromId === toId || loading}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />振替中...</>
        ) : done ? (
          '✓ 振替完了'
        ) : (
          <><ArrowLeftRight className="h-4 w-4" />振替を実行</>
        )}
      </Button>
    </form>
  )
}

// Separator is imported but not used in final layout, using divide-y instead
const _ = Separator

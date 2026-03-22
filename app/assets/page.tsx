import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/dateUtils'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Banknote,
  Wallet,
  CreditCard,
  ReceiptText,
  Building2,
  TrendingDown,
} from 'lucide-react'

const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  BANK: { label: '銀行口座', icon: Building2, color: 'text-blue-500' },
  CASH: { label: '現金', icon: Banknote, color: 'text-green-500' },
  PREPAID: { label: 'プリペイド', icon: Wallet, color: 'text-purple-500' },
  CREDIT: { label: 'クレジットカード', icon: CreditCard, color: 'text-orange-500' },
}

async function getAssetsData() {
  const [accounts, transactions] = await Promise.all([
    prisma.account.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.transaction.findMany({
      include: { account: true },
      where: {
        OR: [
          { isBilled: false, account: { type: 'CREDIT' } },
          { isExpense: true, expenseSettled: false },
        ],
      },
      orderBy: { date: 'desc' },
    }),
  ])

  return { accounts, transactions }
}

export default async function AssetsPage() {
  const { accounts, transactions } = await getAssetsData()

  const bankAndCash = accounts.filter((a) => a.type === 'BANK' || a.type === 'CASH')
  const prepaid = accounts.filter((a) => a.type === 'PREPAID')
  const credit = accounts.filter((a) => a.type === 'CREDIT')

  // 集計
  const totalHolding = [...bankAndCash, ...prepaid].reduce((s, a) => s + a.balance, 0)

  const unpaidCreditTransactions = transactions.filter(
    (t) => t.account.type === 'CREDIT' && !t.isBilled
  )
  const totalUnpaidCredit = unpaidCreditTransactions.reduce(
    (s, t) => s + Math.abs(t.amount),
    0
  )

  const pendingExpenseTransactions = transactions.filter(
    (t) => t.isExpense && !t.expenseSettled
  )
  const totalPendingExpenses = pendingExpenseTransactions.reduce(
    (s, t) => s + Math.abs(t.amount),
    0
  )

  const realBalance = totalHolding - totalUnpaidCredit

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-xl font-bold">資産一覧</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">保有合計</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(totalHolding)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">実質残高</p>
          <p
            className={`text-xl font-bold tabular-nums ${
              realBalance < 0 ? 'text-danger-dark' : 'text-foreground'
            }`}
          >
            {formatCurrency(realBalance)}
          </p>
        </div>
      </div>

      {/* 銀行・現金 */}
      <Section title="銀行・現金">
        {bankAndCash.map((account) => {
          const config = ACCOUNT_TYPE_CONFIG[account.type]
          return (
            <AccountRow
              key={account.id}
              icon={<config.icon className={`h-4 w-4 ${config.color}`} />}
              name={account.name}
              label={config.label}
              balance={account.balance}
            />
          )
        })}
      </Section>

      {/* プリペイド */}
      {prepaid.length > 0 && (
        <Section title="プリペイド残高">
          {prepaid.map((account) => (
            <AccountRow
              key={account.id}
              icon={<Wallet className="h-4 w-4 text-purple-500" />}
              name={account.name}
              label="プリペイド"
              balance={account.balance}
            />
          ))}
        </Section>
      )}

      {/* クレカ未引落 */}
      <Section title="クレジットカード未引落">
        {credit.map((account) => {
          const accountUnpaid = unpaidCreditTransactions
            .filter((t) => t.accountId === account.id)
            .reduce((s, t) => s + Math.abs(t.amount), 0)

          return (
            <div key={account.id}>
              <AccountRow
                icon={<CreditCard className="h-4 w-4 text-orange-500" />}
                name={account.name}
                label={`引落日: 毎月${account.billingDay ?? '?'}日`}
                balance={-accountUnpaid}
                balanceClass="text-danger-dark"
              />
              {accountUnpaid > 0 && (
                <div className="ml-10 mt-1 space-y-1">
                  {unpaidCreditTransactions
                    .filter((t) => t.accountId === account.id)
                    .slice(0, 3)
                    .map((t) => (
                      <div key={t.id} className="flex justify-between text-xs text-muted-foreground">
                        <span className="truncate">{t.memo ?? '（メモなし）'}</span>
                        <span className="tabular-nums shrink-0 ml-2">
                          -{formatCurrency(Math.abs(t.amount))}
                        </span>
                      </div>
                    ))}
                  {unpaidCreditTransactions.filter((t) => t.accountId === account.id).length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      他{unpaidCreditTransactions.filter((t) => t.accountId === account.id).length - 3}件...
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
          <span className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4 text-danger" />
            未引落合計
          </span>
          <span className="text-danger-dark tabular-nums">-{formatCurrency(totalUnpaidCredit)}</span>
        </div>
      </Section>

      {/* 経費立替 */}
      {totalPendingExpenses > 0 && (
        <Section title="経費立替（回収予定）">
          {pendingExpenseTransactions.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm">{t.memo ?? '（メモなし）'}</p>
                  {t.expenseSettledAt && (
                    <p className="text-xs text-muted-foreground">
                      精算予定: {new Date(t.expenseSettledAt).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                +{formatCurrency(Math.abs(t.amount))}
              </Badge>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
            <span className="flex items-center gap-1 text-blue-600">
              <ReceiptText className="h-4 w-4" />
              回収予定合計
            </span>
            <span className="text-blue-600 tabular-nums">+{formatCurrency(totalPendingExpenses)}</span>
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h2>
      <div className="rounded-xl border bg-card divide-y">{children}</div>
    </div>
  )
}

function AccountRow({
  icon,
  name,
  label,
  balance,
  balanceClass,
}: {
  icon: React.ReactNode
  name: string
  label: string
  balance: number
  balanceClass?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      <p className={`text-sm font-semibold tabular-nums ${balanceClass ?? ''}`}>
        {formatCurrency(Math.abs(balance))}
      </p>
    </div>
  )
}

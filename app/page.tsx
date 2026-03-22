import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { calculatePrediction } from '@/lib/prediction'
import { PredictionCard } from '@/components/PredictionCard'
import { TransactionItem } from '@/components/TransactionItem'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Account, Transaction, RecurringItem, Settings } from '@/lib/types'

async function getHomeData() {
  const [accounts, transactions, recurringItems, settings] = await Promise.all([
    prisma.account.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.transaction.findMany({
      include: { account: true },
      orderBy: { date: 'desc' },
    }),
    prisma.recurringItem.findMany({ where: { isActive: true } }),
    prisma.settings.findUnique({ where: { id: 'singleton' } }),
  ])

  return { accounts, transactions, recurringItems, settings }
}

export default async function HomePage() {
  const { accounts, transactions, recurringItems, settings } = await getHomeData()

  // 設定が未作成の場合はデフォルト値で対応
  const effectiveSettings: Settings = settings ?? {
    id: 'singleton',
    salaryDay: 25,
    salaryAmount: 0,
    dangerThreshold: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const prediction = calculatePrediction(
    accounts as Account[],
    transactions as unknown as Transaction[],
    recurringItems as RecurringItem[],
    effectiveSettings
  )

  // ホーム表示用の最近の支出（最大7件）
  const recentTransactions = transactions
    .filter((t) => t.amount < 0)
    .slice(0, 7)

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">FutureBalance</h1>
        <Link href="/add">
          <Button size="sm" className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            支出を追加
          </Button>
        </Link>
      </div>

      {/* メインカード：予測残高 */}
      <PredictionCard prediction={prediction} />

      {/* 最近の支出 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">最近の支出</h2>
          <Link href="/assets" className="text-xs text-primary hover:underline">
            資産一覧 →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">まだ支出がありません</p>
            <Link href="/add">
              <Button variant="outline" size="sm" className="mt-3">
                最初の支出を追加
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            {recentTransactions.map((transaction, index) => (
              <div key={transaction.id}>
                <TransactionItem
                  transaction={transaction as unknown as Transaction & { account: Account }}
                  className="px-4"
                />
                {index < recentTransactions.length - 1 && (
                  <Separator className="mx-4" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

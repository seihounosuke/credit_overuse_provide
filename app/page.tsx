import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { calculatePrediction } from '@/lib/prediction'
import { PredictionCard } from '@/components/PredictionCard'
import { HomeTransactionList } from '@/components/HomeTransactionList'
import { Button } from '@/components/ui/button'
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

const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  salaryDay: 25,
  salaryAmount: 0,
  extraSalaryAmount: 0,
  dangerThreshold: 50000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export default async function HomePage() {
  const { accounts, transactions, recurringItems, settings } = await getHomeData()

  const effectiveSettings: Settings = settings
    ? { ...DEFAULT_SETTINGS, ...settings }
    : DEFAULT_SETTINGS

  const prediction = calculatePrediction(
    accounts as Account[],
    transactions as unknown as Transaction[],
    recurringItems as RecurringItem[],
    effectiveSettings
  )

  // 最近の支出（振替・引落済みを除く、最大7件）
  const recentTransactions = transactions
    .filter((t) => t.amount < 0 && !t.transferToId)
    .slice(0, 7) as unknown as (Transaction & { account: Account })[]

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">FutureBalance</h1>
        <Link href="/add">
          <Button size="sm" className="gap-1.5 h-9">
            <PlusCircle className="h-4 w-4" />
            支出を追加
          </Button>
        </Link>
      </div>

      {/* メインカード：予測残高 */}
      <PredictionCard prediction={prediction} dangerThreshold={effectiveSettings.dangerThreshold} />

      {/* 最近の支出 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">最近の支出</h2>
          <Link href="/assets" className="text-xs text-primary hover:underline">
            資産一覧 →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">まだ支出がありません</p>
            <Link href="/add">
              <Button variant="outline" size="sm" className="mt-3">
                最初の支出を追加
              </Button>
            </Link>
          </div>
        ) : (
          <HomeTransactionList initialTransactions={recentTransactions} />
        )}
      </div>
    </div>
  )
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePrediction } from '@/lib/prediction'
import type { Account, Transaction, RecurringItem, Settings } from '@/lib/types'

export async function GET() {
  try {
    const [accounts, transactions, recurringItems, settings] = await Promise.all([
      prisma.account.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.transaction.findMany({
        include: { account: true },
        orderBy: { date: 'desc' },
      }),
      prisma.recurringItem.findMany({ where: { isActive: true } }),
      prisma.settings.findUnique({ where: { id: 'singleton' } }),
    ])

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    const prediction = calculatePrediction(
      accounts as Account[],
      transactions as Transaction[],
      recurringItems as RecurringItem[],
      settings as Settings
    )

    return NextResponse.json({
      ...prediction,
      nextSalaryDate: prediction.nextSalaryDate.toISOString(),
    })
  } catch (error) {
    console.error('[prediction/GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

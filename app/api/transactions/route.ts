import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/transactions?limit=20&offset=0
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 20)
  const offset = Number(searchParams.get('offset') ?? 0)
  const onlyUnpaid = searchParams.get('onlyUnpaid') === 'true'
  const onlyExpense = searchParams.get('onlyExpense') === 'true'

  try {
    const where: Record<string, unknown> = {}
    if (onlyUnpaid) {
      where.isBilled = false
      where.account = { type: 'CREDIT' }
    }
    if (onlyExpense) {
      where.isExpense = true
      where.expenseSettled = false
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { account: true },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('[transactions/GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, accountId, memo, isExpense, expenseSettledAt, date } = body

    if (!amount || !accountId) {
      return NextResponse.json({ error: 'amount and accountId are required' }, { status: 400 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: -Math.abs(Number(amount)), // 支出は必ず負の値
        accountId,
        memo: memo || null,
        date: date ? new Date(date) : new Date(),
        isExpense: Boolean(isExpense),
        expenseSettledAt: expenseSettledAt ? new Date(expenseSettledAt) : null,
        isBilled: false,
      },
      include: { account: true },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('[transactions/POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

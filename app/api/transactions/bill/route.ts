import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/transactions/bill
 * クレカ引落処理:
 * - 対象クレカの未引落取引を全て isBilled=true にする
 * - 指定した銀行口座の残高から引落額を差し引く
 *
 * Body: { creditAccountId: string, bankAccountId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { creditAccountId, bankAccountId } = body

    if (!creditAccountId || !bankAccountId) {
      return NextResponse.json(
        { error: 'creditAccountId and bankAccountId are required' },
        { status: 400 }
      )
    }

    // 未引落の取引を取得
    const unpaidTransactions = await prisma.transaction.findMany({
      where: { accountId: creditAccountId, isBilled: false },
    })

    if (unpaidTransactions.length === 0) {
      return NextResponse.json({ ok: true, billedAmount: 0, count: 0 })
    }

    const billedAmount = unpaidTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    )

    // トランザクション内で一括更新
    await prisma.$transaction([
      // 全取引を引落済みにマーク
      prisma.transaction.updateMany({
        where: { accountId: creditAccountId, isBilled: false },
        data: { isBilled: true },
      }),
      // 銀行口座残高を減算
      prisma.account.update({
        where: { id: bankAccountId },
        data: { balance: { decrement: billedAmount } },
      }),
    ])

    revalidatePath('/')

    return NextResponse.json({ ok: true, billedAmount, count: unpaidTransactions.length })
  } catch (error) {
    console.error('[transactions/bill/POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

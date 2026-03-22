import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/transfers
 * 口座間の振替（例: 銀行→PayPayチャージ）
 * - fromAccount の残高を減らす
 * - toAccount の残高を増やす
 * - 両口座に取引記録を残す（transferToId で対応を明示）
 *
 * Body: { fromAccountId, toAccountId, amount, memo }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromAccountId, toAccountId, amount, memo } = body

    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json(
        { error: 'fromAccountId, toAccountId, amount are required' },
        { status: 400 }
      )
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Cannot transfer to same account' }, { status: 400 })
    }

    const transferAmount = Math.abs(Number(amount))
    const now = new Date()

    await prisma.$transaction([
      // 送金元: 残高を減らす
      prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: transferAmount } },
      }),
      // 送金先: 残高を増やす
      prisma.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: transferAmount } },
      }),
      // 送金元の取引記録（-amount）
      prisma.transaction.create({
        data: {
          amount: -transferAmount,
          accountId: fromAccountId,
          memo: memo ? `振替: ${memo}` : '振替（送金）',
          date: now,
          isBilled: true, // 振替は引落済みとして扱い、予測計算に二重計上しない
          transferToId: toAccountId,
        },
      }),
      // 送金先の取引記録（+amount）
      prisma.transaction.create({
        data: {
          amount: transferAmount,
          accountId: toAccountId,
          memo: memo ? `振替受取: ${memo}` : '振替（受取）',
          date: now,
          isBilled: true,
          transferToId: fromAccountId,
        },
      }),
    ])

    revalidatePath('/')

    return NextResponse.json({ ok: true, amount: transferAmount })
  } catch (error) {
    console.error('[transfers/POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/transactions/settle
 * 経費精算処理:
 * - 指定取引の expenseSettled を true にする
 *
 * Body: { transactionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { expenseSettled: true },
    })

    revalidatePath('/')

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('[transactions/settle/POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

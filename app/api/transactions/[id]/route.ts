import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

// DELETE /api/transactions/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.transaction.delete({ where: { id } })
    revalidatePath('/')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[transactions/[id]/DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/transactions/[id]  — メモ・日付などの編集
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { memo, date, isExpense, expenseSettledAt } = body

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(memo !== undefined && { memo }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(isExpense !== undefined && { isExpense: Boolean(isExpense) }),
        ...(expenseSettledAt !== undefined && {
          expenseSettledAt: expenseSettledAt ? new Date(expenseSettledAt) : null,
        }),
      },
      include: { account: true },
    })

    revalidatePath('/')
    return NextResponse.json(transaction)
  } catch (error) {
    console.error('[transactions/[id]/PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

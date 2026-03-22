import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

// GET /api/accounts
export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('[accounts/GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/accounts  — 残高一括更新
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, balance } = body

    if (!id || balance === undefined) {
      return NextResponse.json({ error: 'id and balance are required' }, { status: 400 })
    }

    const account = await prisma.account.update({
      where: { id },
      data: { balance: Number(balance) },
    })

    revalidatePath('/')
    return NextResponse.json(account)
  } catch (error) {
    console.error('[accounts/PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

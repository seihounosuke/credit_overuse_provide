import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/recurring
export async function GET() {
  try {
    const items = await prisma.recurringItem.findMany({
      orderBy: [{ type: 'asc' }, { dayOfMonth: 'asc' }],
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('[recurring/GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/recurring
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, amount, dayOfMonth, type } = body

    if (!name || !amount || !dayOfMonth || !type) {
      return NextResponse.json(
        { error: 'name, amount, dayOfMonth, type are required' },
        { status: 400 }
      )
    }

    const item = await prisma.recurringItem.create({
      data: {
        name,
        amount: Number(amount),
        dayOfMonth: Number(dayOfMonth),
        type,
        isActive: true,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('[recurring/POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/recurring?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.recurringItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[recurring/DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

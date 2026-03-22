import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/settings
export async function GET() {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: {
        id: 'singleton',
        salaryDay: 25,
        salaryAmount: 0,
        dangerThreshold: 30000,
      },
    })
    return NextResponse.json(settings)
  } catch (error) {
    console.error('[settings/GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { salaryDay, salaryAmount, extraSalaryAmount, dangerThreshold } = body

    const settings = await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: {
        ...(salaryDay !== undefined && { salaryDay: Number(salaryDay) }),
        ...(salaryAmount !== undefined && { salaryAmount: Number(salaryAmount) }),
        ...(extraSalaryAmount !== undefined && { extraSalaryAmount: Number(extraSalaryAmount) }),
        ...(dangerThreshold !== undefined && { dangerThreshold: Number(dangerThreshold) }),
      },
      create: {
        id: 'singleton',
        salaryDay: Number(salaryDay ?? 25),
        salaryAmount: Number(salaryAmount ?? 0),
        extraSalaryAmount: Number(extraSalaryAmount ?? 0),
        dangerThreshold: Number(dangerThreshold ?? 50000),
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[settings/PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

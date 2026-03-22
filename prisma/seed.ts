import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 設定
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      salaryDay: 25,
      salaryAmount: 280000,
      dangerThreshold: 50000,
    },
  })

  // 口座
  const bank = await prisma.account.upsert({
    where: { id: 'acc-bank' },
    update: {},
    create: {
      id: 'acc-bank',
      name: '三菱UFJ銀行',
      type: 'BANK',
      balance: 187500,
      color: '#3b82f6',
      sortOrder: 1,
    },
  })

  const cash = await prisma.account.upsert({
    where: { id: 'acc-cash' },
    update: {},
    create: {
      id: 'acc-cash',
      name: '現金',
      type: 'CASH',
      balance: 15000,
      color: '#84cc16',
      sortOrder: 2,
    },
  })

  const paypay = await prisma.account.upsert({
    where: { id: 'acc-paypay' },
    update: {},
    create: {
      id: 'acc-paypay',
      name: 'PayPay',
      type: 'PREPAID',
      balance: 5200,
      color: '#ef4444',
      sortOrder: 3,
    },
  })

  const pasmo = await prisma.account.upsert({
    where: { id: 'acc-pasmo' },
    update: {},
    create: {
      id: 'acc-pasmo',
      name: 'PASMO',
      type: 'PREPAID',
      balance: 3800,
      color: '#8b5cf6',
      sortOrder: 4,
    },
  })

  const creditCard = await prisma.account.upsert({
    where: { id: 'acc-credit' },
    update: {},
    create: {
      id: 'acc-credit',
      name: '楽天カード',
      type: 'CREDIT',
      balance: 0,
      billingDay: 27,
      color: '#f97316',
      sortOrder: 5,
    },
  })

  // 固定費
  await prisma.recurringItem.deleteMany()
  await prisma.recurringItem.createMany({
    data: [
      {
        name: '家賃',
        amount: -85000,
        dayOfMonth: 1,
        type: 'EXPENSE',
        isActive: true,
      },
      {
        name: 'Netflix',
        amount: -1490,
        dayOfMonth: 15,
        type: 'EXPENSE',
        isActive: true,
      },
      {
        name: 'Spotify',
        amount: -980,
        dayOfMonth: 8,
        type: 'EXPENSE',
        isActive: true,
      },
      {
        name: 'スマホ代',
        amount: -3850,
        dayOfMonth: 20,
        type: 'EXPENSE',
        isActive: true,
      },
    ],
  })

  // 支出サンプル（最近1ヶ月分）
  await prisma.transaction.deleteMany()

  const now = new Date()
  const daysAgo = (d: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    return date
  }

  await prisma.transaction.createMany({
    data: [
      // クレカ利用（未引落）
      {
        amount: -3200,
        accountId: creditCard.id,
        memo: 'ランチ会食',
        date: daysAgo(1),
        isExpense: false,
        isBilled: false,
      },
      {
        amount: -8900,
        accountId: creditCard.id,
        memo: 'Amazon購入',
        date: daysAgo(3),
        isExpense: false,
        isBilled: false,
      },
      {
        amount: -12000,
        accountId: creditCard.id,
        memo: '部門飲み会（立替）',
        date: daysAgo(5),
        isExpense: true,
        expenseSettledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
        expenseSettled: false,
        isBilled: false,
      },
      {
        amount: -4500,
        accountId: creditCard.id,
        memo: 'ビジネス書2冊',
        date: daysAgo(7),
        isExpense: false,
        isBilled: false,
      },
      {
        amount: -15000,
        accountId: creditCard.id,
        memo: '出張交通費（立替）',
        date: daysAgo(10),
        isExpense: true,
        expenseSettledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
        expenseSettled: false,
        isBilled: false,
      },
      // 現金支出
      {
        amount: -980,
        accountId: cash.id,
        memo: 'コンビニ',
        date: daysAgo(2),
        isExpense: false,
        isBilled: false,
      },
      {
        amount: -1200,
        accountId: cash.id,
        memo: 'ランチ',
        date: daysAgo(4),
        isExpense: false,
        isBilled: false,
      },
      // PayPay利用
      {
        amount: -2300,
        accountId: paypay.id,
        memo: 'スーパー',
        date: daysAgo(1),
        isExpense: false,
        isBilled: false,
      },
      // PASMO
      {
        amount: -480,
        accountId: pasmo.id,
        memo: '電車',
        date: daysAgo(2),
        isExpense: false,
        isBilled: false,
      },
      // 引落済みクレカ（先月分）
      {
        amount: -45000,
        accountId: creditCard.id,
        memo: '先月クレカ引落',
        date: daysAgo(20),
        isExpense: false,
        isBilled: true,
      },
    ],
  })

  const summary = {
    bank: bank.balance,
    cash: cash.balance,
    paypay: paypay.balance,
    pasmo: pasmo.balance,
  }
  const total = Object.values(summary).reduce((s, v) => s + v, 0)

  console.log('✅ Seed completed!')
  console.log('  口座残高合計:', total.toLocaleString('ja-JP'), '円')
  console.log('  固定費: 4件')
  console.log('  取引: 10件（うちクレカ未引落: 5件、経費立替: 2件）')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

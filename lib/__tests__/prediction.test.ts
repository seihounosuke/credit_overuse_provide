import { describe, it, expect } from 'vitest'
import {
  calculatePrediction,
  calculateAddImpact,
  DANGER_LEVEL_LABELS,
} from '../prediction'
import type { Account, Transaction, RecurringItem, Settings } from '../types'

// ── テスト用ヘルパー ─────────────────────────────────────────────

const makeSettings = (overrides: Partial<Settings> = {}): Settings => ({
  id: 'singleton',
  salaryDay: 25,
  salaryAmount: 300000,
  extraSalaryAmount: 0,
  dangerThreshold: 50000,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'テスト口座',
  type: 'BANK',
  balance: 0,
  billingDay: null,
  color: null,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  amount: -1000,
  accountId: 'acc-1',
  memo: null,
  date: new Date(),
  isExpense: false,
  expenseSettledAt: null,
  expenseSettled: false,
  isBilled: false,
  transferToId: null,
  createdAt: new Date(),
  ...overrides,
})

const makeRecurring = (overrides: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'rec-1',
  name: 'テスト固定費',
  amount: -10000,
  dayOfMonth: 1,
  type: 'EXPENSE',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// ── 給料日まで12日の固定日（3月12日）でテスト ────────────────────
// 給料日=25日 → 次の給料日=3月25日（13日後）
const TODAY_BEFORE_SALARY = new Date('2026-03-12')
// 給料日=25日 → 今日が25日以降なら来月25日
const TODAY_AFTER_SALARY = new Date('2026-03-26')

// ── テスト ───────────────────────────────────────────────────────

describe('calculatePrediction', () => {
  describe('基本計算', () => {
    it('クレカなし・固定費なしの最シンプルなケース', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 100000 })]
      const result = calculatePrediction(accounts, [], [], makeSettings(), TODAY_BEFORE_SALARY)

      expect(result.currentBalance).toBe(100000)
      expect(result.unpaidCredit).toBe(0)
      expect(result.fixedExpensesUntilSalary).toBe(0)
      expect(result.nextSalaryAmount).toBe(300000)
      // 100000 - 0 - 0 + 300000 = 400000
      expect(result.predictedBalance).toBe(400000)
    })

    it('クレカ未引落が予測残高を削る', () => {
      const bank = makeAccount({ id: 'bank', type: 'BANK', balance: 200000 })
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      const unpaidTx = makeTx({ accountId: 'credit', amount: -30000, isBilled: false })

      const result = calculatePrediction(
        [bank, credit],
        [unpaidTx],
        [],
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.currentBalance).toBe(200000)
      expect(result.unpaidCredit).toBe(30000)
      // 200000 - 30000 - 0 + 300000 = 470000
      expect(result.predictedBalance).toBe(470000)
    })

    it('引落済みのクレカ取引は未引落に含まれない', () => {
      const bank = makeAccount({ id: 'bank', type: 'BANK', balance: 200000 })
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      const billedTx = makeTx({ accountId: 'credit', amount: -30000, isBilled: true })
      const unpaidTx = makeTx({ id: 'tx-2', accountId: 'credit', amount: -10000, isBilled: false })

      const result = calculatePrediction(
        [bank, credit],
        [billedTx, unpaidTx],
        [],
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.unpaidCredit).toBe(10000) // 未引落のみ
    })

    it('クレカ口座の残高は currentBalance に含まれない', () => {
      const bank = makeAccount({ id: 'bank', type: 'BANK', balance: 100000 })
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 50000 })

      const result = calculatePrediction(
        [bank, credit],
        [],
        [],
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      // クレカの50000は含まれない
      expect(result.currentBalance).toBe(100000)
    })

    it('複数口座（銀行・現金・プリペイド）の残高が合算される', () => {
      const accounts = [
        makeAccount({ id: 'bank', type: 'BANK', balance: 100000 }),
        makeAccount({ id: 'cash', type: 'CASH', balance: 10000 }),
        makeAccount({ id: 'paypay', type: 'PREPAID', balance: 5000 }),
      ]

      const result = calculatePrediction(accounts, [], [], makeSettings(), TODAY_BEFORE_SALARY)

      expect(result.currentBalance).toBe(115000)
    })
  })

  describe('固定費の計算', () => {
    it('給料日までの間に引き落とされる固定費が減額される', () => {
      // 今日=3/12、給料日=3/25
      // 毎月15日の固定費（¥20,000）→ 3/15は給料日前なので含まれる
      const accounts = [makeAccount({ type: 'BANK', balance: 200000 })]
      const recurring = [makeRecurring({ amount: -20000, dayOfMonth: 15 })]

      const result = calculatePrediction(
        accounts,
        [],
        recurring,
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.fixedExpensesUntilSalary).toBe(20000)
      // 200000 - 0 - 20000 + 300000 = 480000
      expect(result.predictedBalance).toBe(480000)
    })

    it('給料日以降の固定費は含まれない', () => {
      // 今日=3/12、給料日=3/25
      // 毎月26日の固定費（¥10,000）→ 3/26は給料日後なので含まれない
      const accounts = [makeAccount({ type: 'BANK', balance: 200000 })]
      const recurring = [makeRecurring({ amount: -10000, dayOfMonth: 26 })]

      const result = calculatePrediction(
        accounts,
        [],
        recurring,
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.fixedExpensesUntilSalary).toBe(0)
    })

    it('今日と同日の固定費は含まれない（当日は過ぎている）', () => {
      // 今日=3/12、毎月12日の固定費
      const accounts = [makeAccount({ type: 'BANK', balance: 200000 })]
      const recurring = [makeRecurring({ amount: -5000, dayOfMonth: 12 })]

      const result = calculatePrediction(
        accounts,
        [],
        recurring,
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.fixedExpensesUntilSalary).toBe(0)
    })

    it('複数の固定費を合算する', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 200000 })]
      const recurring = [
        makeRecurring({ id: 'r1', amount: -85000, dayOfMonth: 13 }), // 家賃
        makeRecurring({ id: 'r2', amount: -1490, dayOfMonth: 15 }), // サブスク
        makeRecurring({ id: 'r3', amount: -50000, dayOfMonth: 26 }), // 給料日後 → 含まれない
      ]

      const result = calculatePrediction(
        accounts,
        [],
        recurring,
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.fixedExpensesUntilSalary).toBe(86490) // 85000 + 1490
    })

    it('isActive=false の固定費は計算から除外される', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 200000 })]
      const recurring = [makeRecurring({ amount: -10000, dayOfMonth: 15, isActive: false })]

      const result = calculatePrediction(accounts, [], recurring, makeSettings(), TODAY_BEFORE_SALARY)

      expect(result.fixedExpensesUntilSalary).toBe(0)
    })
  })

  describe('経費立替', () => {
    it('未精算の経費立替が pendingExpenses に反映される', () => {
      const bank = makeAccount({ id: 'bank', type: 'BANK', balance: 200000 })
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      const expenseTx = makeTx({
        accountId: 'credit',
        amount: -15000,
        isExpense: true,
        expenseSettled: false,
        isBilled: false,
      })

      const result = calculatePrediction(
        [bank, credit],
        [expenseTx],
        [],
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.pendingExpenses).toBe(15000)
    })

    it('精算済みの経費は pendingExpenses に含まれない', () => {
      const bank = makeAccount({ id: 'bank', type: 'BANK', balance: 200000 })
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      const settledTx = makeTx({
        accountId: 'credit',
        amount: -15000,
        isExpense: true,
        expenseSettled: true,
        isBilled: false,
      })

      const result = calculatePrediction(
        [bank, credit],
        [settledTx],
        [],
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      expect(result.pendingExpenses).toBe(0)
    })

    it('経費立替は予測残高には影響する（未引落クレカとして計算される）', () => {
      // 経費はクレカで払った場合、unpaidCredit に含まれる → 予測残高が減る
      // これが「今の自分の実態」の可視化
      const bank = makeAccount({ id: 'bank', type: 'BANK', balance: 200000 })
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      const expenseTx = makeTx({
        accountId: 'credit',
        amount: -15000,
        isExpense: true,
        expenseSettled: false,
        isBilled: false,
      })

      const result = calculatePrediction(
        [bank, credit],
        [expenseTx],
        [],
        makeSettings(),
        TODAY_BEFORE_SALARY
      )

      // 経費もクレカ未引落として予測残高を減らす
      expect(result.unpaidCredit).toBe(15000)
      // 200000 - 15000 - 0 + 300000 = 485000
      expect(result.predictedBalance).toBe(485000)
    })
  })

  describe('変動給与', () => {
    it('extraSalaryAmount が予測残高に加算される', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 100000 })]
      const settings = makeSettings({ salaryAmount: 300000, extraSalaryAmount: 50000 })

      const result = calculatePrediction(accounts, [], [], settings, TODAY_BEFORE_SALARY)

      expect(result.nextSalaryAmount).toBe(350000)
      // 100000 + 350000 = 450000
      expect(result.predictedBalance).toBe(450000)
    })
  })

  describe('給料日の計算', () => {
    it('今日が給料日前なら今月の給料日を返す', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 0 })]
      const result = calculatePrediction(accounts, [], [], makeSettings(), TODAY_BEFORE_SALARY)

      // 今日=3/12、給料日=25日 → 3/25
      expect(result.nextSalaryDate.getMonth()).toBe(2) // March (0-indexed)
      expect(result.nextSalaryDate.getDate()).toBe(25)
    })

    it('今日が給料日以降なら来月の給料日を返す', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 0 })]
      const result = calculatePrediction(accounts, [], [], makeSettings(), TODAY_AFTER_SALARY)

      // 今日=3/26、給料日=25日 → 4/25
      expect(result.nextSalaryDate.getMonth()).toBe(3) // April (0-indexed)
      expect(result.nextSalaryDate.getDate()).toBe(25)
    })

    it('daysUntilSalary が正しく計算される', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 0 })]
      const result = calculatePrediction(accounts, [], [], makeSettings(), TODAY_BEFORE_SALARY)

      // 3/12 → 3/25 = 13日
      expect(result.daysUntilSalary).toBe(13)
    })
  })

  describe('危険度判定', () => {
    it('閾値の2倍以上なら安全', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 200000 })]
      // dangerThreshold=50000, salaryAmount=300000
      // predictedBalance = 200000 + 300000 = 500000 > 100000
      const result = calculatePrediction(accounts, [], [], makeSettings(), TODAY_BEFORE_SALARY)

      expect(result.dangerLevel).toBe('safe')
    })

    it('閾値以上・閾値の2倍未満なら注意', () => {
      // predicted = 40000 (25000 <= 40000 < 50000) → warning
      // threshold=50000, half=25000
      // bank(100000) - unpaid(360000) + salary(300000) = 40000
      const accounts = [makeAccount({ type: 'BANK', balance: 100000 })]
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      const unpaidTx = makeTx({ accountId: 'credit', amount: -360000, isBilled: false })
      const settings = makeSettings({ salaryAmount: 300000, dangerThreshold: 50000 })

      const result = calculatePrediction(
        [accounts[0], credit],
        [unpaidTx],
        [],
        settings,
        TODAY_BEFORE_SALARY
      )

      // 100000 - 360000 + 300000 = 40000
      expect(result.predictedBalance).toBe(40000)
      expect(result.dangerLevel).toBe('warning')
    })

    it('閾値の半分未満なら危険', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 100000 })]
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      const unpaidTx = makeTx({ accountId: 'credit', amount: -380000, isBilled: false })
      const settings = makeSettings({ salaryAmount: 300000, dangerThreshold: 50000 })

      const result = calculatePrediction(
        [accounts[0], credit],
        [unpaidTx],
        [],
        settings,
        TODAY_BEFORE_SALARY
      )

      // 100000 - 380000 + 300000 = 20000 < 25000 (= 50000 * 0.5)
      expect(result.predictedBalance).toBe(20000)
      expect(result.dangerLevel).toBe('danger')
    })

    it('予測残高がマイナスになることがある（赤字状態）', () => {
      const accounts = [makeAccount({ type: 'BANK', balance: 0 })]
      const credit = makeAccount({ id: 'credit', type: 'CREDIT', balance: 0 })
      // クレカで給料超えの利用
      const unpaidTx = makeTx({ accountId: 'credit', amount: -500000, isBilled: false })
      const settings = makeSettings({ salaryAmount: 300000 })

      const result = calculatePrediction(
        [accounts[0], credit],
        [unpaidTx],
        [],
        settings,
        TODAY_BEFORE_SALARY
      )

      expect(result.predictedBalance).toBe(-200000)
      expect(result.dangerLevel).toBe('danger')
    })
  })
})

describe('calculateAddImpact', () => {
  it('支出追加後の予測残高が正しく計算される', () => {
    const accounts = [makeAccount({ type: 'BANK', balance: 100000 })]
    const prediction = calculatePrediction(accounts, [], [], makeSettings(), TODAY_BEFORE_SALARY)

    // 現在の予測残高から支出額を引く
    const after = calculateAddImpact(prediction, 10000)
    expect(after).toBe(prediction.predictedBalance - 10000)
  })

  it('金額0の場合は予測残高が変わらない', () => {
    const accounts = [makeAccount({ type: 'BANK', balance: 100000 })]
    const prediction = calculatePrediction(accounts, [], [], makeSettings(), TODAY_BEFORE_SALARY)

    const after = calculateAddImpact(prediction, 0)
    expect(after).toBe(prediction.predictedBalance)
  })
})

describe('DANGER_LEVEL_LABELS', () => {
  it('各危険度のラベルが定義されている', () => {
    expect(DANGER_LEVEL_LABELS.safe).toBe('安全')
    expect(DANGER_LEVEL_LABELS.warning).toBe('注意')
    expect(DANGER_LEVEL_LABELS.danger).toBe('危険')
  })
})

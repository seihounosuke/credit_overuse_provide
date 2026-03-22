import type { Account, Transaction, RecurringItem, Settings, PredictionResult, DangerLevel } from './types'
import { getNextSalaryDate } from './dateUtils'

// ── 予測残高計算ロジック ─────────────────────────────────────────
//
// 計算式:
//   予測残高 = 現在保有残高
//             - クレカ未引落合計
//             - 今日〜給料日の間に落ちる固定費
//             + 次の給与額
//
// ※ 経費立替は予測残高には含めないが「別途回収予定」として表示する

export function calculatePrediction(
  accounts: Account[],
  transactions: Transaction[],
  recurringItems: RecurringItem[],
  settings: Settings,
  today: Date = new Date()
): PredictionResult {
  const nextSalaryDate = getNextSalaryDate(today, settings.salaryDay)
  const daysUntilSalary = getDaysUntil(today, nextSalaryDate)

  // 1. 現在保有残高（クレカ以外の口座合計）
  const currentBalance = accounts
    .filter((a) => a.type !== 'CREDIT')
    .reduce((sum, a) => sum + a.balance, 0)

  // 2. クレカ未引落合計（未来に引き落とされる金額）
  const unpaidCreditTransactions = transactions.filter((t) => {
    const account = accounts.find((a) => a.id === t.accountId)
    return account?.type === 'CREDIT' && !t.isBilled
  })
  const unpaidCredit = unpaidCreditTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  )

  // 3. 経費立替中（未精算）の合計 ← 表示用・予測残高には含めない
  const pendingExpenses = transactions
    .filter((t) => t.isExpense && !t.expenseSettled)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // 4. 今日〜給料日の間に落ちる固定費
  const activeExpenses = recurringItems.filter(
    (r) => r.isActive && r.type === 'EXPENSE'
  )
  const fixedExpensesUntilSalary = sumFixedExpensesInRange(
    activeExpenses,
    today,
    nextSalaryDate
  )

  // 5. 予測残高（基本給 + 変動給与を加算）
  const totalSalary = settings.salaryAmount + settings.extraSalaryAmount
  const predictedBalance =
    currentBalance - unpaidCredit - fixedExpensesUntilSalary + totalSalary

  const dangerLevel = getDangerLevel(predictedBalance, settings.dangerThreshold)

  return {
    currentBalance,
    unpaidCredit,
    pendingExpenses,
    fixedExpensesUntilSalary,
    nextSalaryAmount: settings.salaryAmount + settings.extraSalaryAmount,
    predictedBalance,
    dangerLevel,
    nextSalaryDate,
    daysUntilSalary,
  }
}

/**
 * from〜to の間に dayOfMonth が含まれる固定費の合計を計算する
 * 月をまたぐ場合も正しく処理する
 */
function sumFixedExpensesInRange(
  expenses: RecurringItem[],
  from: Date,
  to: Date
): number {
  let total = 0

  for (const item of expenses) {
    // from と同月の対象日から開始し、to を超えるまでループ
    let checkDate = new Date(from.getFullYear(), from.getMonth(), item.dayOfMonth)

    while (checkDate <= to) {
      // from より後（当日は含まない）で to 以前のものをカウント
      if (checkDate > from) {
        total += Math.abs(item.amount)
      }
      // 翌月の同日へ
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, item.dayOfMonth)
    }
  }

  return total
}

function getDaysUntil(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getDangerLevel(predictedBalance: number, threshold: number): DangerLevel {
  if (predictedBalance < threshold * 0.5) return 'danger'
  if (predictedBalance < threshold) return 'warning'
  return 'safe'
}

// ── 支出追加時のインパクト計算 ────────────────────────────────────

/**
 * 新たな支出を追加した場合の予測残高への影響を返す
 * クレカ・現金問わず、未来残高は同じだけ減る
 */
export function calculateAddImpact(
  currentPrediction: PredictionResult,
  amount: number
): number {
  return currentPrediction.predictedBalance - amount
}

// ── 危険度ラベル・カラー ──────────────────────────────────────────

export const DANGER_LEVEL_LABELS: Record<DangerLevel, string> = {
  safe: '安全',
  warning: '注意',
  danger: '危険',
}

export const DANGER_LEVEL_COLORS: Record<DangerLevel, { bg: string; text: string; border: string }> = {
  safe: {
    bg: 'bg-safe-light',
    text: 'text-safe-dark',
    border: 'border-safe',
  },
  warning: {
    bg: 'bg-warning-light',
    text: 'text-warning-dark',
    border: 'border-warning',
  },
  danger: {
    bg: 'bg-danger-light',
    text: 'text-danger-dark',
    border: 'border-danger',
  },
}

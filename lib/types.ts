// ── ドメイン型定義 ──────────────────────────────────────────────

export type AccountType = 'BANK' | 'CASH' | 'PREPAID' | 'CREDIT'
export type RecurringType = 'INCOME' | 'EXPENSE'
export type DangerLevel = 'safe' | 'warning' | 'danger'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  billingDay: number | null
  color: string | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  amount: number
  accountId: string
  account?: Account
  memo: string | null
  date: Date
  isExpense: boolean
  expenseSettledAt: Date | null
  expenseSettled: boolean
  isBilled: boolean
  transferToId: string | null
  createdAt: Date
}

export interface RecurringItem {
  id: string
  name: string
  amount: number
  dayOfMonth: number
  type: RecurringType
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  id: string
  salaryDay: number
  salaryAmount: number
  extraSalaryAmount: number   // 今月の変動給与（ボーナス・残業代等）
  dangerThreshold: number
  createdAt: Date
  updatedAt: Date
}

// ── 予測残高 ──────────────────────────────────────────────────────

export interface PredictionResult {
  /** クレカ以外の口座合計 */
  currentBalance: number
  /** クレカ未引落合計（将来の引き落とし予定） */
  unpaidCredit: number
  /** 経費立替中（未精算）の合計 */
  pendingExpenses: number
  /** 今日〜給料日までに落ちる固定費 */
  fixedExpensesUntilSalary: number
  /** 次の給与額 */
  nextSalaryAmount: number
  /** メイン表示値：次の給料日時点の予測残高 */
  predictedBalance: number
  /** 危険度 */
  dangerLevel: DangerLevel
  /** 次の給料日 */
  nextSalaryDate: Date
  /** 給料日まで何日 */
  daysUntilSalary: number
}

// ── フォーム入力型 ────────────────────────────────────────────────

export interface TransactionFormData {
  amount: number
  accountId: string
  memo: string
  isExpense: boolean
  expenseSettledAt: string | null
}

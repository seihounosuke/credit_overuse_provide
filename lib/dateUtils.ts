// ── 日付ユーティリティ ────────────────────────────────────────────

/**
 * 次の給料日を計算する
 * - 今日が給料日より前なら今月の給料日
 * - 今日が給料日以降なら来月の給料日
 */
export function getNextSalaryDate(today: Date, salaryDay: number): Date {
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()

  if (day < salaryDay) {
    return new Date(year, month, salaryDay)
  } else {
    return new Date(year, month + 1, salaryDay)
  }
}

/** 今日から targetDate までの日数（切り上げ） */
export function getDaysUntil(targetDate: Date, fromDate: Date = new Date()): number {
  const diff = targetDate.getTime() - fromDate.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/** 金額を日本円フォーマットで返す */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount)
}

/** 日付を「M/D」形式で返す */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}

/** 日付を「YYYY-MM-DD」形式で返す（input[date]用） */
export function toInputDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 「今日 / N日前 / M/D」と自然な形式で返す */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const diffMs = today.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  if (diffDays <= 7) return `${diffDays}日前`
  return formatDate(d)
}

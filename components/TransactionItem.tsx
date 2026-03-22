import { formatCurrency, formatRelativeDate } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'
import type { Transaction, Account } from '@/lib/types'
import { ReceiptText, CreditCard, Banknote, Wallet } from 'lucide-react'

interface TransactionItemProps {
  transaction: Transaction & { account: Account }
  className?: string
}

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  CREDIT: CreditCard,
  BANK: Banknote,
  CASH: Banknote,
  PREPAID: Wallet,
}

export function TransactionItem({ transaction, className }: TransactionItemProps) {
  const Icon = ACCOUNT_TYPE_ICONS[transaction.account.type] ?? Wallet
  const isExpense = transaction.amount < 0
  const isCredit = transaction.account.type === 'CREDIT'

  return (
    <div className={cn('flex items-center gap-3 py-2.5', className)}>
      {/* アイコン */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          transaction.isExpense ? 'bg-blue-50' : 'bg-muted'
        )}
      >
        {transaction.isExpense ? (
          <ReceiptText className="h-4 w-4 text-blue-500" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* メモ・口座名 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {transaction.memo ?? '（メモなし）'}
          {transaction.isExpense && (
            <span className="ml-1.5 text-[10px] text-blue-500 font-normal">経費</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{transaction.account.name}</span>
          {isCredit && !transaction.isBilled && (
            <span className="text-warning-dark">（未引落）</span>
          )}
          <span>·</span>
          <span>{formatRelativeDate(transaction.date)}</span>
        </p>
      </div>

      {/* 金額 */}
      <p
        className={cn(
          'text-sm font-semibold tabular-nums shrink-0',
          isExpense ? 'text-foreground' : 'text-safe-dark'
        )}
      >
        {isExpense ? '-' : '+'}
        {formatCurrency(Math.abs(transaction.amount))}
      </p>
    </div>
  )
}

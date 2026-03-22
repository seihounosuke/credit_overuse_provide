'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { RecurringItem, Settings } from '@/lib/types'
import { formatCurrency } from '@/lib/dateUtils'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 新規固定費フォーム
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemDay, setNewItemDay] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/recurring').then((r) => r.json()),
    ]).then(([s, r]) => {
      setSettings(s)
      setRecurring(r)
      setLoading(false)
    })
  }, [])

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)

    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salaryDay: settings.salaryDay,
        salaryAmount: settings.salaryAmount,
        dangerThreshold: settings.dangerThreshold,
      }),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName || !newItemAmount || !newItemDay) return

    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newItemName,
        amount: -Math.abs(parseFloat(newItemAmount)),
        dayOfMonth: parseInt(newItemDay),
        type: 'EXPENSE',
      }),
    })
    const item = await res.json()
    setRecurring((prev) => [...prev, item])
    setNewItemName('')
    setNewItemAmount('')
    setNewItemDay('')
  }

  async function handleDeleteRecurring(id: string) {
    await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' })
    setRecurring((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-xl font-bold">設定</h1>

      {/* 給与設定 */}
      <form onSubmit={handleSaveSettings} className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            給与
          </h2>
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salaryDay">給料日（毎月）</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="salaryDay"
                  type="number"
                  min={1}
                  max={31}
                  value={settings?.salaryDay ?? 25}
                  onChange={(e) =>
                    setSettings((s) => s && { ...s, salaryDay: parseInt(e.target.value) })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">日</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salaryAmount">手取り基本給</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="salaryAmount"
                  type="number"
                  inputMode="numeric"
                  value={settings?.salaryAmount ?? 0}
                  onChange={(e) =>
                    setSettings((s) => s && { ...s, salaryAmount: parseFloat(e.target.value) })
                  }
                  className="pl-8"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dangerThreshold">
                危険ライン
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                  予測残高がこの金額を下回ると警告表示
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="dangerThreshold"
                  type="number"
                  inputMode="numeric"
                  value={settings?.dangerThreshold ?? 30000}
                  onChange={(e) =>
                    setSettings((s) => s && { ...s, dangerThreshold: parseFloat(e.target.value) })
                  }
                  className="pl-8"
                  min={0}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />保存中...</>
              ) : saved ? (
                '✓ 保存しました'
              ) : (
                <><Save className="h-4 w-4" />設定を保存</>
              )}
            </Button>
          </div>
        </div>
      </form>

      <Separator />

      {/* 固定費 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          固定費
        </h2>

        <div className="rounded-xl border bg-card divide-y">
          {recurring.filter((r) => r.type === 'EXPENSE').map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">毎月{item.dayOfMonth}日</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-danger-dark tabular-nums">
                  -{formatCurrency(Math.abs(item.amount))}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteRecurring(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {recurring.filter((r) => r.type === 'EXPENSE').length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              固定費が登録されていません
            </div>
          )}
        </div>

        {/* 固定費追加フォーム */}
        <form onSubmit={handleAddRecurring} className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">固定費を追加</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="newItemName" className="text-xs">名前</Label>
              <Input
                id="newItemName"
                placeholder="家賃、Netflix..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newItemAmount" className="text-xs">金額（円）</Label>
              <Input
                id="newItemAmount"
                type="number"
                inputMode="numeric"
                placeholder="10000"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="h-9"
                min={1}
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="newItemDay" className="text-xs">引落日</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="newItemDay"
                  type="number"
                  inputMode="numeric"
                  placeholder="25"
                  value={newItemDay}
                  onChange={(e) => setNewItemDay(e.target.value)}
                  className="h-9 w-20"
                  min={1}
                  max={31}
                />
                <span className="text-sm text-muted-foreground">日</span>
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-9"
              disabled={!newItemName || !newItemAmount || !newItemDay}
            >
              <Plus className="h-4 w-4" />
              追加
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RecurringItem, Settings } from '@/lib/types'
import { formatCurrency } from '@/lib/dateUtils'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
        extraSalaryAmount: settings.extraSalaryAmount,
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

  const totalFixed = recurring
    .filter((r) => r.type === 'EXPENSE' && r.isActive)
    .reduce((s, r) => s + Math.abs(r.amount), 0)

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-xl font-bold">設定</h1>

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* 給与 */}
        <SettingSection title="給与">
          <SettingRow label="給料日" description="毎月この日に給与が入金される">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={31}
                value={settings?.salaryDay ?? 25}
                onChange={(e) =>
                  setSettings((s) => s && { ...s, salaryDay: parseInt(e.target.value) })
                }
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">日</span>
            </div>
          </SettingRow>

          <SettingRow label="手取り基本給" description="毎月の固定手取り額">
            <MoneyInput
              value={settings?.salaryAmount ?? 0}
              onChange={(v) => setSettings((s) => s && { ...s, salaryAmount: v })}
            />
          </SettingRow>

          <SettingRow
            label="今月の変動給与"
            description="残業代・ボーナス等。来月は0に戻してください"
          >
            <div className="space-y-1">
              <MoneyInput
                value={settings?.extraSalaryAmount ?? 0}
                onChange={(v) => setSettings((s) => s && { ...s, extraSalaryAmount: v })}
              />
              {(settings?.extraSalaryAmount ?? 0) > 0 && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  今月の給与合計:{' '}
                  {formatCurrency((settings?.salaryAmount ?? 0) + (settings?.extraSalaryAmount ?? 0))}
                </p>
              )}
            </div>
          </SettingRow>
        </SettingSection>

        {/* 危険ライン */}
        <SettingSection title="危険ライン">
          <SettingRow
            label="警告の閾値"
            description="予測残高がこの金額を下回ると「注意」表示、半分を下回ると「危険」表示"
          >
            <MoneyInput
              value={settings?.dangerThreshold ?? 50000}
              onChange={(v) => setSettings((s) => s && { ...s, dangerThreshold: v })}
            />
          </SettingRow>
        </SettingSection>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />保存中...</>
          ) : saved ? (
            '✓ 保存しました'
          ) : (
            <><Save className="h-4 w-4" />設定を保存</>
          )}
        </Button>
      </form>

      {/* 固定費 */}
      <SettingSection title={`固定費（月計 ${formatCurrency(totalFixed)}）`}>
        {recurring.filter((r) => r.type === 'EXPENSE').length === 0 && (
          <p className="px-4 py-5 text-sm text-muted-foreground text-center">
            固定費が未登録です
          </p>
        )}
        {recurring
          .filter((r) => r.type === 'EXPENSE')
          .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
          .map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">毎月{item.dayOfMonth}日</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-danger-dark tabular-nums">
                  -{formatCurrency(Math.abs(item.amount))}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteRecurring(item.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

        {/* 追加フォーム */}
        <form
          onSubmit={handleAddRecurring}
          className="px-4 py-3 bg-muted/30 border-t space-y-3"
        >
          <p className="text-xs font-medium text-muted-foreground">固定費を追加</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">名前</Label>
              <Input
                placeholder="家賃、Netflix..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">金額（円）</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="10000"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="h-9 text-sm"
                min={1}
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">引落日</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="25"
                  value={newItemDay}
                  onChange={(e) => setNewItemDay(e.target.value)}
                  className="h-9 w-20 text-sm text-center"
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
      </SettingSection>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h2>
      <div className="rounded-xl border bg-card divide-y overflow-hidden">{children}</div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        ¥
      </span>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-9 pl-6 w-36 text-right text-sm"
        min={0}
      />
    </div>
  )
}

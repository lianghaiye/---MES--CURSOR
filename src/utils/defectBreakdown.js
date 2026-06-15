import { resolveDefectItemsByIds } from '@/store/defectItemStore'

export function sumBreakdownQty(breakdown = []) {
  return breakdown.reduce((sum, row) => sum + (Number(row.qty) || 0), 0)
}

export function formatBreakdownLabel(breakdown = []) {
  return breakdown
    .filter((row) => row.qty > 0)
    .map((row) => `${row.name}×${row.qty}`)
    .join('、')
}

export function breakdownToLegacy(breakdown = []) {
  const active = breakdown.filter((row) => row.qty > 0)
  return {
    defectBreakdown: active,
    defectItemIds: active.map((row) => row.id),
    defectItemNames: active.map((row) => row.name),
    defectReasonLabel: formatBreakdownLabel(active) || '—',
  }
}

export function migrateLegacyDefects(target = {}, items = []) {
  if (target.defectBreakdown?.length) {
    return target.defectBreakdown.filter((row) => row.qty > 0)
  }
  const defectQty = Number(target.defectQty) || 0
  const ids = target.defectItemIds || []
  if (!defectQty || !ids.length) return []
  const resolvedItems = items.length > 0 ? items : resolveDefectItemsByIds(ids)
  const firstId = ids[0]
  const item = resolvedItems.find((d) => d.id === firstId)
  return [
    {
      id: firstId,
      name: item?.name || target.defectItemNames?.[0] || '',
      qty: defectQty,
    },
  ]
}

export function ensureDefectBreakdown(target = {}, items = []) {
  return migrateLegacyDefects(target, items)
}

export function resolveDefectReasonLabel(target = {}, items = []) {
  if (target.defectReasonLabel && target.defectReasonLabel !== '—') {
    return target.defectReasonLabel
  }
  const breakdown = ensureDefectBreakdown(target, items)
  return formatBreakdownLabel(breakdown) || '—'
}

/** 登记产出：汇总各工序不良原因（同名合并数量） */
export function aggregateProcessesDefectLabel(processes = []) {
  const merged = new Map()
  ;(processes || [])
    .filter((p) => !p.deleted)
    .forEach((p) => {
      const breakdown = p.defectBreakdown?.length ? p.defectBreakdown : ensureDefectBreakdown(p, [])
      breakdown.forEach((row) => {
        if (!row.qty) return
        const prev = merged.get(row.id)
        merged.set(row.id, {
          ...row,
          qty: (prev?.qty || 0) + Number(row.qty || 0),
        })
      })
    })
  return formatBreakdownLabel([...merged.values()]) || '—'
}

import { resolveDefectItemsByIds, defectItemState } from '@/store/defectItemStore'
import { getProcessByName } from '@/store/processConfigStore'

export function sumBreakdownQty(breakdown = []) {
  return breakdown.reduce((sum, row) => sum + (Number(row.qty) || 0), 0)
}

export function getBreakdownQty(breakdown = [], itemId) {
  const row = breakdown.find((b) => b.id === itemId)
  return Number(row?.qty) || 0
}

export function setBreakdownQty(breakdown = [], item, qty) {
  const list = [...breakdown]
  const nextQty = Math.max(0, Number(qty) || 0)
  const index = list.findIndex((b) => b.id === item.id)
  if (nextQty <= 0) {
    if (index >= 0) list.splice(index, 1)
    return list
  }
  const row = { id: item.id, name: item.name, qty: nextQty }
  if (index >= 0) list[index] = row
  else list.push(row)
  return list
}

export function changeBreakdownQty(breakdown = [], item, delta, defectQty = 0) {
  const max = Number(defectQty) || 0
  const current = getBreakdownQty(breakdown, item.id)
  const allocated = sumBreakdownQty(breakdown)
  const next = current + delta
  if (delta > 0 && allocated >= max) return breakdown
  return setBreakdownQty(breakdown, item, next)
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

export function autoFillSingleReason(process = {}, items = []) {
  const defectQty = Number(process.defectQty) || 0
  if (defectQty <= 0) return []
  if (items.length !== 1) return process.defectBreakdown || []
  const allocated = sumBreakdownQty(process.defectBreakdown)
  if (allocated === defectQty) return process.defectBreakdown || []
  return [{ id: items[0].id, name: items[0].name, qty: defectQty }]
}

export function syncDefectBreakdownOnQtyChange(process = {}, items = []) {
  const defectQty = Number(process.defectQty) || 0
  if (defectQty <= 0) return []
  return autoFillSingleReason(process, items)
}

export function validateDefectBreakdown(defectQty, breakdown = [], items = []) {
  const qty = Number(defectQty) || 0
  if (qty <= 0 || !items.length) return null
  const allocated = sumBreakdownQty(breakdown)
  if (allocated !== qty) {
    return `请分配全部 ${qty} 件不良原因（已分配 ${allocated} 件）`
  }
  return null
}

/** 工序可选不良品项：工序配置 + 当前已选原因（审核调整等场景） */
export function resolveProcessDefectItems(processName, currentBreakdown = []) {
  void defectItemState.items
  const proc = getProcessByName(processName)
  const ids = new Set([
    ...(proc?.defectItemIds || []),
    ...currentBreakdown.map((row) => row.id).filter(Boolean),
  ])
  if (!ids.size) return [...defectItemState.items]
  return resolveDefectItemsByIds([...ids])
}

/** 登记表单：始终展示工序配置的全部不良项；未配置时展示全部字典项 */
export function getProcessDefectItemsForForm(processName) {
  void defectItemState.items
  const proc = getProcessByName(processName)
  if (proc?.defectItemIds?.length) {
    return resolveDefectItemsByIds(proc.defectItemIds)
  }
  return [...defectItemState.items]
}

export function getApprovedDefectBreakdown(line = {}) {
  if (line.adjustedDefectBreakdown?.length) {
    return line.adjustedDefectBreakdown.filter((row) => Number(row.qty) > 0)
  }
  return (line.defectBreakdown || []).filter((row) => Number(row.qty) > 0)
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

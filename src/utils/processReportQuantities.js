import { workOrderState } from '@/store/workOrderStore'

/** 工单/任务按工序登记：排产数量默认值 + 不良增加则良品相应减少 */

export function resolveScheduleQty(source = {}) {
  return Math.max(0, Number(source.scheduleQty ?? source.targetQty ?? source.planQty) || 0)
}

export function findWorkOrderForRecord(record = {}) {
  void workOrderState.orders
  const id = record.workOrderId
  const code = record.workOrderNo || record.workOrderCode
  if (id) {
    const byId = workOrderState.orders.find((o) => o.id === id)
    if (byId) return byId
  }
  if (code && !String(code).startsWith('QK-')) {
    return workOrderState.orders.find((o) => o.code === code) || null
  }
  return null
}

/** 列表「排产数」：有关联工单时取排产数量，否则为 null（展示 —） */
export function resolveListScheduleQty(record = {}, hasLinkedWorkOrder = false) {
  if (!hasLinkedWorkOrder) return null
  const fromRecord = resolveScheduleQty(record)
  if (fromRecord > 0) return fromRecord
  const wo = findWorkOrderForRecord(record)
  if (!wo) return null
  const qty = resolveScheduleQty(wo)
  return qty > 0 ? qty : null
}

export function createScheduledProcessQuantities(scheduleQty) {
  const qty = resolveScheduleQty({ scheduleQty })
  return {
    scheduleQty: qty,
    goodQty: qty,
    defectQty: 0,
    qty: qty,
  }
}

export function snapshotProcessQty(record = {}) {
  record._qtySnapshot = {
    goodQty: Math.max(0, Number(record.goodQty) || 0),
    defectQty: Math.max(0, Number(record.defectQty) || 0),
  }
  return record
}

export function applyLinkedProcessQtyChange(record = {}, field, prev = {}) {
  const prevGood = Math.max(0, Number(prev.goodQty ?? record.goodQty) || 0)
  const prevDefect = Math.max(0, Number(prev.defectQty ?? record.defectQty) || 0)
  let goodQty = Math.max(0, Number(record.goodQty) || 0)
  let defectQty = Math.max(0, Number(record.defectQty) || 0)

  if (field === 'defect') {
    const delta = defectQty - prevDefect
    goodQty = Math.max(0, prevGood - delta)
    record.goodQty = goodQty
    record.defectQty = defectQty
  } else if (field === 'good') {
    record.goodQty = goodQty
  }

  record.qty = (Number(record.goodQty) || 0) + (Number(record.defectQty) || 0)
  snapshotProcessQty(record)
  return record
}

export function applyLinkedProcessQtyStep(record = {}, field, delta) {
  const prev = record._qtySnapshot || snapshotProcessQty(record)._qtySnapshot
  if (field === 'defect') {
    record.defectQty = Math.max(0, prev.defectQty + delta)
    record.goodQty = prev.goodQty
  } else {
    record.goodQty = Math.max(0, prev.goodQty + delta)
    record.defectQty = prev.defectQty
  }
  return applyLinkedProcessQtyChange(record, field, prev)
}

export function applyLinkedSingleQtyChange(target, field, delta) {
  const prevGood = Math.max(0, Number(target.goodQty) || 0)
  const prevDefect = Math.max(0, Number(target.defectQty) || 0)
  if (field === 'defect') {
    target.defectQty = Math.max(0, prevDefect + delta)
    target.goodQty = Math.max(0, prevGood - delta)
  } else {
    target.goodQty = Math.max(0, prevGood + delta)
  }
  if ('finishedQty' in target) {
    target.finishedQty = target.goodQty + target.defectQty
  }
  return target
}

export function applyLinkedSingleQtyFromDefect(target, prev = {}) {
  const prevGood = Math.max(0, Number(prev.goodQty ?? target.goodQty) || 0)
  const prevDefect = Math.max(0, Number(prev.defectQty ?? target.defectQty) || 0)
  const defectQty = Math.max(0, Number(target.defectQty) || 0)
  const delta = defectQty - prevDefect
  target.goodQty = Math.max(0, prevGood - delta)
  target.defectQty = defectQty
  if ('finishedQty' in target) {
    target.finishedQty = target.goodQty + target.defectQty
  }
  return target
}

/** 报工详情行：报工数量 = 良品数 + 不良品数（优先取调整值） */
export function resolveLineReportQty(line = {}) {
  const good =
    line.adjustedGoodQty != null && line.adjustedGoodQty !== ''
      ? Number(line.adjustedGoodQty)
      : Number(line.goodQty)
  const defect =
    line.adjustedDefectQty != null && line.adjustedDefectQty !== ''
      ? Number(line.adjustedDefectQty)
      : Number(line.defectQty)
  return Math.max(0, good || 0) + Math.max(0, defect || 0)
}

export function formatScheduleQtyDisplay(val) {
  if (val == null || val === '') return '—'
  return val
}

/** 报工数量是否超过排产数 */
export function isLineReportQtyOverSchedule(line = {}, fallbackScheduleQty = null) {
  const scheduleQty = resolveScheduleQty({
    scheduleQty: line.scheduleQty ?? fallbackScheduleQty,
  })
  if (scheduleQty <= 0) return false
  return resolveLineReportQty(line) > scheduleQty
}

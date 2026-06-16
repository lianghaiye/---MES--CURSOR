/** 工单/任务按工序登记：排产数量默认值 + 不良增加则良品相应减少 */

export function resolveScheduleQty(source = {}) {
  return Math.max(0, Number(source.scheduleQty ?? source.targetQty ?? source.planQty) || 0)
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

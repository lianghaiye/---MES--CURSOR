/** 外协回货/入库占用（与采购入库进度口径类似） */

export function calcWxLineReceivedQty(order, line) {
  return Number(line?.receivedQty) || 0
}

export function calcWxLineAppliedOccupyQty(order, line) {
  const applied = Number(line?.appliedReceiptQty) || 0
  const received = calcWxLineReceivedQty(order, line)
  return Math.max(applied, received)
}

export function calcWxLineRemainInboundQty(order, line) {
  const planQty = Number(line?.planQty) || 0
  const used = calcWxLineAppliedOccupyQty(order, line)
  return Math.max(0, planQty - used)
}

export function isWxLineOccupyFull(order, line) {
  return calcWxLineRemainInboundQty(order, line) <= 1e-9
}

export function calcWxLineReturnStatus(order, line) {
  const planQty = Number(line?.planQty) || 0
  const received = calcWxLineReceivedQty(order, line)
  if (planQty <= 0 || received <= 0) return '待入库'
  if (received >= planQty - 1e-9) return '已入库'
  return '部分入库'
}

export function calcWxHeaderReturnStatus(order) {
  const lines = order?.lineItems || []
  if (!lines.length) return '待入库'
  const statuses = lines.map((l) => calcWxLineReturnStatus(order, l))
  if (statuses.every((s) => s === '已入库')) return '已入库'
  if (statuses.every((s) => s === '待入库')) return '待入库'
  return '部分入库'
}

/** 已出库（已确认）数量 */
export function calcWxLineIssuedQty(order, line) {
  return Number(line?.issuedQty) || 0
}

/** 已申请发料数量（含待出库占用；与销售已申请发货同口径） */
export function calcWxLineAppliedIssueQty(order, line) {
  const applied = Number(line?.appliedIssueQty) || 0
  const issued = calcWxLineIssuedQty(order, line)
  return Math.max(applied, issued)
}

export function calcWxLineRemainIssueQty(order, line) {
  const planQty = Number(line?.planQty) || 0
  const used = calcWxLineAppliedIssueQty(order, line)
  return Math.max(0, planQty - used)
}

export function isWxLineIssueFull(order, line) {
  return calcWxLineRemainIssueQty(order, line) <= 1e-9
}

export function calcWxHeaderIssueStatus(order) {
  const lines = order?.lineItems || []
  if (!lines.length) return '待出库'
  const plan = lines.reduce((s, l) => s + (Number(l.planQty) || 0), 0)
  const applied = lines.reduce((s, l) => s + calcWxLineAppliedIssueQty(order, l), 0)
  if (plan <= 0 || applied <= 0) return '待出库'
  if (applied >= plan - 1e-9) return '已出库'
  return '部分出库'
}

export function formatWxInboundProgress(receivedQty, appliedQty, planQty) {
  const fmt = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '-'
    return String(Number(n.toFixed(4)))
  }
  return `${fmt(receivedQty)} / ${fmt(appliedQty)} / ${fmt(planQty)}`
}

export const WX_INBOUND_PROGRESS_TOOLTIP = '格式：已入库数量 / 已申请入库（收货）数量 / 计划数量'

/** 发货进度：已出库数量 / 已申请数量 / 计划数量（对齐销售发货进度） */
export function formatWxIssueProgress(issuedQty, appliedIssueQty, planQty) {
  return formatWxInboundProgress(issuedQty, appliedIssueQty, planQty)
}

export const WX_ISSUE_PROGRESS_TOOLTIP = '格式：已出库数量 / 已申请数量 / 计划数量'

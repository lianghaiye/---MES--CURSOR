/** 采购退货：退货类型区分未入库 / 入库 */

export const RETURN_TYPE_UNINBOUND = '未入库退货'
export const RETURN_TYPE_INBOUND = '已入库退货'

export const PURCHASE_RETURN_TYPE_OPTIONS = [RETURN_TYPE_UNINBOUND, RETURN_TYPE_INBOUND]

export function qtyOf(line, key) {
  return Math.max(0, Number(line?.[key]) || 0)
}

export function isUninboundReturnType(type) {
  const t = String(type || '').trim()
  return t === RETURN_TYPE_UNINBOUND || t === '未入库'
}

export function isInboundReturnType(type) {
  const t = String(type || '').trim()
  return t === RETURN_TYPE_INBOUND || t === '入库退货' || t === '已入库'
}

function inferReturnType(line, total) {
  const typed = String(line?.returnType || '').trim()
  if (isInboundReturnType(typed)) return RETURN_TYPE_INBOUND
  if (isUninboundReturnType(typed)) return RETURN_TYPE_UNINBOUND
  const un = qtyOf(line, 'uninboundReturnQty')
  const inn = qtyOf(line, 'inboundReturnQty')
  if (inn > un) return RETURN_TYPE_INBOUND
  if (un > 0) return RETURN_TYPE_UNINBOUND
  if (qtyOf(line, 'receivedQty') > 0 && total > 0) return RETURN_TYPE_INBOUND
  return RETURN_TYPE_UNINBOUND
}

/** 兼容旧数据：双数量或「退货/换货」迁到退货类型 + 退货数量 */
export function normalizeReturnLineQty(line = {}) {
  const next = { ...line }
  let total = qtyOf(next, 'returnQty')
  const splitSum = qtyOf(next, 'uninboundReturnQty') + qtyOf(next, 'inboundReturnQty')
  if (splitSum > 0 && total <= 0) total = splitSum
  next.returnType = inferReturnType(next, total)
  next.returnQty = total
  if (isInboundReturnType(next.returnType)) {
    next.inboundReturnQty = total
    next.uninboundReturnQty = 0
  } else {
    next.uninboundReturnQty = total
    next.inboundReturnQty = 0
  }
  return next
}

export function lineUninboundQty(line) {
  const n = normalizeReturnLineQty(line)
  return isUninboundReturnType(n.returnType) ? n.returnQty : 0
}

export function lineInboundQty(line) {
  const n = normalizeReturnLineQty(line)
  return isInboundReturnType(n.returnType) ? n.returnQty : 0
}

export function sumUninboundQty(row) {
  return (row?.lineItems || []).reduce((s, l) => s + lineUninboundQty(l), 0)
}

export function sumInboundQty(row) {
  return (row?.lineItems || []).reduce((s, l) => s + lineInboundQty(l), 0)
}

export function needsOutbound(row) {
  return sumInboundQty(row) > 1e-9
}

export function hasUninboundReturn(row) {
  return sumUninboundQty(row) > 1e-9
}

/** 列表展示：单据行上的退货类型（去重保序） */
export function formatReturnTypes(row) {
  const types = []
  const seen = new Set()
  ;(row?.lineItems || []).forEach((line) => {
    const t = String(normalizeReturnLineQty(line).returnType || '').trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    types.push(t)
  })
  return types.join('、')
}

function matchPoLine(rl, poLine) {
  const lineId = poLine?.id
  const code = poLine?.productCode || poLine?.itemCode || ''
  const byId = lineId && rl.poLineId && rl.poLineId === lineId
  const byCode = !rl.poLineId && code && (rl.productCode === code || rl.itemCode === code)
  return Boolean(byId || byCode)
}

function isActiveReturn(ret) {
  const status = ret?.status || ''
  return status !== '作废' && status !== '已作废' && status !== '已取消'
}

/** 其他有效退货单已占用的未入库/入库退货数量 */
export function sumOtherReturnSplit(returns, po, poLine, excludeReturnId = '') {
  let uninbound = 0
  let inbound = 0
  if (!po || !poLine) return { uninbound, inbound }
  ;(returns || []).forEach((ret) => {
    if (!isActiveReturn(ret)) return
    if (excludeReturnId && ret.id === excludeReturnId) return
    const samePo =
      (po.id && ret.purchaseOrderId === po.id) || (po.orderNo && ret.purchaseOrderNo === po.orderNo)
    if (!samePo) return
    ;(ret.lineItems || []).forEach((rl) => {
      const line = normalizeReturnLineQty(rl)
      if (!matchPoLine(line, poLine)) return
      uninbound += lineUninboundQty(line)
      inbound += lineInboundQty(line)
    })
  })
  return { uninbound, inbound }
}

export function calcReturnRemain(po, poLine, others = { uninbound: 0, inbound: 0 }) {
  const purchaseQty = Number(poLine?.purchaseQty) || 0
  const receivedQty = Number(poLine?.receivedQty) || 0
  const uninboundRemain = Math.max(0, purchaseQty - receivedQty - (Number(others.uninbound) || 0))
  const inboundRemain = Math.max(0, receivedQty - (Number(others.inbound) || 0))
  return { uninboundRemain, inboundRemain, purchaseQty, receivedQty }
}

export function remainMaxForLine(line, remain) {
  if (isInboundReturnType(line?.returnType)) return Number(remain?.inboundRemain) || 0
  return Number(remain?.uninboundRemain) || 0
}

/**
 * 采购单入账状态（对账口径）：
 * - 未入账：未进入任何对账单
 * - 入账待确认：已在草稿对账单中
 * - 已入账：已在已确认对账单中
 * 优先级：已入账 > 入账待确认 > 未入账
 */
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { PURCHASE_SETTLE_STATUS } from '@/mock/purchaseSettles'
import { roundNumber } from '@/utils/numberFormat'

function round2(n) {
  return roundNumber(n, 2)
}

const RANK = {
  未入账: 0,
  入账待确认: 1,
  已入账: 2,
}

function pickBetter(a, b) {
  if (!a) return b
  if (!b) return a
  return (RANK[b] || 0) > (RANK[a] || 0) ? b : a
}

/** 从对账明细解析采购单行 */
export function resolveSettleLinePoRef(settleLine) {
  if (!settleLine || settleLine.sourceType === 'fee' || settleLine.sourceType === 'adjust') {
    return { purchaseOrderId: '', poLineId: '' }
  }
  let purchaseOrderId = settleLine.purchaseOrderId || ''
  let poLineId = settleLine.poLineId || ''

  if ((!purchaseOrderId || !poLineId) && settleLine.inboundOrderId) {
    const inbound = inboundOrderState.orders.find((o) => o.id === settleLine.inboundOrderId)
    const il = (inbound?.lineItems || []).find((l) => l.id === settleLine.inboundLineId)
    purchaseOrderId = purchaseOrderId || inbound?.purchaseOrderId || il?.purchaseOrderId || ''
    poLineId = poLineId || il?.poLineId || ''
  }

  // 演示种子等缺 poLineId：按采购单 + 物料编码兜底匹配
  if (purchaseOrderId && !poLineId && settleLine.itemCode) {
    const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
    const code = String(settleLine.itemCode)
    const match = (po?.lineItems || []).find(
      (l) => String(l.itemCode || l.productCode || '') === code,
    )
    if (match) poLineId = match.id
  }

  return {
    purchaseOrderId: String(purchaseOrderId || ''),
    poLineId: String(poLineId || ''),
  }
}

export function calcPoHeaderAccountStatusFromLines(po) {
  const lines = (po?.lineItems || []).filter((l) => !l.cancelled)
  if (!lines.length) return '未入账'
  const statuses = lines.map((l) => l.accountStatus || '未入账')
  if (statuses.every((s) => s === '已入账')) return '已入账'
  if (statuses.every((s) => s === '未入账')) return '未入账'
  if (statuses.every((s) => s === '入账待确认')) return '入账待确认'
  return '部分入账'
}

/**
 * 按当前全部对账单重算指定采购单的入账状态
 * @param {string|object} orderOrId
 * @param {Array} settles purchaseSettleState.settles
 */
export function refreshPurchaseOrderAccountStatus(orderOrId, settles = []) {
  const order =
    typeof orderOrId === 'string'
      ? purchaseOrderState.orders.find((o) => o.id === orderOrId)
      : orderOrId
  if (!order) return null

  const byLine = new Map()
  ;(settles || []).forEach((settle) => {
    let mark = ''
    if (settle.status === PURCHASE_SETTLE_STATUS.CONFIRMED) mark = '已入账'
    else if (
      settle.status === PURCHASE_SETTLE_STATUS.DRAFT ||
      settle.status === PURCHASE_SETTLE_STATUS.RECONCILING
    ) {
      mark = '入账待确认'
    }
    if (!mark) return
    ;(settle.lineItems || []).forEach((sl) => {
      const ref = resolveSettleLinePoRef(sl)
      if (!ref.purchaseOrderId || ref.purchaseOrderId !== order.id) return
      if (!ref.poLineId) return
      byLine.set(ref.poLineId, pickBetter(byLine.get(ref.poLineId), mark))
    })
  })
  ;(order.lineItems || []).forEach((line) => {
    if (line.cancelled) {
      line.accountStatus = line.accountStatus || '未入账'
      return
    }
    line.accountStatus = byLine.get(line.id) || '未入账'
  })
  order.accountStatus = calcPoHeaderAccountStatusFromLines(order)
  return order
}

/** 刷新对账单涉及的全部采购单入账状态 */
export function refreshAccountStatusForSettle(settle, settles = []) {
  if (!settle) return
  const poIds = new Set()
  ;(settle.lineItems || []).forEach((sl) => {
    const ref = resolveSettleLinePoRef(sl)
    if (ref.purchaseOrderId) poIds.add(ref.purchaseOrderId)
  })
  if (settle.purchaseOrderId) poIds.add(settle.purchaseOrderId)
  poIds.forEach((id) => refreshPurchaseOrderAccountStatus(id, settles))
}

/** 全量重算（启动或对账数据变更后） */
export function refreshAllPurchaseOrderAccountStatus(settles = []) {
  purchaseOrderState.orders.forEach((order) => {
    if (!order || order.status === '草稿') {
      if (order) {
        order.accountStatus = order.accountStatus || '未入账'
        ;(order.lineItems || []).forEach((line) => {
          if (!line.accountStatus) line.accountStatus = '未入账'
        })
      }
      return
    }
    refreshPurchaseOrderAccountStatus(order, settles)
  })
}

/**
 * 采购明细「已入账/结算数量」：已进入草稿/对账中/已确认对账单的入库结算量累计（不含退货红冲、费用补差）
 * 与可再扫量口径一致：草稿/对账中即占量，跨账期累加。
 */
export function calcPoLineAccountedSettleQty(poLineId, settles = []) {
  if (!poLineId) return 0
  let total = 0
  ;(settles || []).forEach((settle) => {
    if (
      settle.status !== PURCHASE_SETTLE_STATUS.DRAFT &&
      settle.status !== PURCHASE_SETTLE_STATUS.RECONCILING &&
      settle.status !== PURCHASE_SETTLE_STATUS.CONFIRMED
    ) {
      return
    }
    ;(settle.lineItems || []).forEach((sl) => {
      if (sl.sourceType === 'fee' || sl.sourceType === 'adjust') return
      if (sl.sourceType === 'return' || sl.returnOrderId) return
      const ref = resolveSettleLinePoRef(sl)
      if (String(ref.poLineId) !== String(poLineId)) return
      total += Number(sl.settleQty) || 0
    })
  })
  return round2(total)
}

import { formatNumber } from '@/utils/numberFormat'

/** 退货行已出库 / 已申请占用（来自关联出库单） */
export function calcReturnLineOutboundQty(returnRow, line) {
  let apply = 0
  let actual = 0
  const lineId = line?.id
  for (const order of returnRow?.outboundOrders || []) {
    for (const ol of order.lineItems || []) {
      if (lineId && ol.returnLineId !== lineId) continue
      apply += Number(ol.applyQty) || 0
      actual += Number(ol.actualQty) || 0
    }
  }
  const issuedQty = actual
  const appliedQty = Math.max(apply, actual)
  return { issuedQty, appliedQty }
}

export function calcReturnLineRemainOutboundQty(returnRow, line) {
  const returnQty = Number(line?.returnQty) || 0
  const { appliedQty } = calcReturnLineOutboundQty(returnRow, line)
  return Math.max(0, returnQty - appliedQty)
}

export function isReturnLineOutboundFull(returnRow, line) {
  return calcReturnLineRemainOutboundQty(returnRow, line) <= 1e-9
}

/** 发货进度：已出库数量 / 已申请数量 / 退货数量（对齐销售发货进度口径） */
export function formatReturnOutboundProgress(issuedQty, appliedQty, returnQty) {
  const fmt = (v) => formatNumber(v, 4, { empty: '-' })
  return `${fmt(issuedQty)} / ${fmt(appliedQty)} / ${fmt(returnQty)}`
}

export const RETURN_OUTBOUND_PROGRESS_TOOLTIP = '格式：已出库数量 / 已申请数量 / 退货数量'

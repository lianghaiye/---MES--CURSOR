/**
 * 采购对账 · 出库退货（已入库退货）红冲行
 *
 * 规则摘要（详见 docs/ai-agent-kb/reference/05-采购对账退货红冲规则.md）：
 * - 仅「已入库退货」且退货单已完成（已出库）可入对账，数量为负
 * - 「未入库退货」只影响采购开口结清，不进对账单
 * - 占量：已确认 + 草稿对账单占用，剩余为 0 则追加扫不到
 */

import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { getSupplierByName } from '@/store/supplierStore'
import {
  isInboundReturnType,
  lineInboundQty,
  normalizeReturnLineQty,
} from '@/utils/purchaseReturnStock'
import { hasSettleUnit } from '@/utils/settleUnit'
import { roundNumber } from '@/utils/numberFormat'

function round4(n) {
  const r = roundNumber(Number(n) || 0, 4)
  return Number.isFinite(r) ? r : 0
}

function sliceDate(val) {
  if (!val) return ''
  return String(val).slice(0, 10)
}

/** 退货是否已完成且存在已入库退货（可对账红冲） */
export function isReturnEligibleForSettle(ret) {
  if (!ret) return false
  const st = ret.status || ''
  if (st === '作废' || st === '已作废' || st === '已取消') return false
  // 已入库退货以出库完成为准：单据已完成，或出库状态已出库
  const done =
    st === '已完成' ||
    ret.outboundStatus === '已出库' ||
    (ret.outboundOrders || []).some((o) => o.outboundStatus === '已出库')
  if (!done) return false
  return (ret.lineItems || []).some((l) => lineInboundQty(l) > 1e-9)
}

/** 退货对账业务日：优先出库日，其次完成/更新/创建日 */
export function resolveReturnSettleBizDate(ret) {
  if (!ret) return ''
  const fromOutboundOrders = (ret.outboundOrders || [])
    .map((o) => sliceDate(o.outboundDate) || sliceDate(o.completedAt) || sliceDate(o.createdAt))
    .filter(Boolean)
    .sort()
  if (fromOutboundOrders.length) return fromOutboundOrders[fromOutboundOrders.length - 1]
  return (
    sliceDate(ret.outboundDate) ||
    sliceDate(ret.completedAt) ||
    sliceDate(ret.confirmedAt) ||
    sliceDate(ret.updatedAt) ||
    sliceDate(ret.createdAt) ||
    ''
  )
}

export function returnDateInWindow(ret, periodStart, periodEnd) {
  if (!periodStart || !periodEnd) return true
  const d = resolveReturnSettleBizDate(ret)
  if (!d) return false
  return d >= periodStart && d <= periodEnd
}

/**
 * 草稿对账单已占用的退货红冲量（正数；对账行 settleQty 为负）
 */
export function getDraftOccupiedReturnSettleQty(returnOrderId, returnLineId, excludeSettleId = '') {
  if (!returnOrderId || !returnLineId) return 0
  let occupied = 0
  // 延迟取 settle state，避免循环依赖在模块顶层互相引用
  // eslint-disable-next-line global-require
  const { purchaseSettleState, PURCHASE_SETTLE_STATUS } = require('@/store/purchaseSettleStore')
  ;(purchaseSettleState.settles || []).forEach((settle) => {
    if (
      settle.status !== PURCHASE_SETTLE_STATUS.DRAFT &&
      settle.status !== PURCHASE_SETTLE_STATUS.RECONCILING
    ) {
      return
    }
    if (excludeSettleId && settle.id === excludeSettleId) return
    ;(settle.lineItems || []).forEach((row) => {
      if (row.sourceType !== 'return' && !row.returnOrderId) return
      if (row.returnOrderId !== returnOrderId) return
      if ((row.returnLineId || row.inboundLineId) !== returnLineId) return
      occupied += Math.abs(Number(row.settleQty) || 0)
    })
  })
  return round4(occupied)
}

/** 退货行剩余可红冲量（正数）= 已入库退货量 − 已确认 − 草稿占用；0 则追加扫不到 */
export function getEffectiveRemainReturnSettleQty(returnLine, returnOrderId, excludeSettleId = '') {
  const base = lineInboundQty(returnLine)
  if (!(base > 0)) return 0
  const settled = Math.abs(Number(returnLine?.settledSettleQty) || 0)
  const draft = getDraftOccupiedReturnSettleQty(returnOrderId, returnLine?.id, excludeSettleId)
  return Math.max(0, round4(base - settled - draft))
}

function resolvePoForReturn(ret) {
  if (!ret) return null
  return (
    purchaseOrderState.orders.find((o) => o.id === ret.purchaseOrderId) ||
    purchaseOrderState.orders.find((o) => o.orderNo === ret.purchaseOrderNo) ||
    null
  )
}

function resolveOutboundMeta(ret, returnLineId) {
  const orders = ret.outboundOrders || []
  for (const o of orders) {
    const hit = (o.lineItems || []).some((l) => l.returnLineId === returnLineId)
    if (hit) {
      return {
        outboundOrderId: o.id || ret.outboundOrderId || '',
        outboundDocNo: o.outboundOrderNo || ret.outboundOrderNo || '',
      }
    }
  }
  return {
    outboundOrderId: ret.outboundOrderId || (orders[0] && orders[0].id) || '',
    outboundDocNo: ret.outboundOrderNo || (orders[0] && orders[0].outboundOrderNo) || '',
  }
}

/**
 * 构造一条可结算退货红冲预览行（settleQty 为负）
 * @param {'inbound'|'purchase'} sourceTypeForHeader 对账生成维度：按入库行仍标 return；按采购单生成时来源展示仍是退货
 */
export function buildSettleableReturnRow(ret, returnLine, po, { sourceDim = 'inbound' } = {}) {
  void sourceDim
  const line = normalizeReturnLineQty(returnLine)
  if (!isInboundReturnType(line.returnType)) return null
  const remain = getEffectiveRemainReturnSettleQty(line, ret.id)
  if (!(remain > 0)) return null

  const poLine =
    (po?.lineItems || []).find((l) => l.id === line.poLineId) ||
    (po?.lineItems || []).find(
      (l) =>
        (l.productCode || l.itemCode) &&
        (l.productCode === line.productCode || l.itemCode === line.productCode),
    ) ||
    null
  const unitPrice = Number(poLine?.unitPriceInTax ?? poLine?.unitPriceExTax ?? line.unitPrice ?? 0)
  const settleUnit = hasSettleUnit(line)
    ? line.settleUnit
    : hasSettleUnit(poLine || {})
      ? poLine.settleUnit
      : line.unit || poLine?.purchaseUnit || '件'
  const qty = -remain
  const outbound = resolveOutboundMeta(ret, line.id)
  return {
    key: `return:${ret.id}:${line.id}`,
    sourceType: 'return',
    returnOrderId: ret.id,
    returnOrderNo: ret.returnNo || '',
    returnLineId: line.id,
    outboundOrderId: outbound.outboundOrderId,
    outboundDocNo: outbound.outboundDocNo,
    inboundOrderId: '',
    inboundDocNo: '',
    inboundLineId: '',
    poLineId: line.poLineId || poLine?.id || '',
    purchaseOrderId: po?.id || ret.purchaseOrderId || '',
    purchaseOrderNo: po?.orderNo || ret.purchaseOrderNo || '',
    itemCode: line.productCode || line.itemCode || '',
    itemName: line.productName || line.itemName || '',
    settleUnit,
    remainSettleQty: remain,
    settleQty: qty,
    unitPrice,
    amount: round4(qty * unitPrice),
    bizDate: resolveReturnSettleBizDate(ret),
    sourceLine: line,
    poLine,
  }
}

/** 某采购单下可红冲退货行 */
export function listSettleableReturnLinesForPurchaseOrder(purchaseOrderId) {
  const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
  if (!po) return []
  const rows = []
  void purchaseReturnState.returns
  ;(purchaseReturnState.returns || []).forEach((ret) => {
    if (!isReturnEligibleForSettle(ret)) return
    const samePo =
      ret.purchaseOrderId === po.id || (po.orderNo && ret.purchaseOrderNo === po.orderNo)
    if (!samePo) return
    ;(ret.lineItems || []).forEach((rl) => {
      const row = buildSettleableReturnRow(ret, rl, po)
      if (row) rows.push(row)
    })
  })
  return rows
}

/** 按出库业务日窗口 + 供应商筛可红冲退货行 */
export function listSettleableReturnLinesByPeriod({
  supplierId,
  supplierName,
  periodStart,
  periodEnd,
} = {}) {
  const supplier =
    (supplierId &&
      // eslint-disable-next-line global-require
      require('@/store/supplierStore').getSupplierById(supplierId)) ||
    (supplierName ? getSupplierByName(supplierName) : null)
  const targetName = supplier?.name || supplierName || ''

  const rows = []
  void purchaseReturnState.returns
  ;(purchaseReturnState.returns || []).forEach((ret) => {
    if (!isReturnEligibleForSettle(ret)) return
    if (!returnDateInWindow(ret, periodStart, periodEnd)) return
    const po = resolvePoForReturn(ret)
    const name = po?.supplier || ret.supplier || ''
    if (targetName && name !== targetName) return
    ;(ret.lineItems || []).forEach((rl) => {
      const row = buildSettleableReturnRow(ret, rl, po)
      if (row) rows.push(row)
    })
  })
  return rows
}

/** 确认对账时回写退货行已结算量 */
export function applyReturnSettledQty(returnOrderId, returnLineId, absQty) {
  const ret = (purchaseReturnState.returns || []).find((r) => r.id === returnOrderId)
  if (!ret) return
  const line = (ret.lineItems || []).find((l) => l.id === returnLineId)
  if (!line) return
  line.settledSettleQty = round4((Number(line.settledSettleQty) || 0) + Math.abs(absQty || 0))
}

/** 反确认时释放退货行已结算量 */
export function releaseReturnSettledQty(returnOrderId, returnLineId, absQty) {
  const ret = (purchaseReturnState.returns || []).find((r) => r.id === returnOrderId)
  if (!ret) return
  const line = (ret.lineItems || []).find((l) => l.id === returnLineId)
  if (!line) return
  line.settledSettleQty = round4(
    Math.max(0, (Number(line.settledSettleQty) || 0) - Math.abs(absQty || 0)),
  )
}

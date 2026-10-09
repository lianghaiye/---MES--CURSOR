import dayjs from 'dayjs'
import { getOnHandQtyByItemCode } from '@/store/salesStockAllocationStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { outboundState } from '@/store/outboundStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { productBomState, getProductBomById } from '@/store/productBomStore'
import { getBomLineItems } from '@/utils/bomVersionReference'
import { isBomArchived, normalizeBomStatusValue } from '@/mock/productBomOptions'
import { isShipBomType } from '@/mock/bomMaterialColumns'
import {
  buildPurchaseInTransitMap,
  getInTransitForMaterialCode,
} from '@/utils/planPurchaseInTransit'
import { buildWipInProcessMap, getWipForMaterialCode } from '@/utils/planWipInProcess'
import { bomWorkspaceDetailPath } from '@/utils/shipAttachmentNav'

function roundQty(n) {
  const v = Number(n) || 0
  if (!Number.isFinite(v)) return 0
  return Math.round(v * 1000) / 1000
}

export function formatOverviewQty(n) {
  const v = roundQty(n)
  if (v === 0) return '0'
  return String(Number(v.toFixed(3)))
}

function dateInCurrentMonth(dateStr) {
  if (!dateStr) return false
  const d = dayjs(dateStr)
  if (!d.isValid()) return false
  return d.isSame(dayjs(), 'month')
}

function lineItemCode(line) {
  return String(
    line?.itemCode || line?.productCode || line?.materialCode || line?.inventoryCode || '',
  ).trim()
}

function lineQty(line, keys = ['qty']) {
  for (const k of keys) {
    if (line?.[k] != null && line[k] !== '') return Number(line[k]) || 0
  }
  return 0
}

function matchItemCode(line, code) {
  return code && lineItemCode(line) === code
}

function woProductCode(wo) {
  return String(wo?.materialCode || wo?.productCode || wo?.itemCode || '').trim()
}

function orderDate(order, keys) {
  for (const k of keys) {
    if (order?.[k]) return order[k]
  }
  return ''
}

/** 引用该产品作为子件的 BOM（不含自身 BOM、已归档、随货附件） */
export function findBomsReferencingItem(record) {
  const id = String(record?.id || '')
  const code = String(record?.code || '').trim()
  if (!id && !code) return []
  const rows = []

  ;(productBomState.boms || []).forEach((parent) => {
    if (!parent?.id || isBomArchived(parent) || isShipBomType(parent.bomType)) return
    if (id && String(parent.itemId) === id) return
    const lines = getBomLineItems(parent)
    const matched = lines.filter((line) => {
      const lineId = String(line.referencedItemId || line.itemId || '')
      const lineCode = String(
        line.materialCode || line.itemCode || line.productCode || line.inventoryCode || '',
      ).trim()
      return (id && lineId === id) || (code && lineCode === code)
    })
    if (!matched.length) return
    const unitQty = matched.reduce((s, l) => s + (Number(l.unitQty) || 0), 0)
    rows.push({
      id: parent.id,
      bomId: parent.id,
      bomNo: parent.bomNo || '—',
      bomName: parent.bomName || '—',
      bomStatus: normalizeBomStatusValue(parent.status),
      itemName: parent.itemName || '—',
      itemCode: parent.itemCode || '—',
      version: parent.version || '—',
      unitQty: unitQty ? formatOverviewQty(unitQty) : '—',
      detailPath: bomWorkspaceDetailPath(getProductBomById(parent.id) || parent),
    })
  })

  return rows
}

function sumInboundQty(code) {
  return (inboundOrderState.orders || []).reduce((sum, order) => {
    const st = order?.status || ''
    if (st === '待入库' || st === '待审批' || st === '已拒绝') return sum
    if (!dateInCurrentMonth(orderDate(order, ['inboundDate', 'createdAt']))) return sum
    const qty = (order.lineItems || [])
      .filter((l) => matchItemCode(l, code))
      .reduce((s, l) => s + lineQty(l, ['stockQty', 'qty', 'inboundQty']), 0)
    return sum + qty
  }, 0)
}

function sumOutboundQty(code) {
  return (outboundState.orders || []).reduce((sum, order) => {
    const st = order?.status || ''
    if (st === '待出库' || st === '待审批' || st === '已拒绝') return sum
    if (!dateInCurrentMonth(orderDate(order, ['outboundDate', 'createdAt']))) return sum
    const qty = (order.lineItems || [])
      .filter((l) => matchItemCode(l, code))
      .reduce((s, l) => s + lineQty(l, ['stockQty', 'qty', 'outboundQty']), 0)
    return sum + qty
  }, 0)
}

function sumManufacturedQty(code) {
  const collect = (list) =>
    (list || []).reduce((sum, wo) => {
      const st = wo?.status || ''
      if (st !== '已完成' && st !== '完成') return sum
      if (woProductCode(wo) !== code) return sum
      if (!dateInCurrentMonth(orderDate(wo, ['completeTime', 'updatedAt', 'createdAt']))) return sum
      return sum + (Number(wo.finishedQty ?? wo.scheduleQty ?? wo.planQty) || 0)
    }, 0)
  return collect(workOrderState.orders) + collect(assemblyWorkOrderState.orders)
}

function sumPurchasedQty(code) {
  const skip = new Set(['草稿', '待提交', '待审核', '已拒绝', '已作废', '已取消'])
  return (purchaseOrderState.orders || []).reduce((sum, order) => {
    if (skip.has(order?.status)) return sum
    if (!dateInCurrentMonth(orderDate(order, ['documentDate', 'orderDate', 'createdAt'])))
      return sum
    const qty = (order.lineItems || [])
      .filter((l) => matchItemCode(l, code))
      .reduce((s, l) => s + lineQty(l, ['purchaseQty', 'qty', 'planPurchaseQty']), 0)
    return sum + qty
  }, 0)
}

function sumSoldQty(code) {
  const skip = new Set(['待提交', '已拒绝', '已作废', '已取消'])
  return (salesOrderState.orders || []).reduce((sum, order) => {
    if (skip.has(order?.progressStatus || order?.status)) return sum
    if (!dateInCurrentMonth(orderDate(order, ['documentDate', 'orderDate', 'createdAt'])))
      return sum
    const qty = (order.lineItems || [])
      .filter((l) => matchItemCode(l, code))
      .reduce((s, l) => s + lineQty(l, ['salesQty', 'qty', 'shippedQty']), 0)
    return sum + qty
  }, 0)
}

/**
 * 产品详情顶部概览
 * @param {object} record 主数据行
 */
export function buildProductMasterOverview(record) {
  const code = String(record?.code || '').trim()
  const unit = record?.inventoryUnit || '件'
  const bomRefs = findBomsReferencingItem(record)
  const stockQty = code ? getOnHandQtyByItemCode(code) : Number(record?.stockQty) || 0
  const transit = getInTransitForMaterialCode(code, buildPurchaseInTransitMap())
  const wip = getWipForMaterialCode(code, buildWipInProcessMap())
  const inTransitQty = roundQty(
    (Number(transit.inTransitStockQty) || 0) + (Number(wip.wipStockQty) || 0),
  )
  const inboundQty = roundQty(sumInboundQty(code))
  const outboundQty = roundQty(sumOutboundQty(code))

  return {
    unit,
    stockQty: roundQty(stockQty),
    stockText: `${formatOverviewQty(stockQty)} ${unit}`,
    inTransitQty,
    inTransitText: `${formatOverviewQty(inTransitQty)} ${unit}`,
    inboundQty,
    outboundQty,
    ioText: `入 ${formatOverviewQty(inboundQty)} / 出 ${formatOverviewQty(outboundQty)}`,
    bomRefCount: bomRefs.length,
    bomRefs,
    manufacturedQty: roundQty(sumManufacturedQty(code)),
    purchasedQty: roundQty(sumPurchasedQty(code)),
    soldQty: roundQty(sumSoldQty(code)),
  }
}

/**
 * 销售订单随货配件：标准包带出、库存缺口、转采购
 */
import dayjs from 'dayjs'
import { getStockQty } from '@/store/stockStore'
import {
  collectShipAttachmentsFromSalesLines,
  mergeShipAttachmentLists,
  createShipAttachmentLine,
} from '@/utils/shipBomAttachments'
import { addPurchaseRequisition, generateReqNo } from '@/store/purchaseRequisitionStore'
import { createLineItem } from '@/mock/purchaseRequisitions'
import { materialInfoState } from '@/store/materialInfoStore'

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function resolveStock(warehouse, code) {
  if (!code) return 0
  try {
    return Number(getStockQty(warehouse || '', code)) || 0
  } catch {
    return 0
  }
}

export function enrichShipAccessoryStock(row, warehouse = '') {
  if (!row) return row
  const code = row.materialCode || row.itemCode || ''
  const available = resolveStock(warehouse, code)
  const need = Number(row.shipQty ?? row.planQty) || 0
  row.warehouseStockQty = available
  row.availableStock = available
  row.gapQty = round4(Math.max(0, need - available))
  return row
}

export function enrichShipAccessoryList(list, warehouse = '') {
  return (list || []).map((r) => enrichShipAccessoryStock({ ...r }, warehouse))
}

/**
 * 按销售明细同步随货配件标准包到订单快照
 * @returns {object[]} 同步后的 shipAccessories
 */
export function syncSalesOrderShipAccessories(order, options = {}) {
  if (!order) return []
  const warehouse = options.warehouse || order.defaultWarehouse || ''
  const fromBom = collectShipAttachmentsFromSalesLines(order.lineItems || [], { warehouse })
  // 订单阶段默认纳入，便于早下采购
  const seeded = fromBom.map((r) => ({
    ...r,
    selected: options.defaultSelected === false ? false : true,
    kitSets:
      r.kitSets != null
        ? r.kitSets
        : Number(
            (order.lineItems || []).find((l) => l.id === r.salesLineId)?.salesQty ??
              (order.lineItems || []).find((l) => l.id === r.salesLineId)?.qty,
          ) || 1,
  }))
  const merged = mergeShipAttachmentLists(seeded, order.shipAccessories || [])
  const enriched = enrichShipAccessoryList(merged, warehouse)
  order.shipAccessories = enriched
  return enriched
}

export function summarizeShipAccessoryGaps(list) {
  const rows = (list || []).filter((r) => r.selected !== false)
  const gapRows = rows.filter((r) => Number(r.gapQty) > 0)
  const gapQty = gapRows.reduce((s, r) => s + (Number(r.gapQty) || 0), 0)
  return {
    total: rows.length,
    gapCount: gapRows.length,
    gapQty: round4(gapQty),
    gapRows,
  }
}

/**
 * 缺口配件 → 采购申请
 */
export function buildRequisitionFromShipAccessoryGaps(salesOrder, accessories, options = {}) {
  const warehouse = options.warehouse || salesOrder?.defaultWarehouse || ''
  const gapRows = (accessories || []).filter(
    (r) => r.selected !== false && Number(r.gapQty) > 0 && (r.materialCode || r.itemCode),
  )
  if (!gapRows.length) {
    return { ok: false, message: '当前没有库存缺口的随货配件' }
  }

  const salesOrderNo = salesOrder?.orderNo || ''
  const deliveryDate =
    resolveEarliestLineDate(salesOrder?.lineItems) || dayjs().format('YYYY-MM-DD')

  const lineItems = gapRows.map((row) => {
    const code = row.materialCode || row.itemCode || ''
    const master = (materialInfoState.materials || []).find((m) => m.code === code)
    const qty = round4(Number(row.gapQty) || 0)
    return createLineItem({
      inventoryName: row.materialName || master?.name || code,
      inventoryCode: code,
      productName: row.materialName || master?.name || code,
      productCode: code,
      specModel: row.specModel || master?.specModel || '',
      material: row.material || master?.material || '',
      drawingNo: row.drawingNo || master?.drawingNo || '',
      materialType: master?.materialType || '零部件',
      supplyType: master?.supplyForm || '外购件',
      unit: row.unit || master?.inventoryUnit || '件',
      inventoryUnit: master?.inventoryUnit || row.unit || '件',
      purchaseUnit: master?.purchaseUnit || master?.inventoryUnit || row.unit || '件',
      demandQty: qty,
      planPurchaseQty: qty,
      stockQty: Number(row.availableStock ?? row.warehouseStockQty) || 0,
      deliveryDate,
      expectedArrivalDate: deliveryDate,
      salesOrderNo,
      receivingWarehouse: warehouse || '',
      remark: `随货配件缺口（产品 ${row.productCode || row.productName || ''}）`,
    })
  })

  const requisition = {
    id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reqNo: generateReqNo(),
    salesOrderNo,
    sourceSalesOrderId: salesOrder?.id || '',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    urgency: salesOrder?.urgency === '紧急' ? '紧急' : '正常',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    estimatedArrivalDate: deliveryDate,
    source: '销售订单随货配件',
    sourceOrderNo: salesOrderNo,
    operator: options.operator || '管理员',
    creator: options.operator || '管理员',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    remark: `由销售订单 ${salesOrderNo} 随货配件缺口生成`,
    purchaseOrderNo: '',
    lineItems,
  }

  addPurchaseRequisition(requisition)
  return {
    ok: true,
    requisition,
    message: `已生成采购申请 ${requisition.reqNo}，共 ${lineItems.length} 项缺口配件`,
  }
}

function resolveEarliestLineDate(lineItems) {
  const dates = (lineItems || [])
    .map((l) => l.deliveryDate)
    .filter(Boolean)
    .sort()
  return dates[0] || ''
}

/** 发货申请继承订单随货配件快照 */
export function cloneOrderShipAccessoriesForDelivery(order, options = {}) {
  const warehouse = options.warehouse || ''
  const list = order?.shipAccessories || []
  if (!list.length) return []
  return enrichShipAccessoryList(
    list.map((r) =>
      createShipAttachmentLine({
        ...r,
        id: undefined,
        warehouse,
        selected: r.selected !== false,
      }),
    ),
    warehouse,
  )
}

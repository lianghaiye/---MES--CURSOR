/**
 * 按单发货验收演示：强制按单销售单 + 本单打标批次 + 超产自由备货
 */
import dayjs from 'dayjs'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { STOCK_FULFILLMENT_MODE } from '@/utils/salesStockFulfillment'

export const DEDICATED_SHIP_DEMO = {
  salesOrderId: 'so-dedicated-ship-demo',
  salesOrderNo: '1-20260819-DED',
  salesLineId: 'line-dedicated-ship-demo',
  productCode: 'CP-DEDICATED-DEMO-01',
  productName: '按单发货演示整机',
  warehouse: '成品仓',
  dedicatedBatchId: 'bat-dedicated-ship-10',
  freeBatchId: 'bat-dedicated-ship-free-3',
  dedicatedQty: 10,
  freeQty: 3,
  salesQty: 10,
}

export function buildDedicatedShipDemoSalesOrder() {
  return createSalesOrder({
    id: DEDICATED_SHIP_DEMO.salesOrderId,
    orderNo: DEDICATED_SHIP_DEMO.salesOrderNo,
    contractNo: 'HT-DEDICATED-DEMO',
    customerName: '按单发货验收客户',
    region: '华东',
    salesperson: 'admin1',
    progressStatus: '进行中',
    businessType: '自产销售',
    documentDate: dayjs().format('YYYY-MM-DD'),
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    creator: 'admin1',
    approver: 'admin1',
    approvedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    urgency: '正常',
    remark: '验收：强制按单；仓内 10 件挂本单 + 3 件自由备货（订 10 入 13）',
    inventoryStatus: '充足',
    contactPerson: '验收',
    contactPhone: '13800000000',
    deliveryAddress: '验收仓',
    lineItems: [
      createLineItem({
        id: DEDICATED_SHIP_DEMO.salesLineId,
        productName: DEDICATED_SHIP_DEMO.productName,
        productCode: DEDICATED_SHIP_DEMO.productCode,
        specModel: 'DEMO',
        category: '演示',
        unit: '件',
        salesQty: DEDICATED_SHIP_DEMO.salesQty,
        qty: DEDICATED_SHIP_DEMO.salesQty,
        shippedQty: 0,
        stockFulfillmentMode: STOCK_FULFILLMENT_MODE.FORCE_MTO,
        unitPriceExTax: 1000,
        totalPriceExTax: 10000,
        totalPriceInTax: 11300,
        deliveryMode: '整机',
      }),
    ],
  })
}

export function buildDedicatedShipDemoBatches() {
  const now = '2026-08-19T00:00:00.000Z'
  return [
    {
      id: DEDICATED_SHIP_DEMO.dedicatedBatchId,
      batchNo: 'B-260819-D10',
      warehouse: DEDICATED_SHIP_DEMO.warehouse,
      itemCode: DEDICATED_SHIP_DEMO.productCode,
      itemName: DEDICATED_SHIP_DEMO.productName,
      currentLength: DEDICATED_SHIP_DEMO.dedicatedQty,
      unit: '件',
      status: '在库',
      sourceType: '成品入库',
      sourceDocNo: 'IN-DEDICATED-DEMO',
      salesOrderId: DEDICATED_SHIP_DEMO.salesOrderId,
      salesOrderNo: DEDICATED_SHIP_DEMO.salesOrderNo,
      salesLineId: DEDICATED_SHIP_DEMO.salesLineId,
      workOrderNo: 'WO-DEDICATED-DEMO',
      parentBatchId: '',
      createdAt: now,
      updatedAt: now,
      attrs: { dedicatedShipDemo: true },
    },
    {
      id: DEDICATED_SHIP_DEMO.freeBatchId,
      batchNo: 'B-260819-F03',
      warehouse: DEDICATED_SHIP_DEMO.warehouse,
      itemCode: DEDICATED_SHIP_DEMO.productCode,
      itemName: DEDICATED_SHIP_DEMO.productName,
      currentLength: DEDICATED_SHIP_DEMO.freeQty,
      unit: '件',
      status: '在库',
      sourceType: '成品入库',
      sourceDocNo: 'IN-DEDICATED-DEMO',
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      workOrderNo: 'WO-DEDICATED-DEMO',
      parentBatchId: '',
      createdAt: now,
      updatedAt: now,
      attrs: { dedicatedShipDemo: true, overproduceFree: true },
    },
  ]
}

/** 注入销售订单（幂等） */
export function ensureDedicatedShipDemoSalesOrders(orders = []) {
  const list = Array.isArray(orders) ? [...orders] : []
  if (list.some((o) => o.id === DEDICATED_SHIP_DEMO.salesOrderId)) return list
  list.unshift(buildDedicatedShipDemoSalesOrder())
  return list
}

/** 注入批次（幂等）；调用方负责对齐汇总库存 */
export function ensureDedicatedShipDemoBatches(batches = []) {
  const list = Array.isArray(batches) ? [...batches] : []
  const demo = buildDedicatedShipDemoBatches()
  const hasDedicated = list.some((b) => b.id === DEDICATED_SHIP_DEMO.dedicatedBatchId)
  const hasFree = list.some((b) => b.id === DEDICATED_SHIP_DEMO.freeBatchId)
  if (!hasDedicated) list.push(demo[0])
  if (!hasFree) list.push(demo[1])
  return list
}

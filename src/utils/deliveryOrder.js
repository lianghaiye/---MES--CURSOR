import { formatNumber } from '@/utils/numberFormat'
import dayjs from 'dayjs'
import { findLinkedSalesOutbound, sumOutboundLineQty } from '@/utils/deliveryOutbound'
import { sumSelectedShipQty } from '@/utils/shipEbom'

export const DELIVERY_STATUS_OPTIONS = ['待发货', '待出库', '已发货']
/** 申请发货数量 */
export function calcApplyShipQty(application) {
  if (!application) return 0
  const whole = (application.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0)
  const scatter = (application.scatterShipments || []).reduce(
    (s, ship) => s + sumSelectedShipQty(ship),
    0,
  )
  return whole + scatter
}

/** 发货总金额（不含税） */
export function calcDeliveryAmountExTax(application) {
  if (!application) return 0
  const whole = (application.lineItems || []).reduce(
    (s, l) => s + (Number(l.deliveryAmountExTax) || 0),
    0,
  )
  return Math.round(whole * 100) / 100
}

/** 发货重量：明细行 shipWeight 优先，否则按件重 × 数量 */
export function calcShipWeight(application) {
  if (!application) return 0
  const whole = (application.lineItems || []).reduce((s, l) => {
    const explicit = Number(l.shipWeight)
    if (Number.isFinite(explicit) && explicit > 0) {
      return s + explicit
    }
    const w = Number(l.itemWeightKg) || 0
    const q = Number(l.shipQty) || 0
    return s + w * q
  }, 0)
  return Math.round(whole * 10000) / 10000
}

/** 实际出库数量（1:1 关联销售出库单，已出库时按明细汇总） */
export function calcActualOutboundQty(deliveryRow) {
  if (!deliveryRow) return 0
  const ob = findLinkedSalesOutbound(deliveryRow)
  if (!ob || ob.status !== '已出库') return Number(deliveryRow.actualOutboundQty) || 0
  return sumOutboundLineQty(ob)
}

export function resolveDeliveryOrderStatus(row) {
  if (row.deliveryStatus === '已发货') return '已发货'
  const ob = findLinkedSalesOutbound(row)
  if (ob?.status === '已出库') return '已发货'
  if (row.applyOutbound && ob) return '待出库'
  return '待发货'
}

export function deliveryStatusColor(status) {
  const map = {
    待发货: 'default',
    待出库: 'processing',
    已发货: 'success',
    已出库: 'success',
    已提交: 'processing',
    部分发货: 'warning',
    已发完: 'success',
  }
  return map[status] || 'default'
}

/** 实际出库数量展示为整数 */
export function formatOutboundQtyInt(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return '0'
  return String(Math.round(n))
}

/** 发货重量：有小数显示有效小数位（最多4位），无小数只显示整数 */
export function formatShipWeight(val) {
  return formatNumber(val, 4, { empty: '0' })
}

export function formatAmountExTax(val) {
  const n = Number(val) || 0
  return n.toFixed(2)
}

/** 将销售订单上的发货申请转为发货单列表行 */
export function mapApplicationToDeliveryOrder(application, salesOrder) {
  const applyShipQty = calcApplyShipQty(application)
  const totalAmountExTax = calcDeliveryAmountExTax(application)
  const shipWeight = application.shipWeight ?? calcShipWeight(application)
  const deliveryCode = application.deliveryCode || ''
  const salesOrderNo = salesOrder?.orderNo || application.salesOrderNo || ''

  const row = {
    id: application.id || `do-${Date.now()}`,
    deliveryCode,
    salesOrderId: salesOrder?.id || application.salesOrderId || '',
    sourceOrderNo: salesOrderNo,
    salesOrderNo,
    customerName: application.customerName || salesOrder?.customerName || '',
    salesperson: salesOrder?.salesperson || application.salesperson || '',
    documentDate: (
      application.deliveryDate ||
      application.createdAt ||
      dayjs().format('YYYY-MM-DD')
    ).slice(0, 10),
    applyShipQty,
    outboundOrderId: '',
    shipWeight,
    totalAmountExTax,
    shipmentMethod: application.shipmentMethod || '',
    logisticsNo: application.logisticsNo || '',
    contactPerson: application.contactPerson || salesOrder?.contactPerson || '',
    contactPhone: application.contactPhone || salesOrder?.contactPhone || '',
    deliveryAddress: application.deliveryAddress || '',
    driverName: application.driverName || '',
    driverPhone: application.driverPhone || '',
    plateNo: application.plateNo || '',
    applyOutbound: Boolean(application.applyOutbound),
    outboundWarehouse: application.outboundWarehouse || '',
    deliveryStatus: application.status || '待发货',
    remark: application.remark || '',
    createdAt: application.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    lineItems: application.lineItems || [],
    scatterShipments: application.scatterShipments || [],
    shipAttachments: application.shipAttachments || [],
    rawApplication: application,
  }
  row.actualOutboundQty = calcActualOutboundQty(row)
  const linked = findLinkedSalesOutbound(row)
  if (linked) row.outboundOrderId = linked.id
  row.deliveryStatus = resolveDeliveryOrderStatus(row)
  return row
}

export function filterDeliveryOrders(list, filters = {}) {
  return (list || []).filter((row) => {
    if (filters.deliveryCode && !row.deliveryCode?.includes(filters.deliveryCode)) return false
    if (filters.sourceOrderNo && !row.sourceOrderNo?.includes(filters.sourceOrderNo)) return false
    if (filters.customerName && row.customerName !== filters.customerName) return false
    if (filters.salesperson && row.salesperson !== filters.salesperson) return false
    if (filters.deliveryStatus && row.deliveryStatus !== filters.deliveryStatus) return false
    if (filters.documentDateRange?.length === 2) {
      const d = row.documentDate || ''
      if (d < filters.documentDateRange[0] || d > filters.documentDateRange[1]) return false
    }
    return true
  })
}

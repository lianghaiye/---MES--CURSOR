import dayjs from 'dayjs'
import { cloneOrders } from '@/mock/orders'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { catalogBomIdForProduct } from '@/mock/productBomSeed'

function mapUrgencyToPlan(urgency) {
  if (urgency === '紧急' || urgency === '加急') return urgency === '加急' ? '加急' : '紧急'
  return '普通'
}

function resolveDeliveryDate(lineItems, fallback) {
  const dates = (lineItems || []).map((l) => l.deliveryDate).filter(Boolean)
  if (!dates.length) return fallback || dayjs().format('YYYY-MM-DD')
  return dates.sort()[0]
}

function buildPlanFromSalesOrder(salesOrder, bomsById) {
  const lineItems = salesOrder.lineItems || []
  const totalQty = lineItems.reduce((s, i) => s + (Number(i.salesQty) || 0), 0)
  const deliveryDate = resolveDeliveryDate(lineItems, salesOrder.documentDate)
  const daysToDelivery = Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day'))

  const workItems = lineItems.map((line, index) => {
    const bomId = line.bomId || catalogBomIdForProduct(line.productId)
    const bom = bomsById.get(bomId)
    const salesQty = Number(line.salesQty) || 1
    const snapshot = bom ? buildEbomSnapshotFromBom(bom, salesQty) : { materials: [] }

    return {
      id: `wi-${line.id}`,
      salesLineId: line.id,
      status: index === 0 ? '进行中' : '待下达',
      expanded: index === 0,
      salesQty,
      productName: line.productName,
      productCode: line.productCode,
      productAttr: line.productAttr,
      productType: line.category || line.productAttr || '',
      model: line.specModel,
      spec: line.specAttr,
      deliveryDate: line.deliveryDate || deliveryDate,
      bomId,
      bomName: line.bomName,
      bomVersion: line.bomVersion,
      ebomSnapshot: snapshot,
      materials: snapshot.materials || [],
    }
  })

  const statusTags =
    workItems.length > 1 ? ['部分下达', '待下达'] : ['待下达']

  return {
    id: `pp-seed-${salesOrder.id}`,
    salesOrderNo: salesOrder.orderNo,
    orderNo: salesOrder.orderNo,
    customerName: salesOrder.customerName,
    productQty: totalQty,
    salesperson: salesOrder.salesperson || '',
    urgency: mapUrgencyToPlan(salesOrder.urgency),
    orderStatus: workItems.length > 1 ? '部分下达' : '待下达',
    orderDate: salesOrder.documentDate || dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: salesOrder.region || '',
    settlementType: salesOrder.settlementType || '',
    deliveryMethod: salesOrder.deliveryMethod || '',
    remark: salesOrder.remark || '',
    tags: statusTags,
    daysToDelivery,
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    workItems,
  }
}

/**
 * 合并原 orders mock + 已审自产销售订单对应的生产计划
 */
export function buildInitialProductionPlans(boms, salesOrders) {
  const bomsById = new Map(boms.map((b) => [b.id, b]))
  const base = cloneOrders()

  const approvedSelfMade = (salesOrders || []).filter(
    (o) => o.businessType === '自产销售' && o.progressStatus === '已审',
  )

  approvedSelfMade.forEach((order) => {
    if (base.some((p) => p.salesOrderNo === order.orderNo || p.orderNo === order.orderNo)) {
      return
    }
    base.unshift(buildPlanFromSalesOrder(order, bomsById))
  })

  return base.map((plan) => {
    const normalized = { ...plan }
    if (normalized.orderStatus === '待排产') normalized.orderStatus = '待下达'
    if (normalized.orderStatus === '生产中') normalized.orderStatus = '执行中'
    normalized.workItems?.forEach((wi, wiIdx) => {
      if (wi.expanded == null) wi.expanded = wiIdx === 0
      if (!wi.salesQty) wi.salesQty = normalized.productQty
    })
    if (!normalized.salesOrderNo && normalized.orderNo?.startsWith('1-')) {
      normalized.salesOrderNo = normalized.orderNo
    }
    return normalized
  })
}

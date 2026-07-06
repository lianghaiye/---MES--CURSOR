import dayjs from 'dayjs'
import { buildEbomSnapshotFromBom, resolveMaterialsFromEbomSnapshot } from '@/utils/ebomSnapshot'
import { enrichWorkItem } from '@/utils/productionPlanWorkItem'
import { catalogBomIdForProduct, hydrateCatalogBom } from '@/mock/productBomSeed'

function mapUrgencyToPlan(urgency) {
  if (urgency === '紧急' || urgency === '加急') return urgency === '加急' ? '加急' : '紧急'
  return '普通'
}

function resolveDeliveryDate(lineItems, fallback) {
  const dates = (lineItems || []).map((l) => l.deliveryDate).filter(Boolean)
  if (!dates.length) return fallback || dayjs().format('YYYY-MM-DD')
  return dates.sort()[0]
}

function cloneSnapshotWithMaterials(bom, salesQty) {
  const snapshot = bom
    ? buildEbomSnapshotFromBom(bom, salesQty)
    : { materials: [], treeNodes: [], lineItems: [] }
  const cloned = JSON.parse(JSON.stringify(snapshot))
  const materials = resolveMaterialsFromEbomSnapshot(cloned, salesQty)
  cloned.materials = JSON.parse(JSON.stringify(materials))
  return cloned
}

function buildPlanFromSalesOrder(salesOrder, bomsById, planIndex = 0) {
  const lineItems = salesOrder.lineItems || []
  const totalQty = lineItems.reduce((s, i) => s + (Number(i.salesQty) || 0), 0)
  const deliveryDate = resolveDeliveryDate(lineItems, salesOrder.documentDate)
  const daysToDelivery = Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day'))

  const workItems = lineItems.map((line, index) => {
    const bomId = line.bomId || catalogBomIdForProduct(line.productId)
    const bomRaw = bomsById.get(bomId)
    const bom = bomRaw ? hydrateCatalogBom(bomRaw) : null
    const salesQty = Number(line.salesQty) || 1
    const snapshot = cloneSnapshotWithMaterials(bom, salesQty)

    let status = '待下达'
    if (planIndex === 0 && index === 0 && lineItems.length > 1) {
      status = '进行中'
    }

    return enrichWorkItem(
      {
        id: `wi-${line.id}`,
        salesLineId: line.id,
        status,
        expanded: index === 0,
        salesQty,
        productName: line.productName,
        productCode: line.productCode,
        productId: line.productId,
        productAttr: line.productAttr,
        productType: line.category || line.productAttr || '',
        model: line.specModel,
        spec: line.specAttr,
        specModel: line.specModel,
        techParams: line.techParams || '',
        matchingRequirements: line.matchingRequirements || '',
        deliveryDate: line.deliveryDate || deliveryDate,
        deliveryMode: line.deliveryMode,
        bomId,
        bomName: line.bomName,
        bomVersion: line.bomVersion,
        ebomSnapshot: snapshot,
        materials: snapshot.materials || [],
      },
      line,
      index,
    )
  })

  const hasInProgress = workItems.some((wi) => wi.status === '进行中')
  const orderStatus = hasInProgress ? '部分下达' : '待下达'
  const statusTags = hasInProgress ? ['部分下达', '待下达'] : ['待下达']

  return {
    id: `pp-seed-${salesOrder.id}`,
    salesOrderNo: salesOrder.orderNo,
    orderNo: salesOrder.orderNo,
    customerName: salesOrder.customerName,
    productQty: totalQty,
    salesperson: salesOrder.salesperson || '',
    urgency: mapUrgencyToPlan(salesOrder.urgency),
    orderStatus,
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
 * 仅基于已审自产销售订单 + 产品 BOM 生成生产计划演示数据
 */
export function buildInitialProductionPlans(boms, salesOrders) {
  const bomsById = new Map(boms.map((b) => [b.id, b]))

  const approvedSelfMade = (salesOrders || [])
    .filter((o) => o.businessType === '自产销售' && o.progressStatus === '已审')
    .sort((a, b) => dayjs(b.documentDate).valueOf() - dayjs(a.documentDate).valueOf())

  return approvedSelfMade.map((order, planIndex) => {
    const plan = buildPlanFromSalesOrder(order, bomsById, planIndex)
    normalizePlanWorkItems(plan)
    return plan
  })
}

function normalizePlanWorkItems(plan) {
  plan.workItems?.forEach((wi, wiIdx) => {
    Object.assign(wi, enrichWorkItem(wi, null, wiIdx))
    if (wi.expanded == null) wi.expanded = wiIdx === 0
  })
}

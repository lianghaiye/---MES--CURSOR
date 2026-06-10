/** 物料树工具函数 */

import dayjs from 'dayjs'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'

export function flattenMaterials(materials, list = []) {
  if (!materials?.length) return list
  materials.forEach((item) => {
    list.push(item)
    if (item.children?.length) flattenMaterials(item.children, list)
  })
  return list
}

/** 需求数 = 单位用量 × 订单产品数量 */
export function calcDemandQty(unitUsage, productQty) {
  return (unitUsage || 0) * (productQty || 0)
}

/** 缺口数（不含在途）= max(0, 需求数 - 可用库存) */
export function calcGapQty(demandQty, availableStock) {
  return Math.max(0, (demandQty || 0) - (availableStock || 0))
}

/** 在订单工作项中按 id 查找并更新物料 */
export function updateMaterialInOrder(order, materialId, patch) {
  if (!order?.workItems) return false
  let found = false
  const walk = (nodes) => {
    if (!nodes?.length) return
    for (const node of nodes) {
      if (node.id === materialId) {
        Object.assign(node, patch)
        found = true
        return
      }
      if (node.children?.length) walk(node.children)
    }
  }
  order.workItems.forEach((wi) => walk(wi.materials))
  return found
}

/** 筛选供应型态为「自制件」的物料（扁平） */
export function getSelfMadeMaterials(order) {
  const all = []
  order?.workItems?.forEach((wi) => {
    flattenMaterials(wi.materials, all)
  })
  return all.filter((m) => m.supplyType === '自制件')
}

function filterPurchasedWithGap(materials, productQty) {
  return materials.filter((m) => {
    if (m.supplyType !== '外购件') return false
    const gap = calcGapQty(
      m.demandQty ?? calcDemandQty(m.unitUsage, productQty),
      m.availableStock,
    )
    return gap > 0
  })
}

/** 筛选供应型态为「外购件」且存在采购缺口的物料（扁平） */
export function getPurchasedMaterials(order) {
  const all = []
  order?.workItems?.forEach((wi) => {
    flattenMaterials(wi.materials, all)
  })
  return filterPurchasedWithGap(all, order?.productQty)
}

/** 从单个工作项筛选需采购的外购件 */
export function getPurchasedMaterialsFromWorkItem(workItem, order) {
  const all = []
  flattenMaterials(workItem?.materials, all)
  const productQty = workItem?.orderQty ?? order?.productQty
  return filterPurchasedWithGap(all, productQty)
}

/** 解析订单计划总装日期 */
export function resolveAssemblyDate(order) {
  if (order?.planAssemblyDate) return order.planAssemblyDate
  const wiDate = order?.workItems?.[0]?.deliveryDate
  if (wiDate) return wiDate
  return order?.deliveryDate || ''
}

/** 构建加工工单弹窗行数据 */
export function buildWorkOrderRows(materials, order) {
  const assemblyDate = resolveAssemblyDate(order)
  const startDate = dayjs().format('YYYY-MM-DD')
  const endDate = assemblyDate || dayjs().add(14, 'day').format('YYYY-MM-DD')

  return materials.map((m, index) => {
    const demandQty = calcDemandQty(m.unitUsage, order.productQty)
    const gapQty = calcGapQty(demandQty, m.availableStock)
    return {
      key: m.id,
      materialId: m.id,
      index: index + 1,
      productName: m.name,
      code: m.code,
      spec: m.spec,
      specAttr: m.specAttr,
      material: m.material,
      bom: m.bom || m.name,
      processRoute: m.processRoute || '机加标准路线',
      workCenter: m.workCenter || '默认工厂',
      personInCharge: m.personInCharge || '孙琴丽',
      stockQty: m.stockQty ?? 0,
      availableStock: m.availableStock ?? 0,
      inTransitQty: m.inTransitQty ?? 0,
      demandQty,
      gapQty,
      planQty: m.planQty ?? gapQty,
      planDateRange: m.planDateRange?.length === 2 ? [...m.planDateRange] : [startDate, endDate],
      unit: m.unit || '件',
      warehouse: m.warehouse || resolveDefaultWarehouseByMaterialCode(m.code) || '',
      urgency: m.urgency || order.urgency || '普通',
      remark: m.workOrderRemark || m.remark || '',
    }
  })
}

/** 保存弹窗行回写物料 */
export function patchMaterialFromWorkOrderRow(row) {
  return {
    processRoute: row.processRoute,
    workCenter: row.workCenter,
    personInCharge: row.personInCharge,
    planQty: row.planQty,
    planDateRange: row.planDateRange,
    unit: row.unit,
    warehouse: row.warehouse,
    urgency: row.urgency,
    workOrderRemark: row.remark,
    planCount: row.planQty,
    status: '进行中',
    joinPlan: '是',
  }
}

/** 物料树工具函数 */

import dayjs from 'dayjs'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { getMasterDefaults } from '@/utils/productionPlanMaterial'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'

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

/** 筛选供应型态为「外协件」的物料（扁平；优先当前工作项，否则整单） */
export function getOutsourcedMaterials(order, workItem = null) {
  const all = []
  if (workItem?.materials?.length) {
    flattenMaterials(workItem.materials, all)
  } else {
    order?.workItems?.forEach((wi) => flattenMaterials(wi.materials, all))
  }
  return all.filter((m) => m.supplyType === '外协件')
}

/** 从单个工作项筛选外协件 */
export function getOutsourcedMaterialsFromWorkItem(workItem) {
  const all = []
  flattenMaterials(workItem?.materials, all)
  return all.filter((m) => m.supplyType === '外协件')
}

function filterPurchasedWithGap(materials, productQty) {
  return materials.filter((m) => {
    if (m.supplyType !== '外购件') return false
    const gap = calcGapQty(m.demandQty ?? calcDemandQty(m.unitUsage, productQty), m.availableStock)
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

/** 从单个工作项筛选外购件（全部外购件，不限缺口） */
export function getPurchasedMaterialsFromWorkItem(workItem) {
  const all = []
  flattenMaterials(workItem?.materials, all)
  return all.filter((m) => m.supplyType === '外购件')
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
      drawingNo: m.drawingNo || resolveMasterDrawingNo(m.code),
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

function resolveMasterDrawingNo(code) {
  if (!code) return ''
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material?.drawingNo) return material.drawingNo
  const product = productInfoState.products.find((p) => p.code === code)
  return product?.drawingNo || ''
}

function resolveMasterMaterialType(code, fallback = '') {
  if (!code) return fallback
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material?.materialType) return material.materialType
  const product = productInfoState.products.find((p) => p.code === code)
  return product?.materialType || fallback
}

function resolveDefaultWarehouse(code, material) {
  const production =
    materialInfoState.materials.find((m) => m.code === code)?.production ||
    productInfoState.products.find((p) => p.code === code)?.production
  return (
    material?.warehouse ||
    production?.defaultWarehouse ||
    resolveDefaultWarehouseByMaterialCode(code) ||
    ''
  )
}

/** 构建外协工单弹窗行数据 */
export function buildOutsourceWorkOrderRows(materials, order) {
  const defaultArrival = resolveAssemblyDate(order) || dayjs().add(14, 'day').format('YYYY-MM-DD')

  return materials.map((m, index) => {
    const demandQty = m.demandQty ?? calcDemandQty(m.unitUsage, order?.productQty)
    const gapQty = m.gapQty ?? calcGapQty(demandQty, m.availableStock)
    const defaults = getMasterDefaults(m.code)
    return {
      key: m.id,
      materialId: m.id,
      index: index + 1,
      productName: m.name,
      code: m.code,
      spec: m.spec,
      material: m.material || '',
      drawingNo: m.drawingNo || resolveMasterDrawingNo(m.code),
      specAttr: m.specAttr || '',
      materialType: m.type || resolveMasterMaterialType(m.code, '零部件'),
      supplier: m.supplier || defaults.supplier || '',
      stockQty: m.stockQty ?? 0,
      availableStock: m.availableStock ?? 0,
      inTransitQty: m.inTransitQty ?? 0,
      demandQty,
      gapQty,
      planQty: m.planQty ?? gapQty,
      unit: m.unit || '件',
      expectedArrivalDate:
        m.expectedArrivalDate || (m.planDateRange?.[0] ? m.planDateRange[0] : '') || defaultArrival,
      warehouse: resolveDefaultWarehouse(m.code, m),
      urgency: m.urgency || order?.urgency || '普通',
      remark: m.workOrderRemark || m.remark || '',
    }
  })
}

/** 外协工单保存后回写物料 */
export function patchMaterialFromOutsourceWorkOrderRow(row) {
  return {
    supplier: row.supplier,
    planQty: row.planQty,
    expectedArrivalDate: row.expectedArrivalDate,
    unit: row.unit,
    warehouse: row.warehouse,
    urgency: row.urgency,
    workOrderRemark: row.remark,
    planCount: row.planQty,
    status: '进行中',
    joinPlan: '是',
  }
}

/** 构建采购申请弹窗行数据 */
export function buildPurchaseRequisitionRows(materials, order) {
  const defaultArrival = resolveAssemblyDate(order) || dayjs().add(14, 'day').format('YYYY-MM-DD')

  return materials.map((m, index) => {
    const demandQty = m.demandQty ?? calcDemandQty(m.unitUsage, order?.productQty)
    const gapQty = m.gapQty ?? calcGapQty(demandQty, m.availableStock)
    const defaults = getMasterDefaults(m.code)
    const defaultSupplier = m.supplier || defaults.supplier || ''
    return {
      key: m.id,
      materialId: m.id,
      index: index + 1,
      productName: m.name,
      code: m.code,
      spec: m.spec,
      material: m.material || '',
      drawingNo: m.drawingNo || resolveMasterDrawingNo(m.code),
      specAttr: m.specAttr || '',
      materialType: m.type || resolveMasterMaterialType(m.code, '零部件'),
      designatedSupplier: Boolean(m.designateSupplier || defaultSupplier),
      supplier: defaultSupplier,
      stockQty: m.stockQty ?? 0,
      availableStock: m.availableStock ?? 0,
      inTransitQty: m.inTransitQty ?? 0,
      demandQty,
      gapQty,
      planQty: m.planQty ?? gapQty,
      unit: m.unit || '件',
      expectedArrivalDate: m.expectedArrivalDate || defaultArrival,
      warehouse: resolveDefaultWarehouse(m.code, m),
      urgency: m.urgency || order?.urgency || '普通',
      remark: m.remark || '',
    }
  })
}

/** 采购申请保存后回写物料 */
export function patchMaterialFromPurchaseRequisitionRow(row) {
  return {
    designateSupplier: row.designatedSupplier,
    supplier: row.supplier,
    planQty: row.planQty,
    remark: row.remark,
    status: '进行中',
    joinPlan: '是',
  }
}

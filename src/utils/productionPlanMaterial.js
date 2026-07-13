import dayjs from 'dayjs'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { processRouteState } from '@/store/processRouteStore'
import { processRouteOptions } from '@/mock/workOrderOptions'
import { supplierOptions as poSupplierOptions } from '@/mock/purchaseOrderOptions'
import { supplierOptions as reqSupplierOptions } from '@/mock/purchaseRequisitionOptions'
import { SUPPLY_FORM_OPTIONS } from '@/utils/masterDataMigrate'
import { flattenMaterials } from '@/utils/material'
import { createPlanMaterial, resolveMaterialsFromEbomSnapshot } from '@/utils/ebomSnapshot'
import { calcDefaultPlanQty } from '@/utils/productionPlanWorkItem'

export const supplyTypeOptions = SUPPLY_FORM_OPTIONS.map((v) => ({ label: v, value: v }))

/** 顶级物料供应型态（组装 / 自制件） */
export const topLevelSupplyTypeOptions = [
  { label: '组装', value: '组装' },
  { label: '自制件', value: '自制件' },
]

export function resolveWorkItemProduct(wi) {
  if (!wi) return null
  if (wi.productId) {
    const byId = productInfoState.products.find((p) => String(p.id) === String(wi.productId))
    if (byId) return byId
  }
  if (wi.productCode) {
    return productInfoState.products.find((p) => p.code === wi.productCode) || null
  }
  return null
}

export function cascadeMaterialPlanQtyFromParent(parentPlanQty, children) {
  const parent = Number(parentPlanQty) || 0
  ;(children || []).forEach((child) => {
    const unitUsage = Number(child.unitUsage) || 1
    child.planQty = parent * unitUsage
    if (child.children?.length) {
      cascadeMaterialPlanQtyFromParent(child.planQty, child.children)
    }
  })
}

export function resolveWorkItemPlanQty(workItem) {
  const orderQty = Number(workItem?.orderQty ?? workItem?.salesQty ?? 0)
  const stockQty = Number(workItem?.stockQty ?? 0)
  if (workItem?.planQty != null && workItem.planQty !== '') {
    return Number(workItem.planQty)
  }
  return calcDefaultPlanQty(orderQty, stockQty)
}

/** 订单是否已下达单据（计划数量锁定） */
export function isOrderPlanQtyLocked(order) {
  if (!order) return false
  if (order.planQtyLocked) return true
  return (order.workItems || []).some((wi) => {
    const all = []
    flattenMaterials(wi.materials, all)
    return all.some((m) => m.status === '进行中' || m.status === '已完成')
  })
}

export function lockOrderPlanQty(order) {
  if (order) order.planQtyLocked = true
}

export function syncWorkItemMaterialPlanQty(workItem) {
  if (!workItem) return
  const planQty = resolveWorkItemPlanQty(workItem)
  workItem.planQty = planQty
  cascadeMaterialPlanQtyFromParent(planQty, workItem.materials)
}

export function resolveWorkItemMaterials(workItem) {
  if (!workItem) return []
  if (workItem.materials?.length) return workItem.materials
  const qty = Number(workItem.orderQty ?? workItem.salesQty) || 1
  const fromSnapshot = resolveMaterialsFromEbomSnapshot(workItem.ebomSnapshot, qty)
  if (fromSnapshot.length) {
    workItem.materials = fromSnapshot
    if (workItem.ebomSnapshot && !workItem.ebomSnapshot.materials?.length) {
      workItem.ebomSnapshot.materials = fromSnapshot
    }
  }
  return workItem.materials || []
}

function syncTopMaterialFromWorkItem(top, workItem) {
  if (!top || !workItem) return
  const orderQty = Number(workItem.orderQty ?? workItem.salesQty ?? 0)
  const stockQty = Number(workItem.stockQty ?? 0)
  const supplyType = resolveTopLevelSupplyType(workItem)
  const planQty = resolveWorkItemPlanQty(workItem)
  const demandQty = orderQty
  const gapQty = Math.max(0, demandQty - stockQty)

  top.name = workItem.productName || ''
  top.code = workItem.productCode || ''
  top.spec = workItem.specModel || workItem.model || ''
  top.material = workItem.material || ''
  top.drawingNo = workItem.drawingNo || ''
  top.stockQty = stockQty
  top.availableStock = stockQty
  top.demandQty = demandQty
  top.gapQty = gapQty
  top.planQty = planQty
  top.supplyType = supplyType
  top.joinPlan = supplyType === '自制件' ? '是' : '否'
  top.bom = workItem.bomName || workItem.ebomSnapshot?.bomName || ''
}

export function resolveTopLevelSupplyType(workItem) {
  if (workItem?.topLevelSupplyType) return workItem.topLevelSupplyType
  const product = resolveWorkItemProduct(workItem)
  if (product?.isAssemblyPart || product?.supplyForm === '组装') return '组装'
  return '自制件'
}

export function buildTopLevelPlanMaterial(workItem) {
  if (!workItem) return null
  const orderQty = Number(workItem.orderQty ?? workItem.salesQty ?? 0)
  const stockQty = Number(workItem.stockQty ?? 0)
  const supplyType = resolveTopLevelSupplyType(workItem)
  const defaults = getMasterDefaults(workItem.productCode)
  const demandQty = orderQty
  const availableStock = stockQty
  const gapQty = Math.max(0, demandQty - availableStock)
  const planQty = resolveWorkItemPlanQty(workItem)

  return createPlanMaterial({
    id: `top-${workItem.id}`,
    isTopLevel: true,
    workItemId: workItem.id,
    status: workItem.status === '设计中' ? '设计中' : '待下达',
    name: workItem.productName || '',
    code: workItem.productCode || '',
    spec: workItem.specModel || workItem.model || '',
    specAttr: workItem.spec || '',
    material: workItem.material || '',
    type: workItem.productType || '半成品',
    drawingNo: workItem.drawingNo || '',
    unitUsage: 1,
    unit: workItem.unit || '件',
    supplyType,
    stockQty,
    availableStock,
    demandQty,
    gapQty,
    planQty,
    joinPlan: supplyType === '自制件' ? '是' : '否',
    processRoute: workItem.processRoute || defaults.processRoute || '',
    bom: workItem.bomName || workItem.ebomSnapshot?.bomName || '',
    children: workItem.materials || [],
  })
}

function normalizeMaterialTreeLeaves(materials) {
  materials?.forEach((node) => {
    if (node.children?.length) {
      normalizeMaterialTreeLeaves(node.children)
      return
    }
    if (Array.isArray(node.children) && !node.children.length) {
      delete node.children
    }
  })
}

export function buildDisplayMaterialTree(workItem, order) {
  if (!workItem) return []
  const materials = resolveWorkItemMaterials(workItem)
  normalizeMaterialTreeLeaves(materials)
  enrichPlanMaterialTree(materials, order)

  const topId = `top-${workItem.id}`
  if (!workItem._topMaterial || workItem._topMaterial.id !== topId) {
    workItem._topMaterial = buildTopLevelPlanMaterial(workItem)
  } else {
    syncTopMaterialFromWorkItem(workItem._topMaterial, workItem)
  }
  workItem._topMaterial.children = materials
  enrichPlanMaterial(workItem._topMaterial, order)
  return [workItem._topMaterial]
}

/** 收集物料树全部行 id（用于默认展开完整 BOM） */
export function collectAllMaterialRowKeys(materials = []) {
  const keys = []
  const walk = (nodes) => {
    nodes?.forEach((node) => {
      if (node.id) keys.push(node.id)
      if (node.children?.length) walk(node.children)
    })
  }
  walk(materials)
  return keys
}

/** 加工工单：子级自制件 + 顶级为自制件/自制的物料 */
export function getSelfMadeMaterialsForPlan(order) {
  const all = []
  order?.workItems?.forEach((wi) => {
    resolveWorkItemMaterials(wi)
    const top = wi._topMaterial || buildTopLevelPlanMaterial(wi)
    if (top && isTopLevelSelfMade(top.supplyType)) {
      all.push(top)
    }
    flattenMaterials(wi.materials, all)
  })
  return all.filter((m) => m.supplyType === '自制件' || m.supplyType === '自制')
}

export function isTopLevelSelfMade(supplyType) {
  return supplyType === '自制件' || supplyType === '自制'
}

/** 总装/部装工单：顶级组装件 → 总装工单；子级组装件 → 部装工单 */
export function getAssemblyMaterialsForPlan(order) {
  const all = []
  order?.workItems?.forEach((wi) => {
    resolveWorkItemMaterials(wi)
    const top = wi._topMaterial || buildTopLevelPlanMaterial(wi)
    if (top?.supplyType === '组装') {
      all.push({ ...top, orderCategory: '总装工单' })
    }
    const flat = []
    flattenMaterials(wi.materials, flat)
    flat
      .filter((m) => m.supplyType === '组装')
      .forEach((m) => all.push({ ...m, orderCategory: '部装工单' }))
  })
  return all
}

const supplierOptionMap = new Map()
;[...poSupplierOptions, ...reqSupplierOptions].forEach((opt) => {
  supplierOptionMap.set(opt.value, opt)
})
export const planSupplierOptions = [...supplierOptionMap.values()]

export function isPurchasedOrOutsourced(supplyType) {
  return supplyType === '外购件' || supplyType === '外协件'
}

export function getProcessRouteSelectOptions() {
  void processRouteState.routes
  const map = new Map()
  processRouteState.routes
    .filter((r) => r.status === '使用中')
    .forEach((r) => map.set(r.name, { label: r.name, value: r.name }))
  processRouteOptions.forEach((name) => {
    if (!map.has(name)) map.set(name, { label: name, value: name })
  })
  return [...map.values()]
}

/** 工艺文件选项暂留空，组件形态与工艺路线一致 */
export const processFileOptions = []

function findMasterByCode(code) {
  if (!code) return null
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material) return material
  return productInfoState.products.find((p) => p.code === code) || null
}

export function getMasterDefaults(code) {
  const master = findMasterByCode(code)
  if (!master) return {}
  const production = master.production || {}
  const supplyForm = master.supplyForm || master.supplyType
  return {
    supplyType: supplyForm || '',
    processRoute: production.defaultProcessRoute || master.defaultProcessRoute || '',
    processFile: '',
    standardCycle:
      production.standardCycleDays != null && production.standardCycleDays !== ''
        ? String(production.standardCycleDays)
        : '',
    supplier: production.defaultSupplier || '',
  }
}

export function calcLatestProcessTime(planAssemblyDate, standardCycle) {
  if (!planAssemblyDate) return ''
  const days = Number(standardCycle)
  if (Number.isNaN(days)) return ''
  return dayjs(planAssemblyDate).subtract(days, 'day').format('YYYY-MM-DD')
}

export function resolvePlanAssemblyDate(order) {
  return order?.planAssemblyDate || order?.workItems?.[0]?.deliveryDate || order?.deliveryDate || ''
}

export function enrichPlanMaterial(material, order) {
  if (!material) return material
  const defaults = getMasterDefaults(material.code)

  if (!material.supplyType && defaults.supplyType) {
    material.supplyType = defaults.supplyType
  }
  if (!material.processRoute && defaults.processRoute) {
    material.processRoute = defaults.processRoute
  }
  if (!material.standardCycle && defaults.standardCycle) {
    material.standardCycle = defaults.standardCycle
  }
  if (!material.supplier && defaults.supplier) {
    material.supplier = defaults.supplier
  }
  if (material.processFile == null) material.processFile = ''
  if (material.designateSupplier == null) material.designateSupplier = false

  if (!material.latestProcessTime && material.standardCycle) {
    material.latestProcessTime = calcLatestProcessTime(
      resolvePlanAssemblyDate(order),
      material.standardCycle,
    )
  }

  if (!isPurchasedOrOutsourced(material.supplyType)) {
    material.designateSupplier = false
  }

  if (material.children?.length) {
    material.children.forEach((child) => enrichPlanMaterial(child, order))
  }
  return material
}

export function enrichPlanMaterialTree(materials, order) {
  ;(materials || []).forEach((node) => enrichPlanMaterial(node, order))
  return materials
}

export function recalcMaterialLatestProcessTimes(materials, order) {
  const assemblyDate = resolvePlanAssemblyDate(order)
  const walk = (nodes) => {
    nodes?.forEach((node) => {
      if (node.standardCycle) {
        node.latestProcessTime = calcLatestProcessTime(assemblyDate, node.standardCycle)
      }
      if (node.children?.length) walk(node.children)
    })
  }
  walk(materials)
}

export function onMaterialSupplyTypeChange(record) {
  if (!isPurchasedOrOutsourced(record.supplyType)) {
    record.designateSupplier = false
  }
}

export function onMaterialDesignateSupplierChange(record, checked) {
  record.designateSupplier = !!checked
  if (!checked) return
}

export function onMaterialStandardCycleChange(record, order) {
  record.latestProcessTime = calcLatestProcessTime(
    resolvePlanAssemblyDate(order),
    record.standardCycle,
  )
}

export function validateDesignatedSuppliers(materials) {
  const flat = []
  flattenMaterials(materials, flat)
  const missing = flat.find(
    (m) =>
      m.designateSupplier &&
      isPurchasedOrOutsourced(m.supplyType) &&
      !String(m.supplier || '').trim(),
  )
  if (missing) {
    return { ok: false, message: `已指定供应商的「${missing.name}」需填写供方单位` }
  }
  return { ok: true }
}

import dayjs from 'dayjs'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { processRouteState } from '@/store/processRouteStore'
import { processRouteOptions } from '@/mock/workOrderOptions'
import { supplierOptions as poSupplierOptions } from '@/mock/purchaseOrderOptions'
import { supplierOptions as reqSupplierOptions } from '@/mock/purchaseRequisitionOptions'
import { SUPPLY_FORM_OPTIONS } from '@/utils/masterDataMigrate'
import { flattenMaterials } from '@/utils/material'

export const supplyTypeOptions = SUPPLY_FORM_OPTIONS.map((v) => ({ label: v, value: v }))

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

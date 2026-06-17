import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { processRouteState } from '@/store/processRouteStore'
import { buildProcessesFromRoute, getActiveRouteOptions } from '@/mock/processRoutes'

function findWorkOrderProductMaster(workOrder = {}) {
  void productInfoState.products
  void materialInfoState.materials
  const { productName, materialCode } = workOrder
  if (materialCode) {
    const mat = materialInfoState.materials.find((m) => m.code === materialCode)
    if (mat) return { master: mat, itemType: 'material' }
    const prod = productInfoState.products.find((p) => p.code === materialCode)
    if (prod) return { master: prod, itemType: 'product' }
  }
  if (productName) {
    const prod = productInfoState.products.find((p) => p.name === productName)
    if (prod) return { master: prod, itemType: 'product' }
    const mat = materialInfoState.materials.find((m) => m.name === productName)
    if (mat) return { master: mat, itemType: 'material' }
  }
  return { master: null, itemType: '' }
}

/** 产品/物料主数据上的默认工艺路线 */
export function resolveProductDefaultProcessRoute(workOrder = {}) {
  const { master } = findWorkOrderProductMaster(workOrder)
  if (!master) return ''
  const production = master.production || {}
  return production.defaultProcessRoute || ''
}

/** 工单下发页工艺路线下拉选项 */
export function getWorkOrderRouteSelectOptions(workOrder = {}) {
  void processRouteState.routes
  const { master, itemType } = findWorkOrderProductMaster(workOrder)
  const ctx = {
    productName: workOrder.productName,
    productId: itemType === 'product' ? master?.id : undefined,
    materialId: itemType === 'material' ? master?.id : undefined,
    categoryKey: master?.categoryKey,
  }
  return getActiveRouteOptions(ctx).map((name) => ({ label: name, value: name }))
}

/** 工单无工艺路线时，默认带入产品关联路线并生成工序 */
export function ensureWorkOrderProcessRoute(workOrder) {
  if (!workOrder || workOrder.processRouteName) return false
  const options = getWorkOrderRouteSelectOptions(workOrder)
  const defaultRoute = resolveProductDefaultProcessRoute(workOrder)
  const routeName =
    defaultRoute && options.some((o) => o.value === defaultRoute)
      ? defaultRoute
      : options[0]?.value || defaultRoute
  if (!routeName) return false
  workOrder.processRouteName = routeName
  workOrder.processes = buildProcessesFromRoute(routeName)
  return true
}

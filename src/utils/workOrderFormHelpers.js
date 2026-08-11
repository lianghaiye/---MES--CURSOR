import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  getOwnActiveBomForItem,
  getBomsForItem,
  getProductBomById,
  productBomState,
} from '@/store/productBomStore'
import { formatBomInfoLabel } from '@/utils/itemBomInfo'
import { isShipBomType } from '@/mock/bomMaterialColumns'
import { getDefaultProductRoute, getActiveRouteOptions } from '@/mock/processRoutes'
import { stockState } from '@/store/stockStore'
import { demoStockQty } from '@/utils/productionPlanWorkItem'

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function findProductMasterByName(name) {
  if (!name) return null
  const n = normalizeName(name)
  return (
    productInfoState.products.find(
      (p) =>
        normalizeName(p.name) === n ||
        normalizeName(p.name).includes(n) ||
        n.includes(normalizeName(p.name)),
    ) || null
  )
}

export function findMaterialMasterByName(name) {
  if (!name) return null
  const n = normalizeName(name)
  return (
    materialInfoState.materials.find(
      (m) =>
        normalizeName(m.name) === n ||
        normalizeName(m.name).includes(n) ||
        n.includes(normalizeName(m.name)),
    ) || null
  )
}

/** 投产口径：仅 SKU 自有生效 BOM，禁止族模板解析 */
export function resolveProductActiveBom(product) {
  if (!product?.id) return null
  return getOwnActiveBomForItem('product', product.id)
}

export function resolveProductDefaultRoute(product) {
  const fromProduct = product?.production?.defaultProcessRoute
  if (fromProduct) return fromProduct
  const opts = getActiveRouteOptions({ productName: product?.name })
  if (opts.length) return opts[0]
  return getDefaultProductRoute(product?.name)
}

function sumStockQty(itemCode) {
  if (!itemCode) return 0
  return stockState.records
    .filter((r) => r.itemCode === itemCode)
    .reduce((sum, r) => sum + (Number(r.qty) || 0), 0)
}

/** 根据产品 BOM 构建工单组件明细行 */
export function buildWorkOrderComponentLines(bom, scheduleQty = 1) {
  if (!bom?.lineItems?.length) return []
  const qty = Number(scheduleQty) || 0
  return bom.lineItems.map((line, index) => {
    const unitQty = Number(line.unitQty) || 0
    const code = line.materialCode || line.itemCode || ''
    let stockQty = sumStockQty(code)
    if (!stockQty && code) {
      stockQty = demoStockQty(unitQty * 10, index)
    }
    return {
      id: line.id || `comp-${index}`,
      itemName: line.itemName || '',
      itemCode: code,
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      supplyForm: line.supplyForm || '',
      unit: line.unit || '件',
      unitQty,
      stockQty,
      requiredQty: Number((unitQty * qty).toFixed(4)),
      remark: line.remark || '',
    }
  })
}

export function applyProductMasterToForm(form, master, bom) {
  if (!master) return
  form.productName = master.name
  form.materialCode = master.code || ''
  form.productId = master.id
  form.specModel = master.specModel || ''
  form.material = master.material || ''
  form.drawingNo = master.drawingNo || ''
  form.variantSummary = master.variantSummary || ''
  form.variantValues = master.variantValues ? { ...master.variantValues } : {}
  form.techParams = master.techParams || ''
  form.matchingRequirements = master.matchingRequirements || master.remark || ''
  form.bomLabel = bom ? formatBomInfoLabel(bom) : ''
  form.bomId = bom?.id || ''
  const route = resolveProductDefaultRoute(master)
  if (route) form.processRouteName = route
  if (master.production?.defaultWorkCenter) {
    form.workCenter = master.production.defaultWorkCenter
  }
}

/** 从 BOM 解析关联的产品/物料主数据 */
export function resolveMasterFromBom(bom) {
  if (!bom) return null
  if (bom.itemType === 'product') {
    return (
      productInfoState.products.find((p) => String(p.id) === String(bom.itemId)) ||
      findProductMasterByName(bom.itemName)
    )
  }
  if (bom.itemType === 'material') {
    return (
      materialInfoState.materials.find((m) => String(m.id) === String(bom.itemId)) ||
      findMaterialMasterByName(bom.itemName)
    )
  }
  return null
}

/** 选择 BOM 后回填表单（含关联产品信息） */
export function applyBomSelectionToForm(form, bomId) {
  const bom = bomId ? getProductBomById(bomId) : null
  if (!bom) {
    form.bomId = ''
    form.bomLabel = ''
    return null
  }
  const master = resolveMasterFromBom(bom)
  if (master) {
    applyProductMasterToForm(form, master, bom)
    return { master, bom }
  }
  form.bomId = bom.id
  form.bomLabel = formatBomInfoLabel(bom)
  return { master: null, bom }
}

/** 构建工单 BOM 下拉选项 */
export function buildWorkOrderBomSelectOptions(productId) {
  void productBomState.boms
  const source = productId
    ? getBomsForItem('product', productId)
    : productBomState.boms.filter(
        (b) => b.itemType === 'product' && (b.status === '生效' || b.status === '待发布'),
      )

  return source
    .filter((b) => !isShipBomType(b.bomType))
    .map((b) => {
      const master = resolveMasterFromBom(b)
      const productHint = master?.name && !productId ? ` · ${master.name}` : ''
      return {
        label: `${formatBomInfoLabel(b)}${productHint}`,
        value: b.id,
      }
    })
}

/** 从物品选择器选项回填表单 */
export function applyPickerItemToForm(form, item) {
  if (!item?.itemId) return null
  if (item.itemType === '产品') {
    const product =
      productInfoState.products.find((p) => p.id === item.itemId) ||
      findProductMasterByName(item.name)
    if (!product) return null
    const bom = resolveProductActiveBom(product)
    applyProductMasterToForm(form, product, bom)
    return { master: product, bom }
  }
  if (item.itemType === '物料') {
    const material =
      materialInfoState.materials.find((m) => m.id === item.itemId) ||
      findMaterialMasterByName(item.name)
    if (!material) return null
    const bom = getOwnActiveBomForItem('material', material.id)
    applyProductMasterToForm(form, material, bom)
    return { master: material, bom }
  }
  return null
}

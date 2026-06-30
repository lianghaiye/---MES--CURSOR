import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getActiveBomForItem } from '@/store/productBomStore'
import { resolveWarehouseItemCategoryScope } from '@/utils/warehouseItemPicker'
import {
  materialCategoryTree,
  flattenCategoryNodes as flattenMatCats,
} from '@/mock/materialCategories'
import {
  productCategoryTree,
  flattenCategoryNodes as flattenProdCats,
} from '@/mock/productCategories'

function resolveBomItemType(itemType) {
  return itemType === '产品' ? 'product' : 'material'
}

/** 物品关联 BOM 的直属子件项数 */
export function calcLinkedBomSubItemCount(itemType, itemId) {
  const bom = getActiveBomForItem(resolveBomItemType(itemType), itemId)
  if (!bom) return 0
  const rootId = bom.treeNodes?.find((n) => n.isRoot)?.id || 'bom-root'
  return (bom.lineItems || []).filter(
    (l) =>
      l.parentTreeId === rootId || l.parentTreeId === '__ROOT__' || l.parentTreeId === 'bom-root',
  ).length
}

function mapMasterRow(source, itemType) {
  const production = source.production || {}
  return {
    rowKey: `${itemType}-${source.id}`,
    itemType,
    itemId: source.id,
    name: source.name || '',
    code: source.code || '',
    specModel: source.specModel || '',
    categoryName: source.categoryName || '',
    categoryKey: source.categoryKey || '',
    parentCategoryKey: source.parentCategoryKey || source.categoryKey || '',
    material: source.material || '',
    drawingNo: source.drawingNo || '',
    inventoryUnit: source.inventoryUnit || '',
    productAttribute: source.productAttribute || '',
    materialType: source.materialType || '',
    supplyForm: source.supplyForm || '',
    weight: source.weight ?? '',
    processRoute: production.defaultProcessRoute || '',
    defaultWarehouse: production.defaultWarehouse || '',
    defaultSupplier: production.defaultSupplier || '',
    defaultWorkCenter: production.defaultWorkCenter || '',
    createdAt: source.createdAt || '',
    creator: source.creator || source.operator || 'admin',
    unitPrice: source.unitPrice ?? 0,
    subItemCount: calcLinkedBomSubItemCount(itemType, source.id),
  }
}

/** 合并产品信息与物料信息 */
export function buildBomSubItemPickerRows() {
  const products = (productInfoState.products || []).map((p) => mapMasterRow(p, '产品'))
  const materials = (materialInfoState.materials || []).map((m) => mapMasterRow(m, '物料'))
  return [...products, ...materials]
}

export function filterBomSubItemPickerRows(rows, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return rows
  return rows.filter(
    (r) =>
      String(r.code || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.name || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.specModel || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.categoryName || '')
        .toLowerCase()
        .includes(kw),
  )
}

/** ECN 选择新物料：多字段模糊筛选 */
export function filterEcnNewMaterialRows(rows, filters = {}) {
  const f = {
    itemName: String(filters.itemName || '').trim().toLowerCase(),
    materialCode: String(filters.materialCode || '').trim().toLowerCase(),
    specModel: String(filters.specModel || '').trim().toLowerCase(),
    categoryName: String(filters.categoryName || '').trim().toLowerCase(),
    material: String(filters.material || '').trim().toLowerCase(),
    drawingNo: String(filters.drawingNo || '').trim().toLowerCase(),
  }
  const hasFilter = Object.values(f).some(Boolean)
  if (!hasFilter) return rows
  return rows.filter((row) => {
    if (f.itemName && !String(row.name || '').toLowerCase().includes(f.itemName)) return false
    if (f.materialCode && !String(row.code || '').toLowerCase().includes(f.materialCode)) {
      return false
    }
    if (f.specModel && !String(row.specModel || '').toLowerCase().includes(f.specModel)) return false
    if (f.categoryName && !String(row.categoryName || '').toLowerCase().includes(f.categoryName)) {
      return false
    }
    if (f.material && !String(row.material || '').toLowerCase().includes(f.material)) return false
    if (f.drawingNo && !String(row.drawingNo || '').toLowerCase().includes(f.drawingNo)) return false
    return true
  })
}

function collectCategoryKeys(categoryKey) {
  if (!categoryKey) return null
  const matFlat = flattenMatCats(materialCategoryTree)
  const prodFlat = flattenProdCats(productCategoryTree)

  if (categoryKey === 'root-material') {
    return { scope: 'material', keys: new Set(matFlat.map((n) => n.key)) }
  }
  if (categoryKey === 'root-product') {
    return { scope: 'product', keys: new Set(prodFlat.map((n) => n.key)) }
  }

  const all = [...matFlat, ...prodFlat]
  const keys = new Set([categoryKey])
  const walk = (parentKey) => {
    all.forEach((n) => {
      if (n.parentKey === parentKey && !keys.has(n.key)) {
        keys.add(n.key)
        walk(n.key)
      }
    })
  }
  walk(categoryKey)
  return { scope: resolveWarehouseItemCategoryScope(categoryKey), keys }
}

function filterByCategoryKey(rows, categoryKey) {
  const scopeInfo = collectCategoryKeys(categoryKey)
  if (!scopeInfo) return rows
  const { scope, keys } = scopeInfo
  return rows.filter((row) => {
    if (scope === 'product' && row.itemType !== '产品') return false
    if (scope === 'material' && row.itemType !== '物料') return false
    if (categoryKey === 'root-product' || categoryKey === 'root-material') return true
    return keys.has(row.categoryKey) || keys.has(row.parentCategoryKey)
  })
}

/** 关键字 + 高级筛选 + 分类树 */
export function filterBomSubItemPickerRowsAdvanced(rows, options = {}) {
  const { keyword = '', filters = {}, categoryKey = '' } = options
  let result = rows

  if (categoryKey) {
    result = filterByCategoryKey(result, categoryKey)
  }

  if (keyword?.trim()) {
    result = filterBomSubItemPickerRows(result, keyword)
  }

  const f = filters
  if (f.code?.trim()) {
    result = result.filter((r) => String(r.code || '').includes(f.code.trim()))
  }
  if (f.name?.trim()) {
    result = result.filter((r) => String(r.name || '').includes(f.name.trim()))
  }
  if (f.specModel?.trim()) {
    result = result.filter((r) => String(r.specModel || '').includes(f.specModel.trim()))
  }
  if (f.itemType) {
    result = result.filter((r) => r.itemType === f.itemType)
  }
  if (f.categoryName?.trim()) {
    result = result.filter((r) => String(r.categoryName || '').includes(f.categoryName.trim()))
  }
  if (f.productAttribute) {
    result = result.filter((r) => r.productAttribute === f.productAttribute)
  }
  if (f.materialType) {
    result = result.filter((r) => r.materialType === f.materialType)
  }
  if (f.supplyForm) {
    result = result.filter((r) => r.supplyForm === f.supplyForm)
  }

  return result
}

/** 转为 addChildMaterial 所需结构 */
export function toBomSubItemPayload(row) {
  return {
    id: row.itemId,
    itemType: row.itemType,
    code: row.code,
    name: row.name,
    specModel: row.specModel,
    categoryName: row.categoryName,
    materialType: row.materialType || row.productAttribute || '零部件',
    supplyForm: row.supplyForm || '外购件',
    material: row.material || '',
    drawingNo: row.drawingNo || '',
    inventoryUnit: row.inventoryUnit || '件',
    unitPrice: row.unitPrice ?? 0,
  }
}

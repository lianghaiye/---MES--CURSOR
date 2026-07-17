import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getOwnActiveBomForItem } from '@/store/productBomStore'
import { resolveWarehouseItemCategoryScope } from '@/utils/warehouseItemPicker'
import {
  materialCategoryTree,
  flattenCategoryNodes as flattenMatCats,
} from '@/mock/materialCategories'
import {
  productCategoryTree,
  flattenCategoryNodes as flattenProdCats,
} from '@/mock/productCategories'
import { findSpuById, spuState } from '@/store/spuStore'
import { formatVariantSummary, formatVariantTooltip } from '@/utils/spuVariant'
import { isProductSyncedMirror } from '@/utils/bomMaterialPicker'

function resolveBomItemType(itemType) {
  return itemType === '产品' ? 'product' : 'material'
}

/** 物品关联 BOM 的直属子件项数 */
export function calcLinkedBomSubItemCount(itemType, itemId) {
  const bom = getOwnActiveBomForItem(resolveBomItemType(itemType), itemId)
  if (!bom) return 0
  const rootId = bom.treeNodes?.find((n) => n.isRoot)?.id || 'bom-root'
  return (bom.lineItems || []).filter(
    (l) =>
      l.parentTreeId === rootId || l.parentTreeId === '__ROOT__' || l.parentTreeId === 'bom-root',
  ).length
}

function mapMasterRow(source, itemType, options = {}) {
  const production = source.production || {}
  const skipSubItemCount = options.skipSubItemCount === true
  const variantValues = source.variantValues || {}
  const spu = source.spuId ? findSpuById(source.spuId) : null
  const variantAxes = spu?.variantAxes || []
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
    subItemCount: skipSubItemCount ? 0 : calcLinkedBomSubItemCount(itemType, source.id),
    spuId: source.spuId || '',
    spuName: source.spuName || spu?.name || '',
    variantValues,
    materialGradeId: source.materialGradeId || '',
    variantSummary: formatVariantSummary(variantValues, variantAxes),
    variantTooltip: formatVariantTooltip(variantValues, variantAxes),
    isSpuTemplate: false,
    catalogKind: 'sku',
  }
}

/** 产品族模板行：规格/材质/变体为空，便于识别为模板 */
function mapSpuTemplateRow(spu) {
  const shared = spu?.sharedFields || {}
  const itemType = spu?.itemKind === 'material' ? '物料' : '产品'
  return {
    rowKey: `产品族-${spu.id}`,
    itemType,
    itemId: spu.id,
    name: spu.name || '',
    code: spu.code || '',
    specModel: '',
    categoryName: spu.categoryName || '',
    categoryKey: spu.categoryKey || '',
    parentCategoryKey: spu.parentCategoryKey || spu.categoryKey || '',
    material: '',
    drawingNo: shared.drawingNo || '',
    inventoryUnit: shared.inventoryUnit || shared.unit || '件',
    productAttribute: shared.productAttribute || '',
    materialType: '',
    supplyForm: '',
    weight: '',
    processRoute: '',
    defaultWarehouse: '',
    defaultSupplier: '',
    defaultWorkCenter: '',
    createdAt: spu.createdAt || '',
    creator: spu.creator || 'admin',
    unitPrice: 0,
    subItemCount: 0,
    spuId: spu.id,
    spuName: spu.name || '',
    variantValues: {},
    materialGradeId: '',
    variantSummary: '',
    variantTooltip: '',
    isSpuTemplate: true,
    catalogKind: 'spu',
    variantAxes: spu.variantAxes || [],
  }
}

let pickerRowsCache = null
let pickerRowsCacheKey = ''

export function invalidateBomSubItemPickerRowsCache() {
  pickerRowsCache = null
  pickerRowsCacheKey = ''
}

/** 合并产品信息与物料信息
 * @param {{ skipSubItemCount?: boolean, dedupeProductMaterial?: boolean, includeSpuTemplates?: boolean, spuCanSellOnly?: boolean }} [options]
 * - dedupeProductMaterial=true（默认）：跳过产品物料在物料表中的镜像，同 ID 只保留产品行
 * - false：产品行 + 物料镜像均保留，供「类型=物料」筛出产品物料
 * - includeSpuTemplates：一并列出产品族模板（规格/材质/变体为空）
 */
export function buildBomSubItemPickerRows(options = {}) {
  const skipSubItemCount = options.skipSubItemCount === true
  const dedupeProductMaterial = options.dedupeProductMaterial !== false
  const includeSpuTemplates = options.includeSpuTemplates === true
  const spuCanSellOnly = options.spuCanSellOnly !== false
  const cacheKey = `${productInfoState.products?.length || 0}-${materialInfoState.materials?.length || 0}-${spuState.spus?.length || 0}-${skipSubItemCount ? 1 : 0}-${dedupeProductMaterial ? 1 : 0}-${includeSpuTemplates ? 1 : 0}-${spuCanSellOnly ? 1 : 0}`
  if (pickerRowsCache && pickerRowsCacheKey === cacheKey) {
    return pickerRowsCache
  }

  const mapOpts = { skipSubItemCount }
  const products = (productInfoState.products || []).map((p) => mapMasterRow(p, '产品', mapOpts))
  const seen = new Set(products.map((r) => r.itemId))
  const rows = [...products]

  ;(materialInfoState.materials || []).forEach((m) => {
    if (dedupeProductMaterial) {
      if (seen.has(m.id)) return
      if (isProductSyncedMirror(m)) return
    }
    rows.push(mapMasterRow(m, '物料', mapOpts))
  })

  if (includeSpuTemplates) {
    ;(spuState.spus || []).forEach((spu) => {
      if (!(spu.variantAxes || []).length) return
      if (spuCanSellOnly && !spu.canSell) return
      rows.push(mapSpuTemplateRow(spu))
    })
  }

  pickerRowsCache = rows
  pickerRowsCacheKey = cacheKey
  return rows
}

/** 全部类型：按 itemId 去重，优先保留「产品」行（去掉产品物料镜像重复）；产品族模板单独保留 */
export function dedupePickerRowsPreferProduct(rows = []) {
  const map = new Map()
  const spuTemplates = []
  rows.forEach((row) => {
    if (row?.isSpuTemplate) {
      spuTemplates.push(row)
      return
    }
    const id = row?.itemId
    if (id == null || id === '') return
    const prev = map.get(id)
    if (!prev) {
      map.set(id, row)
      return
    }
    if (row.itemType === '产品' && prev.itemType !== '产品') {
      map.set(id, row)
    }
  })
  // 保留无 itemId 的异常行
  const extras = rows.filter((r) => !r?.isSpuTemplate && (r?.itemId == null || r.itemId === ''))
  return [...map.values(), ...extras, ...spuTemplates]
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
      String(r.material || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.variantSummary || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.variantTooltip || '')
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
    itemName: String(filters.itemName || '')
      .trim()
      .toLowerCase(),
    materialCode: String(filters.materialCode || '')
      .trim()
      .toLowerCase(),
    specModel: String(filters.specModel || '')
      .trim()
      .toLowerCase(),
    categoryName: String(filters.categoryName || '')
      .trim()
      .toLowerCase(),
    material: String(filters.material || '')
      .trim()
      .toLowerCase(),
    drawingNo: String(filters.drawingNo || '')
      .trim()
      .toLowerCase(),
  }
  const hasFilter = Object.values(f).some(Boolean)
  if (!hasFilter) return rows
  return rows.filter((row) => {
    if (f.itemName) {
      const nameHit = String(row.name || '')
        .toLowerCase()
        .includes(f.itemName)
      const summaryHit = String(row.variantSummary || '')
        .toLowerCase()
        .includes(f.itemName)
      const tipHit = String(row.variantTooltip || '')
        .toLowerCase()
        .includes(f.itemName)
      if (!nameHit && !summaryHit && !tipHit) return false
    }
    if (
      f.materialCode &&
      !String(row.code || '')
        .toLowerCase()
        .includes(f.materialCode)
    ) {
      return false
    }
    if (
      f.specModel &&
      !String(row.specModel || '')
        .toLowerCase()
        .includes(f.specModel)
    )
      return false
    if (
      f.categoryName &&
      !String(row.categoryName || '')
        .toLowerCase()
        .includes(f.categoryName)
    ) {
      return false
    }
    if (
      f.material &&
      !String(row.material || '')
        .toLowerCase()
        .includes(f.material)
    )
      return false
    if (
      f.drawingNo &&
      !String(row.drawingNo || '')
        .toLowerCase()
        .includes(f.drawingNo)
    )
      return false
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
    spuId: row.spuId || '',
    spuName: row.spuName || '',
    variantValues: row.variantValues || {},
    materialGradeId: row.materialGradeId || '',
    isSpuTemplate: Boolean(row.isSpuTemplate),
    pickType: row.isSpuTemplate ? 'spu' : 'sku',
    isSpuLine: Boolean(row.isSpuTemplate),
    variantAxes: row.variantAxes || [],
  }
}

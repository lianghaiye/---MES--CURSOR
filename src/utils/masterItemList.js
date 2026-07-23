import { getCategoryFilterKeys as getProductCategoryFilterKeys } from '@/mock/productInfo'
import { getCategoryFilterKeys as getMaterialCategoryFilterKeys } from '@/mock/materialInfo'
import {
  CATEGORY_TREE_MODE,
  ITEM_KIND,
  inferItemKindFromRecord,
  itemKindLabel,
  normalizeCapabilityFlags,
} from '@/utils/masterItemKind'
import { MASTER_BUSINESS_TYPE_OPTIONS, matchesBusinessTypeFilter } from '@/utils/businessTypeLabel'
import { isProductSyncedMirror } from '@/utils/bomMaterialPicker'

function pickMergedField(productRow, materialRow, key, fallback = '') {
  const p = productRow?.[key]
  const m = materialRow?.[key]
  if (p != null && p !== '') return p
  if (m != null && m !== '') return m
  return fallback
}

function toUnifiedRow(source, sourceStore, productRow, materialRow) {
  const itemKind = inferItemKindFromRecord(source, {
    source: sourceStore,
    productRow,
    materialRow,
  })
  const caps = normalizeCapabilityFlags(source, sourceStore)
  const isPm = itemKind === ITEM_KIND.PRODUCT_MATERIAL

  return {
    ...source,
    itemKind,
    itemKindLabel: itemKindLabel(itemKind),
    isProductMaterial: isPm,
    canSell: caps.canSell,
    canProduce: caps.canProduce,
    productCategoryKey: productRow?.categoryKey || source.productCategoryKey,
    materialCategoryKey:
      materialRow?.categoryKey || source.materialCategoryKey || source.categoryKey,
    categoryKey: source.categoryKey,
    spuId: source.spuId || productRow?.spuId || materialRow?.spuId || '',
    spuName: source.spuName || productRow?.spuName || materialRow?.spuName || '',
    variantValues:
      source.variantValues || productRow?.variantValues || materialRow?.variantValues || {},
    materialGradeId:
      source.materialGradeId || productRow?.materialGradeId || materialRow?.materialGradeId || '',
    categoryName: pickMergedField(productRow, materialRow, 'categoryName', source.categoryName),
    productAttribute: productRow?.productAttribute || source.productAttribute,
    standardSpec: productRow?.standardSpec || source.standardSpec,
    materialType: materialRow?.materialType || source.materialType,
    supplyForm: materialRow?.supplyForm || source.supplyForm,
    production: productRow?.production || materialRow?.production || source.production,
    _productRow: productRow,
    _materialRow: materialRow,
  }
}

function mergeProductMaterialRow(productRow, materialRow) {
  const base = toUnifiedRow(productRow, 'product', productRow, materialRow)
  return {
    ...base,
    code: pickMergedField(productRow, materialRow, 'code'),
    name: pickMergedField(productRow, materialRow, 'name'),
    specModel: pickMergedField(productRow, materialRow, 'specModel'),
    drawingNo: pickMergedField(productRow, materialRow, 'drawingNo'),
    material: pickMergedField(productRow, materialRow, 'material'),
    inventoryUnit: pickMergedField(productRow, materialRow, 'inventoryUnit'),
    unitPrice: productRow?.unitPrice ?? materialRow?.unitPrice ?? 0,
    updatedAt: productRow?.updatedAt || materialRow?.updatedAt,
    createdAt: productRow?.createdAt || materialRow?.createdAt,
  }
}

/** 合并产品、物料 store 为统一列表行（产品物料去重为一行） */
export function buildUnifiedListRows(products = [], materials = []) {
  const materialById = new Map(materials.map((m) => [m.id, m]))
  const productById = new Map(products.map((p) => [p.id, p]))
  const seen = new Set()
  const rows = []

  for (const productRow of products) {
    const materialRow = materialById.get(productRow.id)
    const itemKind = inferItemKindFromRecord(productRow, {
      source: 'product',
      productRow,
      materialRow,
    })

    if (itemKind === ITEM_KIND.PRODUCT_MATERIAL && materialRow) {
      rows.push(mergeProductMaterialRow(productRow, materialRow))
      seen.add(productRow.id)
      continue
    }

    if (itemKind === ITEM_KIND.PRODUCT || !materialRow) {
      rows.push(toUnifiedRow(productRow, 'product', productRow, materialRow))
      seen.add(productRow.id)
    }
  }

  for (const materialRow of materials) {
    if (seen.has(materialRow.id)) continue
    if (isProductSyncedMirror(materialRow) && productById.has(materialRow.id)) continue

    const productRow = productById.get(materialRow.id)
    const itemKind = inferItemKindFromRecord(materialRow, {
      source: 'material',
      productRow,
      materialRow,
    })

    if (itemKind === ITEM_KIND.PRODUCT_MATERIAL && productRow) {
      rows.push(mergeProductMaterialRow(productRow, materialRow))
      seen.add(materialRow.id)
      continue
    }

    rows.push(toUnifiedRow(materialRow, 'material', productRow, materialRow))
    seen.add(materialRow.id)
  }

  return rows
}

function matchesCategoryTree(row, treeMode, selectedCategoryKey) {
  if (!selectedCategoryKey) return true

  const productKeys =
    treeMode === CATEGORY_TREE_MODE.PRODUCT
      ? getProductCategoryFilterKeys(selectedCategoryKey)
      : null
  const materialKeys =
    treeMode === CATEGORY_TREE_MODE.MATERIAL
      ? getMaterialCategoryFilterKeys(selectedCategoryKey)
      : null

  if (treeMode === CATEGORY_TREE_MODE.PRODUCT) {
    if (row.itemKind === ITEM_KIND.MATERIAL) return false
    const keys = [
      row.productCategoryKey,
      row.categoryKey,
      row.parentCategoryKey,
      row._productRow?.categoryKey,
      row._productRow?.parentCategoryKey,
    ].filter(Boolean)
    return keys.some((k) => productKeys?.includes(k))
  }

  if (row.itemKind === ITEM_KIND.PRODUCT) return false
  const keys = [
    row.materialCategoryKey,
    row.categoryKey,
    row.parentCategoryKey,
    row._materialRow?.categoryKey,
    row._materialRow?.parentCategoryKey,
  ].filter(Boolean)
  return keys.some((k) => materialKeys?.includes(k))
}

/** 统一列表筛选 */
export function filterUnifiedListRows(rows, filters = {}, selectedCategoryKey, treeMode) {
  const hasCodeSearch = Boolean(String(filters.code || '').trim())
  return rows.filter((item) => {
    // 按编码搜索时不限制左侧类别，避免找不到演示料/跨类物料
    if (!hasCodeSearch && !matchesCategoryTree(item, treeMode, selectedCategoryKey)) return false

    if (filters.code && !String(item.code || '').includes(filters.code)) return false
    if (filters.name && !String(item.name || '').includes(filters.name)) return false
    if (filters.barcodeType && item.barcodeType !== filters.barcodeType) return false
    if (filters.categoryKey) {
      const catKeys = [item.categoryKey, item.productCategoryKey, item.materialCategoryKey].filter(
        Boolean,
      )
      if (!catKeys.includes(filters.categoryKey)) return false
    }
    if (filters.specModel && !String(item.specModel || '').includes(filters.specModel)) return false
    if (filters.material && !String(item.material || '').includes(filters.material)) return false
    if (filters.drawingNo && !String(item.drawingNo || '').includes(filters.drawingNo)) return false
    if (filters.itemKind && item.itemKind !== filters.itemKind) return false
    if (
      filters.businessType &&
      !matchesBusinessTypeFilter(item, filters.businessType, MASTER_BUSINESS_TYPE_OPTIONS)
    ) {
      return false
    }
    if (filters.workCenter && item.production?.defaultWorkCenter !== filters.workCenter) {
      return false
    }
    return true
  })
}

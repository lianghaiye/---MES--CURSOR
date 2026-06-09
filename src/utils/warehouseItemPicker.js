import { productCategoryTree, flattenCategoryNodes } from '@/mock/productCategories'
import {
  materialCategoryTree,
  flattenCategoryNodes as flattenMatCats,
} from '@/mock/materialCategories'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'

export function buildWarehouseItemCategoryTree() {
  const mapNodes = (nodes) =>
    nodes.map((n) => ({
      key: n.key,
      title: n.title,
      children: n.children?.length ? mapNodes(n.children) : undefined,
    }))

  return [
    {
      key: 'root-material',
      title: '物料',
      selectable: false,
      children: mapNodes(materialCategoryTree),
    },
    {
      key: 'root-product',
      title: '产品',
      selectable: false,
      children: mapNodes(productCategoryTree),
    },
  ]
}

function collectDescendantKeys(nodes, rootKey) {
  const matFlat = flattenMatCats(materialCategoryTree)
  const prodFlat = flattenCategoryNodes(productCategoryTree)

  if (rootKey === 'root-material') {
    return new Set(matFlat.map((n) => n.key))
  }
  if (rootKey === 'root-product') {
    return new Set(prodFlat.map((n) => n.key))
  }

  const all = [...matFlat, ...prodFlat]
  const keys = new Set([rootKey])
  const walk = (parentKey) => {
    all.forEach((n) => {
      if (n.parentKey === parentKey && !keys.has(n.key)) {
        keys.add(n.key)
        walk(n.key)
      }
    })
  }
  walk(rootKey)
  return keys
}

export function buildWarehousePickableItems() {
  const products = (productInfoState.products || []).map((p) => ({
    rowKey: `产品-${p.id}`,
    itemType: '产品',
    itemId: p.id,
    code: p.code,
    name: p.name,
    specModel: p.specModel || '',
    categoryName: p.categoryName || '',
    categoryKey: p.categoryKey || '',
    material: p.material || '',
    unitPrice: p.unitPrice ?? '',
    standardSpec: p.standardSpec || '',
    standardCycleDays: p.production?.standardCycleDays ?? '',
    barcodeType: p.barcodeType || '',
    inventoryUnit: p.inventoryUnit || '',
    remark: p.remark || '',
  }))

  const materials = (materialInfoState.materials || []).map((m) => ({
    rowKey: `物料-${m.id}`,
    itemType: '物料',
    itemId: m.id,
    code: m.code,
    name: m.name,
    specModel: m.specModel || '',
    categoryName: m.categoryName || '',
    categoryKey: m.categoryKey || '',
    material: m.material || '',
    unitPrice: m.unitPrice ?? '',
    standardSpec: m.standardSpec || '',
    standardCycleDays: m.production?.standardCycleDays ?? '',
    barcodeType: m.barcodeType || '',
    inventoryUnit: m.inventoryUnit || '',
    remark: m.remark || '',
  }))

  return [...products, ...materials]
}

export function filterWarehousePickableItems(list, filters = {}, categoryKey) {
  let rows = list

  if (categoryKey) {
    const keys = collectDescendantKeys(
      categoryKey.startsWith('cat-') ? materialCategoryTree : productCategoryTree,
      categoryKey,
    )
    if (categoryKey === 'root-material') {
      rows = rows.filter((r) => r.itemType === '物料')
    } else if (categoryKey === 'root-product') {
      rows = rows.filter((r) => r.itemType === '产品')
    } else {
      rows = rows.filter((r) => keys.has(r.categoryKey))
    }
  }

  if (filters.code) rows = rows.filter((r) => r.code?.includes(filters.code))
  if (filters.name) rows = rows.filter((r) => r.name?.includes(filters.name))
  if (filters.specModel) rows = rows.filter((r) => r.specModel?.includes(filters.specModel))

  return rows
}

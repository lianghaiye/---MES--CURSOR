import { isForbiddenProductOnlyProduce } from '@/utils/masterItemKind'

/** 物料类型（与表单下拉一致） */
export const MATERIAL_TYPE_OPTIONS = ['零部件', '原材料', '标准件', '毛胚', '半成品', '虚拟件']

/** 供应型态（与表单下拉一致） */
export const SUPPLY_FORM_OPTIONS = ['外协件', '外购件', '自制件', '组装', '其他']

/** ISG50 泵体/泵头总成：主数据为半成品 + 组装 */
const SEMI_ASSEMBLY_CODES = new Set(['010040001', '010070014'])
const SEMI_FINISHED_NAME_KEYWORDS = ['总成', '半成品', '泵体部件', '泵头部件']

const LEGACY_SUPPLY_MAP = {
  虚拟件: '其他',
  虚拟: '其他',
  组装件: '组装',
  半成品: '其他',
}

const LEGACY_TYPE_MAP = {
  成品: '半成品',
  毛胚件: '毛胚',
}

export function normalizeSupplyForm(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (SUPPLY_FORM_OPTIONS.includes(v)) return v
  return LEGACY_SUPPLY_MAP[v] || v
}

export function normalizeMaterialType(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (MATERIAL_TYPE_OPTIONS.includes(v)) return v
  return LEGACY_TYPE_MAP[v] || v
}

function inferMaterialType(record) {
  const code = String(record.code || '')
  const name = String(record.name || '')
  if (SEMI_ASSEMBLY_CODES.has(code)) return '半成品'
  if (record.materialType === '虚拟件') return '虚拟件'
  if (record.supplyForm === '虚拟件' || record.supplyForm === '虚拟') return '虚拟件'
  if (record.materialType === '半成品') return '半成品'
  if (SEMI_FINISHED_NAME_KEYWORDS.some((k) => name.includes(k))) return '半成品'
  return normalizeMaterialType(record.materialType) || record.materialType
}

function inferSupplyForm(record) {
  const type = inferMaterialType(record)
  if (type === '虚拟件') return '其他'
  if (SEMI_ASSEMBLY_CODES.has(String(record.code || ''))) return '组装'
  if (type === '半成品') {
    const sf = normalizeSupplyForm(record.supplyForm)
    return sf && sf !== '其他' ? sf : '自制件'
  }
  return normalizeSupplyForm(record.supplyForm) || record.supplyForm
}

/** 刷物料/产品行上的类型与供应型态枚举 */
export function migrateMaterialRecord(record) {
  if (!record || typeof record !== 'object') return record
  const materialType = inferMaterialType(record)
  const supplyForm = inferSupplyForm({ ...record, materialType })
  return {
    ...record,
    materialType,
    supplyForm,
  }
}

export function migrateMaterialList(list) {
  return (list || []).map((row) => migrateMaterialRecord(row))
}

export function migrateProductRecord(record) {
  if (!record || typeof record !== 'object') return record
  return {
    ...record,
    materialType: record.materialType
      ? normalizeMaterialType(record.materialType)
      : record.materialType,
    supplyForm: record.supplyForm ? normalizeSupplyForm(record.supplyForm) : record.supplyForm,
    productAttribute: normalizeProductAttribute(record.productAttribute),
  }
}

export function migrateProductList(list) {
  return (list || [])
    .filter((row) => !isForbiddenProductOnlyProduce(row))
    .map((row) => migrateProductRecord(row))
}

const LEGACY_PRODUCT_ATTR_MAP = {
  '标准-成品': '标准零部件',
  '标准-成品零部件': '标准零部件',
  '定制-成品零部件': '定制零部件',
  试制产品: '定制零部件',
}

export function normalizeProductAttribute(value) {
  const v = String(value || '').trim()
  if (!v) return '标准产品'
  if (LEGACY_PRODUCT_ATTR_MAP[v]) return LEGACY_PRODUCT_ATTR_MAP[v]
  return v
}

/** 纯函数：为产品物料补齐同 ID 物料行（不依赖 store） */
export function linkProductMaterialRows(products, materials, buildMaterialFromProduct) {
  const list = [...materials]
  const byId = new Map(list.map((m) => [m.id, m]))
  const byCode = new Map(list.map((m) => [m.code, m]))

  products.forEach((p) => {
    if (!p.isProductMaterial) return
    const patch = buildMaterialFromProduct(p)
    const hit = byId.get(p.id) || byCode.get(p.code)
    if (hit) {
      Object.assign(hit, patch, { id: p.id })
      byId.set(p.id, hit)
    } else {
      list.unshift(patch)
      byId.set(p.id, patch)
      byCode.set(p.code, patch)
    }
  })

  return list
}

import { resolveOutboundLocationNo } from '@/utils/outboundLineHelpers'
import { demoStockQty } from '@/utils/productionPlanWorkItem'

const PRODUCT_TYPE = {
  PRODUCT: '产品',
  MATERIAL: '物料',
}

function roundMoney(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

function roundQty(val) {
  return Math.round((Number(val) || 0) * 1000) / 1000
}

function buildMasterIndex(products = [], materials = [], spus = []) {
  const byCode = new Map()
  const spuById = new Map(spus.map((s) => [String(s.id), s]))

  products.forEach((p) => {
    if (!p.code) return
    const spu = p.spuId ? spuById.get(String(p.spuId)) : null
    byCode.set(p.code, {
      itemType: PRODUCT_TYPE.PRODUCT,
      materialType: p.materialType || '',
      name: p.name || '',
      specModel: p.specModel || '',
      material: p.material || '',
      drawingNo: p.drawingNo || '',
      weight: p.weight ?? null,
      unitPrice: p.unitPrice ?? null,
      unit: p.inventoryUnit || p.unit || '件',
      spuId: p.spuId || '',
      spuCode: spu?.code || '',
      isVariantSku: Boolean(p.isVariantSku || p.spuId),
    })
  })

  materials.forEach((m) => {
    if (!m.code || byCode.has(m.code)) return
    const spu = m.spuId ? spuById.get(String(m.spuId)) : null
    byCode.set(m.code, {
      itemType: PRODUCT_TYPE.MATERIAL,
      materialType: m.materialType || '',
      name: m.name || '',
      specModel: m.specModel || '',
      material: m.material || '',
      drawingNo: m.drawingNo || '',
      weight: m.weight ?? null,
      unitPrice: m.unitPrice ?? null,
      unit: m.inventoryUnit || m.stockUnit || m.unit || '件',
      spuId: m.spuId || '',
      spuCode: spu?.code || '',
      isVariantSku: Boolean(m.isVariantSku || m.spuId),
    })
  })

  return { byCode, spuById }
}

function resolveMaster(byCode, itemCode, itemName, itemType) {
  const master = byCode.get(itemCode)
  if (master) return master

  const fallbackType =
    itemType === '产品' || itemType === '成品'
      ? PRODUCT_TYPE.PRODUCT
      : itemType === '物料'
        ? PRODUCT_TYPE.MATERIAL
        : PRODUCT_TYPE.MATERIAL

  return {
    itemType: fallbackType,
    materialType: '',
    name: itemName || '',
    specModel: '',
    material: '',
    drawingNo: '',
    weight: null,
    unitPrice: null,
    unit: '件',
    spuId: '',
    spuCode: '',
    isVariantSku: false,
  }
}

/** 无库存记录时生成演示数据，便于页面展示 */
function buildDemoStockRecords(products = [], materials = [], warehouses = []) {
  const whList = warehouses.length ? warehouses : ['原材料仓', '半成品仓', '成品仓']
  const items = [
    ...products.slice(0, 8).map((p) => ({ ...p, _kind: PRODUCT_TYPE.PRODUCT })),
    ...materials.slice(0, 8).map((m) => ({ ...m, _kind: PRODUCT_TYPE.MATERIAL })),
  ]
  const rows = []
  items.forEach((item, index) => {
    const warehouse = whList[index % whList.length]
    rows.push({
      id: `demo-stk-${item.code}-${warehouse}`,
      key: `${warehouse}::${item.code}`,
      warehouse,
      itemCode: item.code,
      itemName: item.name,
      itemType: item._kind,
      materialType: item.materialType || '',
      unit: item.inventoryUnit || '件',
      qty: demoStockQty(20 + index * 3, index),
    })
  })
  return rows
}

function enrichStockRow(row, master) {
  const qty = roundQty(row.qty)
  const unitPrice =
    master.unitPrice != null && master.unitPrice !== '' ? Number(master.unitPrice) : null
  const totalAmount = unitPrice != null ? roundMoney(qty * unitPrice) : null
  const locationNo = resolveOutboundLocationNo(row.warehouse, row.itemCode)

  return {
    id: row.id || row.key,
    warehouse: row.warehouse || '',
    itemCode: row.itemCode || '',
    itemName: master.name || row.itemName || '',
    itemType: master.itemType,
    materialType: master.materialType || '',
    specModel: master.specModel,
    material: master.material,
    drawingNo: master.drawingNo,
    weight: master.weight,
    unit: row.unit || master.unit || '件',
    stockQty: qty,
    locationNo,
    unitPrice,
    totalAmount,
    spuCode: master.spuCode,
    isVariantSku: master.isVariantSku,
  }
}

/** 将库存记录展开为库存明细行 */
export function buildInventoryDetailLines({
  stockRecords = [],
  products = [],
  materials = [],
  spus = [],
  warehouses = [],
} = {}) {
  const { byCode } = buildMasterIndex(products, materials, spus)
  let records = stockRecords
  if (!records.length) {
    records = buildDemoStockRecords(products, materials, warehouses)
  }

  return records.map((row) => {
    const master = resolveMaster(byCode, row.itemCode, row.itemName, row.itemType)
    return enrichStockRow(row, master)
  })
}

function matchCodeKeyword(row, keyword) {
  const kw = String(keyword).trim().toLowerCase()
  if (!kw) return true

  const code = String(row.itemCode || '').toLowerCase()
  if (code.includes(kw)) return true

  const spuCode = String(row.spuCode || '').toLowerCase()
  if (spuCode.includes(kw)) return true

  return false
}

export function filterInventoryDetailLines(rows, filters = {}) {
  return rows.filter((row) => {
    if (filters.warehouse && row.warehouse !== filters.warehouse) return false

    if (filters.itemCode && !matchCodeKeyword(row, filters.itemCode)) return false

    if (filters.itemName && !String(row.itemName).includes(String(filters.itemName).trim())) {
      return false
    }

    if (filters.materialType && row.materialType !== filters.materialType) return false

    if (filters.specModel && !String(row.specModel).includes(String(filters.specModel).trim())) {
      return false
    }

    if (filters.material && !String(row.material).includes(String(filters.material).trim())) {
      return false
    }

    if (filters.drawingNo && !String(row.drawingNo).includes(String(filters.drawingNo).trim())) {
      return false
    }

    const qty = Number(row.stockQty) || 0
    if (filters.stockQtyMin != null && filters.stockQtyMin !== '') {
      if (qty < Number(filters.stockQtyMin)) return false
    }
    if (filters.stockQtyMax != null && filters.stockQtyMax !== '') {
      if (qty > Number(filters.stockQtyMax)) return false
    }

    return true
  })
}

export function formatInventoryQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

/** 数量 + 单位，如「20 件」 */
export function formatInventoryQtyWithUnit(val, unit) {
  const q = formatInventoryQty(val)
  if (q === '—') return '—'
  const u = String(unit || '').trim()
  return u ? `${q} ${u}` : q
}

export function formatInventoryMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatInventoryWeight(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export { MATERIAL_TYPE_OPTIONS as inventoryMaterialTypeOptions } from '@/utils/masterDataMigrate'

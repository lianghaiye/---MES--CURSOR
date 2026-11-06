/**
 * 齐套演示数据补齐：有 BOM 的计划挂物料 + 台账有库存，避免「点进去空 / 转入本单不出现」被误判为功能不可用。
 *
 * 约定：
 * - 优先保证 KIT-DEMO-*（多单占用）与已有 materials 的计划
 * - 空 BOM 工作项尝试从产品目录 BOM 补齐
 * - 仅为演示物料写入/抬高台账实物，不覆盖已有更大库存
 */
import { stockState } from '@/store/stockStore'
import { getProductBomById } from '@/store/productBomStore'
import { catalogBomIdForProduct, hydrateCatalogBom } from '@/mock/productBomSeed'
import { buildEbomSnapshotFromBom, resolveMaterialsFromEbomSnapshot } from '@/utils/ebomSnapshot'
import { KIT_MULTI_ALLOC } from '@/mock/kitMultiAllocDemoSeed'

const DEMO_WAREHOUSE = '原料仓'
/** 每个物料演示库存上限，避免一次灌爆 */
const MAX_CODES_TO_SEED = 40
const MIN_DEMO_STOCK = 8

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function stockKey(warehouse, itemCode) {
  return `${warehouse}::${itemCode}`
}

function ensureLedgerQty({ itemCode, itemName, unit, qty }) {
  const code = String(itemCode || '').trim()
  if (!code || qty <= 0) return
  const list = stockState.records || []
  const key = stockKey(DEMO_WAREHOUSE, code)
  let row = list.find(
    (r) => r.key === key || (r.warehouse === DEMO_WAREHOUSE && r.itemCode === code),
  )
  if (!row) {
    row = {
      id: `stk-kit-enrich-${code}`,
      key,
      warehouse: DEMO_WAREHOUSE,
      itemCode: code,
      itemName: itemName || code,
      itemType: '物料',
      unit: unit || '件',
      qty: 0,
    }
    list.push(row)
  }
  // 只抬高，不压低已有更大库存
  if (num(row.qty) < qty) {
    row.qty = qty
    if (itemName) row.itemName = itemName
    if (unit) row.unit = unit
  }
}

function cloneBomMaterials(bom, salesQty) {
  if (!bom) return []
  const snapshot = buildEbomSnapshotFromBom(bom, salesQty)
  const materials = resolveMaterialsFromEbomSnapshot(snapshot, salesQty)
  return JSON.parse(JSON.stringify(materials || []))
}

/** 空物料清单：尝试挂产品目录 BOM */
export function ensureWorkItemsAttachCatalogBom(plans = []) {
  ;(plans || []).forEach((plan) => {
    ;(plan.workItems || []).forEach((wi) => {
      const hasMats = Array.isArray(wi.materials) && wi.materials.length > 0
      if (hasMats) return
      const bomId = wi.bomId || catalogBomIdForProduct(wi.productId)
      if (!bomId) return
      const bomRaw = getProductBomById(bomId)
      const bom = bomRaw ? hydrateCatalogBom(bomRaw) : null
      if (!bom) return
      const qty = num(wi.planQty ?? wi.orderQty ?? wi.salesQty) || 1
      const materials = cloneBomMaterials(bom, qty)
      if (!materials.length) return
      wi.bomId = bomId
      wi.bomName = wi.bomName || bom.name || bom.bomName || ''
      wi.bomVersion = wi.bomVersion || bom.version || bom.bomVersion || ''
      wi.materials = materials
      wi.ebomSnapshot = {
        ...(wi.ebomSnapshot || {}),
        materials: JSON.parse(JSON.stringify(materials)),
      }
    })
  })
  return plans
}

function walkMaterialCodes(nodes, out) {
  ;(nodes || []).forEach((n) => {
    const code = String(n?.code || n?.itemCode || '').trim()
    if (code) {
      const demand = num(n.demandQty ?? n.planQty ?? n.unitUsage) || 1
      const prev = out.get(code) || { demand: 0, name: '', unit: '件' }
      out.set(code, {
        demand: prev.demand + demand,
        name: n.name || n.itemName || prev.name || code,
        unit: n.unit || n.inventoryUnit || prev.unit || '件',
      })
    }
    if (n?.children?.length) walkMaterialCodes(n.children, out)
  })
}

/**
 * 为「已有物料树」的计划补台账库存，保证占用明细可「转入本单」
 * 优先 KIT-SHARE / KIT-DEMO，其余有 BOM 物料按需求抬高到至少 MIN_DEMO_STOCK
 */
export function ensureKitSupplyDemoStock(plans = []) {
  // 多单占用锚点
  ensureLedgerQty({
    itemCode: KIT_MULTI_ALLOC.itemCode,
    itemName: KIT_MULTI_ALLOC.itemName,
    unit: KIT_MULTI_ALLOC.unit,
    qty: Math.max(KIT_MULTI_ALLOC.physicalQty, 12),
  })

  const byCode = new Map()
  ;(plans || []).forEach((plan) => {
    const isKitDemo = String(plan?.id || '').startsWith('pp-kit-multi')
    ;(plan.workItems || []).forEach((wi) => {
      walkMaterialCodes(wi.materials || wi.ebomSnapshot?.materials || [], byCode)
      // 演示计划物料行上也写 stockQty，列表口径一致
      if (isKitDemo) {
        const stamp = (nodes) => {
          ;(nodes || []).forEach((n) => {
            if (n?.code === KIT_MULTI_ALLOC.itemCode) {
              n.stockQty = Math.max(num(n.stockQty), KIT_MULTI_ALLOC.physicalQty)
              n.availableStock = Math.max(num(n.availableStock), KIT_MULTI_ALLOC.physicalQty)
            }
            if (n?.children?.length) stamp(n.children)
          })
        }
        stamp(wi.materials)
      }
    })
  })

  let seeded = 0
  for (const [code, meta] of byCode) {
    if (seeded >= MAX_CODES_TO_SEED) break
    const target = Math.max(MIN_DEMO_STOCK, Math.ceil(meta.demand * 0.8))
    ensureLedgerQty({
      itemCode: code,
      itemName: meta.name,
      unit: meta.unit,
      qty: Math.min(target, 80),
    })
    seeded += 1
  }

  return plans
}

/** 生产计划 normalize 末尾调用：BOM + 库存一起补齐 */
export function ensureKitSupplyDemoEnrichment(plans = []) {
  ensureWorkItemsAttachCatalogBom(plans)
  ensureKitSupplyDemoStock(plans)
  return plans
}

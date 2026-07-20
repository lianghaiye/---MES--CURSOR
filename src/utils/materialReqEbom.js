import dayjs from 'dayjs'
import { getProductBomById } from '@/store/productBomStore'
import { createInventorySpuLineDraft } from '@/utils/spuLineResolve'

function lineId() {
  return `mr-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function fromBomLineItems(bom, scheduleQty = 1) {
  if (!bom?.lineItems?.length) return []
  const qty = Number(scheduleQty) || 1
  return bom.lineItems.map((line, index) => {
    const unitQty = Number(line.unitQty) || 1
    const demandQty = unitQty * qty
    return {
      id: line.id || `bom-line-${index}`,
      itemCode: line.materialCode || line.itemCode || '',
      itemName: line.itemName || '',
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      unit: line.unit || '件',
      unitUsage: unitQty,
      suggestedQty: demandQty,
      shipQty: demandQty,
      lineSource: 'EBOM',
      itemId: line.itemId || '',
      itemType: '物料',
      shipWarehouse: '原料仓',
      warehouseStockQty: null,
    }
  })
}

function fromComponentLines(lines = [], scheduleQty = 1) {
  return lines.map((line) => {
    const unitQty = Number(line.unitQty) || 1
    const requiredQty = line.requiredQty ?? unitQty * scheduleQty
    return {
      id: line.id || lineId(),
      itemCode: line.itemCode || line.materialCode || '',
      itemName: line.itemName || '',
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      unit: line.unit || '件',
      unitUsage: unitQty,
      suggestedQty: Number(requiredQty) || 0,
      shipQty: Number(requiredQty) || 0,
      lineSource: 'EBOM',
      itemId: line.itemId || '',
      itemType: '物料',
      shipWarehouse: '原料仓',
      warehouseStockQty: null,
    }
  })
}

function flattenMaterialTree(materials = [], scheduleQty = 1, acc = []) {
  for (const mat of materials || []) {
    const unitUsage = Number(mat.unitUsage) || 1
    const demandQty = mat.demandQty ?? unitUsage * scheduleQty
    acc.push({
      id: mat.id || lineId(),
      itemCode: mat.code || mat.materialCode || '',
      itemName: mat.name || mat.itemName || '',
      specModel: mat.spec || mat.specModel || '',
      material: mat.material || '',
      drawingNo: mat.drawingNo || '',
      unit: mat.unit || '件',
      unitUsage,
      suggestedQty: Number(demandQty) || 0,
      shipQty: Number(demandQty) || 0,
      lineSource: 'EBOM',
      itemId: mat.itemId || '',
      itemType: '物料',
      shipWarehouse: '原料仓',
      warehouseStockQty: null,
    })
    if (mat.children?.length) flattenMaterialTree(mat.children, scheduleQty, acc)
  }
  return acc
}

/** 根据工单解析 EBOM 下级物料 */
export function resolveWorkOrderMaterialLines(workOrder) {
  if (!workOrder || workOrder.skipEbom) return []
  const scheduleQty = Number(workOrder.scheduleQty) || 1
  if (workOrder.ebomSnapshot?.materials?.length) {
    return flattenMaterialTree(workOrder.ebomSnapshot.materials, scheduleQty)
  }
  if (workOrder.componentLines?.length) {
    return fromComponentLines(workOrder.componentLines, scheduleQty)
  }
  const bom = getProductBomById(workOrder.bomId)
  if (bom) return fromBomLineItems(bom, scheduleQty)
  return []
}

export function createManualMaterialLine(item, qty = 1, warehouse = '原料仓') {
  return {
    id: lineId(),
    itemCode: item.code || item.itemCode || '',
    itemName: item.name || item.itemName || '',
    specModel: item.spec || item.specModel || '',
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    variantSummary: item.variantSummary || '',
    variantValues: item.variantValues ? { ...item.variantValues } : {},
    spuId: item.spuId || '',
    spuName: item.spuName || '',
    isSpuLine: Boolean(item.isSpuLine),
    unit: item.unit || '件',
    unitUsage: 1,
    suggestedQty: 0,
    shipQty: Number(qty) || 1,
    lineSource: '手工添加',
    itemId: item.id || item.itemId || '',
    itemType: item.itemType || '物料',
    shipWarehouse: warehouse,
    warehouseStockQty: null,
  }
}

/** 领料明细：产品族草稿行（待配置变体） */
export function createMaterialReqSpuLine(spuPayload, warehouse = '原料仓') {
  const draft = createInventorySpuLineDraft(spuPayload)
  return {
    id: lineId(),
    ...draft,
    unitUsage: 1,
    suggestedQty: 0,
    shipQty: 1,
    lineSource: '手工添加',
    itemType: '产品',
    shipWarehouse: warehouse,
    warehouseStockQty: null,
    sourceWorkOrders: [],
  }
}

export function mergeMaterialLines(lines = []) {
  const map = new Map()
  for (const line of lines) {
    const key = line.itemCode || line.itemName
    if (!key) continue
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...line })
      continue
    }
    existing.shipQty = Number(existing.shipQty || 0) + Number(line.shipQty || 0)
    if (line.lineSource === '手工添加') existing.lineSource = '手工添加'
  }
  return [...map.values()].filter((l) => Number(l.shipQty) > 0)
}

function mergeSourceWorkOrders(target = [], incoming = []) {
  const map = new Map()
  for (const source of [...target, ...incoming]) {
    if (!source?.workOrderId) continue
    const existing = map.get(source.workOrderId)
    if (!existing) {
      map.set(source.workOrderId, { ...source })
      continue
    }
    existing.qty = Number(existing.qty || 0) + Number(source.qty || 0)
  }
  return [...map.values()]
}

export function attachWorkOrderSourceToLines(workOrder, lines = []) {
  return lines.map((line) => ({
    ...line,
    sourceWorkOrders: [
      {
        workOrderId: workOrder.id,
        workOrderCode: workOrder.code,
        qty: Number(line.shipQty) || 0,
      },
    ],
  }))
}

export function mergeMaterialLinesWithSources(lines = []) {
  const map = new Map()
  for (const line of lines) {
    const key = line.itemCode || line.itemName
    if (!key) continue
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...line, sourceWorkOrders: [...(line.sourceWorkOrders || [])] })
      continue
    }
    existing.shipQty = Number(existing.shipQty || 0) + Number(line.shipQty || 0)
    existing.suggestedQty = Number(existing.suggestedQty || 0) + Number(line.suggestedQty || 0)
    existing.sourceWorkOrders = mergeSourceWorkOrders(
      existing.sourceWorkOrders,
      line.sourceWorkOrders,
    )
    if (line.lineSource === '手工添加') existing.lineSource = '手工添加'
  }
  return [...map.values()].filter((l) => Number(l.shipQty) > 0)
}

export function resolveBatchWorkOrderMaterialLines(workOrders = []) {
  const allLines = []
  const emptyWorkOrders = []
  for (const wo of workOrders) {
    const lines = resolveWorkOrderMaterialLines(wo)
    if (!lines.length) {
      emptyWorkOrders.push(wo)
      continue
    }
    allLines.push(...attachWorkOrderSourceToLines(wo, lines))
  }
  return {
    lines: mergeMaterialLinesWithSources(allLines),
    emptyWorkOrders,
  }
}

export function formatNow() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export function generateMaterialReqNo(existing = []) {
  const date = dayjs().format('YYYYMMDD')
  const prefix = `ML${date}`
  const sameDay = existing.filter((r) => r.reqNo?.startsWith(prefix))
  const seq = String(sameDay.length + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

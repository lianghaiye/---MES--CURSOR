import dayjs from 'dayjs'
import { getProductBomById } from '@/store/productBomStore'
import { createInventorySpuLineDraft } from '@/utils/spuLineResolve'
import { materialInfoState } from '@/store/materialInfoStore'
import { calcDemandStockQty, inferUomRelation } from '@/utils/variableLengthMaterial'
import {
  calcBlankAreaSquareMeters,
  toMillimeters,
  isPlateBlankSizeLine,
} from '@/utils/bomBlankSize'
import { isBackflushMaterial, isRequisitionEnabledMaterial } from '@/utils/backflushMaterial'

function lineId() {
  return `mr-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function lookupMaterial(code) {
  if (!code) return null
  return materialInfoState.materials.find((m) => m.code === code) || null
}

function resolveBlankLengthMeters(bomLine, base) {
  const fromLine = Number(bomLine?.blankLength)
  if (Number.isFinite(fromLine) && fromLine > 0) return fromLine
  const fromBase = Number(base?.blankLength)
  if (Number.isFinite(fromBase) && fromBase > 0) return fromBase
  const size = bomLine?.blankSize
  if (!size || size.length == null) return 0
  const unit = size.units?.length || 'mm'
  const mm = toMillimeters(size.length, unit)
  return mm != null ? mm / 1000 : 0
}

function resolveBlankArea(bomLine, base) {
  const fromLine = Number(bomLine?.blankArea)
  if (Number.isFinite(fromLine) && fromLine > 0) return fromLine
  const fromBase = Number(base?.blankArea)
  if (Number.isFinite(fromBase) && fromBase > 0) return fromBase
  const fromSize = calcBlankAreaSquareMeters(bomLine?.blankSize || base?.blankSize)
  return fromSize != null && fromSize > 0 ? fromSize : 0
}

function enrichVariableLengthFields(base, bomLine, scheduleQty = 1) {
  const mat = lookupMaterial(base.itemCode)
  const isVL = Boolean(bomLine?.isVariableLength || mat?.isVariableLength)
  if (!isVL) return base

  const stockUnit = mat?.stockUnit || mat?.inventoryUnit || bomLine?.unit || base.unit || '米'
  const uomRelation = bomLine?.uomRelation || mat?.uomRelation || inferUomRelation(stockUnit, '')
  // 优先 BOM 行手动下料方式；未指定时再按单位关系推断
  const areaBased = isPlateBlankSizeLine({
    ...bomLine,
    isVariableLength: true,
    uomRelation,
    stockUnit,
    inventoryUnit: stockUnit,
    unit: stockUnit,
  })
  const blankLength = areaBased ? null : resolveBlankLengthMeters(bomLine, base)
  const blankArea = areaBased ? resolveBlankArea(bomLine, base) : null
  const blankLossRate = Number(bomLine?.blankLossRate) || 0
  const unitQty = Number(base.unitUsage) || 1
  const demandQty = calcDemandStockQty({
    blankLength,
    blankArea,
    areaBased,
    unitQty,
    scheduleQty,
    blankLossRate,
  })
  return {
    ...base,
    isVariableLength: true,
    uomRelation,
    blankSizeMode: bomLine?.blankSizeMode || '',
    blankLength,
    blankArea,
    blankSize: bomLine?.blankSize || base.blankSize || null,
    blankSizeText: bomLine?.blankSizeText || base.blankSizeText || '',
    blankLossRate,
    demandMeters: demandQty,
    unit: stockUnit,
    suggestedQty: demandQty,
    shipQty: demandQty,
    pickedBatchId: null,
    pickedBatchNo: '',
    pickedLength: null,
  }
}

function fromBomLineItems(bom, scheduleQty = 1) {
  if (!bom?.lineItems?.length) return []
  const qty = Number(scheduleQty) || 1
  return bom.lineItems.map((line, index) => {
    const unitQty = Number(line.unitQty) || 1
    const demandQty = unitQty * qty
    const base = {
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
      blankLength: line.blankLength,
      blankArea: line.blankArea ?? null,
      blankSize: line.blankSize || null,
      blankSizeText: line.blankSizeText || '',
      blankSizeMode: line.blankSizeMode || '',
      blankLossRate: line.blankLossRate,
      isVariableLength: line.isVariableLength,
      uomRelation: line.uomRelation || '',
    }
    return enrichVariableLengthFields(base, line, qty)
  })
}

function blankFieldsFromSource(src = {}) {
  return {
    blankLength: src.blankLength ?? null,
    blankArea: src.blankArea ?? null,
    blankSize: src.blankSize || null,
    blankSizeText: src.blankSizeText || '',
    blankSizeMode: src.blankSizeMode || '',
    blankLossRate: src.blankLossRate ?? null,
    isVariableLength: Boolean(src.isVariableLength),
    uomRelation: src.uomRelation || '',
  }
}

function fromComponentLines(lines = [], scheduleQty = 1) {
  return lines.map((line) => {
    const unitQty = Number(line.unitQty) || 1
    const requiredQty = line.requiredQty ?? unitQty * scheduleQty
    const base = {
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
      ...blankFieldsFromSource(line),
    }
    return enrichVariableLengthFields(base, line, scheduleQty)
  })
}

function flattenMaterialTree(materials = [], scheduleQty = 1, acc = []) {
  for (const mat of materials || []) {
    const unitUsage = Number(mat.unitUsage) || 1
    const demandQty = mat.demandQty ?? unitUsage * scheduleQty
    const base = {
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
      ...blankFieldsFromSource(mat),
    }
    acc.push(enrichVariableLengthFields(base, mat, scheduleQty))
    if (mat.children?.length) flattenMaterialTree(mat.children, scheduleQty, acc)
  }
  return acc
}

/** 根据工单解析全部 BOM 下级物料（含倒冲件） */
export function resolveWorkOrderAllMaterialLines(workOrder) {
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

/** 领料用：排除领料属性关闭的倒冲件 */
export function resolveWorkOrderMaterialLines(workOrder) {
  return resolveWorkOrderAllMaterialLines(workOrder).filter((line) => {
    const mat = lookupMaterial(line.itemCode || line.materialCode)
    return isRequisitionEnabledMaterial(mat) && !isBackflushMaterial(line)
  })
}

/** 倒冲用：仅领料属性关闭的物料 */
export function resolveWorkOrderBackflushLines(workOrder) {
  return resolveWorkOrderAllMaterialLines(workOrder).filter((line) => {
    const mat = lookupMaterial(line.itemCode || line.materialCode)
    return isBackflushMaterial(mat) || isBackflushMaterial(line)
  })
}

export function createManualMaterialLine(item, qty = 1, warehouse = '原料仓') {
  const isVL = Boolean(item.isVariableLength)
  const base = {
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
    unit: isVL
      ? item.stockUnit || item.inventoryUnit || '米'
      : item.unit || item.inventoryUnit || '件',
    unitUsage: 1,
    suggestedQty: 0,
    shipQty: Number(qty) || 1,
    lineSource: '手工添加',
    itemId: item.id || item.itemId || '',
    itemType: item.itemType || '物料',
    shipWarehouse: warehouse,
    warehouseStockQty: null,
    isVariableLength: isVL,
    blankLength: isVL ? Number(qty) || null : null,
    blankArea: null,
    blankSize: null,
    blankSizeText: '',
    blankSizeMode: '',
    demandMeters: isVL ? Number(qty) || 0 : null,
    pickedBatchId: null,
    pickedBatchNo: '',
    pickedLength: null,
  }
  if (isVL) {
    base.suggestedQty = base.demandMeters
    base.shipQty = base.demandMeters
  }
  return base
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
    if (existing.isVariableLength || line.isVariableLength) {
      existing.isVariableLength = true
      existing.demandMeters =
        Number(existing.demandMeters || 0) + Number(line.demandMeters || line.shipQty || 0)
      existing.shipQty = existing.demandMeters
      existing.suggestedQty = existing.demandMeters
      existing.unit = existing.unit || line.unit || '米'
      // 合并后需重新拣批；下料尺寸保留首条（说明用，扣账看 shipQty）
      existing.blankSize = existing.blankSize || line.blankSize || null
      existing.blankSizeText = existing.blankSizeText || line.blankSizeText || ''
      existing.blankSizeMode = existing.blankSizeMode || line.blankSizeMode || ''
      existing.blankLength = existing.blankLength ?? line.blankLength ?? null
      existing.blankArea = existing.blankArea ?? line.blankArea ?? null
      existing.pickedBatchId = null
      existing.pickedBatchNo = ''
      existing.pickedLength = null
    }
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
    if (existing.isVariableLength || line.isVariableLength) {
      existing.isVariableLength = true
      existing.demandMeters =
        Number(existing.demandMeters || 0) + Number(line.demandMeters || line.shipQty || 0)
      existing.shipQty = existing.demandMeters
      existing.suggestedQty = existing.demandMeters
      existing.unit = existing.unit || line.unit || '米'
      existing.blankSize = existing.blankSize || line.blankSize || null
      existing.blankSizeText = existing.blankSizeText || line.blankSizeText || ''
      existing.blankSizeMode = existing.blankSizeMode || line.blankSizeMode || ''
      existing.blankLength = existing.blankLength ?? line.blankLength ?? null
      existing.blankArea = existing.blankArea ?? line.blankArea ?? null
      existing.pickedBatchId = null
      existing.pickedBatchNo = ''
      existing.pickedLength = null
    }
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

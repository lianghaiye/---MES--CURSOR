/**
 * 工单完工库存扣减：按 BOM 单位用量 × 完工数量生成扣减明细
 * - 「不领料」模式：不建工单完工扣减单（由调用方跳过）
 * - 「完工后预扣+确认」：默认扣发料仓；领料件+倒冲件都实扣；不可自动确认
 * - 「自主领料+完工后预扣+确认」：默认扣线边仓；领料件+倒冲件都按 BOM×完工数实扣（领料出库只是调入线边，不等于消耗）
 */

import { materialInfoState } from '@/store/materialInfoStore'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { warehouseState } from '@/store/warehouseStore'
import { resolveWorkOrderAllMaterialLines } from '@/utils/materialReqEbom'
import { isBackflushMaterial } from '@/utils/backflushMaterial'
import { getStockQty } from '@/store/stockStore'
import {
  getInventoryDeductMode,
  INVENTORY_DEDUCT_MODES,
  isInventoryDeductByActual,
} from '@/store/functionParamStore'

function lookupMaterial(code) {
  if (!code) return null
  return materialInfoState.materials.find((m) => m.code === code) || null
}

/**
 * 默认完工扣减仓（单据上仍可改）：
 * - 自主领料模式 → 线边仓 / 工单收料仓
 * - 无领料完工直扣 → 发料仓 / 工单仓库
 */
export function resolveBackflushWarehouse(workOrder = {}) {
  void warehouseState.warehouses
  if (isInventoryDeductByActual()) {
    const preferred = workOrder.receiveWarehouse || workOrder.lineWarehouse || ''
    if (preferred) {
      return { warehouseName: preferred, warehouseCode: resolveWarehouseCode(preferred) }
    }
    const lineSide = (warehouseState.warehouses || []).find(
      (w) => w.enabled !== false && w.categoryName === '线边仓',
    )
    if (lineSide) {
      return { warehouseName: lineSide.name, warehouseCode: lineSide.code || '' }
    }
    const opts = getWarehouseSelectOptions()
    const first = opts[0]
    return {
      warehouseName: first?.value || '库线边仓',
      warehouseCode: resolveWarehouseCode(first?.value || ''),
    }
  }

  // 完工直扣发料仓
  const shipPreferred =
    workOrder.warehouse || workOrder.issueWarehouse || workOrder.shipWarehouse || ''
  if (shipPreferred) {
    return { warehouseName: shipPreferred, warehouseCode: resolveWarehouseCode(shipPreferred) }
  }
  const rawWh = (warehouseState.warehouses || []).find(
    (w) => w.enabled !== false && (w.categoryName === '原料仓' || w.categoryName === '发料仓'),
  )
  if (rawWh) {
    return { warehouseName: rawWh.name, warehouseCode: rawWh.code || '' }
  }
  const opts = getWarehouseSelectOptions()
  const first = opts[0]
  return {
    warehouseName: first?.value || '原料仓',
    warehouseCode: resolveWarehouseCode(first?.value || ''),
  }
}

function resolveWarehouseCode(name) {
  if (!name) return ''
  const hit = (warehouseState.warehouses || []).find((w) => w.name === name)
  return hit?.code || ''
}

export function resolveLineIssueMode(line, material) {
  if (line?.isBackflush || line?.issueMode === '倒冲') return '倒冲'
  if (isBackflushMaterial(material) || isBackflushMaterial(line)) return '倒冲'
  return '领料'
}

/** 该行是否在完工扣减单中实际扣库存（两档完工模式均按 BOM×完工数实扣） */
export function isCompletionDeductLineDeductible(_line, deductMode = getInventoryDeductMode()) {
  return (
    deductMode === INVENTORY_DEDUCT_MODES.POST_COMPLETE_BY_REPORT ||
    deductMode === INVENTORY_DEDUCT_MODES.SELF_ISSUE_BY_ACTUAL
  )
}

/**
 * 从工单 BOM 收集领料件 + 倒冲件及应扣数量
 */
export function collectWorkOrderCompletionDeductLines(workOrder, finishedQty) {
  const qty =
    Number(finishedQty) || Number(workOrder?.scheduleQty) || Number(workOrder?.planQty) || 0
  if (!(qty > 0) || !workOrder) return []

  const deductMode = getInventoryDeductMode()
  // BOM 行按单位用量展开；完工数量 = 单位用量 × 完工数
  const bomLines = resolveWorkOrderAllMaterialLines({
    ...workOrder,
    scheduleQty: 1,
  })

  const lines = []
  const { warehouseName } = resolveBackflushWarehouse(workOrder)
  for (const bl of bomLines) {
    const code = bl.itemCode || bl.materialCode || ''
    if (!code) continue
    const mat = lookupMaterial(code)
    const issueMode = resolveLineIssueMode(bl, mat)
    const isBackflush = issueMode === '倒冲'
    const unitUsage = Number(bl.unitUsage) || Number(bl.unitQty) || Number(bl.shipQty) || 1
    const planQty = Math.round(unitUsage * qty * 1000) / 1000
    if (!(planQty > 0)) continue
    const deductible = isCompletionDeductLineDeductible({ issueMode, isBackflush }, deductMode)
    const stock = getStockQty(warehouseName, code)
    lines.push({
      id: `wo-deduct-line-${code}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      materialCode: code,
      materialName: bl.itemName || mat?.name || code,
      specModel: bl.specModel || mat?.specModel || '',
      material: bl.material || mat?.material || '',
      drawingNo: bl.drawingNo || mat?.drawingNo || '',
      blankSizeText: bl.blankSizeText || '',
      blankSize: bl.blankSize || null,
      blankSizeMode: bl.blankSizeMode || '',
      planQty,
      actualQty: 0,
      status: '待确认',
      failReason: '',
      warehouseStockQty: stock,
      issueMode,
      isBackflush,
      deductible,
      unit: bl.unit || mat?.inventoryUnit || mat?.stockUnit || '个',
      unitUsage,
    })
  }
  return lines
}

/** @deprecated 兼容旧调用：仅倒冲行 */
export function collectBackflushDeductLines(workOrder, finishedQty) {
  return collectWorkOrderCompletionDeductLines(workOrder, finishedQty).filter((l) => l.isBackflush)
}

/**
 * 构建工单完工扣减单草稿（领料+倒冲同单，未写入 store）
 */
export function buildWorkOrderCompletionDeductDraft(workOrder, finishedQty) {
  const reportQty =
    Number(finishedQty) || Number(workOrder?.scheduleQty) || Number(workOrder?.planQty) || 0
  const lines = collectWorkOrderCompletionDeductLines(workOrder, reportQty)
  if (!lines.length) {
    return { ok: false, message: '该工单 BOM 无下级物料', lines: [] }
  }
  const wh = resolveBackflushWarehouse(workOrder)
  const backflushCount = lines.filter((l) => l.isBackflush).length
  const issueCount = lines.length - backflushCount
  return {
    ok: true,
    draft: {
      workOrderNo: workOrder.code || workOrder.workOrderNo || '',
      workOrderId: workOrder.id || '',
      productName: workOrder.productName || '',
      productSpec: workOrder.specModel || workOrder.productSpec || '',
      material: workOrder.material || '',
      drawingNo: workOrder.drawingNo || '',
      reportQty,
      warehouseName: wh.warehouseName,
      warehouseCode: wh.warehouseCode,
      // 统一为工单来源，不再单独出「倒冲」单据
      deductSource: 'work_order',
      requisitionMode: 'work-order',
      lines,
      remark: `工单完工扣减（完工数量 ${reportQty}；按 BOM×完工数，领料 ${issueCount} / 倒冲 ${backflushCount}）`,
    },
  }
}

/** @deprecated 兼容旧调用 */
export function buildBackflushDeductDraft(workOrder, finishedQty) {
  return buildWorkOrderCompletionDeductDraft(workOrder, finishedQty)
}

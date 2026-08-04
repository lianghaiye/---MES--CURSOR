/**
 * 工单完工库存扣减：按 BOM 同时带出领料件与倒冲件（一张工单维度单据）
 * - 领料申请仍排除倒冲件
 * - 完工扣减单按发料方式区分；倒冲件始终参与扣减；领料件仅在「按报工数量扣」模式下参与扣减
 */

import { materialInfoState } from '@/store/materialInfoStore'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { warehouseState } from '@/store/warehouseStore'
import { resolveWorkOrderAllMaterialLines } from '@/utils/materialReqEbom'
import { isBackflushMaterial } from '@/utils/backflushMaterial'
import { getStockQty } from '@/store/stockStore'
import { getInventoryDeductMode, INVENTORY_DEDUCT_MODES } from '@/store/functionParamStore'

function lookupMaterial(code) {
  if (!code) return null
  return materialInfoState.materials.find((m) => m.code === code) || null
}

/** 默认完工扣减仓：优先线边仓 / 工单收料仓 */
export function resolveBackflushWarehouse(workOrder = {}) {
  const preferred = workOrder.receiveWarehouse || workOrder.lineWarehouse || ''
  if (preferred) {
    return { warehouseName: preferred, warehouseCode: resolveWarehouseCode(preferred) }
  }
  void warehouseState.warehouses
  const lineSide = (warehouseState.warehouses || []).find(
    (w) => w.enabled !== false && w.categoryName === '线边仓',
  )
  if (lineSide) {
    return { warehouseName: lineSide.name, warehouseCode: lineSide.code || '' }
  }
  const opts = getWarehouseSelectOptions()
  const first = opts[0]
  return {
    warehouseName: workOrder.warehouse || first?.value || '库线边仓',
    warehouseCode: resolveWarehouseCode(workOrder.warehouse || first?.value || ''),
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

/** 该行是否在完工扣减单中实际扣库存 */
export function isCompletionDeductLineDeductible(line, deductMode = getInventoryDeductMode()) {
  const mode = line?.issueMode || (line?.isBackflush ? '倒冲' : '领料')
  if (mode === '倒冲') return true
  // 领料件：仅「完工后按报工数量扣」时在本单扣减；自主领料已通过领料出库扣过
  return deductMode === INVENTORY_DEDUCT_MODES.POST_COMPLETE_BY_REPORT
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
      remark: `工单完工扣减（报工/完工数量 ${reportQty}；领料 ${issueCount} / 倒冲 ${backflushCount}）`,
    },
  }
}

/** @deprecated 兼容旧调用 */
export function buildBackflushDeductDraft(workOrder, finishedQty) {
  return buildWorkOrderCompletionDeductDraft(workOrder, finishedQty)
}

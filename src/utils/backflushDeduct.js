/**
 * 工单完工库存扣减：按 BOM 单位用量 × 完工数量生成扣减明细
 * - 「不领料」模式：不建工单完工扣减单（由调用方跳过）
 * - 「完工后预扣+确认」：默认扣发料仓；须人工确认
 * - 「自主领料+完工后预扣+确认」：默认扣线边仓；可自动确认
 * - 物料主数据勾选「需要下料结算」且功能参数为「需下料结算」：本单仅展示为「下料结算扣减」，线边实扣在下料结算完成
 * - 功能参数「无需下料结算」或未勾选需要下料结算：仍在本单按 BOM×完工数实扣
 */

import { materialInfoState } from '@/store/materialInfoStore'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { warehouseState } from '@/store/warehouseStore'
import { mobileMaterialReqState } from '@/store/mobileMaterialReqStore'
import { resolveWorkOrderAllMaterialLines } from '@/utils/materialReqEbom'
import { isBackflushMaterial } from '@/utils/backflushMaterial'
import { resolveNeedsBlankingSettle } from '@/utils/blankingSettleMaterial'
import { getStockQty } from '@/store/stockStore'
import {
  getInventoryDeductMode,
  INVENTORY_DEDUCT_MODES,
  isInventoryDeductByActual,
  isWholeWithRemnantIssue,
} from '@/store/functionParamStore'
import { MATERIAL_DEDUCT_STATUS } from '@/mock/materialRequisitionRecords'

function lookupMaterial(code) {
  if (!code) return null
  return materialInfoState.materials.find((m) => m.code === code) || null
}

/**
 * 默认完工扣减仓（单据上仍可改）：
 * - 自主领料：优先领料单「领入仓库」→ 工单工作中心关联仓 → 工单收料/线边仓
 * - 无领料完工直扣 → 发料仓 / 工单仓库
 */
export function resolveBackflushWarehouse(workOrder = {}) {
  void warehouseState.warehouses
  if (isInventoryDeductByActual()) {
    const fromReq = resolveReceiveWarehouseFromMaterialReq(workOrder)
    if (fromReq) {
      return { warehouseName: fromReq, warehouseCode: resolveWarehouseCode(fromReq) }
    }
    const fromCenter = resolveWarehouseByWorkCenter(workOrder.workCenter)
    if (fromCenter) {
      return { warehouseName: fromCenter.name, warehouseCode: fromCenter.code || '' }
    }
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

/** 从工单关联领料单取领入仓库（取最近一条有仓的） */
export function resolveReceiveWarehouseFromMaterialReq(workOrder = {}) {
  const woNo = String(workOrder.code || workOrder.workOrderNo || '').trim()
  const woId = String(workOrder.id || '').trim()
  if (!woNo && !woId) return ''
  void mobileMaterialReqState.items
  const items = mobileMaterialReqState.items || []
  const hits = items.filter((r) => {
    if (!r?.receiveWarehouse) return false
    if (woId && r.workOrderId === woId) return true
    if (woNo && (r.workOrderCode === woNo || r.sourceOrderNo === woNo)) return true
    if ((r.workOrders || []).some((w) => w.id === woId || w.code === woNo)) return true
    return (r.lines || []).some(
      (l) =>
        l.workOrderNo === woNo ||
        l.workOrderCode === woNo ||
        (woId && (l.workOrderId === woId || l.sourceWorkOrderId === woId)),
    )
  })
  return hits[0]?.receiveWarehouse || ''
}

export function resolveWarehouseByWorkCenter(workCenter) {
  const center = String(workCenter || '').trim()
  if (!center) return null
  return (
    (warehouseState.warehouses || []).find(
      (w) => w.enabled !== false && String(w.workCenter || '').trim() === center,
    ) || null
  )
}

function resolveWarehouseCode(name) {
  if (!name) return ''
  const hit = (warehouseState.warehouses || []).find((w) => w.name === name)
  return hit?.code || ''
}

/** EBOM 展示：名称 + 版本 */
export function formatDeductEbomLabel(source = {}) {
  const name =
    source.ebomName || source.bomName || source.ebomSnapshot?.bomName || source.productBomName || ''
  const ver =
    source.ebomVersion ||
    source.bomVersion ||
    source.ebomSnapshot?.bomVersion ||
    source.version ||
    ''
  const n = String(name || '').trim()
  const v = String(ver || '').trim()
  if (n && v) return `${n} ${v}`
  return n || v || ''
}

export function resolveLineIssueMode(line, material) {
  if (line?.isBackflush || line?.issueMode === '倒冲') return '倒冲'
  if (isBackflushMaterial(material) || isBackflushMaterial(line)) return '倒冲'
  return '领料'
}

/** 该行是否走下料结算消耗（库存扣减单仅展示、不实扣） */
export function shouldCompletionDeductViaCutSettle(materialOrLine) {
  if (!resolveNeedsBlankingSettle(materialOrLine)) return false
  // 功能参数「需下料结算」才走下料结算扣线边；「无需下料结算」仍在本单扣
  return isWholeWithRemnantIssue()
}

/** 该行是否在完工扣减单中实际扣库存 */
export function isCompletionDeductLineDeductible(line, deductMode = getInventoryDeductMode()) {
  if (line?.deductChannel === 'cut_settle' || line?.viaCutSettle) return false
  if (shouldCompletionDeductViaCutSettle(line)) return false
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
    const viaCutSettle =
      shouldCompletionDeductViaCutSettle(mat) || shouldCompletionDeductViaCutSettle(bl)
    const deductible =
      !viaCutSettle &&
      isCompletionDeductLineDeductible({ issueMode, isBackflush, viaCutSettle }, deductMode)
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
      status: viaCutSettle ? MATERIAL_DEDUCT_STATUS.CUT_SETTLE : MATERIAL_DEDUCT_STATUS.PENDING,
      failReason: viaCutSettle ? '线边消耗在下料结算完成' : '',
      warehouseStockQty: stock,
      issueMode,
      isBackflush,
      viaCutSettle,
      deductChannel: viaCutSettle ? 'cut_settle' : 'completion',
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
  const cutSettleCount = lines.filter((l) => l.viaCutSettle).length
  const ebomName =
    workOrder.ebomSnapshot?.bomName || workOrder.bomName || workOrder.productBomName || ''
  const ebomVersion =
    workOrder.ebomSnapshot?.bomVersion || workOrder.bomVersion || workOrder.version || ''
  return {
    ok: true,
    draft: {
      workOrderNo: workOrder.code || workOrder.workOrderNo || '',
      workOrderId: workOrder.id || '',
      productName: workOrder.productName || '',
      productCode: workOrder.materialCode || workOrder.productCode || workOrder.itemCode || '',
      productSpec: workOrder.specModel || workOrder.productSpec || '',
      material: workOrder.material || '',
      drawingNo: workOrder.drawingNo || '',
      variantSummary: workOrder.variantSummary || '',
      ebomName,
      ebomVersion,
      reportQty,
      warehouseName: wh.warehouseName,
      warehouseCode: wh.warehouseCode,
      // 统一为工单来源，不再单独出「倒冲」单据
      deductSource: 'work_order',
      requisitionMode: 'work-order',
      lines,
      remark: `工单完工扣减（完工数量 ${reportQty}；领料 ${issueCount} / 倒冲 ${backflushCount}；下料结算扣减 ${cutSettleCount}）`,
    },
  }
}

/** @deprecated 兼容旧调用 */
export function buildBackflushDeductDraft(workOrder, finishedQty) {
  return buildWorkOrderCompletionDeductDraft(workOrder, finishedQty)
}

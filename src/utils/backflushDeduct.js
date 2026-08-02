/**
 * 倒冲扣减：完工时按 BOM 中「领料属性=关」物料生成库存扣减明细
 */

import { materialInfoState } from '@/store/materialInfoStore'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { warehouseState } from '@/store/warehouseStore'
import { resolveWorkOrderBackflushLines } from '@/utils/materialReqEbom'
import { getStockQty } from '@/store/stockStore'

function lookupMaterial(code) {
  if (!code) return null
  return materialInfoState.materials.find((m) => m.code === code) || null
}

/** 默认倒冲仓：优先线边仓 */
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

/**
 * 从工单 BOM 收集倒冲件及应扣数量
 * @returns {Array}
 */
export function collectBackflushDeductLines(workOrder, finishedQty) {
  const qty =
    Number(finishedQty) || Number(workOrder?.scheduleQty) || Number(workOrder?.planQty) || 0
  if (!(qty > 0) || !workOrder) return []

  // BOM 行按工单计划数量展开；倒冲按完工数量 = 单位用量 × 完工数
  const bomLines = resolveWorkOrderBackflushLines({
    ...workOrder,
    scheduleQty: 1,
  })

  const lines = []
  const { warehouseName } = resolveBackflushWarehouse(workOrder)
  for (const bl of bomLines) {
    const code = bl.itemCode || bl.materialCode || ''
    const mat = lookupMaterial(code)
    const unitUsage = Number(bl.unitUsage) || Number(bl.unitQty) || Number(bl.shipQty) || 1
    const planQty = Math.round(unitUsage * qty * 1000) / 1000
    if (!(planQty > 0)) continue
    const stock = getStockQty(warehouseName, code)
    lines.push({
      id: `bf-line-${code}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
      isBackflush: true,
      unit: bl.unit || mat?.inventoryUnit || mat?.stockUnit || '个',
      unitUsage,
    })
  }
  return lines
}

/**
 * 构建倒冲扣减单草稿（未写入 store）
 */
export function buildBackflushDeductDraft(workOrder, finishedQty) {
  const reportQty =
    Number(finishedQty) || Number(workOrder?.scheduleQty) || Number(workOrder?.planQty) || 0
  const lines = collectBackflushDeductLines(workOrder, reportQty)
  if (!lines.length) {
    return { ok: false, message: '该工单无倒冲件（领料属性关闭的物料）', lines: [] }
  }
  const wh = resolveBackflushWarehouse(workOrder)
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
      deductSource: 'backflush',
      requisitionMode: 'work-order',
      lines,
      remark: `工单完工倒冲（报工/完工数量 ${reportQty}）`,
    },
  }
}

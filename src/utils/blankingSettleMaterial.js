/** 物料「需要下料结算」+ 工单下料工序展示 / 结算准入 */

import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { getProcessById, getProcessByName } from '@/store/processConfigStore'

function lookupByCode(code) {
  const c = String(code || '').trim()
  if (!c) return null
  const mat = materialInfoState.materials.find((m) => m.code === c)
  if (mat) return mat
  return productInfoState.products.find((p) => p.code === c) || null
}

/** 工序是否为下料（避免与 workOrderBlanking 循环依赖） */
function processIsBlanking(processLike) {
  if (!processLike) return false
  if (processLike.isBlanking === true) return true
  if (processLike.isBlanking === false) return false
  const master =
    (processLike.processId && getProcessById(processLike.processId)) ||
    (processLike.name && getProcessByName(processLike.name)) ||
    null
  return Boolean(master?.isBlanking)
}

/** 主数据是否勾选「需要下料结算」 */
export function masterNeedsBlankingSettle(record) {
  if (!record) return false
  return Boolean(record.needsBlankingSettle)
}

/**
 * 按物料编码 / 出库行 / BOM 行解析是否需下料结算
 * 行上显式字段优先，否则查主数据
 */
export function resolveNeedsBlankingSettle(codeOrLine) {
  if (codeOrLine == null) return false
  if (typeof codeOrLine === 'string') {
    return masterNeedsBlankingSettle(lookupByCode(codeOrLine))
  }
  if (codeOrLine.needsBlankingSettle === true) return true
  if (codeOrLine.needsBlankingSettle === false) return false
  const code =
    codeOrLine.itemCode || codeOrLine.materialCode || codeOrLine.code || codeOrLine.materialId || ''
  return masterNeedsBlankingSettle(lookupByCode(code))
}

/** 从工单组件明细收集需下料结算的物料（去重） */
export function collectBlankingMaterialsFromWorkOrder(workOrder) {
  const lines = Array.isArray(workOrder?.componentLines) ? workOrder.componentLines : []
  const seen = new Set()
  const list = []
  lines.forEach((line, index) => {
    const code = String(line?.itemCode || line?.materialCode || '').trim()
    if (!code || seen.has(code)) return
    if (!resolveNeedsBlankingSettle(line)) return
    seen.add(code)
    list.push({
      id: `blank-${code}-${index}`,
      materialCode: code,
      materialName: line.itemName || line.materialName || lookupByCode(code)?.name || code,
      unit: line.unit || lookupByCode(code)?.inventoryUnit || '',
      unitQty: line.unitQty != null ? Number(line.unitQty) : null,
      requiredQty: line.requiredQty != null ? Number(line.requiredQty) : null,
    })
  })
  return list
}

/**
 * 将需下料物料挂到工单「下料工序」上（只读名单，供下发页展示）
 * @returns {boolean} 是否写入过
 */
export function syncWorkOrderBlankingMaterials(workOrder) {
  if (!workOrder?.processes?.length) return false
  const mats = collectBlankingMaterialsFromWorkOrder(workOrder)
  let touched = false
  workOrder.processes.forEach((p) => {
    if (!processIsBlanking(p)) return
    p.blankingMaterials = mats.map((m, i) => ({
      ...m,
      id: m.id || `blank-${p.id || 'p'}-${i}`,
    }))
    touched = true
  })
  return touched
}

export function formatBlankingMaterialsSummary(process) {
  if (!processIsBlanking(process)) return '—'
  const items = process?.blankingMaterials || []
  if (!items.length) return '（本工单 BOM 无「需要下料结算」物料）'
  return items
    .map((m) => {
      const name = m.materialName || m.materialCode || '物料'
      const code = m.materialCode && m.materialName ? `(${m.materialCode})` : ''
      if (m.requiredQty != null && m.requiredQty !== '') {
        return `${name}${code}×${m.requiredQty}${m.unit ? m.unit : ''}`
      }
      return `${name}${code}`
    })
    .join('；')
}

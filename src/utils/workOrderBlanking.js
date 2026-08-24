/** 工艺「下料工序」→ 工单/出库 → 下料结算准入 */

import { getProcessById, getProcessByName } from '@/store/processConfigStore'
import { workOrderState } from '@/store/workOrderStore'
import { resolveNeedsBlankingSettle } from '@/utils/blankingSettleMaterial'

/** 解析工序是否为下料工序（优先快照字段，否则回查工序主数据） */
export function resolveProcessIsBlanking(processLike) {
  if (!processLike) return false
  if (processLike.isBlanking === true) return true
  if (processLike.isBlanking === false) return false
  const master =
    (processLike.processId && getProcessById(processLike.processId)) ||
    (processLike.name && getProcessByName(processLike.name)) ||
    null
  return Boolean(master?.isBlanking)
}

export function workOrderHasBlankingProcess(workOrder) {
  return (workOrder?.processes || []).some((p) => resolveProcessIsBlanking(p))
}

export function findWorkOrderByCode(code) {
  const no = String(code || '').trim()
  if (!no) return null
  void workOrderState.orders
  return workOrderState.orders.find((o) => o.code === no) || null
}

/** 从出库单收集关联工单号 */
export function collectOutboundWorkOrderNos(order) {
  const set = new Set()
  const head = String(order?.sourceOrderNo || '').trim()
  // 领料申请号也可能在头；工单号多在行上
  ;(order?.lineItems || []).forEach((l) => {
    ;[l.workOrderNo, l.sourceDocNo, l.sourceOrderNo].forEach((v) => {
      const s = String(v || '').trim()
      if (s) set.add(s)
    })
  })
  if (head) set.add(head)
  return [...set]
}

export function outboundLinkedToBlankingWorkOrder(order) {
  return collectOutboundWorkOrderNos(order).some((no) => {
    const wo = findWorkOrderByCode(no)
    return wo ? workOrderHasBlankingProcess(wo) : false
  })
}

export function outboundLineHasPick(line) {
  if (!line) return false
  if (line.pickedBatchId) return true
  const allocs = Array.isArray(line.batchAllocations) ? line.batchAllocations : []
  if (allocs.some((a) => a?.batchId && Number(a.qty) > 0)) return true
  // 单单位无批次时：已出库实发量 > 0 也可结算
  return Number(line.shipQty) > 0 || Number(line.pickedLength) > 0
}

/**
 * 出库单是否可进入下料结算：
 * - 主路径：关联工单含下料工序，且存在「需要下料结算」的已发行
 * - 兼容：无工单可解析时，仍允许已拣批的双单位行（旧演示/历史单）
 */
export function isOutboundEligibleForCutSettle(order) {
  if (!order || order.status !== '已出库') return false
  if (order.outboundType !== '领料出库' && order.outboundType !== '发料出库') return false
  const lines = order.lineItems || []
  if (!lines.some((l) => outboundLineHasPick(l))) return false
  if (outboundLinkedToBlankingWorkOrder(order)) {
    return lines.some((l) => outboundLineHasPick(l) && resolveNeedsBlankingSettle(l))
  }
  return lines.some((l) => l.isVariableLength && outboundLineHasPick(l))
}

/**
 * 可结算明细行：
 * - 有下料工单：仅「需要下料结算」的已拣/已发行
 * - 否则：仅双单位已拣行（兼容）
 */
export function getCutSettleCandidateLines(order) {
  const lines = order?.lineItems || []
  const blanking = outboundLinkedToBlankingWorkOrder(order)
  return lines.filter((l) => {
    if (!outboundLineHasPick(l)) return false
    if (blanking) return resolveNeedsBlankingSettle(l)
    return Boolean(l.isVariableLength)
  })
}

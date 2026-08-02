/**
 * 生产计划「工单占用」：开立工单 BOM 需求 − 已领（库存单位）
 * 可用库存 = max(0, 现存量 − 工单占用)
 *
 * Store 采用运行时 require，避免与 assemblyWorkOrderStore / productionPlanMaterial 形成循环依赖。
 */

import { MATERIAL_DEDUCT_STATUS } from '@/mock/materialRequisitionRecords'
import { resolveWorkOrderAllMaterialLines } from '@/utils/materialReqEbom'

const OPEN_WO_STATUSES = new Set(['待下发', '已下发', '执行中', '暂停'])

function getWorkOrderState() {
  return require('@/store/workOrderStore').workOrderState
}

function getAssemblyWorkOrderState() {
  return require('@/store/assemblyWorkOrderStore').assemblyWorkOrderState
}

function getOutboundState() {
  return require('@/store/outboundStore').outboundState
}

function getMaterialRequisitionState() {
  return require('@/store/materialRequisitionStore').materialRequisitionState
}

function getStockState() {
  return require('@/store/stockStore').stockState
}

function isOpenWorkOrder(wo) {
  if (!wo) return false
  if (wo.skipEbom) return false
  return OPEN_WO_STATUSES.has(wo.status)
}

function materialCodeOf(line) {
  return line?.itemCode || line?.materialCode || line?.code || line?.inventoryCode || ''
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

/** 账面现存量：行上 stockQty 优先，否则汇总库存台账 */
function resolveOnHandQty(node) {
  const fromRow = Number(node?.stockQty)
  if (Number.isFinite(fromRow) && fromRow > 0) return fromRow
  const code = node?.code
  if (!code) return Number.isFinite(fromRow) ? fromRow : 0
  const fromLedger = (getStockState().records || [])
    .filter((r) => r.itemCode === code)
    .reduce((sum, r) => sum + (Number(r.qty) || 0), 0)
  return fromLedger > 0 ? round3(fromLedger) : Number.isFinite(fromRow) ? fromRow : 0
}

function collectOpenWorkOrders() {
  const list = []
  ;(getWorkOrderState().orders || []).forEach((wo) => {
    if (isOpenWorkOrder(wo)) list.push(wo)
  })
  ;(getAssemblyWorkOrderState().orders || []).forEach((wo) => {
    if (isOpenWorkOrder(wo)) list.push(wo)
  })
  return list
}

/** 开立工单 BOM 需求（库存单位）按物料编码汇总 */
function buildOpenWoDemandMap(openOrders) {
  const demand = new Map()
  openOrders.forEach((wo) => {
    const lines = resolveWorkOrderAllMaterialLines(wo)
    lines.forEach((line) => {
      const code = materialCodeOf(line)
      if (!code) return
      const qty = Number(line.suggestedQty ?? line.requiredQty ?? line.shipQty) || 0
      if (qty <= 0) return
      demand.set(code, (demand.get(code) || 0) + qty)
    })
  })
  return demand
}

function openWoCodeSet(openOrders) {
  const set = new Set()
  openOrders.forEach((wo) => {
    if (wo.code) set.add(wo.code)
    if (wo.id) set.add(wo.id)
  })
  return set
}

function lineBelongsToOpenWo(line, order, openCodes) {
  const woNo = line.workOrderNo || line.sourceDocNo || order.sourceOrderNo || ''
  if (woNo && openCodes.has(woNo)) return true
  const sources = line.sourceWorkOrders || []
  return sources.some(
    (s) =>
      (s.workOrderCode && openCodes.has(s.workOrderCode)) ||
      (s.workOrderId && openCodes.has(s.workOrderId)),
  )
}

/** 已领：已出库的领料/发料 + 开立工单关联的成功扣减 */
function buildIssuedMap(openCodes) {
  const issued = new Map()

  ;(getOutboundState().orders || []).forEach((order) => {
    if (order.status !== '已出库') return
    if (order.outboundType !== '领料出库' && order.outboundType !== '发料出库') return
    ;(order.lineItems || []).forEach((line) => {
      if (!lineBelongsToOpenWo(line, order, openCodes)) return
      const code = materialCodeOf(line)
      if (!code) return
      const qty = Number(line.shipQty ?? line.demandMeters) || 0
      if (qty <= 0) return
      issued.set(code, (issued.get(code) || 0) + qty)
    })
  })
  ;(getMaterialRequisitionState().records || []).forEach((rec) => {
    const st = rec.status
    if (st !== MATERIAL_DEDUCT_STATUS.SUCCESS && st !== MATERIAL_DEDUCT_STATUS.PARTIAL) return
    const woKey = rec.workOrderNo || rec.workOrderId || ''
    if (!woKey || !openCodes.has(woKey)) return
    ;(rec.lines || []).forEach((line) => {
      const lineSt = line.status || st
      if (lineSt !== MATERIAL_DEDUCT_STATUS.SUCCESS && lineSt !== MATERIAL_DEDUCT_STATUS.PARTIAL) {
        return
      }
      const code = materialCodeOf(line)
      if (!code) return
      const qty = Number(line.actualQty) || 0
      if (qty <= 0) return
      issued.set(code, (issued.get(code) || 0) + qty)
    })
  })

  return issued
}

/**
 * @returns {Map<string, { woAllocatedQty: number, woDemandQty: number, issuedQty: number }>}
 */
export function buildWoAllocatedMap() {
  const openOrders = collectOpenWorkOrders()
  const openCodes = openWoCodeSet(openOrders)
  const demand = buildOpenWoDemandMap(openOrders)
  const issued = buildIssuedMap(openCodes)
  const map = new Map()

  const codes = new Set([...demand.keys(), ...issued.keys()])
  codes.forEach((code) => {
    const woDemandQty = round3(demand.get(code) || 0)
    const issuedQty = round3(issued.get(code) || 0)
    const woAllocatedQty = round3(Math.max(0, woDemandQty - issuedQty))
    map.set(code, { woAllocatedQty, woDemandQty, issuedQty })
  })
  return map
}

export function getWoAllocatedForMaterialCode(code, allocatedMap) {
  if (!code) {
    return { woAllocatedQty: 0, woDemandQty: 0, issuedQty: 0 }
  }
  const map = allocatedMap || buildWoAllocatedMap()
  return map.get(code) || { woAllocatedQty: 0, woDemandQty: 0, issuedQty: 0 }
}

/**
 * 写回计划物料树：工单占用、可用库存、缺口
 * 现存量 stockQty 不变；可用 = max(0, 现存量 − 占用)
 */
export function applyWoAllocatedToMaterialTree(materials, allocatedMap) {
  const map = allocatedMap || buildWoAllocatedMap()
  const walk = (nodes) => {
    ;(nodes || []).forEach((node) => {
      if (node?.code && !node.isTopLevel) {
        const hit = getWoAllocatedForMaterialCode(node.code, map)
        node.woAllocatedQty = hit.woAllocatedQty
        node.woDemandQty = hit.woDemandQty
        node.issuedQty = hit.issuedQty
        const onHand = resolveOnHandQty(node)
        node.stockQty = onHand
        node.availableStock = round3(Math.max(0, onHand - hit.woAllocatedQty))
        if (node.demandQty != null) {
          node.gapQty = Math.max(
            0,
            (Number(node.demandQty) || 0) - (Number(node.availableStock) || 0),
          )
        }
      } else if (node?.isTopLevel) {
        node.woAllocatedQty = node.woAllocatedQty ?? 0
      }
      if (node?.children?.length) walk(node.children)
    })
  }
  walk(materials)
  return materials
}

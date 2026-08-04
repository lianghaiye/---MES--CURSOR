/**
 * 生产计划「在途/在制」：
 * - 外购：采购申请未转单量 / 采购订单未入库量（采购单位）
 * - 自制/组装/外协：待下发 / 执行中（库存单位，产出工单）
 * 缺口仍 = 需求 − 可用库存（不扣在途/在制）
 */

import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  convertStockDemandToPurchase,
  purchaseQtyToStockQty,
  resolveInventoryUnit,
  resolvePackageContent,
  resolvePurchaseUnit,
} from '@/utils/purchaseUomConvert'
import {
  buildWipInProcessMap,
  getWipForMaterialCode,
  usesWipInProcessDisplay,
} from '@/utils/planWipInProcess'

function isOpenPurchaseRequisition(req) {
  if (!req) return false
  const status = req.docStatus || ''
  if (status === '已作废' || status === '处理完成') return false
  // 已生成采购单号的视为已转出，避免与订单重复
  if (String(req.purchaseOrderNo || '').trim()) return false
  return true
}

function isOpenPurchaseOrder(order) {
  if (!order) return false
  if (order.status === '已完成' || order.status === '已作废' || order.status === '已取消') {
    return false
  }
  if (order.inboundStatus === '已入库') return false
  return true
}

function lookupMaster(code) {
  if (!code) return null
  return materialInfoState.materials.find((m) => m.code === code) || null
}

/** 将行数量折算为库存单位量 */
function lineToStockQty(qty, unit, master) {
  const n = Number(qty) || 0
  if (n <= 0) return 0
  if (!master) return n
  const purchaseUnit = resolvePurchaseUnit(master)
  const inventoryUnit = resolveInventoryUnit(master)
  const content = resolvePackageContent(master) ?? 1
  const lineUnit = unit || purchaseUnit || inventoryUnit
  if (lineUnit === inventoryUnit) return n
  if (lineUnit === purchaseUnit) return purchaseQtyToStockQty(n, content)
  // 未知单位：按原值计入（演示兜底）
  return n
}

/**
 * 按物料编码汇总未关闭的采购申请 / 采购订单数量（库存单位）
 * @returns {Map<string, { prStockQty: number, poStockQty: number, purchaseUnit: string, inventoryUnit: string, packageContent: number }>}
 */
export function buildPurchaseInTransitMap() {
  const map = new Map()

  const ensure = (code) => {
    if (!map.has(code)) {
      const master = lookupMaster(code)
      map.set(code, {
        prStockQty: 0,
        poStockQty: 0,
        purchaseUnit: resolvePurchaseUnit(master || { inventoryUnit: '件' }),
        inventoryUnit: resolveInventoryUnit(master || { inventoryUnit: '件' }),
        packageContent: resolvePackageContent(master || {}),
        master,
      })
    }
    return map.get(code)
  }

  ;(purchaseRequisitionState.requisitions || []).forEach((req) => {
    if (!isOpenPurchaseRequisition(req)) return
    ;(req.lineItems || []).forEach((line) => {
      const code = line.inventoryCode || line.productCode || ''
      if (!code) return
      const row = ensure(code)
      row.prStockQty += lineToStockQty(
        line.planPurchaseQty,
        line.unit || line.purchaseUnit,
        row.master,
      )
    })
  })
  ;(purchaseOrderState.orders || []).forEach((order) => {
    if (!isOpenPurchaseOrder(order)) return
    ;(order.lineItems || []).forEach((line) => {
      const code = line.itemCode || line.productCode || line.inventoryCode || ''
      if (!code) return
      const row = ensure(code)
      row.poStockQty += lineToStockQty(line.purchaseQty, line.unit || line.purchaseUnit, row.master)
    })
  })

  map.forEach((row) => {
    row.prStockQty = Math.round(row.prStockQty * 1000) / 1000
    row.poStockQty = Math.round(row.poStockQty * 1000) / 1000
    const prPurchase = convertStockDemandToPurchase(row.prStockQty, row.master || {})
    const poPurchase = convertStockDemandToPurchase(row.poStockQty, row.master || {})
    row.prPurchaseQty = prPurchase.planPurchaseQty
    row.poPurchaseQty = poPurchase.planPurchaseQty
    row.inTransitStockQty = Math.round((row.prStockQty + row.poStockQty) * 1000) / 1000
    row.inTransitText = formatInTransitText(row)
  })

  return map
}

export function formatInTransitText(row) {
  if (!row) return '—'
  const unit = row.purchaseUnit || row.inventoryUnit || ''
  const pr = Number(row.prPurchaseQty) || 0
  const po = Number(row.poPurchaseQty) || 0
  if (!pr && !po) return `0${unit}/0${unit}`
  return `${pr}${unit}/${po}${unit}`
}

export function getInTransitForMaterialCode(code, transitMap) {
  if (!code) {
    return {
      prPurchaseQty: 0,
      poPurchaseQty: 0,
      inTransitStockQty: 0,
      inTransitText: '—',
      purchaseUnit: '',
      inventoryUnit: '',
      displayMode: 'purchase',
      inTransitTip: PURCHASE_IN_TRANSIT_TIP,
    }
  }
  const map = transitMap || buildPurchaseInTransitMap()
  const hit = map.get(code)
  if (hit) {
    return {
      ...hit,
      displayMode: 'purchase',
      inTransitTip: PURCHASE_IN_TRANSIT_TIP,
    }
  }
  return {
    prPurchaseQty: 0,
    poPurchaseQty: 0,
    prStockQty: 0,
    poStockQty: 0,
    inTransitStockQty: 0,
    inTransitText: formatInTransitText({
      prPurchaseQty: 0,
      poPurchaseQty: 0,
      purchaseUnit: '件',
    }),
    purchaseUnit: '件',
    inventoryUnit: '件',
    displayMode: 'purchase',
    inTransitTip: PURCHASE_IN_TRANSIT_TIP,
  }
}

export const PURCHASE_IN_TRANSIT_TIP =
  '申请量/订单量（采购单位）：未转单的采购申请 / 未入库的采购订单'
export const WIP_IN_PROCESS_TIP =
  '待下发/执行中（库存单位）：已生成未完工入库的生产/外协/总装工单；不参与缺口计算'

/**
 * 按供应型态解析计划行「在途/在制」展示
 * @param {{ code?: string, supplyType?: string }} node
 */
export function resolveInTransitOrWipForPlanNode(node, purchaseMap, wipMap) {
  const code = node?.code || ''
  if (usesWipInProcessDisplay(node?.supplyType)) {
    const wip = getWipForMaterialCode(code, wipMap)
    return {
      inTransitQty: wip.wipStockQty,
      prInTransitQty: wip.pendingQty,
      poInTransitQty: wip.executingQty,
      inTransitText: wip.wipText,
      inTransitPurchaseUnit: wip.inventoryUnit,
      displayMode: 'wip',
      inTransitTip: WIP_IN_PROCESS_TIP,
    }
  }
  const hit = getInTransitForMaterialCode(code, purchaseMap)
  return {
    inTransitQty: hit.inTransitStockQty,
    prInTransitQty: hit.prPurchaseQty,
    poInTransitQty: hit.poPurchaseQty,
    inTransitText: hit.inTransitText,
    inTransitPurchaseUnit: hit.purchaseUnit,
    displayMode: 'purchase',
    inTransitTip: PURCHASE_IN_TRANSIT_TIP,
  }
}

/** 将在途/在制信息写回计划物料树（缺口仍不扣减本列） */
export function applyPurchaseInTransitToMaterialTree(materials, transitMap, wipMap) {
  const purchaseMap = transitMap || buildPurchaseInTransitMap()
  const processMap = wipMap || buildWipInProcessMap()
  const walk = (nodes) => {
    ;(nodes || []).forEach((node) => {
      if (node?.code) {
        const hit = resolveInTransitOrWipForPlanNode(node, purchaseMap, processMap)
        node.inTransitQty = hit.inTransitQty
        node.prInTransitQty = hit.prInTransitQty
        node.poInTransitQty = hit.poInTransitQty
        node.inTransitText = hit.inTransitText
        node.inTransitPurchaseUnit = hit.inTransitPurchaseUnit
        node.inTransitDisplayMode = hit.displayMode
        node.inTransitTip = hit.inTransitTip
      } else if (node?.isTopLevel) {
        node.inTransitText = node.inTransitText || '—'
      }
      if (node?.children?.length) walk(node.children)
    })
  }
  walk(materials)
  return materials
}

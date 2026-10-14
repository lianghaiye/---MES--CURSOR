import dayjs from 'dayjs'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getStockQty } from '@/store/stockStore'
import { createShipMaterialPickRow } from '@/utils/shipEbom'

const SKIP_PO_STATUS = new Set(['草稿', '已拒绝', '已作废', '已取消'])

function splitDocNos(raw) {
  return String(raw || '')
    .split(/[,，;；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function orderMatchesSalesNo(orderNoCsv, salesOrderNo) {
  if (!salesOrderNo) return false
  return splitDocNos(orderNoCsv).includes(String(salesOrderNo).trim())
}

function resolveStock(code, warehouse) {
  if (!code) return 0
  if (warehouse) return Number(getStockQty(warehouse, code)) || 0
  return Number(getStockQty('', code)) || 0
}

function findMaterialMaster(code) {
  if (!code) return null
  return (materialInfoState.materials || []).find((m) => m.code === code) || null
}

/**
 * 汇总与销售单关联的采购订单/采购申请物料行（按物料编码合并数量）
 */
export function listPurchaseMaterialLinesForSalesOrder(salesOrder, options = {}) {
  const salesOrderNo = salesOrder?.orderNo || ''
  if (!salesOrderNo) return []

  const warehouse = options.warehouse || ''
  const map = new Map()

  function upsert(partial) {
    const code = String(partial.code || '').trim()
    if (!code) return
    const qty = Math.max(0, Number(partial.qty) || 0)
    if (!map.has(code)) {
      map.set(code, {
        code,
        name: partial.name || code,
        spec: partial.spec || '',
        unit: partial.unit || '件',
        materialType: partial.materialType || '零部件',
        supplyType: partial.supplyType || '外购件',
        qty: 0,
        sources: [],
      })
    }
    const row = map.get(code)
    row.qty += qty
    if (partial.name) row.name = partial.name
    if (partial.spec) row.spec = partial.spec
    if (partial.unit) row.unit = partial.unit
    if (partial.source) row.sources.push(partial.source)
  }

  for (const po of purchaseOrderState.orders || []) {
    if (SKIP_PO_STATUS.has(po.status)) continue
    if (!orderMatchesSalesNo(po.salesOrderNo, salesOrderNo)) continue
    for (const line of po.lineItems || []) {
      const code = line.itemCode || line.productCode || ''
      upsert({
        code,
        name: line.itemName || line.productName || code,
        spec: line.specModel || '',
        unit: line.inventoryUnit || line.unit || '件',
        materialType: line.itemType || '零部件',
        supplyType: '外购件',
        qty: Number(line.purchaseQty) || 0,
        source: `采购单 ${po.orderNo}`,
      })
    }
  }

  for (const pr of purchaseRequisitionState.requisitions || []) {
    if (pr.docStatus === '已作废' || pr.docStatus === '已关闭') continue
    const matchOrder =
      orderMatchesSalesNo(pr.salesOrderNo, salesOrderNo) ||
      pr.sourceSalesOrderId === salesOrder?.id ||
      pr.sourceOrderNo === salesOrderNo
    if (!matchOrder) continue
    for (const line of pr.lineItems || []) {
      const code = line.inventoryCode || line.materialCode || line.itemCode || ''
      upsert({
        code,
        name: line.inventoryName || line.materialName || line.itemName || code,
        spec: line.specModel || '',
        unit: line.unit || '件',
        materialType: line.materialType || '零部件',
        supplyType: line.supplyType || '外购件',
        qty: Number(line.planPurchaseQty ?? line.demandQty) || 0,
        source: `采购申请 ${pr.reqNo}`,
      })
    }
  }

  return [...map.values()].map((row) => {
    const master = findMaterialMaster(row.code)
    return {
      ...row,
      name: master?.name || row.name,
      spec: master?.specModel || row.spec,
      unit: master?.inventoryUnit || master?.unit || row.unit,
      availableStock: resolveStock(row.code, warehouse),
      materialId: master?.id || `po-mat-${row.code}`,
    }
  })
}

/**
 * 由采购明细生成扁平简易 EBOM 快照（挂到销售行，供散件勾选发货）
 */
export function buildFlatEbomSnapshotFromPurchaseLines(purchaseLines, salesLine, salesQty) {
  const qty = Math.max(1, Math.floor(Number(salesQty) || 1))
  const materials = (purchaseLines || []).map((line, idx) => {
    const totalQty = Math.max(0, Number(line.qty) || 0)
    const demandQty = totalQty > 0 ? totalQty : qty
    return {
      id: line.materialId || `flat-ebom-${line.code || idx}`,
      code: line.code,
      name: line.name,
      spec: line.spec || '',
      unit: line.unit || '件',
      type: line.materialType || '零部件',
      materialType: line.materialType || '零部件',
      supplyType: line.supplyType || '外购件',
      demandQty,
      availableStock: Number(line.availableStock) || 0,
      stockQty: Number(line.availableStock) || 0,
      children: [],
      sourceHint: (line.sources || []).join('；'),
    }
  })

  return {
    snapshotId: `ebom-po-flat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'purchase-flat',
    ebomName: '采购明细简易 EBOM',
    bomVersion: 'PO-FLAT',
    bomName: `${salesLine?.productName || salesLine?.productCode || '散件'}（采购生成）`,
    snapshotAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    salesLineId: salesLine?.id || '',
    materials,
    treeNodes: [],
    lineItems: [],
  }
}

/** 将主数据物料转为发运勾选行（免 EBOM 手工加料） */
export function createManualShipPickFromMaterial(material, options = {}) {
  const sets = Math.max(0, Number(options.shipSets) || 0)
  const orderQty = Math.max(1, Number(options.orderQty) || 1)
  const warehouse = options.warehouse || ''
  const code = material?.code || ''
  const unitDemand = Math.max(0, Number(options.unitDemandQty) || 1)
  const availableStock = resolveStock(code, warehouse)
  const orderDemandQty = Math.round(unitDemand * orderQty * 10000) / 10000
  const demandQty = Math.round(unitDemand * sets * 10000) / 10000

  const row = createShipMaterialPickRow(
    {
      id: material?.id || `manual-${code || Date.now()}`,
      code,
      name: material?.name || code,
      spec: material?.specModel || material?.spec || '',
      unit: material?.inventoryUnit || material?.unit || '件',
      type: material?.materialType || material?.type || '零部件',
      materialType: material?.materialType || '零部件',
      supplyType: material?.supplyType || material?.supplyForm || '外购件',
      demandQty,
      availableStock,
      stockQty: availableStock,
      children: [],
    },
    0,
    null,
  )
  row.unitDemandQty = unitDemand
  row.orderDemandQty = orderDemandQty
  row.pickSource = 'manual'
  row.selected = true
  row.shipQty = demandQty > 0 ? demandQty : unitDemand
  return row
}

/** 由当前勾选物料反构扁平快照（手工加料后回写销售行） */
export function buildFlatEbomSnapshotFromPickRows(pickRows, salesLine, salesQty) {
  const qty = Math.max(1, Math.floor(Number(salesQty) || 1))
  const materials = (pickRows || [])
    .filter((r) => !r.parentMaterialId)
    .map((r) => ({
      id: r.materialId,
      code: r.code,
      name: r.name,
      spec: r.spec || '',
      unit: r.unit || '件',
      type: r.materialType || '零部件',
      materialType: r.materialType || '零部件',
      supplyType: r.supplyType || '外购件',
      demandQty:
        r.orderDemandQty != null
          ? Number(r.orderDemandQty)
          : Math.round((Number(r.unitDemandQty) || 0) * qty * 10000) / 10000,
      availableStock: Number(r.availableStock) || 0,
      stockQty: Number(r.availableStock) || 0,
      children: [],
    }))

  return {
    snapshotId: `ebom-manual-flat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'manual-flat',
    ebomName: '手工发运清单',
    bomVersion: 'MANUAL-FLAT',
    bomName: `${salesLine?.productName || salesLine?.productCode || '散件'}（手工）`,
    snapshotAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    salesLineId: salesLine?.id || '',
    materials,
    treeNodes: [],
    lineItems: [],
  }
}

/** 回写销售订单行 EBOM 快照 */
export function writeSalesLineEbomSnapshot(salesOrder, salesLineId, snapshot) {
  if (!salesOrder?.lineItems || !salesLineId || !snapshot) return false
  const line = salesOrder.lineItems.find((l) => l.id === salesLineId)
  if (!line) return false
  line.ebomSnapshot = snapshot
  line.ebomStatus = line.ebomStatus && line.ebomStatus !== '—' ? line.ebomStatus : '简易清单'
  line.ebomName = snapshot.ebomName || snapshot.bomName || line.ebomName
  return true
}

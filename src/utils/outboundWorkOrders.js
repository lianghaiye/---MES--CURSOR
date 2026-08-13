import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { getWorkOrderPlanQty } from '@/utils/workOrderScheduleBatch'

export const OUTBOUND_WORK_ORDER_COLUMNS = [
  { title: '工单号', dataIndex: 'code', key: 'code', width: 160 },
  { title: '产品', dataIndex: 'productName', key: 'productName', width: 160, ellipsis: true },
  { title: '编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', key: 'specModel', width: 120, ellipsis: true },
  { title: '材质', key: 'material', width: 90, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 120, ellipsis: true },
  { title: '关联BOM', key: 'bom', width: 140, ellipsis: true },
  { title: '计划数量', key: 'planQty', width: 100, align: 'right' },
]

export function findLinkedWorkOrder(row = {}) {
  const id = row.id || row.workOrderId
  const code = row.code || row.workOrderCode
  return (
    workOrderState.orders.find((o) => (id && o.id === id) || (code && o.code === code)) ||
    assemblyWorkOrderState.orders.find((o) => (id && o.id === id) || (code && o.code === code)) ||
    null
  )
}

export function enrichOutboundWorkOrderRow(row = {}) {
  const wo = findLinkedWorkOrder(row)
  const planQty =
    row.planQty != null && row.planQty !== ''
      ? row.planQty
      : wo
        ? getWorkOrderPlanQty(wo) || wo.scheduleQty
        : row.scheduleQty
  return {
    ...row,
    id: row.id || row.workOrderId || wo?.id || '',
    code: row.code || row.workOrderCode || wo?.code || '',
    productName: row.productName || wo?.productName || '—',
    productCode: row.productCode || wo?.productCode || wo?.materialCode || '',
    specModel: row.specModel || wo?.specModel || wo?.productSpec || '',
    material: row.material || wo?.material || '',
    drawingNo: row.drawingNo || wo?.drawingNo || '',
    bom: row.bom || wo?.bomLabel || wo?.bom || '',
    planQty,
  }
}

export function findMaterialReqForOutbound(order, materialReqs = []) {
  if (!order) return null
  const id = order.id
  const docNo = order.docNo
  const reqId = order.materialReqId
  const reqNo = order.materialReqNo || order.sourceOrderNo
  return (
    (materialReqs || []).find((r) => {
      if (reqId && r.id === reqId) return true
      if (id && r.outboundId === id) return true
      if (docNo && r.outboundDocNo === docNo) return true
      if (reqNo && r.reqNo === reqNo) return true
      return false
    }) || null
  )
}

/** 从出库单 / 关联领料申请解析工单清单 */
export function resolveOutboundWorkOrders(order, materialReqs = []) {
  if (!order || order.outboundType !== '领料出库') return []

  const fromOrder = Array.isArray(order.workOrders) ? order.workOrders : []
  if (fromOrder.length) {
    return fromOrder.map(enrichOutboundWorkOrderRow)
  }

  const req = findMaterialReqForOutbound(order, materialReqs)
  if (!req) return []

  if (Array.isArray(req.workOrders) && req.workOrders.length) {
    return req.workOrders.map(enrichOutboundWorkOrderRow)
  }

  if (req.workOrderCode || req.workOrderId) {
    return [
      enrichOutboundWorkOrderRow({
        id: req.workOrderId,
        code: req.workOrderCode,
        productName: req.productName,
        productCode: req.productCode,
        specModel: req.specModel,
        material: req.material,
        drawingNo: req.drawingNo,
        bom: req.bom,
        planQty: req.planQty ?? req.scheduleQty,
        scheduleQty: req.scheduleQty,
      }),
    ]
  }

  return []
}

export function snapshotWorkOrdersForOutbound(workOrders = []) {
  return (workOrders || []).map((wo) => {
    const enriched = enrichOutboundWorkOrderRow(wo)
    return {
      id: enriched.id,
      code: enriched.code,
      productName: enriched.productName === '—' ? '' : enriched.productName,
      productCode: enriched.productCode || '',
      specModel: enriched.specModel || '',
      material: enriched.material || '',
      drawingNo: enriched.drawingNo || '',
      bom: enriched.bom || '',
      planQty: enriched.planQty ?? enriched.scheduleQty ?? 0,
      scheduleQty: enriched.scheduleQty ?? enriched.planQty ?? 0,
      salesOrderNo: wo.salesOrderNo || '',
    }
  })
}

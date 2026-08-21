import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

export const OUTBOUND_OUTSOURCING_ORDER_COLUMNS = [
  { title: '外协单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
  { title: '产品', dataIndex: 'productName', key: 'productName', width: 160, ellipsis: true },
  { title: '编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', key: 'specModel', width: 120, ellipsis: true },
  { title: '材质', key: 'material', width: 90, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 120, ellipsis: true },
  { title: '关联BOM', key: 'bom', width: 140, ellipsis: true },
  { title: '计划数量', key: 'planQty', width: 100, align: 'right' },
]

export function findLinkedOutsourcingOrder(row = {}) {
  const id = row.id || row.outsourcingOrderId
  const orderNo = row.orderNo || row.outsourcingOrderNo
  return (
    (outsourcingOrderState.orders || []).find(
      (o) => (id && o.id === id) || (orderNo && o.orderNo === orderNo),
    ) || null
  )
}

export function enrichOutboundOutsourcingOrderRow(row = {}) {
  const wx = findLinkedOutsourcingOrder(row)
  return {
    ...row,
    id:
      row.id ||
      row.lineId ||
      `${row.outsourcingOrderId || wx?.id || 'wx'}-${row.productCode || ''}`,
    outsourcingOrderId: row.outsourcingOrderId || wx?.id || '',
    orderNo: row.orderNo || row.outsourcingOrderNo || wx?.orderNo || '',
    productName: row.productName || row.itemName || wx?.workOrderName || '—',
    productCode: row.productCode || row.itemCode || '',
    specModel: row.specModel || '',
    material: row.material || '',
    drawingNo: row.drawingNo || '',
    bom: row.bom || row.bomLabel || '',
    planQty: row.planQty != null && row.planQty !== '' ? row.planQty : wx?.totalQty,
  }
}

function findOutsourcingOrderForOutbound(order) {
  if (!order) return null
  const id = order.outsourcingOrderId
  const orderNo = order.outsourcingOrderNo || order.sourceOrderNo
  return (
    (outsourcingOrderState.orders || []).find(
      (o) => (id && o.id === id) || (orderNo && o.orderNo === orderNo),
    ) || null
  )
}

/** 外协订单 → 出库单展示用行（按外协明细拆行） */
export function snapshotOutsourcingOrderForOutbound(wx) {
  if (!wx) return []
  const lines = wx.lineItems || []
  if (!lines.length) {
    return [
      enrichOutboundOutsourcingOrderRow({
        id: wx.id,
        outsourcingOrderId: wx.id,
        orderNo: wx.orderNo,
        productName: wx.workOrderName || '',
        planQty: wx.totalQty,
      }),
    ]
  }
  return lines.map((line, idx) =>
    enrichOutboundOutsourcingOrderRow({
      id: `${wx.id}-${line.id || idx}`,
      lineId: line.id,
      outsourcingOrderId: wx.id,
      orderNo: wx.orderNo,
      productName: line.productName || line.itemName || '',
      productCode: line.productCode || line.itemCode || '',
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      bom: line.bom || line.bomLabel || '',
      planQty: line.planQty,
    }),
  )
}

/** 从出库单解析外协订单清单（发料出库） */
export function resolveOutboundOutsourcingOrders(order) {
  if (!order || order.outboundType !== '发料出库') return []

  const fromOrder = Array.isArray(order.outsourcingOrders) ? order.outsourcingOrders : []
  if (fromOrder.length) {
    return fromOrder.map(enrichOutboundOutsourcingOrderRow)
  }

  const wx = findOutsourcingOrderForOutbound(order)
  if (!wx) return []
  return snapshotOutsourcingOrderForOutbound(wx)
}

export function snapshotOutsourcingOrdersForOutbound(rows = []) {
  return (rows || []).map((row) => {
    const enriched = enrichOutboundOutsourcingOrderRow(row)
    return {
      id: enriched.id,
      lineId: row.lineId || '',
      outsourcingOrderId: enriched.outsourcingOrderId,
      orderNo: enriched.orderNo,
      productName: enriched.productName === '—' ? '' : enriched.productName,
      productCode: enriched.productCode || '',
      specModel: enriched.specModel || '',
      material: enriched.material || '',
      drawingNo: enriched.drawingNo || '',
      bom: enriched.bom || '',
      planQty: enriched.planQty ?? 0,
    }
  })
}

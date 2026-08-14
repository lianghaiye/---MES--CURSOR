/**
 * 出库信息列表：一物料一行（字段对齐外协订单「发料信息」/ 领料申请「出库信息」）
 */

function isOutboundCompleted(order) {
  const status = order?.status || ''
  return status === '已出库' || status === '已完成'
}

/** 与领料申请「出库信息」一致的表格列（每次返回新数组，避免多表共享 mutation） */
export function createOutboundIssueLineColumns() {
  return [
    { title: '序号', key: 'index', width: 56, align: 'center' },
    { title: '出库状态', dataIndex: 'outboundStatus', width: 90 },
    { title: '出库单号', key: 'outboundOrderNo', dataIndex: 'outboundOrderNo', width: 150 },
    { title: '物料名称', dataIndex: 'productName', width: 140, ellipsis: true },
    { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
    { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
    { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
    { title: '申请出库数量', key: 'applyQty', width: 110, align: 'right' },
    { title: '实际出库数量', key: 'actualQty', width: 110, align: 'right' },
    { title: '出库仓库', dataIndex: 'shipWarehouse', width: 110, ellipsis: true },
    { title: '出库时间', dataIndex: 'confirmedAt', width: 160 },
    { title: '确认人', dataIndex: 'confirmer', width: 90 },
    { title: '创建时间', dataIndex: 'createdAt', width: 160 },
    { title: '创建人', dataIndex: 'creator', width: 90 },
  ]
}

/** @deprecated 请用 createOutboundIssueLineColumns()，保留别名避免漏改 */
export const OUTBOUND_ISSUE_LINE_COLUMNS = createOutboundIssueLineColumns()

export function getOutboundIssueLineScrollX(columns = OUTBOUND_ISSUE_LINE_COLUMNS) {
  return (columns || []).reduce((sum, col) => sum + (col.width || 100), 0)
}

export const OUTBOUND_ISSUE_LINE_SCROLL_X = getOutboundIssueLineScrollX()

function resolveShipWarehouse(order, line) {
  return (
    line?.shipWarehouse ||
    line?.warehouse ||
    order?.warehouse ||
    order?.shipWarehouse ||
    order?.outboundWarehouse ||
    ''
  )
}

/**
 * @param {object[]} orders 出库单列表
 * @returns {Array<object>}
 */
export function flattenOutboundOrdersToIssueLines(orders = []) {
  const rows = []
  ;(orders || []).forEach((order) => {
    if (!order) return
    const outboundOrderNo = order.docNo || order.issueOrderNo || order.outboundOrderNo || ''
    const outboundId = order.id || ''
    const outboundStatus = order.status || order.outboundStatus || ''
    const completed = isOutboundCompleted(order) || outboundStatus === '已出库'
    const confirmedAt = completed
      ? order.completedAt || order.outboundTime || order.confirmedAt || ''
      : order.confirmedAt || ''
    const confirmer = completed
      ? order.confirmer || order.warehouseKeeper || order.handler || ''
      : order.confirmer || ''
    const createdAt = order.createdAt || ''
    const creator = order.creator || order.handler || ''
    const lines = order.lineItems || []

    if (!lines.length) {
      rows.push({
        id: `${outboundId || outboundOrderNo || 'empty'}-empty`,
        outboundId,
        outboundStatus,
        outboundOrderNo,
        productName: '',
        productCode: '',
        specModel: '',
        material: '',
        applyQty: null,
        actualQty: null,
        unit: '',
        shipWarehouse: resolveShipWarehouse(order, null),
        confirmedAt,
        confirmer,
        createdAt,
        creator,
      })
      return
    }

    lines.forEach((line, idx) => {
      const applyQty =
        line.applyQty != null
          ? Number(line.applyQty)
          : line.issueQty != null
            ? Number(line.issueQty)
            : Number(line.shipQty) || null
      const actualQty = completed
        ? Number(line.actualQty ?? line.shippedQty ?? line.shipQty) || 0
        : line.actualQty != null
          ? Number(line.actualQty)
          : null
      rows.push({
        id: line.id || `${outboundId}-${idx}`,
        outboundId,
        outboundStatus,
        outboundOrderNo,
        productName: line.itemName || line.productName || '',
        productCode: line.itemCode || line.productCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty,
        actualQty,
        unit: line.unit || '',
        shipWarehouse: resolveShipWarehouse(order, line),
        confirmedAt,
        confirmer,
        createdAt,
        creator,
      })
    })
  })
  return rows
}

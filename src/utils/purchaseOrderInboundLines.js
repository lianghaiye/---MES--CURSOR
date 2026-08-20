/**
 * 采购订单详情 — 入库信息行（一物料一行）
 */
import { BARCODE_BATCH_NO_COLUMN, formatLineBarcodeBatchNo } from '@/utils/outboundIssueLines'

/** 采购/外协/收货/销售订单详情「入库信息」列（每次返回新数组） */
export function createInboundInfoLineColumns(options = {}) {
  const itemNameTitle = options.productName ? '产品名称' : '物料名称'
  const columns = [
    { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
    { title: '入库状态', dataIndex: 'inboundStatus', width: 90 },
    { title: '入库单号', key: 'docNo', dataIndex: 'docNo', width: 150, fixed: 'left' },
    { title: itemNameTitle, dataIndex: 'itemName', width: 140, ellipsis: true },
    { title: '编码', dataIndex: 'itemCode', width: 120, ellipsis: true },
    { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
    { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
    { title: '申请入库数量', key: 'applyQty', width: 110, align: 'right' },
    { title: '实际入库数量', key: 'actualQty', width: 110, align: 'right' },
  ]
  if (options.showInboundWarehouse) {
    columns.push({
      title: '入库仓库',
      key: 'inboundWarehouse',
      dataIndex: 'inboundWarehouse',
      width: 100,
      ellipsis: true,
    })
  }
  columns.push(
    { ...BARCODE_BATCH_NO_COLUMN },
    { title: '入库时间', dataIndex: 'inboundAt', width: 160 },
    { title: '确认人', dataIndex: 'confirmer', width: 88 },
    { title: '创建时间', dataIndex: 'createdAt', width: 160 },
    { title: '创建人', dataIndex: 'creator', width: 88 },
  )
  return columns
}

export function getInboundInfoLineScrollX(columns = createInboundInfoLineColumns()) {
  return (columns || []).reduce((sum, col) => sum + (col.width || 100), 0)
}

function isConfirmedInbound(order) {
  const status = order?.status || ''
  return status === '已完成' || status === '已入库' || status === '已确认'
}

export function flattenPurchaseOrderInboundLines(orders = []) {
  const rows = []
  ;(orders || []).forEach((order) => {
    const confirmed = isConfirmedInbound(order)
    ;(order.lineItems || []).forEach((line, idx) => {
      const applyQty = Number(line.applyQty ?? line.qty) || 0
      const actualQty = confirmed
        ? Number(line.actualQty ?? line.receivedQty ?? line.qty) || 0
        : Number(line.actualQty ?? line.receivedQty) || 0
      rows.push({
        id: `${order.id}-${line.id || idx}`,
        orderId: order.id,
        inboundStatus: order.status || '',
        docNo: order.docNo || '',
        itemName: line.itemName || line.productName || '',
        itemCode: line.itemCode || line.productCode || '',
        specModel: line.specModel || '',
        material: line.material || '',
        applyQty,
        actualQty,
        inboundWarehouse: line.warehouse || order.warehouse || '',
        barcodeBatchNo: formatLineBarcodeBatchNo(line),
        inboundAt: order.confirmedAt || order.inboundDate || '',
        confirmer: order.confirmer || '',
        createdAt: order.createdAt || '',
        creator: order.creator || order.handler || '',
      })
    })
  })
  return rows
}

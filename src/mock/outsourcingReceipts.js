/**
 * 外协收货单 mock / 筛选
 */
import dayjs from 'dayjs'

/** 质检状态 */
export const receiptQcStatusOptions = [
  '未质检',
  '质检中',
  '质检通过',
  '部分通过',
  '质检不通过',
  '已终止',
]

/** 入库状态 */
export const receiptInboundStatusOptions = ['待入库', '入库中', '部分入库', '已入库']

/** 单据状态 */
export const receiptDocStatusOptions = ['新建', '进行中', '已完成', '作废']

export function createOutsourcingReceipt(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const outsourcingOrderNo = partial.outsourcingOrderNo || partial.purchaseOrderNo || ''
  const outsourcingOrderId = partial.outsourcingOrderId || partial.purchaseOrderId || ''
  return {
    id: `wxrct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    receiptNo: '',
    contractNo: '',
    outsourcingOrderNo,
    outsourcingOrderId,
    purchaseOrderNo: outsourcingOrderNo,
    purchaseOrderId: outsourcingOrderId,
    supplier: '',
    contactPerson: '',
    purchaser: '',
    qcNo: '',
    qcStatus: '未质检',
    qcResult: '',
    inspector: '',
    inspectedAt: '',
    receiptStatus: '新建',
    inboundStatus: '待入库',
    remark: '',
    lineItems: [],
    creator: 'admin1',
    createdAt: now,
    updater: 'admin1',
    updatedAt: now,
    ...partial,
  }
}

export function calcReceiptQtySummary(receipt) {
  const lines = receipt?.lineItems || []
  const lineCount = lines.length
  const totalQty = lines.reduce((s, l) => s + (Number(l.receiptQty) || 0), 0)
  return { lineCount, totalQty }
}

export function formatReceiptQtySummary(receipt) {
  const { lineCount, totalQty } = calcReceiptQtySummary(receipt)
  const qtyText = Number.isFinite(totalQty) ? String(Number(totalQty.toFixed(4)).toString()) : '0'
  return `${lineCount}行/${qtyText}`
}

export const mockOutsourcingReceipts = [
  createOutsourcingReceipt({
    id: 'wxrct-1',
    receiptNo: 'WXSH-260807-001',
    qcNo: 'RKZJ-260807-021',
    outsourcingOrderNo: 'WX-260807001',
    outsourcingOrderId: 'wx-2',
    supplier: '采购供应商A',
    contactPerson: '张经理',
    purchaser: 'admin1',
    qcStatus: '质检中',
    receiptStatus: '进行中',
    inboundStatus: '入库中',
    createdAt: '2026-08-07 10:20',
    updatedAt: '2026-08-07 14:30',
    lineItems: [
      {
        id: 'wxrct-1-l1',
        wxLineId: 'wx-2-line',
        productName: '轴承套',
        productCode: 'MAT-BRG-SLEEVE',
        specModel: 'φ50',
        material: '45#',
        planQty: 30,
        receiptQty: 10,
        unit: '件',
        receivingWarehouse: '半成品仓',
      },
    ],
  }),
  createOutsourcingReceipt({
    id: 'wxrct-2',
    receiptNo: 'WXSH-260805-002',
    qcNo: 'RKZJ-260805-005',
    outsourcingOrderNo: 'WX-260805001',
    outsourcingOrderId: 'wx-4',
    supplier: '多功能供应商02',
    contactPerson: '李四',
    purchaser: 'admin1',
    qcStatus: '质检通过',
    qcResult: '合格',
    inspector: '质检员A',
    inspectedAt: '2026-08-05 15:20',
    receiptStatus: '已完成',
    inboundStatus: '已入库',
    createdAt: '2026-08-05 09:00',
    updatedAt: '2026-08-05 18:00',
    lineItems: [
      {
        id: 'wxrct-2-l1',
        productName: '精密轴',
        productCode: 'SEMI-SHAFT-01',
        planQty: 10,
        receiptQty: 10,
        unit: '根',
        receivingWarehouse: '半成品仓',
      },
    ],
  }),
  createOutsourcingReceipt({
    id: 'wxrct-3',
    receiptNo: 'WXSH-260808-001',
    qcNo: '',
    outsourcingOrderNo: 'WX-260807001',
    outsourcingOrderId: 'wx-2',
    supplier: '采购供应商A',
    contactPerson: '张经理',
    purchaser: 'admin1',
    qcStatus: '未质检',
    receiptStatus: '新建',
    inboundStatus: '待入库',
    createdAt: '2026-08-08 09:30',
    updatedAt: '2026-08-08 09:30',
    lineItems: [
      {
        id: 'wxrct-3-l1',
        productName: '轴承套',
        productCode: 'MAT-BRG-SLEEVE',
        planQty: 30,
        receiptQty: 5,
        unit: '件',
        receivingWarehouse: '半成品仓',
      },
    ],
  }),
]

export function cloneOutsourcingReceipts() {
  return JSON.parse(JSON.stringify(mockOutsourcingReceipts))
}

export function filterOutsourcingReceipts(list, filters = {}) {
  return (list || []).filter((item) => {
    if (
      filters.receiptNo &&
      !String(item.receiptNo || '').includes(String(filters.receiptNo).trim())
    ) {
      return false
    }
    const orderNo = filters.outsourcingOrderNo || filters.purchaseOrderNo
    if (orderNo) {
      const no = item.outsourcingOrderNo || item.purchaseOrderNo || ''
      if (!String(no).includes(String(orderNo).trim())) return false
    }
    if (filters.supplier && item.supplier !== filters.supplier) return false
    if (filters.qcStatus && item.qcStatus !== filters.qcStatus) return false
    if (filters.inboundStatus && item.inboundStatus !== filters.inboundStatus) return false
    if (filters.receiptStatus && item.receiptStatus !== filters.receiptStatus) return false
    return true
  })
}

export function generateOutsourcingReceiptNo(receipts = []) {
  const datePart = dayjs().format('YYMMDD')
  const prefix = `WXSH-${datePart}-`
  const seqs = (receipts || [])
    .map((r) => String(r.receiptNo || ''))
    .filter((no) => no.startsWith(prefix))
    .map((no) => Number(no.slice(prefix.length)))
    .filter((n) => Number.isFinite(n) && n > 0)
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

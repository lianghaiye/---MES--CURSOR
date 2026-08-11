/**
 * 采购收货单 mock / 筛选
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

export function createPurchaseReceipt(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: `prct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    receiptNo: '',
    contractNo: '',
    purchaseOrderNo: '',
    purchaseOrderId: '',
    supplier: '',
    purchaser: '',
    qcNo: '',
    qcStatus: '未质检',
    qcResult: '',
    inspector: '',
    inspectedAt: '',
    /** 单据状态：新建 | 进行中 | 已完成 | 作废 */
    receiptStatus: '新建',
    /** 入库状态 */
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

export const mockPurchaseReceipts = [
  createPurchaseReceipt({
    id: 'prct-1',
    receiptNo: 'CGSH-260807-017',
    qcNo: 'RKZJ-260807-017',
    purchaseOrderNo: 'CG20260803001',
    purchaseOrderId: 'po-3',
    supplier: '多功能供应商02',
    purchaser: 'admin1',
    qcStatus: '质检中',
    receiptStatus: '进行中',
    inboundStatus: '入库中',
    createdAt: '2026-08-07 10:20:00',
    updatedAt: '2026-08-07 14:30:00',
    lineItems: [
      { id: 'prct-1-l1', receiptQty: 50 },
      { id: 'prct-1-l2', receiptQty: 30 },
    ],
  }),
  createPurchaseReceipt({
    id: 'prct-2',
    receiptNo: 'CGSH-260807-016',
    qcNo: 'RKZJ-260807-016',
    purchaseOrderNo: 'CG20260802001',
    purchaseOrderId: 'po-4',
    supplier: '多功能供应商01',
    purchaser: 'admin1',
    qcStatus: '质检通过',
    qcResult: '合格',
    inspector: '质检员A',
    inspectedAt: '2026-08-07 15:20',
    receiptStatus: '进行中',
    inboundStatus: '待入库',
    createdAt: '2026-08-07 09:10:00',
    updatedAt: '2026-08-07 15:20:00',
    lineItems: [{ id: 'prct-2-l1', receiptQty: 100 }],
  }),
  createPurchaseReceipt({
    id: 'prct-3',
    receiptNo: 'CGSH-260807-015',
    qcNo: '',
    purchaseOrderNo: 'CG20260720001',
    purchaseOrderId: 'po-6',
    supplier: '多功能供应商01',
    purchaser: 'admin1',
    qcStatus: '未质检',
    receiptStatus: '新建',
    inboundStatus: '待入库',
    createdAt: '2026-08-06 16:00:00',
    updatedAt: '2026-08-06 16:00:00',
    lineItems: [
      { id: 'prct-3-l1', receiptQty: 20 },
      { id: 'prct-3-l2', receiptQty: 40 },
      { id: 'prct-3-l3', receiptQty: 10 },
    ],
  }),
  createPurchaseReceipt({
    id: 'prct-4',
    receiptNo: 'CGSH-260806-008',
    qcNo: '',
    purchaseOrderNo: 'CG20260804001',
    purchaseOrderId: 'po-1',
    supplier: '采购供应商A',
    purchaser: 'admin1',
    qcStatus: '未质检',
    receiptStatus: '作废',
    inboundStatus: '待入库',
    createdAt: '2026-08-06 11:00:00',
    updatedAt: '2026-08-06 12:00:00',
    updater: 'admin1',
    lineItems: [{ id: 'prct-4-l1', receiptQty: 15 }],
  }),
  createPurchaseReceipt({
    id: 'prct-5',
    receiptNo: 'CGSH-260805-003',
    qcNo: 'RKZJ-260805-003',
    purchaseOrderNo: 'CG20260802001',
    purchaseOrderId: 'po-4',
    supplier: '多功能供应商01',
    purchaser: 'admin1',
    qcStatus: '质检通过',
    qcResult: '合格',
    receiptStatus: '已完成',
    inboundStatus: '已入库',
    createdAt: '2026-08-05 09:00:00',
    updatedAt: '2026-08-05 18:00:00',
    lineItems: [{ id: 'prct-5-l1', receiptQty: 80 }],
  }),
]

export function clonePurchaseReceipts() {
  return JSON.parse(JSON.stringify(mockPurchaseReceipts))
}

export function filterPurchaseReceipts(list, filters = {}) {
  return (list || []).filter((item) => {
    if (
      filters.receiptNo &&
      !String(item.receiptNo || '').includes(String(filters.receiptNo).trim())
    ) {
      return false
    }
    if (
      filters.purchaseOrderNo &&
      !String(item.purchaseOrderNo || '').includes(String(filters.purchaseOrderNo).trim())
    ) {
      return false
    }
    if (filters.supplier && item.supplier !== filters.supplier) return false
    if (filters.qcStatus && item.qcStatus !== filters.qcStatus) return false
    if (filters.inboundStatus && item.inboundStatus !== filters.inboundStatus) return false
    if (filters.receiptStatus && item.receiptStatus !== filters.receiptStatus) return false
    return true
  })
}

export function generatePurchaseReceiptNo(receipts = []) {
  const datePart = dayjs().format('YYMMDD')
  const prefix = `CGSH-${datePart}-`
  const seqs = (receipts || [])
    .map((r) => String(r.receiptNo || ''))
    .filter((no) => no.startsWith(prefix))
    .map((no) => Number(no.slice(prefix.length)))
    .filter((n) => Number.isFinite(n) && n > 0)
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

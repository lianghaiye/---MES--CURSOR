/**
 * 票款流水：跨单据拍平回款 / 开票 / 付款 / 收票记录（只读查询）
 */
import { salesPaymentState } from '@/store/salesPaymentStore'
import {
  ensureSettleInvoiceRecords,
  getPurchaseSettleById,
  purchaseSettleState,
} from '@/store/purchaseSettleStore'
import { roundNumber } from '@/utils/numberFormat'

function round2(n) {
  return roundNumber(Number(n) || 0, 2)
}

function includesKw(hay, needle) {
  const n = String(needle || '')
    .trim()
    .toLowerCase()
  if (!n) return true
  return String(hay || '')
    .toLowerCase()
    .includes(n)
}

function inDateRange(dateStr, range) {
  if (!range || !range.length) return true
  const d = String(dateStr || '').slice(0, 10)
  if (!d) return false
  const [start, end] = range
  if (start && d < String(start).slice(0, 10)) return false
  if (end && d > String(end).slice(0, 10)) return false
  return true
}

/** 回款记录（销售侧全局列表） */
export function listReceiptFlowRecords(filters = {}) {
  const { partner = '', keyword = '', dateRange = null, docNo = '' } = filters
  const rows = (salesPaymentState.payments || []).map((p) => ({
    id: p.id,
    bizDate: String(p.receivedAt || p.createdAt || '').slice(0, 10),
    recordNo: p.paymentNo || '',
    partnerName: p.customerName || '',
    linkDocNo: p.contractNo || p.salesOrderNo || (p.salesOrderNos || [])[0] || '',
    contractNo: p.contractNo || '',
    salesOrderNo: p.salesOrderNo || (p.salesOrderNos || [])[0] || '',
    linkType: p.linkType || '',
    nodeName: p.nodeName || '',
    amount: round2(p.amount),
    method: p.paymentMethod || '',
    invoiceNo: p.invoiceNo || '',
    remark: p.remark || '',
    creator: p.creator || '',
    createdAt: p.createdAt || '',
  }))
  return rows
    .filter((r) => includesKw(r.partnerName, partner))
    .filter((r) => includesKw(`${r.recordNo} ${r.linkDocNo} ${r.invoiceNo}`, docNo || keyword))
    .filter((r) => inDateRange(r.bizDate, dateRange))
    .sort(
      (a, b) =>
        String(b.bizDate).localeCompare(String(a.bizDate)) ||
        String(b.createdAt).localeCompare(String(a.createdAt)),
    )
}

/** 开票记录（销售侧全局列表） */
export function listSalesInvoiceFlowRecords(filters = {}) {
  const { partner = '', keyword = '', dateRange = null, docNo = '' } = filters
  const rows = (salesPaymentState.invoices || []).map((inv) => ({
    id: inv.id,
    bizDate: String(inv.invoiceDate || inv.createdAt || '').slice(0, 10),
    recordNo: inv.invoiceRecordNo || '',
    partnerName: inv.customerName || '',
    linkDocNo: inv.contractNo || inv.salesOrderNo || '',
    contractNo: inv.contractNo || '',
    salesOrderNo: inv.salesOrderNo || '',
    linkType: inv.linkType || '',
    nodeName: inv.nodeName || '',
    amount: round2(inv.amount),
    taxRate: inv.taxRate,
    taxAmount: inv.taxAmount != null ? round2(inv.taxAmount) : null,
    invoiceNo: inv.invoiceNo || '',
    remark: inv.remark || '',
    creator: inv.creator || '',
    createdAt: inv.createdAt || '',
  }))
  return rows
    .filter((r) => includesKw(r.partnerName, partner))
    .filter((r) => includesKw(`${r.recordNo} ${r.linkDocNo} ${r.invoiceNo}`, docNo || keyword))
    .filter((r) => inDateRange(r.bizDate, dateRange))
    .sort(
      (a, b) =>
        String(b.bizDate).localeCompare(String(a.bizDate)) ||
        String(b.createdAt).localeCompare(String(a.createdAt)),
    )
}

/** 付款列表可合并列（与销售明细同款 rowSpan） */
export const PAYMENT_BATCH_MERGE_KEYS = [
  'index',
  'paidAt',
  'partnerName',
  'entryPeriodKey',
  'targetTypeLabel',
  'entrySettleNo',
  'batchAmount',
  'remark',
  'paidBy',
]

/** 当前页内同付款批次合并 rowSpan */
export function buildPaymentBatchRowSpans(rows = []) {
  const spans = new Array(rows.length).fill(1)
  let i = 0
  while (i < rows.length) {
    const key = String(rows[i]?.batchKey || rows[i]?.batchId || rows[i]?.id || '')
    let j = i + 1
    while (j < rows.length) {
      const next = String(rows[j]?.batchKey || rows[j]?.batchId || rows[j]?.id || '')
      if (next !== key) break
      j += 1
    }
    const span = j - i
    spans[i] = span
    for (let k = i + 1; k < j; k += 1) spans[k] = 0
    i = j
  }
  return spans
}

/**
 * 付款记录：按「一次付款登记」成组拍平。
 * 同 batch 多行 = 冲抵到多张对账单的分摊；合并字段挂在组上，分摊行保留入账对账单/入账金额。
 * @returns {{ rows: object[], groups: object[][] }}
 */
export function listPurchasePaymentFlowRecords(filters = {}) {
  const { partner = '', keyword = '', dateRange = null, docNo = '' } = filters
  const flat = []
  ;(purchaseSettleState.settles || []).forEach((s) => {
    ;(s.paymentRecords || []).forEach((r) => {
      const entryId = r.entrySettleId || s.id
      const entry = getPurchaseSettleById(entryId) || s
      flat.push({
        id: r.id || `pay-${s.id}-${r.paidAt}-${r.amount}`,
        bizDate: String(r.paidAt || '').slice(0, 10),
        batchId: r.batchId || '',
        batchKey: r.batchId || r.id || `pay-${s.id}-${r.paidAt}`,
        partnerName: entry.supplier || s.supplier || '',
        supplierId: entry.supplierId || s.supplierId || '',
        amount: round2(r.amount),
        targetType: r.targetType === 'opening' ? '期初' : '本期',
        targetSettleId: r.targetSettleId || s.id,
        targetSettleNo: r.targetSettleNo || s.settleNo || '',
        entrySettleId: entryId,
        entrySettleNo: r.entrySettleNo || entry.settleNo || s.settleNo || '',
        entryPeriodKey: entry.periodKey || '',
        periodKey: s.periodKey || '',
        remark: r.remark || '',
        paidBy: r.paidBy || '',
        paidAt: r.paidAt || '',
      })
    })
  })

  const groupMap = new Map()
  flat.forEach((r) => {
    const key = r.batchKey
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key).push(r)
  })

  const groups = [...groupMap.values()]
    .map((lines) => {
      const sortedLines = [...lines].sort((a, b) =>
        String(a.targetSettleNo).localeCompare(String(b.targetSettleNo)),
      )
      const batchAmount = round2(sortedLines.reduce((s, x) => s + (Number(x.amount) || 0), 0))
      const types = [...new Set(sortedLines.map((x) => x.targetType).filter(Boolean))]
      const targetTypeLabel = types.join(' / ') || '本期'
      const head = sortedLines[0]
      return sortedLines.map((line) => ({
        ...line,
        batchAmount,
        targetTypeLabel,
        partnerName: head.partnerName,
        entrySettleId: head.entrySettleId,
        entrySettleNo: head.entrySettleNo,
        entryPeriodKey: head.entryPeriodKey,
        paidAt: head.paidAt,
        paidBy: head.paidBy,
        remark: head.remark,
      }))
    })
    .filter((lines) => {
      const head = lines[0]
      if (!includesKw(head.partnerName, partner)) return false
      if (!inDateRange(head.bizDate || head.paidAt, dateRange)) return false
      const hay = lines
        .map(
          (x) =>
            `${x.targetSettleNo} ${x.entrySettleNo} ${x.batchId} ${x.periodKey} ${x.entryPeriodKey}`,
        )
        .join(' ')
      return includesKw(hay, docNo || keyword)
    })
    .sort((a, b) => String(b[0].paidAt).localeCompare(String(a[0].paidAt)))

  const numberedGroups = groups.map((lines, idx) => {
    const batchIndex = idx + 1
    return lines.map((line) => ({ ...line, batchIndex }))
  })
  const rows = numberedGroups.flat()

  return { rows, groups: numberedGroups }
}

/** 收票记录：拍平各对账单 invoiceRecords */
export function listPurchaseInvoiceFlowRecords(filters = {}) {
  const { partner = '', keyword = '', dateRange = null, docNo = '' } = filters
  const rows = []
  ;(purchaseSettleState.settles || []).forEach((s) => {
    ensureSettleInvoiceRecords(s).forEach((inv) => {
      rows.push({
        id: inv.id || `inv-${s.id}-${inv.invoiceNo}`,
        bizDate: String(inv.invoiceDate || inv.invoicedAt || '').slice(0, 10),
        partnerName: s.supplier || '',
        supplierId: s.supplierId || '',
        settleId: s.id,
        settleNo: s.settleNo || '',
        periodKey: s.periodKey || '',
        invoiceNo: inv.invoiceNo || '',
        amount: round2(inv.invoiceAmount),
        taxRate: inv.taxRate,
        taxAmount:
          inv.invoiceTaxAmount != null && inv.invoiceTaxAmount !== ''
            ? round2(inv.invoiceTaxAmount)
            : null,
        remark: inv.invoiceRemark || '',
        creator: inv.invoicer || '',
        createdAt: inv.invoicedAt || '',
      })
    })
  })
  return rows
    .filter((r) => includesKw(r.partnerName, partner))
    .filter((r) => includesKw(`${r.settleNo} ${r.invoiceNo} ${r.periodKey}`, docNo || keyword))
    .filter((r) => inDateRange(r.bizDate, dateRange))
    .sort(
      (a, b) =>
        String(b.bizDate).localeCompare(String(a.bizDate)) ||
        String(b.createdAt).localeCompare(String(a.createdAt)),
    )
}

/**
 * 客户往来台账：销售订单（应收增加）+ 回款流水（实收）+ 开票流水
 *
 * 列表口径（与供应商往来对称）：
 * - 期初应收 / 本期增加 / 本期实收 / 期末应收
 * - 本年应收 / 本年实收 / 本年累计往来
 * - 累计开票 / 欠票金额（票款分列，不卡回款）
 *   欠票 = Σ max(0, 计划节点金额 − 节点开票金额)
 */
import dayjs from 'dayjs'
import { salesOrderState } from '@/store/salesOrderStore'
import { salesPaymentState, ensureAllPaymentPlans } from '@/store/salesPaymentStore'
import { getSalesContractByNo } from '@/store/salesContractStore'
import { customerState, getCustomerByName } from '@/store/customerStore'
import {
  isSalesOrderApproved,
  normalizeSalesOrderProgressStatus,
  SALES_ORDER_STATUS,
} from '@/utils/salesOrderStatus'
import { roundNumber } from '@/utils/numberFormat'

function round2(n) {
  return roundNumber(Number(n) || 0, 2)
}

function orderReceivableAmount(order) {
  const n = Number(order?.amountInTax ?? order?.orderAmount ?? 0)
  return Number.isFinite(n) ? round2(n) : 0
}

function orderBizDate(order) {
  return String(order?.approvedAt || order?.documentDate || order?.createdAt || '').slice(0, 10)
}

function isReceivableOrder(order) {
  if (!order || !isSalesOrderApproved(order)) return false
  const st = normalizeSalesOrderProgressStatus(order.progressStatus)
  return st !== SALES_ORDER_STATUS.VOIDED
}

export function resolveCustomerLedgerPeriod(params = {}) {
  const year = Number(params.year) || dayjs().year()
  const monthRaw = params.month
  const month =
    monthRaw === '' || monthRaw == null || Number(monthRaw) === 0
      ? null
      : Math.min(12, Math.max(1, Number(monthRaw)))
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  let periodStart = yearStart
  let periodEnd = yearEnd
  let periodLabel = `${year}年`
  if (month) {
    const m = String(month).padStart(2, '0')
    periodStart = `${year}-${m}-01`
    periodEnd = dayjs(periodStart).endOf('month').format('YYYY-MM-DD')
    periodLabel = `${year}年${month}月`
  }
  return { year, month, periodStart, periodEnd, yearStart, yearEnd, periodLabel }
}

function inRange(date, start, end) {
  const at = String(date || '').slice(0, 10)
  return Boolean(at && at >= start && at <= end)
}

function before(date, start) {
  const at = String(date || '').slice(0, 10)
  return Boolean(at && at < start)
}

/**
 * @param {{ year?: number, month?: number|null }} params
 */
export function listCustomerLedgerSummaries(params = {}) {
  const { periodStart, periodEnd, yearStart, yearEnd } = resolveCustomerLedgerPeriod(params)

  void salesOrderState.orders
  void salesPaymentState.payments
  void customerState.customers

  const map = new Map()

  function ensure(customerName) {
    const name = String(customerName || '').trim()
    if (!name) return null
    if (!map.has(name)) {
      const master = getCustomerByName(name)
      map.set(name, {
        key: name,
        customerId: master?.id || '',
        customer: name,
        customerCode: master?.code || '',
        openingBalance: 0,
        periodIncrease: 0,
        periodReceived: 0,
        endingBalance: 0,
        yearReceivable: 0,
        yearReceived: 0,
        yearTurnover: 0,
        /** 累计开票（回款计划节点票面） */
        invoicedTotal: 0,
        /** 欠票：计划未开齐票面 */
        openInvoiceDebt: 0,
        periodInvoiced: 0,
        yearInvoiced: 0,
        orderCount: 0,
        _recvBeforePeriod: 0,
        _paidBeforePeriod: 0,
      })
    }
    return map.get(name)
  }

  salesOrderState.orders.forEach((o) => {
    if (!isReceivableOrder(o)) return
    const row = ensure(o.customerName)
    if (!row) return
    row.orderCount += 1
    const at = orderBizDate(o)
    const amt = orderReceivableAmount(o)
    if (before(at, periodStart)) {
      row._recvBeforePeriod = round2(row._recvBeforePeriod + amt)
    }
    if (inRange(at, periodStart, periodEnd)) {
      row.periodIncrease = round2(row.periodIncrease + amt)
    }
    if (inRange(at, yearStart, yearEnd)) {
      row.yearReceivable = round2(row.yearReceivable + amt)
    }
  })

  salesPaymentState.payments.forEach((p) => {
    const row = ensure(p.customerName)
    if (!row) return
    const at = String(p.receivedAt || p.createdAt || '').slice(0, 10)
    const amt = Number(p.amount) || 0
    if (before(at, periodStart)) {
      row._paidBeforePeriod = round2(row._paidBeforePeriod + amt)
    }
    if (inRange(at, periodStart, periodEnd)) {
      row.periodReceived = round2(row.periodReceived + amt)
    }
    if (inRange(at, yearStart, yearEnd)) {
      row.yearReceived = round2(row.yearReceived + amt)
    }
  })

  ensureAllPaymentPlans()
  void salesPaymentState.plans
  void salesPaymentState.invoices
  salesPaymentState.plans.forEach((plan) => {
    const customerName =
      String(plan.customerName || '').trim() ||
      String(getSalesContractByNo(plan.contractNo)?.customerName || '').trim()
    const row = ensure(customerName)
    if (!row) return
    const inv = Number(plan.invoiceAmount) || 0
    const planAmt = Number(plan.planAmount) || 0
    row.invoicedTotal = round2(row.invoicedTotal + inv)
    row.openInvoiceDebt = round2(row.openInvoiceDebt + Math.max(0, planAmt - inv))
  })
  ;(salesPaymentState.invoices || []).forEach((invRow) => {
    const customerName =
      String(invRow.customerName || '').trim() ||
      String(getSalesContractByNo(invRow.contractNo)?.customerName || '').trim()
    const row = ensure(customerName)
    if (!row) return
    const amt = Number(invRow.amount) || 0
    if (!(amt > 0)) return
    const invAt = String(invRow.invoiceDate || invRow.createdAt || '').slice(0, 10)
    if (inRange(invAt, periodStart, periodEnd)) {
      row.periodInvoiced = round2(row.periodInvoiced + amt)
    }
    if (inRange(invAt, yearStart, yearEnd)) {
      row.yearInvoiced = round2(row.yearInvoiced + amt)
    }
  })

  map.forEach((row) => {
    row.openingBalance = round2(row._recvBeforePeriod - row._paidBeforePeriod)
    row.endingBalance = round2(row.openingBalance + row.periodIncrease - row.periodReceived)
    row.yearTurnover = round2(row.yearReceivable + row.yearReceived)
    delete row._recvBeforePeriod
    delete row._paidBeforePeriod
  })

  return [...map.values()]
    .filter((r) => r.customer)
    .sort((a, b) => String(a.customer).localeCompare(String(b.customer), 'zh-CN'))
}

export function listCustomerLedgerEntries(customerName, params = {}) {
  const { periodStart, periodEnd, yearStart, yearEnd } = resolveCustomerLedgerPeriod(params)
  const rangeStart = params.month ? periodStart : yearStart
  const rangeEnd = params.month ? periodEnd : yearEnd
  const name = String(customerName || '').trim()
  const entries = []

  salesOrderState.orders.forEach((o) => {
    if (String(o.customerName || '').trim() !== name) return
    if (!isReceivableOrder(o)) return
    const at = orderBizDate(o)
    if (!inRange(at, rangeStart, rangeEnd)) return
    entries.push({
      id: `so-${o.id}`,
      bizDate: at,
      type: '销售订单',
      docNo: o.orderNo,
      orderId: o.id,
      debit: orderReceivableAmount(o),
      credit: 0,
      remark: o.progressStatus || '',
    })
  })

  salesPaymentState.payments.forEach((p) => {
    if (String(p.customerName || '').trim() !== name) return
    const at = String(p.receivedAt || p.createdAt || '').slice(0, 10)
    if (!inRange(at, rangeStart, rangeEnd)) return
    entries.push({
      id: `hk-${p.id}`,
      bizDate: at,
      type: '回款',
      docNo: p.paymentNo,
      paymentId: p.id,
      debit: 0,
      credit: Number(p.amount) || 0,
      remark: [p.nodeName, p.contractNo, p.remark].filter(Boolean).join(' · '),
    })
  })

  ensureAllPaymentPlans()
  ;(salesPaymentState.invoices || []).forEach((invRow) => {
    const customerName =
      String(invRow.customerName || '').trim() ||
      String(getSalesContractByNo(invRow.contractNo)?.customerName || '').trim()
    if (customerName !== name) return
    const amt = Number(invRow.amount) || 0
    if (!(amt > 0) && !String(invRow.invoiceNo || '').trim()) return
    const at = String(invRow.invoiceDate || invRow.createdAt || '').slice(0, 10)
    if (!inRange(at, rangeStart, rangeEnd)) return
    entries.push({
      id: `inv-${invRow.id}`,
      bizDate: at,
      type: '开票',
      docNo: invRow.invoiceRecordNo || invRow.invoiceNo || invRow.contractNo || '',
      contractNo: invRow.contractNo || '',
      debit: 0,
      credit: 0,
      amount: amt,
      remark: [invRow.nodeName, invRow.invoiceNo ? `发票 ${invRow.invoiceNo}` : '', invRow.remark]
        .filter(Boolean)
        .join(' · '),
    })
  })

  return entries.sort((a, b) => String(b.bizDate).localeCompare(String(a.bizDate)))
}

/**
 * 供应商往来台账：由采购对账单 + 争议挂账汇总
 *
 * 列表口径：
 * - 期初应付 / 本期增加 / 本期实付 / 期末应付（相对所选账期）
 * - 本年应付 / 本年实付 / 挂起争议 / 本年累计往来
 * - 累计收票 / 欠票金额（票款分列展示，不卡付款）
 *   欠票 = Σ max(0, 已确认应付 − 该单累计票面)
 */
import dayjs from 'dayjs'
import {
  purchaseSettleState,
  PURCHASE_SETTLE_STATUS,
  settleInvoicedTotal,
  ensureSettleInvoiceRecords,
} from '@/store/purchaseSettleStore'
import {
  purchaseDisputeAccrualState,
  DISPUTE_ACCRUAL_STATUS,
} from '@/store/purchaseDisputeAccrualStore'
import { supplierState } from '@/store/supplierStore'
import { roundNumber } from '@/utils/numberFormat'

function round2(n) {
  return roundNumber(Number(n) || 0, 2)
}

function settleConfirmAmount(settle) {
  if (!settle) return 0
  if (settle.confirmedAmount != null && settle.confirmedAmount !== '') {
    return Number(settle.confirmedAmount) || 0
  }
  const book =
    settle.bookAmount != null && settle.bookAmount !== ''
      ? Number(settle.bookAmount) || 0
      : Number(settle.totalAmount) || 0
  return round2(book - (Number(settle.disputeAmount) || 0))
}

/**
 * 解析账期：year + month(1-12，空/0=全年)
 * @returns {{ year: number, month: number|null, periodStart: string, periodEnd: string, yearStart: string, yearEnd: string, periodLabel: string }}
 */
export function resolveSupplierLedgerPeriod(params = {}) {
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
export function listSupplierLedgerSummaries(params = {}) {
  const { periodStart, periodEnd, yearStart, yearEnd } = resolveSupplierLedgerPeriod(params)

  void purchaseSettleState.settles
  void purchaseDisputeAccrualState.accruals
  void supplierState.suppliers

  const map = new Map()

  function ensure(supplierId, supplierName) {
    const key = supplierId || supplierName
    if (!key) return null
    if (!map.has(key)) {
      const master =
        (supplierId && supplierState.suppliers.find((s) => s.id === supplierId)) ||
        supplierState.suppliers.find((s) => s.name === supplierName)
      map.set(key, {
        key,
        supplierId: supplierId || master?.id || '',
        supplier: supplierName || master?.name || '',
        supplierCode: master?.code || '',
        openingBalance: 0,
        periodIncrease: 0,
        periodPaid: 0,
        endingBalance: 0,
        yearPayable: 0,
        yearPaid: 0,
        openDisputeAmount: 0,
        yearTurnover: 0,
        /** 名下已确认单累计票面 */
        invoicedTotal: 0,
        /** 欠票：已确认未收齐票面合计 */
        openInvoiceDebt: 0,
        periodInvoiced: 0,
        yearInvoiced: 0,
        settleCount: 0,
        _payableBeforePeriod: 0,
        _paidBeforePeriod: 0,
      })
    }
    return map.get(key)
  }

  purchaseSettleState.settles.forEach((s) => {
    const row = ensure(s.supplierId, s.supplier)
    if (!row) return
    row.settleCount += 1

    if (s.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
      const confirmAt = String(s.confirmedAt || s.settleDate || s.createdAt || '').slice(0, 10)
      const due = settleConfirmAmount(s)
      const invoiced = settleInvoicedTotal(s)
      row.invoicedTotal = round2(row.invoicedTotal + invoiced)
      row.openInvoiceDebt = round2(row.openInvoiceDebt + Math.max(0, due - invoiced))

      if (before(confirmAt, periodStart)) {
        row._payableBeforePeriod = round2(row._payableBeforePeriod + due)
      }
      if (inRange(confirmAt, periodStart, periodEnd)) {
        row.periodIncrease = round2(row.periodIncrease + due)
      }
      if (inRange(confirmAt, yearStart, yearEnd)) {
        row.yearPayable = round2(row.yearPayable + due)
      }

      ensureSettleInvoiceRecords(s).forEach((inv) => {
        const invAt = String(inv.invoiceDate || inv.invoicedAt || '').slice(0, 10)
        const amt = Number(inv.invoiceAmount) || 0
        if (!(amt > 0)) return
        if (inRange(invAt, periodStart, periodEnd)) {
          row.periodInvoiced = round2(row.periodInvoiced + amt)
        }
        if (inRange(invAt, yearStart, yearEnd)) {
          row.yearInvoiced = round2(row.yearInvoiced + amt)
        }
      })
    }

    const paid = Number(s.paidAmount) || 0
    if (paid > 0) {
      const paidAt = String(s.lastPaidAt || s.confirmedAt || s.createdAt || '').slice(0, 10)
      if (before(paidAt, periodStart)) {
        row._paidBeforePeriod = round2(row._paidBeforePeriod + paid)
      }
      if (inRange(paidAt, periodStart, periodEnd)) {
        row.periodPaid = round2(row.periodPaid + paid)
      }
      if (inRange(paidAt, yearStart, yearEnd)) {
        row.yearPaid = round2(row.yearPaid + paid)
      }
    }
  })

  purchaseDisputeAccrualState.accruals.forEach((a) => {
    if (a.status === DISPUTE_ACCRUAL_STATUS.CLOSED) return
    const row = ensure(a.supplierId, a.supplier)
    if (!row) return
    const remain = Math.max(0, round2((Number(a.amount) || 0) - (Number(a.writtenOffAmount) || 0)))
    row.openDisputeAmount = round2(row.openDisputeAmount + remain)
  })

  map.forEach((row) => {
    row.openingBalance = round2(row._payableBeforePeriod - row._paidBeforePeriod)
    row.endingBalance = round2(row.openingBalance + row.periodIncrease - row.periodPaid)
    row.yearTurnover = round2(row.yearPayable + row.yearPaid)
    delete row._payableBeforePeriod
    delete row._paidBeforePeriod
  })

  return [...map.values()]
    .filter((r) => r.supplier)
    .sort((a, b) => String(a.supplier).localeCompare(String(b.supplier), 'zh-CN'))
}

/** 某供应商往来流水（默认账期内；可传 year/month） */
export function listSupplierLedgerEntries(supplierIdOrName, params = {}) {
  const { periodStart, periodEnd, yearStart, yearEnd } = resolveSupplierLedgerPeriod(params)
  // 流水默认展示本年（含期初前发生的本年单据），若指定月份则只展示本期
  const rangeStart = params.month ? periodStart : yearStart
  const rangeEnd = params.month ? periodEnd : yearEnd
  const key = String(supplierIdOrName || '')
  const entries = []

  purchaseSettleState.settles.forEach((s) => {
    if (!(s.supplierId === key || s.supplier === key)) return

    if (s.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
      const at = String(s.confirmedAt || s.settleDate || '').slice(0, 10)
      if (inRange(at, rangeStart, rangeEnd)) {
        entries.push({
          id: `cf-${s.id}`,
          bizDate: at,
          type: '对账确认',
          docNo: s.settleNo,
          settleId: s.id,
          debit: settleConfirmAmount(s),
          credit: 0,
          remark: s.periodKey ? `账期 ${s.periodKey}` : '',
        })
      }
    }
    const paid = Number(s.paidAmount) || 0
    if (paid > 0) {
      const paidAt = String(s.lastPaidAt || s.confirmedAt || '').slice(0, 10)
      if (inRange(paidAt, rangeStart, rangeEnd)) {
        entries.push({
          id: `pay-${s.id}`,
          bizDate: paidAt,
          type: '付款',
          docNo: s.settleNo,
          settleId: s.id,
          debit: 0,
          credit: paid,
          remark: s.lastPaidRemark || '',
        })
      }
    }

    if (s.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
      ensureSettleInvoiceRecords(s).forEach((inv) => {
        const invAt = String(inv.invoiceDate || inv.invoicedAt || '').slice(0, 10)
        if (!inRange(invAt, rangeStart, rangeEnd)) return
        const amt = Number(inv.invoiceAmount) || 0
        entries.push({
          id: `inv-${inv.id || inv.invoiceNo}-${s.id}`,
          bizDate: invAt,
          type: '收票',
          docNo: s.settleNo,
          settleId: s.id,
          debit: 0,
          credit: 0,
          amount: amt,
          remark: `发票 ${inv.invoiceNo || '—'}${inv.invoiceRemark ? `／${inv.invoiceRemark}` : ''}`,
        })
      })
    }
  })

  purchaseDisputeAccrualState.accruals.forEach((a) => {
    if (!(a.supplierId === key || a.supplier === key)) return
    const at = String(a.createdAt || '').slice(0, 10)
    if (!inRange(at, rangeStart, rangeEnd)) return
    entries.push({
      id: `dis-${a.id}`,
      bizDate: at,
      type: a.status === DISPUTE_ACCRUAL_STATUS.CLOSED ? '争议核销' : '争议挂起',
      docNo: a.accrualNo,
      settleId: a.settleId,
      settleNo: a.settleNo,
      debit: 0,
      credit: 0,
      amount: Number(a.amount) || 0,
      remark: a.diffRemark || a.resolutionRemark || '',
      status: a.status,
    })
  })

  return entries.sort((a, b) => String(b.bizDate).localeCompare(String(a.bizDate)))
}

export function getSupplierLedgerSummary(supplierIdOrName, params = {}) {
  const list = listSupplierLedgerSummaries(params)
  return (
    list.find((r) => r.supplierId === supplierIdOrName || r.supplier === supplierIdOrName) || null
  )
}

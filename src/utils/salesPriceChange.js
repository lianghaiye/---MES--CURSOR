import { formatDiscountRatePercent, normalizeDiscountRate, round2 } from '@/utils/salesOrderPricing'
import { formatNumber } from '@/utils/numberFormat'
import { calcSalesLineAppliedShipQty } from '@/utils/salesLineShipped'

export const PRICE_CHANGE_STATUS = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

export const PRICE_CHANGE_REASON_OPTIONS = [
  { value: '客户增配', label: '客户增配' },
  { value: '客户取消订货', label: '客户取消订货' },
  { value: '设计变更', label: '设计变更' },
  { value: '材质升级', label: '材质升级' },
  { value: '工艺加价', label: '工艺加价' },
  { value: '材料涨价', label: '材料涨价' },
  { value: '交期调整', label: '交期调整' },
  { value: '其他', label: '其他' },
]

/** 订单变更可改的基本信息（不含销售单号） */
export const ORDER_CHANGE_HEADER_KEYS = [
  'urgency',
  'contractType',
  'contractNo',
  'settlementCurrency',
  'orderType',
  'customerName',
  'contactPerson',
  'contactPhone',
  'deliveryAddress',
  'deliveryMethod',
  'techSpecCode',
  'reminderDate',
  'salesperson',
  'settlementType',
  'paymentRatio',
  'downPaymentAmount',
  'remark',
]

export const ORDER_CHANGE_HEADER_LABELS = {
  urgency: '紧急度',
  contractType: '合同类型',
  contractNo: '合同编号',
  settlementCurrency: '结算币种',
  orderType: '订单类型',
  customerName: '客户名称',
  contactPerson: '联系人',
  contactPhone: '联系人电话',
  deliveryAddress: '交货地址',
  deliveryMethod: '交货方式',
  techSpecCode: '技术规范编码',
  reminderDate: '提醒日期',
  salesperson: '业务员',
  settlementType: '结算类型',
  paymentRatio: '付款比例',
  downPaymentAmount: '首付/定金金额',
  remark: '备注',
}

function headerScalar(key, value) {
  if (key === 'downPaymentAmount') {
    if (value == null || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (key === 'reminderDate') {
    if (!value) return ''
    if (typeof value?.format === 'function') return value.format('YYYY-MM-DD')
    return String(value).slice(0, 10)
  }
  if (value == null || value === undefined) return ''
  return value
}

export function snapshotOrderChangeHeader(order = {}) {
  const snap = {}
  ORDER_CHANGE_HEADER_KEYS.forEach((key) => {
    snap[key] = headerScalar(key, order[key])
  })
  return snap
}

export function isOrderChangeHeaderChanged(oldHeader = {}, newHeader = {}) {
  return ORDER_CHANGE_HEADER_KEYS.some(
    (key) =>
      String(headerScalar(key, oldHeader[key]) ?? '') !==
      String(headerScalar(key, newHeader[key]) ?? ''),
  )
}

function formatHeaderDiffValue(key, value) {
  const v = headerScalar(key, value)
  if (key === 'downPaymentAmount') {
    if (v == null || v === '') return '—'
    return `￥${Number(v).toFixed(2)}`
  }
  if (v == null || v === '') return '—'
  return String(v)
}

export function listOrderChangeHeaderDiffs(oldHeader = {}, newHeader = {}) {
  return ORDER_CHANGE_HEADER_KEYS.filter(
    (key) =>
      String(headerScalar(key, oldHeader[key]) ?? '') !==
      String(headerScalar(key, newHeader[key]) ?? ''),
  ).map((key) => ({
    key,
    label: ORDER_CHANGE_HEADER_LABELS[key] || key,
    oldValue: formatHeaderDiffValue(key, oldHeader[key]),
    newValue: formatHeaderDiffValue(key, newHeader[key]),
  }))
}

/** 未发部分仍有余量时才可「取消行」（已全部占用发货则不可） */
export function canCancelPriceChangeLine(row) {
  if (!row || row.cancelled || row.oldCancelled) return false
  const oldQty = Number(row.oldQty ?? row.qty) || 0
  const applied = Number(row.appliedShipQty) || 0
  return oldQty > applied + 1e-9
}

export function priceChangeStatusColor(status) {
  if (status === PRICE_CHANGE_STATUS.APPROVED) return 'success'
  if (status === PRICE_CHANGE_STATUS.REJECTED) return 'error'
  if (status === PRICE_CHANGE_STATUS.PENDING) return 'warning'
  return 'default'
}

export function lineChangeAmount(qty, unitPrice) {
  return round2((Number(qty) || 0) * (Number(unitPrice) || 0))
}

/** 取该销售行最近一次已通过价格变更的新单价；无变更则返回 null */
export function pickLatestApprovedLinePrices(changes = [], salesLineId) {
  if (!salesLineId) return null
  const approved = (changes || [])
    .filter((c) => c.status === PRICE_CHANGE_STATUS.APPROVED)
    .slice()
    .sort((a, b) =>
      String(b.approvedAt || b.createdAt || '').localeCompare(
        String(a.approvedAt || a.createdAt || ''),
      ),
    )
  for (const change of approved) {
    const row = (change.lines || []).find((r) => r.salesLineId === salesLineId)
    if (!row) continue
    const ex = Number(row.newUnitPriceExTax)
    const inc = Number(row.newUnitPriceInTax)
    if (!Number.isFinite(ex) && !Number.isFinite(inc)) continue
    return {
      unitPriceExTax: Number.isFinite(ex) ? ex : 0,
      unitPriceInTax: Number.isFinite(inc) ? inc : 0,
    }
  }
  return null
}

function lineDiscountAmount(listPrice, qty, discountRate) {
  const rate = normalizeDiscountRate(discountRate, 1)
  return round2(
    Math.max(0, (Number(listPrice) || 0) * (Number(qty) || 0) * (1 - Math.min(rate, 1))),
  )
}

function deriveInTax(ex, taxRate) {
  return round2((Number(ex) || 0) * (1 + (Number(taxRate) || 0) / 100))
}

function deriveExTax(inc, taxRate) {
  const rate = Number(taxRate) || 0
  const inTax = Number(inc) || 0
  return rate >= 0 ? round2(inTax / (1 + rate / 100)) : round2(inTax)
}

export function isPriceChangeLineChanged(row) {
  if (!row) return false
  if (Boolean(row.cancelled) !== Boolean(row.oldCancelled)) return true
  if (String(row.newDeliveryDate || '') !== String(row.oldDeliveryDate || '')) return true
  const checks = [
    [row.newUnitPriceExTax, row.oldUnitPriceExTax],
    [row.newUnitPriceInTax, row.oldUnitPriceInTax],
    [row.newLineDiscountRate, row.oldLineDiscountRate],
    [row.newQty, row.oldQty],
    [row.newTaxRate, row.oldTaxRate],
  ]
  return checks.some(([a, b]) => Math.abs((Number(a) || 0) - (Number(b) || 0)) > 1e-9)
}

export function buildPriceChangeDraftLines(order) {
  return (order?.lineItems || [])
    .filter((line) => line.productName || line.productCode)
    .map((line) => {
      const qty = Number(line.salesQty ?? line.qty) || 0
      const taxRate = Number(line.taxRate) || 0
      const deliveryDate = line.deliveryDate ? String(line.deliveryDate).slice(0, 10) : ''
      const appliedShipQty = calcSalesLineAppliedShipQty(order, line)
      const oldUnitPriceExTax = round2(Number(line.unitPriceExTax) || 0)
      const oldUnitPriceInTax = round2(
        Number(line.unitPriceInTax) || deriveInTax(oldUnitPriceExTax, taxRate),
      )
      const listUnitPriceExTax = round2(Number(line.listUnitPriceExTax) || oldUnitPriceExTax)
      const oldLineDiscountRate = normalizeDiscountRate(line.lineDiscountRate, 1)
      const alreadyCancelled = Boolean(line.cancelled)
      const row = {
        salesLineId: line.id,
        productCode: line.productCode || '',
        productName: line.productName || '',
        specModel: line.specModel || '',
        material: line.material || '',
        unit: line.unit || '',
        qty,
        oldQty: qty,
        newQty: qty,
        appliedShipQty,
        oldDeliveryDate: deliveryDate,
        newDeliveryDate: deliveryDate,
        oldTaxRate: taxRate,
        newTaxRate: taxRate,
        taxRate,
        oldCancelled: alreadyCancelled,
        cancelled: alreadyCancelled,
        listUnitPriceExTax,
        oldUnitPriceExTax,
        oldUnitPriceInTax,
        newUnitPriceExTax: oldUnitPriceExTax,
        newUnitPriceInTax: oldUnitPriceInTax,
        oldLineDiscountRate,
        newLineDiscountRate: oldLineDiscountRate,
        oldLineDiscountAmount: round2(Number(line.lineDiscountAmount) || 0),
        newLineDiscountAmount: round2(Number(line.lineDiscountAmount) || 0),
      }
      return recalcPriceChangeLine(row, { taxModeExcluding: true, editMode: 'unitPrice' })
    })
}

export function recalcPriceChangeLine(row, options = {}) {
  const taxModeExcluding = options.taxModeExcluding !== false
  const editMode = options.editMode || 'unitPrice'
  const oldQty = Number(row.oldQty ?? row.qty) || 0
  const minQty = Number(row.appliedShipQty) || 0
  let newQty = Number(row.newQty ?? row.qty) || 0
  if (row.cancelled) newQty = minQty
  if (newQty < minQty) newQty = minQty
  const oldTaxRate = Number(row.oldTaxRate ?? row.taxRate) || 0
  const newTaxRate = Number(row.newTaxRate ?? row.taxRate) || 0
  const listPrice = Number(row.listUnitPriceExTax) || Number(row.oldUnitPriceExTax) || 0
  row.oldQty = oldQty
  row.newQty = newQty
  row.qty = newQty
  row.oldTaxRate = oldTaxRate
  row.newTaxRate = newTaxRate
  row.taxRate = newTaxRate
  row.listUnitPriceExTax = round2(listPrice)

  row.oldUnitPriceExTax = round2(Number(row.oldUnitPriceExTax) || 0)
  row.oldUnitPriceInTax = round2(
    Number(row.oldUnitPriceInTax) || deriveInTax(row.oldUnitPriceExTax, oldTaxRate),
  )
  row.oldAmountExTax = lineChangeAmount(oldQty, row.oldUnitPriceExTax)
  row.oldAmountInTax = lineChangeAmount(oldQty, row.oldUnitPriceInTax)
  row.oldLineDiscountRate = normalizeDiscountRate(row.oldLineDiscountRate, 1)
  row.oldLineDiscountAmount = lineDiscountAmount(listPrice, oldQty, row.oldLineDiscountRate)

  if (editMode === 'discount') {
    const rate = normalizeDiscountRate(row.newLineDiscountRate, 1)
    row.newLineDiscountRate = rate
    row.newUnitPriceExTax = round2(listPrice * rate)
    row.newUnitPriceInTax = deriveInTax(row.newUnitPriceExTax, newTaxRate)
  } else if (taxModeExcluding) {
    row.newUnitPriceExTax = round2(Number(row.newUnitPriceExTax) || 0)
    row.newUnitPriceInTax = deriveInTax(row.newUnitPriceExTax, newTaxRate)
    row.newLineDiscountRate = normalizeDiscountRate(row.newLineDiscountRate, 1)
  } else {
    row.newUnitPriceInTax = round2(Number(row.newUnitPriceInTax) || 0)
    row.newUnitPriceExTax = deriveExTax(row.newUnitPriceInTax, newTaxRate)
    row.newLineDiscountRate = normalizeDiscountRate(row.newLineDiscountRate, 1)
  }

  row.newAmountExTax = lineChangeAmount(newQty, row.newUnitPriceExTax)
  row.newAmountInTax = lineChangeAmount(newQty, row.newUnitPriceInTax)
  row.newLineDiscountAmount = lineDiscountAmount(listPrice, newQty, row.newLineDiscountRate)
  row.deltaAmountExTax = round2(row.newAmountExTax - row.oldAmountExTax)
  row.deltaAmountInTax = round2(row.newAmountInTax - row.oldAmountInTax)
  return row
}

export function summarizePriceChangeLines(lines = []) {
  const changed = (lines || []).filter(isPriceChangeLineChanged)
  const oldAmountExTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.oldAmountExTax) || 0), 0),
  )
  const newAmountExTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.newAmountExTax) || 0), 0),
  )
  const oldAmountInTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.oldAmountInTax) || 0), 0),
  )
  const newAmountInTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.newAmountInTax) || 0), 0),
  )
  return {
    changedCount: changed.length,
    oldAmountExTax,
    newAmountExTax,
    deltaAmountExTax: round2(newAmountExTax - oldAmountExTax),
    oldAmountInTax,
    newAmountInTax,
    deltaAmountInTax: round2(newAmountInTax - oldAmountInTax),
    changedLines: changed,
  }
}

export function normalizePriceChangeLine(row, taxModeExcluding = true) {
  const next = { ...row }
  if (next.oldQty == null) next.oldQty = next.qty
  if (next.newQty == null) next.newQty = next.qty
  if (next.oldTaxRate == null || next.oldTaxRate === '') next.oldTaxRate = next.taxRate ?? 13
  if (next.newTaxRate == null || next.newTaxRate === '') next.newTaxRate = next.taxRate ?? 13
  if (next.taxRate == null || next.taxRate === '') next.taxRate = next.newTaxRate
  if (next.oldDeliveryDate == null) next.oldDeliveryDate = next.deliveryDate || ''
  if (next.newDeliveryDate == null) next.newDeliveryDate = next.deliveryDate || next.oldDeliveryDate
  if (next.oldCancelled == null) next.oldCancelled = false
  if (next.cancelled == null) next.cancelled = false
  if (next.appliedShipQty == null) next.appliedShipQty = 0
  if (next.listUnitPriceExTax == null || next.listUnitPriceExTax === '') {
    next.listUnitPriceExTax = next.oldUnitPriceExTax
  }
  if (next.oldLineDiscountRate == null || next.oldLineDiscountRate === '') {
    next.oldLineDiscountRate = 1
  }
  if (next.newLineDiscountRate == null || next.newLineDiscountRate === '') {
    next.newLineDiscountRate = next.oldLineDiscountRate
  }
  return recalcPriceChangeLine(next, { taxModeExcluding, editMode: 'unitPrice' })
}

export function normalizePriceChangeRecord(record) {
  if (!record) return record
  const taxModeExcluding = record.taxModeExcluding !== false
  const lines = (record.lines || []).map((row) => normalizePriceChangeLine(row, taxModeExcluding))
  const summary = summarizePriceChangeLines(lines)
  return {
    ...record,
    taxModeExcluding,
    oldCustomerName: record.oldCustomerName || record.headerOld?.customerName || '',
    newCustomerName:
      record.newCustomerName || record.headerNew?.customerName || record.oldCustomerName || '',
    headerOld:
      record.headerOld ||
      snapshotOrderChangeHeader({
        customerName: record.oldCustomerName,
      }),
    headerNew:
      record.headerNew ||
      snapshotOrderChangeHeader({
        customerName: record.newCustomerName || record.oldCustomerName,
      }),
    lines,
    oldAmountExTax: summary.oldAmountExTax,
    newAmountExTax: summary.newAmountExTax,
    deltaAmountExTax: summary.deltaAmountExTax,
    oldAmountInTax: summary.oldAmountInTax,
    newAmountInTax: summary.newAmountInTax,
    deltaAmountInTax: summary.deltaAmountInTax,
  }
}

export function formatPriceChangeDiscount(rate) {
  return formatDiscountRatePercent(rate)
}

/** 金额展示：有小数显示有效小数，无小数显示整数；带千分位 */
function formatGroupedSmartMoney(absVal, maxDecimals = 2) {
  const text = formatNumber(absVal, maxDecimals, { empty: '' })
  if (!text) return '—'
  const neg = text.startsWith('-')
  const raw = neg ? text.slice(1) : text
  const [intPart, dec] = raw.split('.')
  const withSep = Number(intPart).toLocaleString('zh-CN')
  return `${neg ? '-' : ''}${withSep}${dec != null ? `.${dec}` : ''}`
}

export function formatPriceChangeMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  const prefix = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${prefix}￥${formatGroupedSmartMoney(Math.abs(n))}`
}

export function formatPriceChangeAbsMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}￥${formatGroupedSmartMoney(Math.abs(n))}`
}

export function isCustomerChanged(change = {}) {
  const oldName = String(change.oldCustomerName || '').trim()
  const newName = String(change.newCustomerName || '').trim()
  return Boolean(oldName && newName && oldName !== newName)
}

export function formatCustomerChangeHint(oldName, newName) {
  return `原客户：${oldName || '—'} → 新客户：${newName || '—'}`
}

export function buildPriceChangeApprovalGroups(changes = []) {
  return (changes || []).map((change) => {
    const oldCustomerName = String(change.oldCustomerName || '').trim()
    const newCustomerName = String(change.newCustomerName || oldCustomerName).trim()
    const customerChanged = isCustomerChanged({ oldCustomerName, newCustomerName })
    const items = [
      {
        name: change.submitter || change.creator || '—',
        role: '订单变更申请',
        result: '已提交',
        time: change.submittedAt || change.createdAt || '—',
        opinion: [change.reasonType, change.reason].filter(Boolean).join('：'),
      },
    ]
    if (
      change.status === PRICE_CHANGE_STATUS.APPROVED ||
      change.status === PRICE_CHANGE_STATUS.REJECTED
    ) {
      items.push({
        name: change.approver || '—',
        role: change.autoApproved ? '系统自动审批' : '订单变更审核',
        result: change.status === PRICE_CHANGE_STATUS.APPROVED ? '已通过' : '已驳回',
        time: change.approvedAt || '—',
        opinion: change.opinion || '',
      })
    } else {
      items.push({
        name: '—',
        role: '订单变更审核',
        result: '待审核',
        time: '',
        opinion: '',
      })
    }
    return {
      id: change.id,
      changeNo: change.changeNo,
      status: change.status,
      reasonType: change.reasonType,
      oldCustomerName,
      newCustomerName,
      customerName: newCustomerName || oldCustomerName,
      customerHint: customerChanged
        ? formatCustomerChangeHint(oldCustomerName, newCustomerName)
        : newCustomerName
          ? `客户名称：${newCustomerName}`
          : '',
      items,
    }
  })
}

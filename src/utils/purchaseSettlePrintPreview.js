/**
 * 采购对账单打印预览：与销售/采购订单同款 sessionStorage + 新窗口预览
 */
import { getCompanyProfile } from '@/store/companyProfileStore'
import { getSupplierById, getSupplierByName } from '@/store/supplierStore'
import { resolveSettleFundOverview } from '@/store/purchaseSettleStore'
import { inboundOrderState } from '@/store/inboundOrderStore'

const STORAGE_PREFIX = 'purchase-settle-print-preview:'

function formatPrintFieldValue(value) {
  if (value === 0) return '0'
  return String(value ?? '').trim()
}

function formatPrintMoney(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPrintQty(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Math.round(n * 10000) / 10000)
}

/** 统一打印字段标签（兼容旧预览缓存文案） */
function normalizePrintLabel(label) {
  if (label === '对账联系人' || label === '供应商联系人') return '联系人'
  return label
}

function mapPrintFields(fields) {
  return fields.map((field) => ({
    ...field,
    label: normalizePrintLabel(field.label),
    value: formatPrintFieldValue(field.value),
  }))
}

function resolveSettleSupplier(settle) {
  if (!settle) return null
  return (
    (settle.supplierId && getSupplierById(settle.supplierId)) ||
    getSupplierByName(settle.supplier) ||
    null
  )
}

function displayPeriodWindow(settle) {
  const start = String(settle?.periodStart || '').slice(0, 10)
  const end = String(settle?.periodEnd || '').slice(0, 10)
  if (start && end) return `${start} ~ ${end}`
  if (start || end) return start || end
  return settle?.periodKey || ''
}

function displayPaymentTermDays(settle) {
  const days = Number(settle?.paymentTermDays)
  if (Number.isFinite(days) && days > 0) return `${days} 天`
  return ''
}

function pickSupplierContact(supplier) {
  const list = Array.isArray(supplier?.contacts) ? supplier.contacts : []
  const hit = list.find((c) => /对账|财务|结算/.test(String(c.title || ''))) || list[0] || null
  if (!hit) return { name: '', phone: '', title: '' }
  return {
    name: hit.name || '',
    phone: hit.phone || '',
    title: hit.title || '',
  }
}

/** 旧单缺规格/材质时，尽量从入库行补齐 */
function resolveLineSpecMaterial(line) {
  let specModel = line?.specModel || ''
  let material = line?.material || ''
  if ((specModel && material) || !line?.inboundOrderId || !line?.inboundLineId) {
    return { specModel, material }
  }
  const inbound = inboundOrderState.orders.find((o) => o.id === line.inboundOrderId)
  const ibLine = inbound?.lineItems?.find((l) => l.id === line.inboundLineId)
  if (!ibLine) return { specModel, material }
  if (!specModel) specModel = ibLine.specModel || ''
  if (!material) material = ibLine.material || ''
  return { specModel, material }
}

function formatQtyWithUnit(qty, unit) {
  const q = formatPrintQty(qty)
  const u = formatPrintFieldValue(unit)
  if (!q && !u) return ''
  if (!u) return q
  if (!q) return u
  return `${q}${u}`
}

export function buildPurchaseSettlePrintPayload(settle, options = {}) {
  if (!settle) return null

  const company = getCompanyProfile()
  const supplier = resolveSettleSupplier(settle)
  const fund = resolveSettleFundOverview(settle)
  const contact = pickSupplierContact(supplier)

  const lineItems = (settle.lineItems || []).map((line, index) => {
    const { specModel, material } = resolveLineSpecMaterial(line)
    return {
      seq: index + 1,
      purchaseOrderNo: formatPrintFieldValue(line.purchaseOrderNo || settle.purchaseOrderNo),
      itemCode: formatPrintFieldValue(line.itemCode),
      itemName: formatPrintFieldValue(line.itemName),
      specModel: formatPrintFieldValue(specModel),
      material: formatPrintFieldValue(material),
      qtyText: formatQtyWithUnit(line.settleQty, line.settleUnit),
      unitPrice: formatPrintMoney(line.unitPrice),
      amount: formatPrintMoney(line.amount),
      remark: formatPrintFieldValue(line.remark || line.disputeRemark),
    }
  })

  const book =
    settle.bookAmount != null && settle.bookAmount !== '' ? settle.bookAmount : settle.totalAmount
  const confirmed =
    settle.confirmedAmount != null && settle.confirmedAmount !== '' ? settle.confirmedAmount : book

  const basicFields = mapPrintFields([
    { label: '供应商', value: settle.supplier },
    { label: '账期', value: settle.periodKey },
    { label: '结算起止', value: displayPeriodWindow(settle) },
    { label: '账期起算', value: settle.paymentTermStart || '对账日' },
    { label: '账期天数', value: displayPaymentTermDays(settle) },
  ])

  const invoiceFields = mapPrintFields([
    { label: '开票名称', value: company.invoiceName || company.companyName },
    { label: '纳税人识别号', value: company.invoiceTaxNo || company.unifiedSocialCreditCode },
    { label: '地址电话', value: company.invoiceAddressPhone },
    { label: '开户银行', value: company.openingBank },
    { label: '银行账号', value: company.bankAccount },
    {
      label: '联系人',
      value: [company.reconcileContactName, company.reconcileContactTitle]
        .filter(Boolean)
        .join(' / '),
    },
    { label: '联系电话', value: company.reconcileContactPhone },
  ])

  const paymentFields = mapPrintFields([
    {
      label: '收款户名',
      value: supplier?.invoiceName || supplier?.name || settle.supplier,
    },
    { label: '开户银行', value: supplier?.openingBank },
    { label: '银行账号', value: supplier?.bankAccount },
    {
      label: '联系人',
      value: [contact.name, contact.title].filter(Boolean).join(' / '),
    },
    { label: '联系电话', value: contact.phone },
  ])

  /** 期末 = 期初 + 本期应付 −（期初已付 + 本期已付） */
  const periodPaidTotal = Number(fund.openingPaid || 0) + Number(fund.periodPaid || 0)
  const fundOverview = {
    endingBalance: formatPrintMoney(fund.endingBalance),
    openingBalance: formatPrintMoney(fund.openingBalance),
    periodPayable: formatPrintMoney(fund.periodPayable),
    periodPaid: formatPrintMoney(periodPaidTotal),
  }

  return {
    orderNo: formatPrintFieldValue(settle.settleNo),
    title: '采购对账单',
    basicFields,
    invoiceFields,
    paymentFields,
    fundOverview,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      bookAmount: formatPrintMoney(book),
      confirmedAmount: formatPrintMoney(confirmed),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildPurchaseSettleBatchPrintPayload(rows, options = {}) {
  const sheets = (rows || [])
    .map((row) => buildPurchaseSettlePrintPayload(row, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function savePurchaseSettlePrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadPurchaseSettlePrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openPurchaseSettlePrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = savePurchaseSettlePrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'settlement-purchase-settle-preview', query })
  window.open(href, '_blank')
}

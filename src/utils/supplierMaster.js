import dayjs from 'dayjs'
import { SUPPLIER_ROLE } from '@/constants/supplierMaster'
import { normalizeContactRow } from '@/utils/customerMaster'

export function createEmptyMainMaterial(partial = {}) {
  return {
    id: `smat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    materialCode: '',
    materialName: '',
    specModel: '',
    remark: '',
    ...partial,
  }
}

export function createDefaultSupplierForm(partial = {}) {
  return {
    code: '',
    name: '',
    shortName: '',
    supplierRoles: [],
    supplierCategoryId: undefined,
    enterpriseScale: undefined,
    remark: '',
    settlementMethod: '银行转账',
    settlementType: '先货后款',
    settlementCycle: '月结',
    paymentTermStart: '对账日',
    paymentTermDays: 30,
    paymentMethod: undefined,
    supplyCycleDays: undefined,
    minOrderQty: undefined,
    quoteMethod: undefined,
    mainMaterials: [],
    unifiedSocialCreditCode: '',
    legalRepresentative: '',
    registeredCapital: '',
    establishedDate: '',
    industry: '',
    businessLicenseFiles: [],
    contacts: [],
    openingBank: '',
    bankAccount: '',
    invoiceName: '',
    invoiceTaxNo: '',
    invoiceAddressPhone: '',
    defaultInvoiceType: undefined,
    invoiceRecipientInfo: '',
    status: '启用',
    ...partial,
  }
}

function normalizeLicenseFile(file) {
  if (!file) return null
  if (typeof file === 'string') return { name: file, size: '' }
  return { name: file.name || '', size: file.size || '' }
}

function normalizeSupplierRoles(roles) {
  if (!Array.isArray(roles)) return []
  return roles.filter((role) => role === SUPPLIER_ROLE.OUTSOURCE || role === SUPPLIER_ROLE.PURCHASE)
}

export function normalizeSupplierRecord(row = {}) {
  const form = createDefaultSupplierForm(row)
  form.supplierRoles = normalizeSupplierRoles(row.supplierRoles || row.supplierTypes)
  if (!Array.isArray(form.mainMaterials)) form.mainMaterials = []
  form.mainMaterials = form.mainMaterials.map((item) => createEmptyMainMaterial(item))
  if (!Array.isArray(form.businessLicenseFiles)) form.businessLicenseFiles = []
  form.businessLicenseFiles = form.businessLicenseFiles
    .map(normalizeLicenseFile)
    .filter((item) => item?.name)
  if (!Array.isArray(form.contacts)) form.contacts = row.contacts || []
  form.contacts = form.contacts.map(normalizeContactRow)
  if (!form.invoiceName && form.name) form.invoiceName = form.name
  if (!form.invoiceTaxNo && form.unifiedSocialCreditCode) {
    form.invoiceTaxNo = form.unifiedSocialCreditCode
  }
  // 旧「付款方式」与结算方式/结算类型重复：加载时迁到正确字段后清空
  const legacyPay = String(form.paymentMethod || '').trim()
  if (legacyPay) {
    const instrumentMap = {
      现金: '现金结算',
      现金结算: '现金结算',
      银行转账: '银行转账',
      承兑汇票: '承兑汇票',
    }
    const tradeMap = {
      款到发货: '先款后货',
      货到付款: '先货后款',
      预付款: '预付款+发货付',
      预付定金发货前付款: '预付款+发货付',
      先款后货: '先款后货',
      先货后款: '先货后款',
      '预付款+货到付': '预付款+货到付',
      '预付款+发货付': '预付款+发货付',
    }
    if (!form.settlementMethod && instrumentMap[legacyPay]) {
      form.settlementMethod = instrumentMap[legacyPay]
    }
    if (!form.settlementType && tradeMap[legacyPay]) {
      form.settlementType = tradeMap[legacyPay]
    }
    form.paymentMethod = undefined
  }
  return {
    ...row,
    ...form,
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: row.updatedAt || dayjs().format('YYYY-MM-DD HH:mm'),
    creator: row.creator || 'admin',
    lastModifier: row.lastModifier || row.creator || 'admin',
  }
}

export function generateSupplierCode(existing = []) {
  const yy = dayjs().format('YY')
  const prefix = `GYS${yy}`
  const samePrefix = existing.filter((item) => String(item.code || '').startsWith(prefix))
  const maxSeq = samePrefix.reduce((max, item) => {
    const seq = Number(String(item.code).slice(prefix.length)) || 0
    return Math.max(max, seq)
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(5, '0')}`
}

import dayjs from 'dayjs'
import { CUSTOMER_GRADE } from '@/constants/customerMaster'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'

export function createEmptyAddress(partial = {}) {
  return {
    id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    addressType: '注册地址',
    country: '中国',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    zipCode: '',
    isDefault: false,
    consignee: '',
    consigneePhone: '',
    ...partial,
  }
}

export function createEmptyContact(partial = {}) {
  return {
    id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    title: '',
    phone: '',
    mobile: '',
    email: '',
    fax: '',
    isDefault: false,
    ...partial,
  }
}

function normalizeLicenseFile(file) {
  if (!file) return null
  if (typeof file === 'string') return { name: file, size: '' }
  return { name: file.name || '', size: file.size || '' }
}

function normalizeContactRow(row = {}) {
  if (typeof row === 'string') {
    return createEmptyContact({ name: row })
  }
  return createEmptyContact({
    id: row.id,
    name: row.name || row.contactPerson || '',
    title: row.title || row.contactTitle || '',
    phone: row.phone || row.contactPhone || '',
    mobile: row.mobile || row.contactMobile || '',
    email: row.email || row.contactEmail || '',
    fax: row.fax || row.contactFax || '',
    isDefault: Boolean(row.isDefault),
  })
}

export function mapCustomerPriceListForForm(list = []) {
  return (list || []).map((item) => ({
    ...item,
    agreementDiscountPercent:
      item.agreementDiscountPercent ??
      (item.agreementDiscountRate != null
        ? Number((normalizeDiscountRate(item.agreementDiscountRate) * 100).toFixed(2))
        : null),
  }))
}

export function mapCustomerPriceListForSave(list = []) {
  return (list || [])
    .filter((item) => item.productCode?.trim())
    .map((item) => ({
      id: item.id,
      productCode: item.productCode.trim(),
      productId: item.productId || '',
      agreementDiscountRate:
        item.agreementDiscountPercent != null
          ? normalizeDiscountRate(item.agreementDiscountPercent / 100, 1)
          : undefined,
      agreementUnitPriceExTax: item.agreementUnitPriceExTax ?? undefined,
    }))
}

export function createDefaultCustomerForm(partial = {}) {
  return {
    code: '',
    name: '',
    shortName: '',
    customerTypeId: undefined,
    customerGrade: CUSTOMER_GRADE.NORMAL,
    externalCode: '',
    salesperson: '',
    remark: '',
    unifiedSocialCreditCode: '',
    legalRepresentative: '',
    registeredCapital: '',
    establishedDate: '',
    industry: '',
    enterpriseScale: undefined,
    businessLicenseFiles: [],
    contacts: [],
    addresses: [],
    currency: 'CNY',
    settlementMethod: undefined,
    settlementCycle: undefined,
    settlementType: undefined,
    creditLimit: undefined,
    creditAvailableBalance: undefined,
    creditWarningPercent: 80,
    taxRate: 13,
    defaultDeliveryMethod: undefined,
    defaultCarrier: '',
    freightBearer: undefined,
    deliveryLeadTimeDays: undefined,
    packagingRequirements: '',
    specialRequirements: '',
    openingBank: '',
    bankAccount: '',
    invoiceName: '',
    invoiceTaxNo: '',
    invoiceAddressPhone: '',
    defaultInvoiceType: undefined,
    invoiceRecipientInfo: '',
    dataStatus: '草稿',
    orgBelonging: '默认工厂',
    extendedFields: {},
    priceLevel: '标准',
    defaultDiscountRate: 1,
    customerPriceList: [],
    status: '启用',
    ...partial,
  }
}

export function normalizeCustomerRecord(row = {}) {
  const form = createDefaultCustomerForm(row)
  if (!Array.isArray(form.addresses)) form.addresses = []
  if (!Array.isArray(form.businessLicenseFiles)) form.businessLicenseFiles = []
  form.businessLicenseFiles = form.businessLicenseFiles
    .map(normalizeLicenseFile)
    .filter((item) => item?.name)
  if (!Array.isArray(form.customerPriceList)) form.customerPriceList = row.customerPriceList || []
  form.customerPriceList = mapCustomerPriceListForForm(form.customerPriceList)
  if (form.defaultDiscountRate == null) form.defaultDiscountRate = 1
  if (!Array.isArray(form.contacts)) form.contacts = row.contacts || []
  if (!form.contacts.length && (row.contactPerson || row.contacts?.length)) {
    if (row.contactPerson) {
      form.contacts = [
        createEmptyContact({
          name: row.contactPerson,
          title: row.contactTitle,
          phone: row.contactPhone,
          mobile: row.contactMobile,
          email: row.contactEmail,
          fax: row.contactFax,
          isDefault: true,
        }),
      ]
    }
  }
  form.contacts = form.contacts.map(normalizeContactRow)
  const defaultContact =
    form.contacts.find((item) => item.isDefault) || form.contacts[0] || null
  form.contactPerson = defaultContact?.name || row.contactPerson || ''
  form.contactTitle = defaultContact?.title || row.contactTitle || ''
  form.contactPhone = defaultContact?.phone || row.contactPhone || ''
  form.contactMobile = defaultContact?.mobile || row.contactMobile || ''
  form.contactEmail = defaultContact?.email || row.contactEmail || ''
  form.contactFax = defaultContact?.fax || row.contactFax || ''
  if (!form.customerGrade) form.customerGrade = CUSTOMER_GRADE.NORMAL
  if (!form.dataStatus) form.dataStatus = row.status === '启用' ? '已审' : '草稿'
  if (!form.invoiceName && form.name) form.invoiceName = form.name
  if (!form.invoiceTaxNo && form.unifiedSocialCreditCode) {
    form.invoiceTaxNo = form.unifiedSocialCreditCode
  }
  if (!form.settlementCycle && ['月结', '周结', '半月结', '季结', '无'].includes(form.settlementMethod)) {
    form.settlementCycle = form.settlementMethod
    form.settlementMethod = undefined
  } else if (form.settlementMethod === '现结') {
    form.settlementCycle = form.settlementCycle || '无'
    form.settlementMethod = '现金结算'
  } else if (form.settlementMethod === '票据') {
    form.settlementCycle = form.settlementCycle || '无'
    form.settlementMethod = '承兑汇票'
  }
  form.contacts = form.contacts.map((item) => ({
    ...item,
    phone: item.phone || item.mobile || '',
  }))
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
    approver: row.approver || '',
    approvedAt: row.approvedAt || '',
  }
}

export function generateCustomerCode(existing = []) {
  const yy = dayjs().format('YY')
  const prefix = `KH${yy}`
  const samePrefix = existing.filter((c) => String(c.code || '').startsWith(prefix))
  const maxSeq = samePrefix.reduce((max, c) => {
    const seq = Number(String(c.code).slice(prefix.length)) || 0
    return Math.max(max, seq)
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(5, '0')}`
}

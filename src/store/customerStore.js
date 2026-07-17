import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createDefaultCustomerForm,
  generateCustomerCode,
  normalizeCustomerRecord,
} from '@/utils/customerMaster'

const STORAGE_KEY = 'i_doms_customers'
const DATA_VERSION = 3

const LEGACY_CUSTOMER_SEED = [
  { name: '测试人员', contacts: [{ name: 'TEST', phone: '16522033362' }] },
  { name: '人纷纷', contacts: [{ name: '张三', phone: '13800138000' }] },
  {
    name: '华东机械制造有限公司',
    contacts: [{ name: '李经理', phone: '021-88886666' }],
    unifiedSocialCreditCode: '91310000MA1FL3XX',
    legalRepresentative: '张三',
    registeredCapital: '5000万',
    establishedDate: '2010-06-15',
    industry: '通用设备制造业',
    enterpriseScale: '中型',
    contactPerson: '李经理',
    contactTitle: '采购经理',
    contactPhone: '021-88886666',
    contactMobile: '13800138001',
    contactEmail: 'purchase@example.com',
    customerGrade: '战略',
    customerTypeId: 'ctype-1',
    salesperson: '王五',
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    creditLimit: 500000,
    creditAvailableBalance: 320000,
    defaultDeliveryMethod: '送货',
    defaultCarrier: '顺丰物流',
    freightBearer: '买方',
    deliveryLeadTimeDays: 7,
    openingBank: '中国银行上海支行',
    bankAccount: '4512345678901234',
    invoiceName: '华东机械制造有限公司',
    invoiceTaxNo: '91310000MA1FL3XX',
    defaultInvoiceType: '增值税专用发票',
    dataStatus: '已审',
    priceLevel: 'VIP',
    defaultDiscountRate: 0.95,
    customerPriceList: [
      {
        id: 'cpl-1',
        productCode: 'PRD-YQST250',
        productId: '',
        agreementDiscountRate: 0.92,
      },
      {
        id: 'cpl-1b',
        productCode: 'CP2610001',
        productId: 'prod-00001',
        agreementDiscountRate: 0.9,
      },
    ],
  },
  {
    name: '华北水泵经销有限公司',
    contacts: [{ name: '赵采购', phone: '0311-55667788' }],
    contactPerson: '赵采购',
    contactPhone: '0311-55667788',
    contactMobile: '13900139001',
    customerGrade: 'A',
    customerTypeId: 'ctype-2',
    salesperson: '李四',
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    creditLimit: 300000,
    creditAvailableBalance: 210000,
    dataStatus: '已审',
    priceLevel: 'VIP',
    defaultDiscountRate: 0.92,
    customerPriceList: [
      {
        id: 'cpl-hb-1',
        productCode: 'CP2610001',
        productId: 'prod-00001',
        agreementDiscountRate: 0.88,
      },
      {
        id: 'cpl-hb-2',
        productCode: 'CP2610002',
        productId: 'prod-00002',
        agreementUnitPriceExTax: 12500,
      },
    ],
  },
  {
    name: '西南矿业设备集团',
    contacts: [{ name: '周工', phone: '028-66778899' }],
    contactPerson: '周工',
    contactPhone: '028-66778899',
    contactMobile: '13700137002',
    customerGrade: '战略',
    customerTypeId: 'ctype-1',
    salesperson: '王五',
    settlementMethod: '承兑汇票',
    settlementCycle: '季结',
    settlementType: '先款后货',
    creditLimit: 800000,
    creditAvailableBalance: 650000,
    dataStatus: '已审',
    priceLevel: '战略',
    defaultDiscountRate: 0.9,
    customerPriceList: [
      {
        id: 'cpl-xn-1',
        productCode: 'CP2610004',
        productId: 'prod-00004',
        agreementDiscountRate: 0.85,
      },
      {
        id: 'cpl-xn-2',
        productCode: 'CP2610003',
        productId: 'prod-00003',
        agreementUnitPriceExTax: 9800,
      },
    ],
  },
  {
    name: '江苏环保工程有限公司',
    contacts: [{ name: '吴经理', phone: '0512-88990011' }],
    contactPerson: '吴经理',
    contactPhone: '0512-88990011',
    contactMobile: '13600136003',
    customerGrade: 'B',
    customerTypeId: 'ctype-3',
    salesperson: 'admin1',
    settlementMethod: '现金结算',
    settlementCycle: '现结',
    settlementType: '先货后款',
    creditLimit: 150000,
    creditAvailableBalance: 120000,
    dataStatus: '已审',
    priceLevel: '标准',
    defaultDiscountRate: 0.97,
    customerPriceList: [
      {
        id: 'cpl-js-1',
        productCode: 'CP2610005',
        productId: 'prod-00005',
        agreementDiscountRate: 0.93,
      },
    ],
  },
  {
    name: '深圳海洋装备股份',
    contacts: [{ name: '陈总', phone: '0755-22334455' }],
    contactPerson: '陈总',
    contactPhone: '0755-22334455',
    contactMobile: '13500135004',
    customerGrade: 'A',
    customerTypeId: 'ctype-2',
    salesperson: '李四',
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    creditLimit: 600000,
    creditAvailableBalance: 480000,
    dataStatus: '已审',
    priceLevel: 'VIP',
    defaultDiscountRate: 0.94,
    customerPriceList: [
      {
        id: 'cpl-sz-1',
        productCode: 'CP2610002',
        productId: 'prod-00002',
        agreementDiscountRate: 0.91,
      },
      {
        id: 'cpl-sz-2',
        productCode: 'CP2610004',
        productId: 'prod-00004',
        agreementUnitPriceExTax: 15800,
      },
    ],
  },
]

function seedCustomers() {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  return LEGACY_CUSTOMER_SEED.map((item, index) =>
    normalizeCustomerRecord({
      ...createDefaultCustomerForm(item),
      id: `cust-${index + 1}`,
      code: `KH${dayjs().format('YY')}${String(10001 + index).slice(-5)}`,
      name: item.name,
      contacts: [...(item.contacts || [])],
      customerPriceList: item.customerPriceList || [],
      priceLevel: item.priceLevel || '标准',
      defaultDiscountRate: item.defaultDiscountRate ?? 1,
      creator: 'admin',
      lastModifier: 'admin',
      createdAt: now,
      updatedAt: now,
    }),
  )
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.customers)) {
        return parsed.customers.map(normalizeCustomerRecord)
      }
      if (Array.isArray(parsed.customers)) {
        return parsed.customers.map(normalizeCustomerRecord)
      }
    }
  } catch {
    /* ignore */
  }
  return seedCustomers()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, customers: customerState.customers }),
  )
}

export const customerState = reactive({
  customers: loadFromStorage(),
})

watch(
  () => customerState.customers,
  () => persist(),
  { deep: true },
)

export function getCustomerOptions() {
  return customerState.customers
    .filter((c) => c.status !== '停用' && c.dataStatus !== '作废')
    .map((c) => ({
      label: c.name,
      value: c.name,
      code: c.code || '',
      contacts: c.contacts || [],
      defaultDiscountRate: c.defaultDiscountRate ?? 1,
      customerPriceList: c.customerPriceList || [],
    }))
}

export function getCustomerByName(name) {
  return customerState.customers.find((c) => c.name === name) || null
}

export function getCustomerById(id) {
  return customerState.customers.find((c) => c.id === id) || null
}

export function addCustomer(payload) {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const record = normalizeCustomerRecord({
    ...createDefaultCustomerForm(payload),
    id: payload.id || `cust-${Date.now()}`,
    code: payload.code || generateCustomerCode(customerState.customers),
    creator: payload.creator || 'admin',
    lastModifier: payload.lastModifier || 'admin',
    createdAt: now,
    updatedAt: now,
  })
  customerState.customers.unshift(record)
  return record
}

export function updateCustomer(id, payload) {
  const index = customerState.customers.findIndex((c) => c.id === id)
  if (index < 0) return null
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const updated = normalizeCustomerRecord({
    ...customerState.customers[index],
    ...payload,
    id,
    updatedAt: now,
    lastModifier: payload.lastModifier || 'admin',
  })
  customerState.customers[index] = updated
  return updated
}

export function deleteCustomer(id) {
  const index = customerState.customers.findIndex((c) => c.id === id)
  if (index < 0) return { ok: false, message: '客户不存在' }
  customerState.customers.splice(index, 1)
  return { ok: true }
}

export function setCustomersStatus(ids, status, operator = 'admin') {
  if (!Array.isArray(ids) || !ids.length) {
    return { ok: false, message: '请先选择客户' }
  }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  let count = 0
  ids.forEach((id) => {
    const item = customerState.customers.find((row) => row.id === id)
    if (!item) return
    item.status = status
    item.updatedAt = now
    item.lastModifier = operator
    count += 1
  })
  if (!count) return { ok: false, message: '未找到可操作的客户' }
  return { ok: true, count }
}

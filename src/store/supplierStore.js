import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { SUPPLIER_ROLE } from '@/constants/supplierMaster'
import {
  createDefaultSupplierForm,
  generateSupplierCode,
  normalizeSupplierRecord,
} from '@/utils/supplierMaster'

const STORAGE_KEY = 'i_doms_suppliers'
const DATA_VERSION = 1

const LEGACY_SUPPLIER_SEED = [
  {
    code: 'SUP-001',
    name: '多功能供应商01',
    shortName: '多功能01',
    legacyType: '综合供应商',
    supplierRoles: [SUPPLIER_ROLE.OUTSOURCE, SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-1',
    enterpriseScale: '中型',
    supplyCycleDays: 7,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
    quoteMethod: '询价议价',
    contacts: [{ name: '张采购', phone: '021-66001101', title: '采购经理' }],
  },
  {
    code: 'SUP-002',
    name: '多功能供应商02',
    shortName: '多功能02',
    legacyType: '综合供应商',
    supplierRoles: [SUPPLIER_ROLE.OUTSOURCE, SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-1',
    enterpriseScale: '中型',
    supplyCycleDays: 10,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
  },
  {
    code: 'SUP-003',
    name: '采购供应商A',
    shortName: '采购A',
    legacyType: '综合供应商',
    supplierRoles: [SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-1',
    enterpriseScale: '小型',
    supplyCycleDays: 5,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
  },
  {
    code: 'SUP-004',
    name: '采购供应商B',
    shortName: '采购B',
    legacyType: '综合供应商',
    supplierRoles: [SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-1',
    enterpriseScale: '小型',
    supplyCycleDays: 8,
    settlementMethod: '承兑汇票',
    settlementCycle: '季结',
    settlementType: '先款后货',
    paymentMethod: '承兑汇票',
  },
  {
    code: 'SUP-005',
    name: 'SKF代理商',
    shortName: 'SKF',
    legacyType: '代理商',
    supplierRoles: [SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-4',
    enterpriseScale: '中型',
    supplyCycleDays: 14,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
    quoteMethod: '框架协议价',
  },
  {
    code: 'SUP-006',
    name: '标准件供应商',
    shortName: '标准件',
    legacyType: '标准件供应商',
    supplierRoles: [SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-2',
    enterpriseScale: '小型',
    supplyCycleDays: 3,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
  },
  {
    code: 'SUP-007',
    name: '华东外协加工中心',
    shortName: '华东外协',
    legacyType: '外协供应商',
    supplierRoles: [SUPPLIER_ROLE.OUTSOURCE],
    supplierCategoryId: 'scat-3',
    enterpriseScale: '中型',
    supplyCycleDays: 12,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
    quoteMethod: '询价议价',
  },
  {
    code: 'SUP-008',
    name: '精密机加外协厂',
    shortName: '精密机加',
    legacyType: '外协供应商',
    supplierRoles: [SUPPLIER_ROLE.OUTSOURCE],
    supplierCategoryId: 'scat-3',
    enterpriseScale: '小型',
    supplyCycleDays: 15,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
  },
  {
    code: 'SUP-009',
    name: '轴承专营代理商',
    shortName: '轴承代理',
    legacyType: '代理商',
    supplierRoles: [SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-4',
    enterpriseScale: '小型',
    supplyCycleDays: 7,
    settlementMethod: '银行转账',
    settlementCycle: '月结',
    settlementType: '先货后款',
    paymentMethod: '银行转账',
  },
  {
    code: 'SUP-010',
    name: '密封件标准件厂',
    shortName: '密封件',
    legacyType: '标准件供应商',
    supplierRoles: [SUPPLIER_ROLE.PURCHASE],
    supplierCategoryId: 'scat-2',
    enterpriseScale: '小型',
    supplyCycleDays: 5,
    settlementMethod: '现金结算',
    settlementCycle: '无',
    settlementType: '先款后货',
    paymentMethod: '现金结算',
  },
]

function seedSuppliers() {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  return LEGACY_SUPPLIER_SEED.map((item, index) =>
    normalizeSupplierRecord({
      ...createDefaultSupplierForm(item),
      id: `sup-${index + 1}`,
      code: item.code,
      name: item.name,
      creator: 'admin',
      lastModifier: 'admin',
      createdAt: now,
      updatedAt: now,
      status: '启用',
    }),
  )
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.suppliers)) {
        return parsed.suppliers.map(normalizeSupplierRecord)
      }
      if (Array.isArray(parsed.suppliers)) {
        return parsed.suppliers.map(normalizeSupplierRecord)
      }
    }
  } catch {
    /* ignore */
  }
  return seedSuppliers()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, suppliers: supplierState.suppliers }),
  )
}

export const supplierState = reactive({
  suppliers: loadFromStorage(),
})

watch(
  () => supplierState.suppliers,
  () => persist(),
  { deep: true },
)

export function getSupplierById(id) {
  return supplierState.suppliers.find((item) => item.id === id) || null
}

export function getSupplierByName(name) {
  return supplierState.suppliers.find((item) => item.name === name) || null
}

export function getSupplierOptions() {
  return supplierState.suppliers
    .filter((item) => item.status !== '停用')
    .map((item) => ({
      label: item.name,
      value: item.name,
      code: item.code,
      type: (item.supplierRoles || []).join('/'),
      supplierRoles: item.supplierRoles || [],
      supplierCategoryId: item.supplierCategoryId,
    }))
}

export function addSupplier(payload, operator = 'admin') {
  const name = payload.name?.trim()
  if (!name) return { ok: false, message: '请填写供应商名称' }
  const code = payload.code?.trim()
  if (code && supplierState.suppliers.some((item) => item.code === code)) {
    return { ok: false, message: '供应商编码已存在' }
  }
  if (supplierState.suppliers.some((item) => item.name === name)) {
    return { ok: false, message: '供应商名称已存在' }
  }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const record = normalizeSupplierRecord({
    ...createDefaultSupplierForm(payload),
    id: payload.id || `sup-${Date.now()}`,
    code: code || generateSupplierCode(supplierState.suppliers),
    name,
    creator: operator,
    lastModifier: operator,
    createdAt: now,
    updatedAt: now,
  })
  supplierState.suppliers.unshift(record)
  return { ok: true, data: record }
}

export function updateSupplier(id, payload, operator = 'admin') {
  const index = supplierState.suppliers.findIndex((item) => item.id === id)
  if (index < 0) return { ok: false, message: '供应商不存在' }
  const name = payload.name?.trim()
  if (!name) return { ok: false, message: '请填写供应商名称' }
  const code = payload.code?.trim()
  if (code && supplierState.suppliers.some((item) => item.code === code && item.id !== id)) {
    return { ok: false, message: '供应商编码已存在' }
  }
  if (supplierState.suppliers.some((item) => item.name === name && item.id !== id)) {
    return { ok: false, message: '供应商名称已存在' }
  }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const updated = normalizeSupplierRecord({
    ...supplierState.suppliers[index],
    ...payload,
    id,
    name,
    code: code || supplierState.suppliers[index].code,
    updatedAt: now,
    lastModifier: operator,
  })
  supplierState.suppliers[index] = updated
  return { ok: true, data: updated }
}

export function deleteSupplier(id) {
  const index = supplierState.suppliers.findIndex((item) => item.id === id)
  if (index < 0) return { ok: false, message: '供应商不存在' }
  supplierState.suppliers.splice(index, 1)
  return { ok: true }
}

export function setSuppliersStatus(ids, status, operator = 'admin') {
  if (!Array.isArray(ids) || !ids.length) {
    return { ok: false, message: '请先选择供应商' }
  }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  let count = 0
  ids.forEach((id) => {
    const item = supplierState.suppliers.find((row) => row.id === id)
    if (!item) return
    item.status = status
    item.updatedAt = now
    item.lastModifier = operator
    count += 1
  })
  if (!count) return { ok: false, message: '未找到可操作的供应商' }
  return { ok: true, count }
}

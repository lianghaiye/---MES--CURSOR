import { reactive, watch } from 'vue'
import dayjs from 'dayjs'

const STORAGE_KEY = 'i_doms_customer_types'

function seedTypes() {
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  return [
    {
      id: 'ctype-1',
      code: 'CT001',
      name: '企业客户',
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ctype-2',
      code: 'CT002',
      name: '经销商',
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ctype-3',
      code: 'CT003',
      name: '代理商',
      creator: 'admin',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.types)) return parsed.types
    }
  } catch {
    /* ignore */
  }
  return seedTypes()
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ types: customerTypeState.types }))
}

export const customerTypeState = reactive({
  types: loadFromStorage(),
})

watch(
  () => customerTypeState.types,
  () => persist(),
  { deep: true },
)

export function getCustomerTypeById(id) {
  return customerTypeState.types.find((t) => t.id === id) || null
}

export function getCustomerTypeOptions() {
  return customerTypeState.types.map((t) => ({
    label: t.name,
    value: t.id,
    code: t.code,
  }))
}

export function addCustomerType(payload, operator = 'admin') {
  const code = payload.code?.trim()
  const name = payload.name?.trim()
  if (!code) return { ok: false, message: '请输入分类编码' }
  if (!name) return { ok: false, message: '请输入分类名称' }
  if (customerTypeState.types.some((t) => t.code === code)) {
    return { ok: false, message: '分类编码已存在' }
  }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const row = {
    id: `ctype-${Date.now()}`,
    code,
    name,
    creator: operator,
    createdAt: now,
    updatedAt: now,
  }
  customerTypeState.types.unshift(row)
  return { ok: true, data: row }
}

export function updateCustomerType(id, patch, operator = 'admin') {
  const idx = customerTypeState.types.findIndex((t) => t.id === id)
  if (idx < 0) return { ok: false, message: '客户类型不存在' }
  const code = patch.code?.trim()
  const name = patch.name?.trim()
  if (code && customerTypeState.types.some((t) => t.code === code && t.id !== id)) {
    return { ok: false, message: '分类编码已存在' }
  }
  Object.assign(customerTypeState.types[idx], {
    ...patch,
    code: code || customerTypeState.types[idx].code,
    name: name || customerTypeState.types[idx].name,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    lastModifier: operator,
  })
  return { ok: true, data: customerTypeState.types[idx] }
}

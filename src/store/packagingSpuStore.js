import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  DEFAULT_PACKAGING_VARIANT_AXES,
  defaultPackagingSkuCodePattern,
} from '@/constants/packagingSpu'
import { createPackagingSpuSeed, normalizePackagingSpu } from '@/mock/packagingSpuSeed'

const STORAGE_KEY = 'i_doms_packaging_spus'
const SEED_VERSION_KEY = 'i_doms_packaging_spus_seed_v'
const CURRENT_SEED_VERSION = '1'

let spuCodeSeq = 4

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.items)) return parsed.items
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: packagingSpuState.items }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function loadInitialItems() {
  if (shouldReseed()) return createPackagingSpuSeed()
  const stored = loadFromStorage()
  if (stored?.length) return stored.map(normalizePackagingSpu)
  return createPackagingSpuSeed()
}

export const packagingSpuState = reactive({
  items: loadInitialItems(),
})

watch(
  () => packagingSpuState.items,
  () => persist(),
  { deep: true },
)

export function generatePackagingSpuCode() {
  return `T-BZ-${String(spuCodeSeq++).padStart(3, '0')}`
}

export function findPackagingSpuById(id) {
  return packagingSpuState.items.find((i) => i.id === id) || null
}

export function listPackagingSpus(filters = {}) {
  return packagingSpuState.items.filter((item) => {
    if (filters.keyword) {
      const kw = filters.keyword.trim()
      if (!item.name?.includes(kw) && !item.code?.includes(kw)) return false
    }
    if (filters.businessType === 'canSell' && !item.canSell) return false
    if (filters.businessType === 'canPurchase' && !item.canPurchase) return false
    return true
  })
}

export function addPackagingSpu(payload) {
  if (!payload.name?.trim()) return { ok: false, message: '请输入包装族名称' }
  if (!payload.canSell && !payload.canPurchase) {
    return { ok: false, message: '请至少勾选「可销售」或「可采购」之一' }
  }
  const code = payload.code?.trim() || generatePackagingSpuCode()
  if (packagingSpuState.items.some((i) => i.code === code)) {
    return { ok: false, message: '包装族编码已存在' }
  }

  const variantAxes = payload.variantAxes?.length
    ? payload.variantAxes
    : JSON.parse(JSON.stringify(DEFAULT_PACKAGING_VARIANT_AXES))

  const row = normalizePackagingSpu({
    id: `pkg-spu-${Date.now()}`,
    code,
    name: payload.name.trim(),
    canSell: Boolean(payload.canSell),
    canPurchase: Boolean(payload.canPurchase),
    variantAxes,
    skuCodePattern: payload.skuCodePattern || defaultPackagingSkuCodePattern(variantAxes),
    enabledCombinations: payload.enabledCombinations || [],
    creator: payload.creator || 'admin',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  packagingSpuState.items.unshift(row)
  return { ok: true, item: row }
}

export function updatePackagingSpu(id, payload) {
  const row = packagingSpuState.items.find((i) => i.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (!payload.name?.trim()) return { ok: false, message: '请输入包装族名称' }
  if (!payload.canSell && !payload.canPurchase) {
    return { ok: false, message: '请至少勾选「可销售」或「可采购」之一' }
  }

  const code = payload.code?.trim() || row.code
  if (packagingSpuState.items.some((i) => i.code === code && i.id !== id)) {
    return { ok: false, message: '包装族编码已存在' }
  }

  Object.assign(
    row,
    normalizePackagingSpu({
      ...row,
      code,
      name: payload.name.trim(),
      canSell: Boolean(payload.canSell),
      canPurchase: Boolean(payload.canPurchase),
      variantAxes: payload.variantAxes || row.variantAxes,
      skuCodePattern:
        payload.skuCodePattern ||
        row.skuCodePattern ||
        defaultPackagingSkuCodePattern(payload.variantAxes || row.variantAxes),
      enabledCombinations: payload.enabledCombinations ?? row.enabledCombinations,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }),
  )
  return { ok: true, item: row }
}

export function deletePackagingSpu(id) {
  const idx = packagingSpuState.items.findIndex((i) => i.id === id)
  if (idx === -1) return { ok: false, message: '记录不存在' }
  packagingSpuState.items.splice(idx, 1)
  return { ok: true }
}

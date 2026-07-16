import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createPackagingSkuSeed, normalizePackagingSku } from '@/mock/packagingSeed'
import { bootstrapPackagingSkuSeed } from '@/mock/packagingSkuBootstrap'
import { matchesBusinessTypeFilter } from '@/utils/businessTypeLabel'
import { PACKAGING_BUSINESS_TYPE_OPTIONS } from '@/constants/packagingMaster'

const STORAGE_KEY = 'i_doms_packaging_skus'
const SEED_VERSION_KEY = 'i_doms_packaging_skus_seed_v'
const CURRENT_SEED_VERSION = '2'

let codeSeq = 20

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.items)) return parsed.items
    }
    // 兼容 v1 flat 存储
    const legacyRaw = localStorage.getItem('i_doms_packaging')
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw)
      if (Array.isArray(legacy.items)) return legacy.items.map(normalizePackagingSku)
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: packagingState.items }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function loadInitialItems() {
  if (shouldReseed()) return bootstrapPackagingSkuSeed()
  const stored = loadFromStorage()
  if (stored?.length) return stored.map(normalizePackagingSku)
  return bootstrapPackagingSkuSeed()
}

export const packagingState = reactive({
  items: loadInitialItems(),
})

watch(
  () => packagingState.items,
  () => persist(),
  { deep: true },
)

export function generatePackagingCode() {
  return `BZ${dayjs().format('YYYYMMDD')}${String(codeSeq++).padStart(3, '0')}`
}

export function getPackagingById(id) {
  return packagingState.items.find((i) => i.id === id) || null
}

export function getPackagingOptions() {
  return packagingState.items.map((i) => ({
    label: i.name,
    value: i.id,
    code: i.code,
    spuId: i.spuId,
    spuName: i.spuName,
    packagingForm: i.packagingForm,
    outerSize: i.outerSize,
    capacityQty: i.capacityQty,
    unit: i.unit,
  }))
}

export function filterPackaging(list, filters = {}) {
  return list.filter((i) => {
    if (filters.code && !i.code?.includes(filters.code)) return false
    if (filters.name && !i.name?.includes(filters.name) && !i.spuName?.includes(filters.name)) {
      return false
    }
    if (filters.spuName && !i.spuName?.includes(filters.spuName)) return false
    if (filters.packagingForm && i.packagingForm !== filters.packagingForm) return false
    if (filters.spuId && i.spuId !== filters.spuId) return false
    if (
      filters.businessType &&
      !matchesBusinessTypeFilter(i, filters.businessType, PACKAGING_BUSINESS_TYPE_OPTIONS)
    ) {
      return false
    }
    return true
  })
}

export function updatePackagingSku(id, payload) {
  const row = packagingState.items.find((i) => i.id === id)
  if (!row) return { ok: false, message: '记录不存在' }

  const code = payload.code?.trim() || row.code
  if (packagingState.items.some((i) => i.code === code && i.id !== id)) {
    return { ok: false, message: '包装编码已存在' }
  }

  Object.assign(
    row,
    normalizePackagingSku({
      ...row,
      code,
      canSell: payload.canSell ?? row.canSell,
      canPurchase: payload.canPurchase ?? row.canPurchase,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }),
  )
  return { ok: true, item: row }
}

export function deletePackaging(id) {
  const idx = packagingState.items.findIndex((i) => i.id === id)
  if (idx === -1) return { ok: false, message: '记录不存在' }
  packagingState.items.splice(idx, 1)
  return { ok: true }
}

export function deleteSkusBySpuId(spuId) {
  const pid = String(spuId)
  packagingState.items = packagingState.items.filter((i) => i.spuId !== pid)
}

/** @deprecated 保留兼容，请使用 upsertPackagingSkuForSpu */
export function addPackaging(payload) {
  void payload
  return { ok: false, message: '请通过包装族变体矩阵生成 SKU' }
}

/** @deprecated */
export function updatePackaging(id, payload) {
  return updatePackagingSku(id, payload)
}

export { createPackagingSkuSeed, normalizePackagingSku }

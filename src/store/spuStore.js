import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  PRODUCT_SKU_CODE_PATTERN,
  ensureLockedVariantAxes,
  normalizeBomStrategy,
} from '@/constants/spu'

const STORAGE_KEY = 'i_doms_spus_v1'

function loadSpus() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spuState.spus))
}

export const spuState = reactive({
  spus: loadSpus(),
})

function normalizeSpu(record = {}) {
  const variantAxes = ensureLockedVariantAxes(record.variantAxes || [])
  return {
    id: record.id || `spu-${Date.now()}`,
    code: record.code || '',
    name: record.name || '',
    categoryKey: record.categoryKey || '',
    parentCategoryKey: record.parentCategoryKey || '',
    categoryName: record.categoryName || '',
    categoryTreeMode: record.categoryTreeMode || 'material',
    itemKind: record.itemKind || 'material',
    canSell: Boolean(record.canSell),
    canProduce: Boolean(record.canProduce),
    canPurchase: Boolean(record.canPurchase),
    canOutsource: Boolean(record.canOutsource),
    variantAxes,
    skuCodePattern: PRODUCT_SKU_CODE_PATTERN,
    enabledCombinations: record.enabledCombinations || [],
    bomStrategy: normalizeBomStrategy(record.bomStrategy),
    baseBomId: record.baseBomId || '',
    mixedBomRules: null,
    sharedFields: record.sharedFields || {},
    createdAt: record.createdAt || dayjs().format('YYYY-MM-DD'),
    updatedAt: record.updatedAt || dayjs().format('YYYY-MM-DD'),
  }
}

export function findSpuById(id) {
  return spuState.spus.find((s) => String(s.id) === String(id)) || null
}

export function listSpus({ keyword = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return spuState.spus.filter((s) => {
    if (!kw) return true
    return (s.name || '').toLowerCase().includes(kw) || (s.code || '').toLowerCase().includes(kw)
  })
}

export function countSkusForSpu(spuId, listSkusFn) {
  if (typeof listSkusFn === 'function') return listSkusFn(spuId).length
  return 0
}

/**
 * 族编码规则：F + 4 位全局流水（例 F0001）
 * 缩短参与 SKU 拼接长度；类别仅作主数据分类，不入族编码。
 */
export function generateSpuCode() {
  const existing = spuState.spus.map((s) => s.code).filter(Boolean)
  let maxSeq = 0
  existing.forEach((code) => {
    const m = /^F(\d{1,6})$/i.exec(String(code).trim())
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]))
  })
  return `F${String(maxSeq + 1).padStart(4, '0')}`
}

export function addSpu(payload = {}) {
  const row = normalizeSpu(payload)
  spuState.spus.unshift(row)
  persist()
  return row
}

export function updateSpu(id, patch = {}) {
  const idx = spuState.spus.findIndex((s) => String(s.id) === String(id))
  if (idx < 0) return null
  const next = normalizeSpu({
    ...spuState.spus[idx],
    ...patch,
    id: spuState.spus[idx].id,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  })
  spuState.spus.splice(idx, 1, next)
  persist()
  return next
}

export function deleteSpu(id) {
  const idx = spuState.spus.findIndex((s) => String(s.id) === String(id))
  if (idx < 0) return false
  spuState.spus.splice(idx, 1)
  persist()
  return true
}

import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createBoardCatalogSeed } from '@/mock/boardCatalogSeed'

const STORAGE_KEY = 'i_doms_board_catalog'
const SEED_VERSION_KEY = 'i_doms_board_catalog_seed_v'
const CURRENT_SEED_VERSION = '1'

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function loadFromStorage() {
  try {
    if (localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION) return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.items) && parsed.items.length) return parsed.items
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: boardCatalogState.items }))
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  } catch {
    /* ignore quota */
  }
}

export const boardCatalogState = reactive({
  items: loadFromStorage() || createBoardCatalogSeed(),
})

watch(
  () => boardCatalogState.items,
  () => persist(),
  { deep: true },
)

persist()

export function listBoardCatalog() {
  return [...boardCatalogState.items]
}

export function getBoardCatalogById(id) {
  return boardCatalogState.items.find((i) => i.id === id) || null
}

export function getBoardCatalogByCode(code) {
  const c = String(code || '').trim()
  return boardCatalogState.items.find((i) => i.code === c) || null
}

export function getEnabledBoardOptions() {
  return boardCatalogState.items
    .filter((i) => i.enabled !== false)
    .map((i) => ({ label: i.name, value: i.id, code: i.code, playPath: i.playPath }))
}

/**
 * @returns {{ ok: true, item: object } | { ok: false, message: string }}
 */
export function saveBoardCatalog(payload = {}) {
  const name = String(payload.name || '').trim()
  const code = String(payload.code || '').trim()
  const playPath = String(payload.playPath || '').trim()
  if (!name) return { ok: false, message: '请填写看板名称' }
  if (!code) return { ok: false, message: '请填写看板编码' }
  if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
    return { ok: false, message: '编码仅支持字母、数字、下划线、中划线' }
  }
  if (!playPath) return { ok: false, message: '请填写播放地址' }
  if (!playPath.startsWith('/')) {
    return { ok: false, message: '播放地址须为站内路径，以 / 开头' }
  }

  const id = payload.id || `board-${Date.now()}`
  const dup = boardCatalogState.items.find((i) => i.code === code && i.id !== id)
  if (dup) return { ok: false, message: `编码「${code}」已存在` }

  const existing = payload.id ? getBoardCatalogById(payload.id) : null
  if (existing && existing.code !== code) {
    return { ok: false, message: '看板编码创建后不可修改' }
  }

  const row = {
    id,
    code: existing ? existing.code : code,
    name,
    playPath,
    enabled: payload.enabled !== false,
    updatedAt: nowText(),
  }

  if (existing) {
    const idx = boardCatalogState.items.findIndex((i) => i.id === id)
    boardCatalogState.items[idx] = row
  } else {
    boardCatalogState.items.unshift(row)
  }
  return { ok: true, item: row }
}

export function setBoardCatalogEnabled(id, enabled) {
  const row = getBoardCatalogById(id)
  if (!row) return { ok: false, message: '看板不存在' }
  row.enabled = Boolean(enabled)
  row.updatedAt = nowText()
  return { ok: true, item: row }
}

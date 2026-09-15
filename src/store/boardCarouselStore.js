import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { getBoardCatalogById } from '@/store/boardCatalogStore'

const STORAGE_KEY = 'i_doms_board_carousel_schemes'
const SEED_VERSION_KEY = 'i_doms_board_carousel_schemes_seed_v'
const CURRENT_SEED_VERSION = '1'

export const CAROUSEL_TRANSITION_OPTIONS = [
  { label: '硬切', value: 'cut' },
  { label: '淡入淡出', value: 'fade' },
  { label: '左右滑动', value: 'slide' },
]

export const CAROUSEL_AFTER_ROUND_OPTIONS = [
  { label: '循环播放', value: 'loop' },
  { label: '停在最后一页', value: 'stop' },
]

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function loadFromStorage() {
  try {
    if (localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION) return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.schemes)) return parsed.schemes
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemes: boardCarouselState.schemes }))
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  } catch {
    /* ignore */
  }
}

function createDemoScheme() {
  return [
    {
      id: 'carousel-demo-workshop',
      name: '车间大屏演示',
      enabled: true,
      defaultDwellSeconds: 15,
      transition: 'fade',
      afterRound: 'loop',
      items: [
        {
          id: 'item-1',
          source: 'board',
          boardId: 'board-wo-monitor',
          externalUrl: '',
          displayName: '',
          dwellSeconds: null,
          sort: 0,
        },
      ],
      updatedAt: nowText(),
    },
  ]
}

export const boardCarouselState = reactive({
  schemes: loadFromStorage() || createDemoScheme(),
})

watch(
  () => boardCarouselState.schemes,
  () => persist(),
  { deep: true },
)

persist()

export function listCarouselSchemes() {
  return [...boardCarouselState.schemes]
}

export function getCarouselSchemeById(id) {
  return boardCarouselState.schemes.find((s) => s.id === id) || null
}

export function transitionLabel(value) {
  return CAROUSEL_TRANSITION_OPTIONS.find((o) => o.value === value)?.label || value || '—'
}

export function afterRoundLabel(value) {
  return CAROUSEL_AFTER_ROUND_OPTIONS.find((o) => o.value === value)?.label || value || '—'
}

export function buildCarouselPlayUrl(schemeId, { fullscreen = false } = {}) {
  const base = `${window.location.origin}${window.location.pathname || '/'}`.replace(/\/$/, '')
  // SPA hash/history: use router path absolute from origin root
  const path = `/board/carousel/play/${schemeId}${fullscreen ? '?fullscreen=1' : ''}`
  // Prefer origin + path for history mode
  try {
    return `${window.location.origin}${path}`
  } catch {
    return `${base}${path}`
  }
}

function isHttpUrl(url) {
  try {
    const u = new URL(String(url || '').trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeItems(items = []) {
  return (items || []).map((it, idx) => ({
    id: it.id || uid('item'),
    source: it.source === 'url' ? 'url' : 'board',
    boardId: it.source === 'url' ? '' : String(it.boardId || '').trim(),
    externalUrl: it.source === 'url' ? String(it.externalUrl || '').trim() : '',
    displayName: String(it.displayName || '').trim(),
    dwellSeconds:
      it.dwellSeconds === null || it.dwellSeconds === undefined || it.dwellSeconds === ''
        ? null
        : Number(it.dwellSeconds),
    sort: Number.isFinite(Number(it.sort)) ? Number(it.sort) : idx,
  }))
}

/**
 * 解析可播放条目（跳过停用看板、空 URL）
 * @returns {{ key: string, title: string, src: string, dwellSeconds: number, source: string }[]}
 */
export function resolvePlayableItems(scheme) {
  if (!scheme) return []
  const defaultDwell = Math.max(1, Number(scheme.defaultDwellSeconds) || 15)
  const items = [...(scheme.items || [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  const result = []
  for (const it of items) {
    const dwell =
      it.dwellSeconds != null && Number(it.dwellSeconds) > 0
        ? Number(it.dwellSeconds)
        : defaultDwell
    if (it.source === 'url') {
      const url = String(it.externalUrl || '').trim()
      if (!isHttpUrl(url)) continue
      result.push({
        key: it.id,
        title: it.displayName || url,
        src: url,
        dwellSeconds: dwell,
        source: 'url',
      })
      continue
    }
    const board = getBoardCatalogById(it.boardId)
    if (!board || board.enabled === false) continue
    const path = String(board.playPath || '').trim()
    if (!path) continue
    const src = path.startsWith('http') ? path : `${window.location.origin}${path}`
    result.push({
      key: it.id,
      title: it.displayName || board.name,
      src,
      dwellSeconds: dwell,
      source: 'board',
      boardId: board.id,
    })
  }
  return result
}

/**
 * @returns {{ ok: true, scheme: object } | { ok: false, message: string }}
 */
export function saveCarouselScheme(payload = {}) {
  const name = String(payload.name || '').trim()
  if (!name) return { ok: false, message: '请填写方案名称' }

  const defaultDwellSeconds = Number(payload.defaultDwellSeconds)
  if (!Number.isFinite(defaultDwellSeconds) || defaultDwellSeconds < 1) {
    return { ok: false, message: '默认停留秒数须 ≥ 1' }
  }

  const transition = ['cut', 'fade', 'slide'].includes(payload.transition)
    ? payload.transition
    : 'fade'
  const afterRound = payload.afterRound === 'stop' ? 'stop' : 'loop'
  const items = normalizeItems(payload.items)

  if (!items.length) return { ok: false, message: '请至少添加一条播放条目' }

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const label = `第 ${i + 1} 条`
    if (it.source === 'url') {
      if (!isHttpUrl(it.externalUrl)) {
        return { ok: false, message: `${label}：请填写有效的 http(s) 地址` }
      }
    } else {
      if (!it.boardId) return { ok: false, message: `${label}：请选择看板` }
      const board = getBoardCatalogById(it.boardId)
      if (!board) return { ok: false, message: `${label}：看板不存在` }
      if (board.enabled === false) {
        return { ok: false, message: `${label}：看板「${board.name}」已停用，请更换或移除` }
      }
    }
    if (it.dwellSeconds != null && (!Number.isFinite(it.dwellSeconds) || it.dwellSeconds < 1)) {
      return { ok: false, message: `${label}：停留秒数须 ≥ 1 或留空` }
    }
  }

  // 至少一条在「当前」可解析为可播放（允许仅校验结构；停用已拦截）
  const draft = { defaultDwellSeconds, items }
  if (!resolvePlayableItems(draft).length) {
    return { ok: false, message: '没有可播放的有效条目' }
  }

  const id = payload.id || uid('carousel')
  const existing = payload.id ? getCarouselSchemeById(payload.id) : null
  const row = {
    id,
    name,
    enabled: payload.enabled !== false,
    defaultDwellSeconds,
    transition,
    afterRound,
    items: items.map((it, idx) => ({ ...it, sort: idx })),
    updatedAt: nowText(),
  }

  if (existing) {
    const idx = boardCarouselState.schemes.findIndex((s) => s.id === id)
    boardCarouselState.schemes[idx] = row
  } else {
    boardCarouselState.schemes.unshift(row)
  }
  return { ok: true, scheme: row }
}

export function duplicateCarouselScheme(id) {
  const src = getCarouselSchemeById(id)
  if (!src) return { ok: false, message: '方案不存在' }
  const copy = {
    ...JSON.parse(JSON.stringify(src)),
    id: uid('carousel'),
    name: `${src.name}（副本）`,
    items: (src.items || []).map((it) => ({ ...it, id: uid('item') })),
    updatedAt: nowText(),
  }
  boardCarouselState.schemes.unshift(copy)
  return { ok: true, scheme: copy }
}

export function setCarouselSchemeEnabled(id, enabled) {
  const row = getCarouselSchemeById(id)
  if (!row) return { ok: false, message: '方案不存在' }
  row.enabled = Boolean(enabled)
  row.updatedAt = nowText()
  return { ok: true, scheme: row }
}

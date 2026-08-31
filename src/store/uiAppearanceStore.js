import { computed, reactive } from 'vue'
import { getUser } from '@/utils/auth'
import { normalizeDensity, TABLE_DENSITY_LEVELS } from '@/utils/tableDensity'

export const THEME_OPTIONS = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

export const FONT_SIZE_OPTIONS = [
  { value: 'large', label: '大号' },
  { value: 'medium', label: '中号' },
  { value: 'small', label: '小号' },
]

const STORAGE_PREFIX = 'i_doms_ui_appearance_'

function resolveUserScope() {
  const user = getUser()
  return String(user?.id || user?.username || user?.displayName || 'guest')
}

function storageKey() {
  return `${STORAGE_PREFIX}${resolveUserScope()}`
}

function readStored() {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStored(payload) {
  localStorage.setItem(storageKey(), JSON.stringify(payload))
}

function normalizeTheme(value) {
  return THEME_OPTIONS.some((o) => o.value === value) ? value : 'light'
}

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches === true
}

/** @type {{ theme: 'light'|'dark'|'system', tableDensity: 'large'|'medium'|'small' }} */
const state = reactive({
  theme: 'light',
  tableDensity: 'large',
})

let mediaQuery = null
let mediaHandler = null

function resolveEffectiveTheme() {
  if (state.theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return state.theme === 'dark' ? 'dark' : 'light'
}

function applyToDocument() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const effective = resolveEffectiveTheme()
  root.setAttribute('data-theme', effective)
  root.setAttribute('data-table-density', normalizeDensity(state.tableDensity, 'large'))
  root.classList.toggle('theme-dark', effective === 'dark')
}

function persist() {
  writeStored({
    theme: state.theme,
    tableDensity: state.tableDensity,
  })
}

function bindSystemThemeListener() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  mediaQuery?.removeEventListener?.('change', mediaHandler)
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaHandler = () => {
    if (state.theme === 'system') applyToDocument()
  }
  mediaQuery.addEventListener('change', mediaHandler)
}

export function initUiAppearance() {
  const stored = readStored()
  if (stored) {
    state.theme = normalizeTheme(stored.theme)
    state.tableDensity = normalizeDensity(stored.tableDensity, 'large')
  }
  bindSystemThemeListener()
  applyToDocument()
}

export function setTheme(theme) {
  state.theme = normalizeTheme(theme)
  persist()
  applyToDocument()
}

export function setTableDensity(density) {
  state.tableDensity = normalizeDensity(density, 'large')
  persist()
  applyToDocument()
}

export const uiAppearanceState = state

export const effectiveTheme = computed(() => resolveEffectiveTheme())

export const isDarkTheme = computed(() => resolveEffectiveTheme() === 'dark')

export const tableDensityClass = computed(
  () => `table-density--${normalizeDensity(state.tableDensity, 'large')}`,
)

export { TABLE_DENSITY_LEVELS }

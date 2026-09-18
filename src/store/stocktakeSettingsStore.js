/**
 * 盘点全局设置（演示：localStorage 持久化）
 * autoPostOnApprove：审核通过后是否自动生成盘盈盘亏并入账
 */
import { reactive, watch } from 'vue'
import { persistJson } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_stocktake_settings'
const DATA_VERSION = 1

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version === DATA_VERSION && parsed.settings) return parsed.settings
  } catch {
    /* ignore */
  }
  return null
}

const saved = load()

export const stocktakeSettingsState = reactive({
  autoPostOnApprove: saved?.autoPostOnApprove !== false,
})

watch(
  stocktakeSettingsState,
  () => {
    persistJson(STORAGE_KEY, {
      version: DATA_VERSION,
      settings: { ...stocktakeSettingsState },
    })
  },
  { deep: true },
)

export function isStocktakeAutoPostOnApprove() {
  return Boolean(stocktakeSettingsState.autoPostOnApprove)
}

export function setStocktakeAutoPostOnApprove(value) {
  stocktakeSettingsState.autoPostOnApprove = Boolean(value)
}

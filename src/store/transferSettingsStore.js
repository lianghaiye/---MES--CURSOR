/**
 * 调拨全局设置（演示：localStorage 持久化；不做权限拦截）
 */
import { reactive, watch } from 'vue'
import { persistJson } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_transfer_settings'
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

/** requireInboundConfirm：true=需入库方签收；false=出库确认后自动入库完结 */
export const transferSettingsState = reactive({
  requireInboundConfirm: saved?.requireInboundConfirm !== false,
})

watch(
  transferSettingsState,
  () => {
    persistJson(STORAGE_KEY, { version: DATA_VERSION, settings: { ...transferSettingsState } })
  },
  { deep: true },
)

export function isTransferRequireInboundConfirm() {
  return Boolean(transferSettingsState.requireInboundConfirm)
}

export function setTransferRequireInboundConfirm(value) {
  transferSettingsState.requireInboundConfirm = Boolean(value)
}

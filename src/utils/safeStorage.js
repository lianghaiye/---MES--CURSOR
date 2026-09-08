/** 浏览器 localStorage 配额（Safari 常见文案：The quota has been exceeded.） */
export function isQuotaExceededError(err) {
  if (!err) return false
  const name = String(err.name || '')
  const msg = String(err.message || '').toLowerCase()
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    msg.includes('quota')
  )
}

/** 安全写入 localStorage，配额满时返回 false 而不抛错 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    if (isQuotaExceededError(err)) return false
    throw err
  }
}

export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** 配额满时可先丢掉的缓存（不影响主流程演示数据） */
const EVICTABLE_KEYS = [
  'i_doms_import_export_history',
  'i_doms_qc_tasks',
  'i_doms_process_reports',
  'i_doms_quick_reports',
  'i_doms_report_confirm_lines',
]

/**
 * 写入 JSON。配额不足时：清本 key 再写；仍失败则清掉可丢弃缓存后再写。
 * 全部失败则放弃持久化，不抛错，避免打断页面。
 */
export function persistJson(key, data) {
  let payload = data
  try {
    if (typeof data !== 'string') payload = JSON.stringify(data)
  } catch {
    return false
  }
  if (safeSetItem(key, payload)) return true
  safeRemoveItem(key)
  if (safeSetItem(key, payload)) return true
  for (const k of EVICTABLE_KEYS) {
    if (k !== key) safeRemoveItem(k)
  }
  return safeSetItem(key, payload)
}

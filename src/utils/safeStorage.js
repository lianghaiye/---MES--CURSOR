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

/** 配额满时可先丢掉的缓存（演示/日志类，清掉不影响主流程） */
const EVICTABLE_KEYS = [
  'i_doms_import_export_history',
  'i_doms_qc_tasks',
  'i_doms_process_reports',
  'i_doms_quick_reports',
  'i_doms_report_confirm_lines',
  'i_doms_process_report_wo_log',
  'i_doms_process_report_quick_log',
  'i_doms_mobile_disassembly_tasks',
  'i_doms_sales_stock_allocations',
  'i_doms_stock_batches',
  'i_doms_stock_pieces',
  'i_doms_inventory_stock',
  'i_doms_cut_settle',
  'i_doms_inbound_orders',
  'i_doms_outbound_orders',
  'i_doms_purchase_receipts',
  'i_doms_outsourcing_receipts',
]

/** 尽量保留的 UI / 配置 key（清仓时跳过） */
const KEEP_KEY_PREFIXES = [
  'i_doms_wo_layout',
  'i_doms_assembly_wo_layout',
  'i_doms_ui_',
  'i_doms_function_',
]

function shouldKeepKey(key, protectKey) {
  if (!key) return true
  if (key === protectKey) return true
  return KEEP_KEY_PREFIXES.some((p) => key === p || key.startsWith(p))
}

/** 清掉可丢弃 key；仍不够则清掉其它 i_doms_*（保留 protectKey 与 UI 配置） */
export function evictLocalStorageForQuota(protectKey) {
  for (const k of EVICTABLE_KEYS) {
    if (k !== protectKey) safeRemoveItem(k)
  }
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (k) keys.push(k)
    }
    for (const k of keys) {
      if (!k.startsWith('i_doms_')) continue
      if (shouldKeepKey(k, protectKey)) continue
      safeRemoveItem(k)
    }
  } catch {
    /* ignore */
  }
}

/**
 * 写入 JSON。配额不足时：清本 key 再写 → 清可丢弃缓存 → 清其它 i_doms_* 再写。
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
  if (safeSetItem(key, payload)) return true
  evictLocalStorageForQuota(key)
  return safeSetItem(key, payload)
}

/** 浏览器 localStorage 配额（Chrome/Safari 常见约 5MB；Safari 文案：The quota has been exceeded.） */
const SOFT_LIMIT_BYTES = 3.5 * 1024 * 1024
const WARN_LIMIT_BYTES = 4.2 * 1024 * 1024

let warnedNearQuota = false
let warnedPersistFail = false

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

/** 估算已用字节（UTF-16：length * 2） */
export function getLocalStorageUsageBytes() {
  let total = 0
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (!k) continue
      const v = localStorage.getItem(k) || ''
      total += (k.length + v.length) * 2
    }
  } catch {
    /* ignore */
  }
  return total
}

/** 按体积降序列出 key，便于排查谁把配额吃满 */
export function listLocalStorageSizes(limit = 30) {
  const rows = []
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (!k) continue
      const v = localStorage.getItem(k) || ''
      rows.push({ key: k, bytes: (k.length + v.length) * 2 })
    }
  } catch {
    /* ignore */
  }
  rows.sort((a, b) => b.bytes - a.bytes)
  return rows.slice(0, limit)
}

/** 配额满时可先丢掉的缓存（演示/业务单据，清掉不影响配置） */
const EVICTABLE_KEYS = [
  'i_doms_import_export_history',
  'i_doms_qc_tasks',
  'i_doms_qc_work_orders',
  'i_doms_factory_qc',
  'i_doms_process_reports',
  'i_doms_mobile_process_report_records',
  'i_doms_process_report_wo_logs',
  'i_doms_process_report_quick_logs',
  'i_doms_process_report_seed_v',
  'i_doms_quick_reports',
  'i_doms_report_confirm_lines',
  'i_doms_process_report_wo_log',
  'i_doms_process_report_quick_log',
  'i_doms_mobile_disassembly_tasks',
  'i_doms_mobile_material_req',
  'i_doms_sales_stock_allocations',
  'i_doms_stock_batches',
  'i_doms_stock_pieces',
  'i_doms_inventory_stock',
  'i_doms_cut_settle',
  'i_doms_inbound_orders',
  'i_doms_outbound_orders',
  'i_doms_transfer_orders',
  'i_doms_stocktake_orders',
  'i_doms_purchase_receipts',
  'i_doms_outsourcing_receipts',
  'i_doms_purchase_returns',
  'i_doms_outsourcing_returns',
  'i_doms_material_requisition',
  'i_doms_work_orders',
  'i_doms_assembly_work_orders',
  'i_doms_disassembly_work_orders',
  'i_doms_sales_orders',
  'i_doms_delivery_orders',
  'i_doms_purchase_orders',
  'i_doms_purchase_requisitions',
  'i_doms_outsourcing_orders',
  'i_doms_production_plans',
  'i_doms_scrap_orders',
  'i_doms_replenish_ledger',
  'i_doms_design_tasks',
  'i_doms_change_requests',
  'i_doms_transfer_soft_locks',
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
  if (key.endsWith('_seed_v') || key.endsWith('_seed_version')) return true
  return KEEP_KEY_PREFIXES.some((p) => key === p || key.startsWith(p))
}

function warnNearQuota(used) {
  if (warnedNearQuota || used < WARN_LIMIT_BYTES) return
  warnedNearQuota = true
  console.warn(
    `[safeStorage] localStorage 已用约 ${(used / 1024 / 1024).toFixed(2)}MB，接近浏览器配额。` +
      '可在控制台执行 __clearIDomsStorage() 清理演示缓存。',
  )
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
 * 清理演示业务缓存（保留 UI/功能参数）。
 * 刷新后各 store 会按 seed 重建，用于配额经常爆满时一键恢复。
 */
export function clearDemoLocalStorage() {
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (k) keys.push(k)
    }
  } catch {
    return 0
  }
  let removed = 0
  for (const k of keys) {
    if (!k.startsWith('i_doms_')) continue
    if (shouldKeepKey(k, null)) continue
    if (safeRemoveItem(k)) removed += 1
  }
  warnedNearQuota = false
  warnedPersistFail = false
  return removed
}

/**
 * 启动或写入前主动腾空间：超过软上限则按可丢弃列表清理，
 * 仍紧张则清理全部演示 key（保留 UI 配置）。
 */
export function ensureStorageHeadroom(needBytes = 256 * 1024) {
  const used = getLocalStorageUsageBytes()
  warnNearQuota(used)
  if (used + needBytes < SOFT_LIMIT_BYTES) return true

  for (const k of EVICTABLE_KEYS) safeRemoveItem(k)
  if (getLocalStorageUsageBytes() + needBytes < SOFT_LIMIT_BYTES) return true

  clearDemoLocalStorage()
  return getLocalStorageUsageBytes() + needBytes < SOFT_LIMIT_BYTES
}

/**
 * 写入 JSON。配额不足时：腾空间 → 清本 key 再写 → 清可丢弃 → 清其它 i_doms_*。
 * 全部失败则放弃持久化，不抛错，避免打断页面。
 */
export function persistJson(key, data) {
  let payload = data
  try {
    if (typeof data !== 'string') payload = JSON.stringify(data)
  } catch {
    return false
  }

  const need = typeof payload === 'string' ? payload.length * 2 + 1024 : 256 * 1024
  ensureStorageHeadroom(need)

  if (safeSetItem(key, payload)) return true
  safeRemoveItem(key)
  if (safeSetItem(key, payload)) return true
  for (const k of EVICTABLE_KEYS) {
    if (k !== key) safeRemoveItem(k)
  }
  if (safeSetItem(key, payload)) return true
  evictLocalStorageForQuota(key)
  const ok = safeSetItem(key, payload)
  if (!ok && !warnedPersistFail) {
    warnedPersistFail = true
    console.warn(
      `[safeStorage] 写入「${key}」失败（配额仍不足），本次仅保留内存态。` +
        '可执行 __clearIDomsStorage() 后刷新。',
    )
  }
  return ok
}

/** 开发排查：挂到 window，控制台可直接清理 */
export function installStorageDebugHelpers() {
  if (typeof window === 'undefined') return
  window.__clearIDomsStorage = () => {
    const n = clearDemoLocalStorage()
    console.info(`[safeStorage] 已清理 ${n} 个演示缓存 key，请刷新页面。`)
    return n
  }
  window.__iDomsStorageSizes = () => {
    const used = getLocalStorageUsageBytes()
    console.table(listLocalStorageSizes())
    console.info(`合计约 ${(used / 1024 / 1024).toFixed(2)} MB`)
    return { used, rows: listLocalStorageSizes() }
  }
}

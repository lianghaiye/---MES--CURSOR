import {
  assignOverviewIndexes,
  buildBomOverviewTree,
  flattenOverviewRows,
} from '@/utils/bomOverview'
import { bomOverviewBaseColumns, defaultBomOverviewColumnSettings } from '@/mock/bomOverviewColumns'
import { buildTableColumns } from '@/utils/tableColumnSettings'

const STORAGE_PREFIX = 'bom-print-preview:'

function resolvePrintColumns(columnSettings, baseColumns) {
  const settings = columnSettings?.length
    ? columnSettings
    : JSON.parse(JSON.stringify(defaultBomOverviewColumnSettings))
  const columns = baseColumns?.length ? baseColumns : bomOverviewBaseColumns
  return buildTableColumns(columns, settings, { minScrollX: 0 })
}

/** 深拷贝打印源数据，去掉响应式代理 / 环形引用风险 */
function clonePrintSource(value) {
  if (value == null) return value
  return JSON.parse(JSON.stringify(value))
}

function pruneOldBomPrintPayloads() {
  const keys = []
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key)
  }
  keys
    .sort()
    .slice(0, Math.max(0, keys.length - 8))
    .forEach((key) => {
      try {
        sessionStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    })
}

/** 构建 BOM 打印/预览数据 */
export function buildBomPrintPayload({
  flatNodes,
  lineItems,
  rootItemName,
  overviewInfo,
  quantity = 1,
  columnSettings,
  baseColumns,
  paper = 'A4',
  orientation = 'portrait',
  materialQtyByCode = null,
  printScene = null,
}) {
  const scale = Number(quantity) || 1
  const resolvedColumnSettings = columnSettings?.length
    ? columnSettings
    : JSON.parse(JSON.stringify(defaultBomOverviewColumnSettings))
  const safeFlatNodes = clonePrintSource(flatNodes) || []
  const safeLineItems = clonePrintSource(lineItems) || []
  const safeQtyMap = clonePrintSource(materialQtyByCode)
  const tree = assignOverviewIndexes(
    buildBomOverviewTree(safeFlatNodes, safeLineItems, scale, safeQtyMap),
  )
  const payload = {
    rootItemName: rootItemName || '—',
    overviewInfo: overviewInfo || {},
    quantity: scale,
    paper,
    orientation,
    columns: resolvePrintColumns(resolvedColumnSettings, baseColumns).map((col) => ({
      key: col.key,
      title: col.title,
      dataIndex: col.dataIndex,
      align: col.align,
    })),
    rows: flattenOverviewRows(tree),
    printedAt: new Date().toISOString(),
  }
  if (printScene) {
    payload.printConfig = {
      scene: printScene,
      columnSettings: JSON.parse(JSON.stringify(resolvedColumnSettings)),
      baseColumns: baseColumns?.length
        ? baseColumns.map((col) => ({ ...col }))
        : bomOverviewBaseColumns.map((col) => ({ ...col })),
      flatNodes: safeFlatNodes,
      lineItems: safeLineItems,
      materialQtyByCode: safeQtyMap,
      rootItemName: rootItemName || '—',
      overviewInfo: overviewInfo || {},
      quantity: scale,
      paper,
      orientation,
    }
  }
  return payload
}

export function saveBomPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const raw = JSON.stringify(payload)
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, raw)
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      pruneOldBomPrintPayloads()
      sessionStorage.setItem(STORAGE_PREFIX + key, raw)
    } else {
      throw err
    }
  }
  return key
}

export function updateBomPrintPayload(key, payload) {
  if (!key || !payload) return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      pruneOldBomPrintPayloads()
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
    }
  }
}

export function loadBomPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * 打开 BOM 打印预览页
 * @param {import('vue-router').Router} router
 * @param {object} payload
 * @param {{ autoPrint?: boolean, previewWin?: Window | null }} [options]
 * @returns {{ ok: boolean, message?: string }}
 */
export function openBomPrintPreview(
  router,
  payload,
  { autoPrint = false, previewWin = null } = {},
) {
  try {
    const key = saveBomPrintPayload(payload)
    const query = { key }
    if (autoPrint) query.autoPrint = '1'
    const { href } = router.resolve({ name: 'product-process-bom-preview', query })
    const absoluteHref = new URL(href, window.location.origin).href

    // 优先使用点击瞬间已打开的窗口（避免丢失用户手势被当广告拦截）
    if (previewWin && !previewWin.closed) {
      previewWin.location.href = absoluteHref
      return { ok: true }
    }

    const win = window.open(absoluteHref, '_blank')
    if (win) return { ok: true }

    // 弹窗被拦：同页打开（预览页「关闭」会回退）
    window.location.assign(absoluteHref)
    return { ok: true }
  } catch (err) {
    try {
      previewWin?.close()
    } catch {
      /* ignore */
    }
    const msg =
      err?.name === 'QuotaExceededError' || err?.code === 22
        ? '预览数据过大，本地存储空间不足，请清理浏览器缓存后重试'
        : String(err?.message || '').includes('circular')
          ? '预览数据含无效结构，请刷新页面后重试'
          : '预览数据生成失败，请刷新后重试'
    return { ok: false, message: msg }
  }
}

export function formatPrintQty(val) {
  if (val == null || val === '' || val === '—') return '—'
  const num = Number(val)
  if (Number.isNaN(num)) return '—'
  return num.toFixed(2)
}

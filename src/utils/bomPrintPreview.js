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
  const tree = assignOverviewIndexes(
    buildBomOverviewTree(flatNodes, lineItems, scale, materialQtyByCode),
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
      flatNodes,
      lineItems,
      materialQtyByCode,
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
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function updateBomPrintPayload(key, payload) {
  if (!key || !payload) return
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
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

export function openBomPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveBomPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'product-process-bom-preview', query })
  window.open(href, '_blank')
}

export function formatPrintQty(val) {
  if (val == null || val === '' || val === '—') return '—'
  const num = Number(val)
  if (Number.isNaN(num)) return '—'
  return num.toFixed(2)
}

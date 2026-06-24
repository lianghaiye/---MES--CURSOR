import {
  assignOverviewIndexes,
  buildBomOverviewTree,
  flattenOverviewRows,
} from '@/utils/bomOverview'
import { bomOverviewBaseColumns, defaultBomOverviewColumnSettings } from '@/mock/bomOverviewColumns'
import { buildTableColumns } from '@/utils/tableColumnSettings'

const STORAGE_PREFIX = 'bom-print-preview:'

function resolvePrintColumns(columnSettings) {
  const settings = columnSettings?.length
    ? columnSettings
    : JSON.parse(JSON.stringify(defaultBomOverviewColumnSettings))
  return buildTableColumns(bomOverviewBaseColumns, settings, { minScrollX: 0 })
}

/** 构建 BOM 打印/预览数据 */
export function buildBomPrintPayload({
  flatNodes,
  lineItems,
  rootItemName,
  overviewInfo,
  quantity = 1,
  columnSettings,
  paper = 'A4',
  orientation = 'portrait',
}) {
  const scale = Number(quantity) || 1
  const tree = assignOverviewIndexes(buildBomOverviewTree(flatNodes, lineItems, scale))
  return {
    rootItemName: rootItemName || '—',
    overviewInfo: overviewInfo || {},
    quantity: scale,
    paper,
    orientation,
    columns: resolvePrintColumns(columnSettings).map((col) => ({
      key: col.key,
      title: col.title,
      dataIndex: col.dataIndex,
      align: col.align,
    })),
    rows: flattenOverviewRows(tree),
    printedAt: new Date().toISOString(),
  }
}

export function saveBomPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
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
  if (val == null || val === '') return '—'
  return Number(val).toFixed(2)
}

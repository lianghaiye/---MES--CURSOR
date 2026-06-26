import { bomOverviewBaseColumns, defaultBomOverviewColumnSettings } from '@/mock/bomOverviewColumns'

/** 生产计划 EBOM 打印列 localStorage 键（不含前缀） */
export const PRODUCTION_PLAN_PRINT_COLUMN_STORAGE_KEY = 'production-plan-print'

const EXTRA_QTY_COLUMNS = [
  { title: '库存数', dataIndex: 'stockQty', key: 'stockQty', width: 90, align: 'right' },
  { title: '需求数', dataIndex: 'demandQty', key: 'demandQty', width: 90, align: 'right' },
]

/** 生产计划 EBOM 打印：在「单位用量」后追加库存数、需求数 */
export const productionPlanPrintBaseColumns = (() => {
  const cols = bomOverviewBaseColumns.map((col) => ({ ...col }))
  const unitIdx = cols.findIndex((col) => col.key === 'unitQty')
  if (unitIdx === -1) return [...cols, ...EXTRA_QTY_COLUMNS]
  cols.splice(unitIdx + 1, 0, ...EXTRA_QTY_COLUMNS.map((col) => ({ ...col })))
  return cols
})()

export const productionPlanPrintColumnSettings = (() => {
  const settings = defaultBomOverviewColumnSettings.map((col) => ({ ...col }))
  const unitIdx = settings.findIndex((col) => col.key === 'unitQty')
  const insertAt = unitIdx === -1 ? settings.length : unitIdx + 1
  settings.splice(
    insertAt,
    0,
    { key: 'stockQty', title: '库存数', hidden: false, frozen: false, order: insertAt },
    { key: 'demandQty', title: '需求数', hidden: false, frozen: false, order: insertAt + 1 },
  )
  return settings.map((col, index) => ({ ...col, order: index }))
})()

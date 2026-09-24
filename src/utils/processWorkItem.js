/**
 * 工序作业分项：报工口径 / 计薪口径 / 分项模板与产品单价
 * @see docs/superpowers/specs/2026-09-22-process-work-item-report-wage-design.md
 */

export const REPORT_QTY_MODE = {
  SCHEDULE: 'schedule',
  ITEMIZED: 'itemized',
}

export const WAGE_QTY_MODE = {
  REPORTED: 'reported',
  ITEMIZED: 'itemized',
}

export const REPORT_QTY_MODE_OPTIONS = [
  { value: REPORT_QTY_MODE.SCHEDULE, label: '按工单排产数' },
  { value: REPORT_QTY_MODE.ITEMIZED, label: '按分项作业' },
]

export const WAGE_QTY_MODE_OPTIONS = [
  { value: WAGE_QTY_MODE.REPORTED, label: '按报工数' },
  { value: WAGE_QTY_MODE.ITEMIZED, label: '按分项作业报工数' },
]

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

export function normalizeReportQtyMode(mode) {
  return mode === REPORT_QTY_MODE.ITEMIZED ? REPORT_QTY_MODE.ITEMIZED : REPORT_QTY_MODE.SCHEDULE
}

export function normalizeWageQtyMode(mode) {
  return mode === WAGE_QTY_MODE.ITEMIZED ? WAGE_QTY_MODE.ITEMIZED : WAGE_QTY_MODE.REPORTED
}

export function normalizeWorkItemTemplate(row = {}, index = 0) {
  const code = String(row.code || '').trim()
  const name = String(row.name || '').trim()
  const unit = String(row.unit || '个').trim() || '个'
  return {
    code: code || `WI${String(index + 1).padStart(2, '0')}`,
    name: name || code || `分项${index + 1}`,
    unit,
  }
}

export function normalizeWorkItemTemplates(list = []) {
  const seen = new Set()
  const out = []
  ;(Array.isArray(list) ? list : []).forEach((row, i) => {
    const item = normalizeWorkItemTemplate(row, i)
    if (!item.code || seen.has(item.code)) return
    seen.add(item.code)
    out.push(item)
  })
  return out
}

export function normalizeWorkItemRate(row = {}) {
  const itemCode = String(row.itemCode || row.code || '').trim()
  if (!itemCode) return null
  const planned =
    row.plannedQtyPerPiece != null && row.plannedQtyPerPiece !== ''
      ? Number(row.plannedQtyPerPiece)
      : null
  return {
    itemCode,
    unitPrice: Number(row.unitPrice) || 0,
    plannedQtyPerPiece: Number.isFinite(planned) && planned > 0 ? planned : null,
  }
}

export function normalizeWorkItemRates(list = []) {
  const map = new Map()
  ;(Array.isArray(list) ? list : []).forEach((row) => {
    const item = normalizeWorkItemRate(row)
    if (!item) return
    map.set(item.itemCode, item)
  })
  return [...map.values()]
}

/** 工序口径 + 模板规范化（迁移默认：schedule + reported） */
export function normalizeProcessWorkItemFields(process = {}) {
  const reportQtyMode = normalizeReportQtyMode(process.reportQtyMode)
  const wageQtyMode = normalizeWageQtyMode(process.wageQtyMode)
  const workItemTemplates = normalizeWorkItemTemplates(process.workItemTemplates)
  return { reportQtyMode, wageQtyMode, workItemTemplates }
}

/**
 * 配置校验
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateProcessWorkItemConfig({
  reportQtyMode,
  wageQtyMode,
  workItemTemplates = [],
} = {}) {
  const report = normalizeReportQtyMode(reportQtyMode)
  const wage = normalizeWageQtyMode(wageQtyMode)
  const templates = normalizeWorkItemTemplates(workItemTemplates)

  // 四种口径组合均允许；分项报工或分项计薪时必须有模板
  if (
    (report === REPORT_QTY_MODE.ITEMIZED || wage === WAGE_QTY_MODE.ITEMIZED) &&
    !templates.length
  ) {
    return { ok: false, message: '启用分项口径时请至少配置一条作业分项' }
  }
  const emptyName = templates.find((t) => !String(t.name || '').trim())
  if (emptyName) return { ok: false, message: '作业分项名称不能为空' }
  return { ok: true }
}

/** 工序模板左连产品分项单价 */
export function mergeWorkItemTemplatesWithRates(templates = [], rates = []) {
  const rateMap = new Map(normalizeWorkItemRates(rates).map((r) => [r.itemCode, r]))
  return normalizeWorkItemTemplates(templates).map((t) => {
    const rate = rateMap.get(t.code)
    return {
      code: t.code,
      name: t.name,
      unit: t.unit,
      unitPrice: rate ? Number(rate.unitPrice) || 0 : 0,
      plannedQtyPerPiece: rate?.plannedQtyPerPiece ?? null,
      hasPrice: Boolean(rate && Number(rate.unitPrice) > 0),
    }
  })
}

/** 分项口径下缺价清单 */
export function listMissingWorkItemPrices(mergedItems = []) {
  return (mergedItems || []).filter((item) => !item.hasPrice)
}

/** 仅「计薪按分项」才强制填写分项数量、并要求产品侧分项单价 */
export function needsWorkItemPricing(reportQtyMode, wageQtyMode) {
  void reportQtyMode
  return normalizeWageQtyMode(wageQtyMode) === WAGE_QTY_MODE.ITEMIZED
}

/** 报工时必须填写分项数量：仅分项计薪 */
export function requiresWorkItemQty(reportQtyMode, wageQtyMode) {
  void reportQtyMode
  return normalizeWageQtyMode(wageQtyMode) === WAGE_QTY_MODE.ITEMIZED
}

/** @deprecated 使用 requiresWorkItemQty */
export function requiresWorkItemReport(reportQtyMode, wageQtyMode) {
  return requiresWorkItemQty(reportQtyMode, wageQtyMode)
}

/**
 * 报工 UI 分项录入方式
 * - none: 无分项
 * - select: 仅勾选分项（排产+报工 或 分项+报工；不填数量）
 * - qty: 填写分项数量（计薪按分项时）
 */
export function resolveWorkItemEntryMode(reportQtyMode, wageQtyMode, hasTemplates = false) {
  if (requiresWorkItemQty(reportQtyMode, wageQtyMode)) return 'qty'
  // 按报工数计薪 + 有模板：勾选分项（不填量）；分项报工时另填总报工数
  if (hasTemplates && !isItemizedWageMode(wageQtyMode)) {
    return 'select'
  }
  return 'none'
}

export function isScheduleReportMode(reportQtyMode) {
  return normalizeReportQtyMode(reportQtyMode) === REPORT_QTY_MODE.SCHEDULE
}

export function isItemizedReportMode(reportQtyMode) {
  return normalizeReportQtyMode(reportQtyMode) === REPORT_QTY_MODE.ITEMIZED
}

export function isItemizedWageMode(wageQtyMode) {
  return normalizeWageQtyMode(wageQtyMode) === WAGE_QTY_MODE.ITEMIZED
}

export function sumWorkItemQty(workItems = []) {
  return round2((workItems || []).reduce((sum, row) => sum + (Number(row.qty) || 0), 0))
}

/** 报工分项行规范化（含单价快照） */
export function normalizeReportWorkItems(list = [], snapshotCatalog = []) {
  const catalog = new Map(
    (snapshotCatalog || []).map((c) => [String(c.code || c.itemCode || ''), c]),
  )
  return (Array.isArray(list) ? list : [])
    .map((row) => {
      const itemCode = String(row.itemCode || row.code || '').trim()
      if (!itemCode) return null
      const hit = catalog.get(itemCode)
      const qty = Number(row.qty) || 0
      const selected = row.selected === true || qty > 0
      const unitPrice =
        row.unitPriceSnapshot != null && row.unitPriceSnapshot !== ''
          ? Number(row.unitPriceSnapshot)
          : Number(row.unitPrice ?? hit?.unitPrice) || 0
      return {
        itemCode,
        itemName: String(row.itemName || hit?.name || itemCode),
        unit: String(row.unit || hit?.unit || '个'),
        qty,
        selected,
        unitPriceSnapshot: unitPrice,
      }
    })
    .filter(Boolean)
}

export function sumWorkItemWage(workItems = []) {
  return round2(
    (workItems || []).reduce(
      (sum, row) => sum + (Number(row.qty) || 0) * (Number(row.unitPriceSnapshot) || 0),
      0,
    ),
  )
}

/**
 * 报工提交前校验分项
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateReportWorkItems({
  reportQtyMode,
  wageQtyMode,
  workItems = [],
  catalog = [],
} = {}) {
  const mode = resolveWorkItemEntryMode(
    reportQtyMode,
    wageQtyMode,
    (catalog || []).length > 0 || (workItems || []).length > 0,
  )
  if (mode === 'none') return { ok: true }

  const normalized = normalizeReportWorkItems(workItems, catalog)

  if (mode === 'select') {
    // 分项+报工：必须至少勾选一条；排产+报工：勾选可选
    if (isItemizedReportMode(reportQtyMode)) {
      const selected = normalized.filter((r) => r.selected)
      if (!selected.length) {
        return { ok: false, message: '请至少勾选一条作业分项' }
      }
    }
    return { ok: true }
  }

  const positive = normalized.filter((r) => r.qty > 0)
  if (!positive.length) {
    return { ok: false, message: '请至少填写一条作业分项数量' }
  }
  if (isItemizedWageMode(wageQtyMode)) {
    const missing = positive.find((r) => !(Number(r.unitPriceSnapshot) > 0))
    if (missing) {
      return { ok: false, message: `分项「${missing.itemName}」缺少单价，无法计薪` }
    }
  }
  return { ok: true }
}

/** 下发快照：合并口径 + 分项清单 */
export function buildWorkItemDispatchSnapshot({
  process = {},
  laborRow = {},
  scheduleQty = 0,
} = {}) {
  const { reportQtyMode, wageQtyMode, workItemTemplates } = normalizeProcessWorkItemFields(process)
  const rates = normalizeWorkItemRates(laborRow.workItemRates)
  const merged = mergeWorkItemTemplatesWithRates(workItemTemplates, rates)
  const qty = Number(scheduleQty) || 0
  const workItems = merged.map((item) => ({
    ...item,
    plannedQtyTotal:
      item.plannedQtyPerPiece != null && qty > 0 ? round2(item.plannedQtyPerPiece * qty) : null,
  }))
  return {
    reportQtyMode,
    wageQtyMode,
    workItemEntryMode: resolveWorkItemEntryMode(
      reportQtyMode,
      wageQtyMode,
      workItemTemplates.length > 0,
    ),
    workItems,
  }
}

export function validateDispatchWorkItemPricing(snapshot = {}) {
  if (!needsWorkItemPricing(snapshot.reportQtyMode, snapshot.wageQtyMode)) {
    return { ok: true }
  }
  const missing = listMissingWorkItemPrices(snapshot.workItems || [])
  if (!missing.length) return { ok: true }
  const names = missing.map((m) => m.name || m.code).join('、')
  return {
    ok: false,
    message: `作业分项单价未配置齐全：${names}`,
    missing,
  }
}

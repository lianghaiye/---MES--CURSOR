import { productInfoState, updateProduct } from '@/store/productInfoStore'
import { materialInfoState, updateMaterial } from '@/store/materialInfoStore'
import { createDefaultLaborRow } from '@/mock/materialInfoOptions'
import { normalizeSalaryMethodForReportType } from '@/utils/laborConfigResolver'

export const BATCH_UNCHANGED = '__UNCHANGED__'

export function isProcessLaborConfigured(row = {}) {
  return !!(
    row.reportType &&
    row.salaryMethod &&
    (Number(row.standardMinutesPerPiece) > 0 ||
      Number(row.setupMinutesPerBatch) > 0 ||
      Number(row.standardHourlyRate) > 0 ||
      Number(row.pieceRate) > 0)
  )
}

function createLaborRowForProcess(processName) {
  return {
    ...createDefaultLaborRow(),
    processName,
  }
}

function toTableRow(item, itemType, laborRow, processName) {
  const base = laborRow || createLaborRowForProcess(processName)
  return {
    rowKey: `${itemType}-${item.id}`,
    itemId: item.id,
    itemType,
    code: item.code || '',
    name: item.name || '',
    specModel: item.specModel || '',
    material: item.material || '',
    laborRowId: base.id,
    reportType: base.reportType,
    salaryMethod: base.salaryMethod,
    standardMinutesPerPiece: base.standardMinutesPerPiece ?? 0,
    setupMinutesPerBatch: base.setupMinutesPerBatch ?? 0,
    standardHourlyRate: base.standardHourlyRate ?? 0,
    pieceRate: base.pieceRate ?? 0,
  }
}

/** 从主数据收集某工序下已有工时配置的产品/物料行 */
export function collectProcessLaborRows(processName) {
  void productInfoState.products
  void materialInfoState.materials
  const rows = []
  productInfoState.products.forEach((item) => {
    const laborRow = (item.laborRows || []).find((r) => r.processName === processName)
    if (laborRow) rows.push(toTableRow(item, 'product', laborRow, processName))
  })
  materialInfoState.materials.forEach((item) => {
    const laborRow = (item.laborRows || []).find((r) => r.processName === processName)
    if (laborRow) rows.push(toTableRow(item, 'material', laborRow, processName))
  })
  return rows
}

/** 将产品/物料主数据行转为未配置表格行 */
export function createUnconfiguredTableRows(items = [], processName) {
  return items.map((item) => {
    const itemType = item.itemType === '物料' ? 'material' : 'product'
    return toTableRow(item, itemType, null, processName)
  })
}

export function applyBatchFillPatch(rows, patch = {}) {
  rows.forEach((row) => {
    Object.keys(patch).forEach((field) => {
      row[field] = patch[field]
    })
    if (patch.reportType === '时长报工' && !('salaryMethod' in patch)) {
      row.salaryMethod = '计时工资'
    }
    if (row.reportType === '时长报工') {
      row.salaryMethod = normalizeSalaryMethodForReportType(row.reportType, row.salaryMethod)
      row.pieceRate = 0
    }
  })
}

export function buildBatchFillHint(patch = {}, selectedCount = 0) {
  const labels = {
    reportType: '报工类型',
    salaryMethod: '计薪方式',
    standardMinutesPerPiece: '单件标准工时',
    setupMinutesPerBatch: '整批准备工时',
    standardHourlyRate: '标准工时单价',
    pieceRate: '单件计件单价',
  }
  const formatValue = (field, value) => {
    if (field === 'standardMinutesPerPiece' || field === 'setupMinutesPerBatch') {
      return `${value} 分钟`
    }
    if (field === 'standardHourlyRate' || field === 'pieceRate') {
      return `¥${Number(value).toFixed(2)}`
    }
    return String(value)
  }
  const parts = Object.keys(labels)
    .filter((field) => {
      const value = patch[field]
      return value !== BATCH_UNCHANGED && value !== undefined && value !== null && value !== ''
    })
    .map((field) => `「${labels[field]}」统一设为 ${formatValue(field, patch[field])}`)

  if (!parts.length) {
    return '请至少填写一个需要批量修改的字段；留空的字段将保持原值不变。'
  }
  return `本次操作将把 ${parts.join('、')}，其余字段保持不变。如需仅对部分产品生效，请先在列表中精确勾选目标产品（已选 ${selectedCount} 条）。`
}

function upsertLaborRowOnItem(item, processName, rowData) {
  const laborRows = [...(item.laborRows || [])]
  const idx = laborRows.findIndex((r) => r.processName === processName)
  const payload = {
    id: rowData.laborRowId || `labor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    processName,
    reportType: rowData.reportType || undefined,
    salaryMethod: rowData.salaryMethod || undefined,
    standardMinutesPerPiece: Number(rowData.standardMinutesPerPiece) || 0,
    setupMinutesPerBatch: Number(rowData.setupMinutesPerBatch) || 0,
    standardHourlyRate: Number(rowData.standardHourlyRate) || 0,
    pieceRate: Number(rowData.pieceRate) || 0,
  }
  if (idx >= 0) {
    laborRows[idx] = { ...laborRows[idx], ...payload }
  } else {
    laborRows.push(payload)
  }
  return { laborEnabled: true, laborRows }
}

/** 批量保存：返写产品/物料基础信息中的工时配置 */
export function saveProcessLaborRows(processName, tableRows = []) {
  let saved = 0
  tableRows.forEach((row) => {
    const list =
      row.itemType === 'product' ? productInfoState.products : materialInfoState.materials
    const item = list.find((i) => i.id === row.itemId)
    if (!item) return
    const patch = upsertLaborRowOnItem(item, processName, row)
    if (row.itemType === 'product') updateProduct(item.id, patch)
    else updateMaterial(item.id, patch)
    saved += 1
  })
  return { ok: true, saved }
}

/** 批量删除：移除选中产品在指定工序下的工时配置行 */
export function removeProcessLaborRows(processName, tableRows = []) {
  let removed = 0
  tableRows.forEach((row) => {
    const list =
      row.itemType === 'product' ? productInfoState.products : materialInfoState.materials
    const item = list.find((i) => i.id === row.itemId)
    if (!item) return
    const laborRows = (item.laborRows || []).filter((r) => r.processName !== processName)
    const patch = {
      laborRows,
      laborEnabled: laborRows.length > 0 ? item.laborEnabled : false,
    }
    if (row.itemType === 'product') updateProduct(item.id, patch)
    else updateMaterial(item.id, patch)
    removed += 1
  })
  return { ok: true, removed }
}

export function reportTypeTagColor(reportType) {
  if (reportType === '时长报工') return 'orange'
  if (reportType === '批量计件') return 'blue'
  return 'default'
}

export function salaryMethodTagColor(salaryMethod) {
  if (salaryMethod === '计件工资') return 'green'
  if (salaryMethod === '计时工资') return 'cyan'
  return 'default'
}

export function shortReportTypeLabel(reportType) {
  if (reportType === '批量计件') return '计件'
  if (reportType === '时长报工') return '计时'
  return reportType || '—'
}

export function shortSalaryMethodLabel(salaryMethod) {
  if (salaryMethod === '计件工资') return '按件'
  if (salaryMethod === '计时工资') return '按工时'
  return salaryMethod || '—'
}

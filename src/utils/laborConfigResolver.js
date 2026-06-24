import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { legacyReportTypeMap, legacySalaryMethodMap } from '@/mock/materialInfoOptions'
import { PROCESS_REPORT_LABOR_BY_CODE } from '@/mock/processReportLaborConfig'

function normalizeLaborRow(row = {}) {
  if (!row) return null
  return {
    processName: row.processName || '',
    reportType: legacyReportTypeMap[row.reportType] || row.reportType || '',
    salaryMethod: legacySalaryMethodMap[row.salaryMethod] || row.salaryMethod || '',
    standardMinutesPerPiece: Number(row.standardMinutesPerPiece) || 0,
    setupMinutesPerBatch: Number(row.setupMinutesPerBatch) || 0,
    standardHourlyRate: Number(row.standardHourlyRate) || 0,
    pieceRate: Number(row.pieceRate) || 0,
  }
}

function findInList(list, materialCode, processName) {
  if (!materialCode) return null
  const item = list.find((row) => row.code === materialCode)
  if (!item?.laborEnabled || !item.laborRows?.length) return null
  const hit = item.laborRows.find((r) => r.processName === processName) || item.laborRows[0]
  return normalizeLaborRow(hit)
}

/** 按物品编码 + 工序名称解析工时配置，未配置返回 null（按 0 计算） */
export function resolveLaborConfig(materialCode, processName) {
  void productInfoState.products
  void materialInfoState.materials
  const fromMaster =
    findInList(productInfoState.products, materialCode, processName) ||
    findInList(materialInfoState.materials, materialCode, processName)
  if (fromMaster) return fromMaster

  const fallback = PROCESS_REPORT_LABOR_BY_CODE[materialCode]
  if (!fallback?.laborEnabled || !fallback.laborRows?.length) return null
  const hit = fallback.laborRows.find((r) => r.processName === processName) || fallback.laborRows[0]
  return normalizeLaborRow(hit)
}

export function laborCalcMethodLabel(reportType, salaryMethod) {
  return `${reportType || '—'}+${salaryMethod || '—'}`
}

/** 工资汇总应展示的单价类型 */
export function resolveWageRateDisplayMode(config = {}) {
  if (!config) return null
  const reportType = config.reportType || ''
  const salaryMethod = config.salaryMethod || ''
  if (reportType === '批量计件' && salaryMethod === '计件工资') return 'piece'
  if (salaryMethod === '计时工资' && (reportType === '批量计件' || reportType === '时长报工')) {
    return 'hourly'
  }
  return null
}

/** 合并任务级单价覆盖（不影响主数据工时配置） */
export function resolveEffectiveLaborConfig(config, line = {}) {
  if (!config) return null
  const effective = { ...config }
  if (line.overrideSalaryMethod) {
    effective.salaryMethod = line.overrideSalaryMethod
  }
  if (line.overridePieceRate != null && line.overridePieceRate !== '') {
    effective.pieceRate = Number(line.overridePieceRate) || 0
  }
  if (line.overrideStandardHourlyRate != null && line.overrideStandardHourlyRate !== '') {
    effective.standardHourlyRate = Number(line.overrideStandardHourlyRate) || 0
  }
  return effective
}

/** 当前报工类型下可选的计薪方式 */
export function resolveSalaryMethodOptions(reportType = '') {
  if (reportType === '时长报工') return ['计时工资']
  return ['计件工资', '计时工资']
}

export function canEditSalaryMethod(config = {}) {
  return resolveSalaryMethodOptions(config.reportType).length > 1
}

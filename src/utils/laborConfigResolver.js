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
  const hit =
    fallback.laborRows.find((r) => r.processName === processName) || fallback.laborRows[0]
  return normalizeLaborRow(hit)
}

export function laborCalcMethodLabel(reportType, salaryMethod) {
  return `${reportType || '—'}+${salaryMethod || '—'}`
}

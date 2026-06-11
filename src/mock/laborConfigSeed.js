/** 产品/物料工时配置种子（仅演示物料有预设，其余默认关闭） */
import { LABOR_CONFIG_BY_CODE as DEMO_LABOR_CONFIG } from '@/mock/laborHourDemoSeed'

export const LABOR_CONFIG_VERSION = 5

export { LABOR_CONFIG_BY_CODE } from '@/mock/laborHourDemoSeed'

let laborRowSeq = 0

export function createLaborRow(partial = {}) {
  laborRowSeq += 1
  return {
    id: `labor-seed-${laborRowSeq}`,
    processName: partial.processName,
    reportType: partial.reportType,
    salaryMethod: partial.salaryMethod,
    standardMinutesPerPiece: partial.standardMinutesPerPiece ?? 0,
    setupMinutesPerBatch: partial.setupMinutesPerBatch ?? 0,
    standardHourlyRate: partial.standardHourlyRate ?? 0,
    pieceRate: partial.pieceRate ?? 0,
  }
}

function cloneLaborPreset(preset) {
  return {
    laborEnabled: preset.laborEnabled,
    laborRows: preset.laborRows.map((row) => createLaborRow(row)),
  }
}

/**
 * 为主数据刷入工时配置：仅 DEMO_LABOR_CONFIG 中的编码启用工时，其余关闭
 */
export function applyLaborConfigSeed(list, options = {}) {
  const { force = false } = options
  return (list || []).map((item) => {
    const preset = DEMO_LABOR_CONFIG[item.code]
    if (preset) {
      return { ...item, ...cloneLaborPreset(preset) }
    }
    if (!force && item.laborEnabled && item.laborRows?.length) {
      return item
    }
    return { ...item, laborEnabled: false, laborRows: [] }
  })
}

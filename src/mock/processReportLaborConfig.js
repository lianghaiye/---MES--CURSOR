/** 工序报工演示：固定产品编码的工时配置（主数据未建档时回退） */
import { createLaborRow } from '@/mock/laborConfigSeed'
import { LABOR_CONFIG_BY_CODE } from '@/mock/laborHourDemoSeed'

function clonePreset(preset) {
  return {
    laborEnabled: preset.laborEnabled,
    laborRows: (preset.laborRows || []).map((row) => createLaborRow(row)),
  }
}

/** LH-MAT 演示物料 + 轴承/定子铁芯产品编码 */
export const PROCESS_REPORT_LABOR_BY_CODE = {
  ...Object.fromEntries(
    Object.entries(LABOR_CONFIG_BY_CODE).map(([code, preset]) => [code, clonePreset(preset)]),
  ),
  CP2510002: {
    laborEnabled: true,
    laborRows: [
      createLaborRow({
        processName: '领料',
        reportType: '批量计件',
        salaryMethod: '计件工资',
        pieceRate: 17.5,
        standardMinutesPerPiece: 12,
        setupMinutesPerBatch: 30,
        standardHourlyRate: 38,
      }),
      createLaborRow({
        processName: '轴承装配',
        reportType: '批量计件',
        salaryMethod: '计件工资',
        pieceRate: 12,
        standardMinutesPerPiece: 15,
        setupMinutesPerBatch: 20,
        standardHourlyRate: 36,
      }),
      createLaborRow({
        processName: '总装',
        reportType: '批量计件',
        salaryMethod: '计件工资',
        pieceRate: 25,
        standardMinutesPerPiece: 20,
        setupMinutesPerBatch: 40,
        standardHourlyRate: 40,
      }),
    ],
  },
  CP2510001: {
    laborEnabled: true,
    laborRows: [
      createLaborRow({
        processName: '粗车',
        reportType: '批量计件',
        salaryMethod: '计时工资',
        pieceRate: 0,
        standardMinutesPerPiece: 18,
        setupMinutesPerBatch: 45,
        standardHourlyRate: 42,
      }),
      createLaborRow({
        processName: '精车',
        reportType: '批量计件',
        salaryMethod: '计件工资',
        pieceRate: 22,
        standardMinutesPerPiece: 15,
        setupMinutesPerBatch: 30,
        standardHourlyRate: 40,
      }),
    ],
  },
  CP2510003: {
    laborEnabled: true,
    laborRows: [
      createLaborRow({
        processName: '领料',
        reportType: '批量计件',
        salaryMethod: '计件工资',
        pieceRate: 8,
        standardMinutesPerPiece: 10,
        setupMinutesPerBatch: 25,
        standardHourlyRate: 35,
      }),
      createLaborRow({
        processName: '预装',
        reportType: '批量计件',
        salaryMethod: '计时工资',
        pieceRate: 0,
        standardMinutesPerPiece: 14,
        setupMinutesPerBatch: 35,
        standardHourlyRate: 36,
      }),
      createLaborRow({
        processName: '调试',
        reportType: '时长报工',
        salaryMethod: '计件工资',
        pieceRate: 10,
        standardMinutesPerPiece: 12,
        setupMinutesPerBatch: 20,
        standardHourlyRate: 40,
      }),
      createLaborRow({
        processName: '入库',
        reportType: '时长报工',
        salaryMethod: '计时工资',
        pieceRate: 0,
        standardMinutesPerPiece: 6,
        setupMinutesPerBatch: 15,
        standardHourlyRate: 38,
      }),
    ],
  },
}

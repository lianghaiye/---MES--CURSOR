import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { personnelList } from '@/mock/personnel'
import {
  breakdownToLegacy,
  ensureDefectBreakdown,
  resolveDefectReasonLabel,
} from '@/utils/defectBreakdown'
import { resolveDefectItemsByIds } from '@/store/defectItemStore'
import { resolveReportMode } from '@/utils/reportMode'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { calcProcessReportWage } from '@/utils/processReportWageCalc'

function findMasterByCode(code) {
  if (!code) return null
  void productInfoState.products
  void materialInfoState.materials
  return (
    productInfoState.products.find((p) => p.code === code) ||
    materialInfoState.materials.find((m) => m.code === code) ||
    null
  )
}

function resolveReporterWorkCenter(reporter) {
  if (!reporter) return '—'
  const hit = personnelList.find((p) => p.name === reporter)
  return hit?.dept || '—'
}

/** 列表展示字段：规格型号/材质从主数据带出，工作中心从报工人所属部门带出 */
export function enrichProcessReportRecord(record) {
  if (!record) return null
  const master = findMasterByCode(record.productCode)
  const items = resolveDefectItemsByIds(record.defectItemIds || [])
  const defectBreakdown = ensureDefectBreakdown(record, items)
  const legacy = breakdownToLegacy(defectBreakdown)
  const config = resolveLaborConfig(record.productCode, record.processName)
  const wageLine = { ...record, ...legacy, defectBreakdown: legacy.defectBreakdown }
  const wage = calcProcessReportWage(config, wageLine)
  return {
    ...record,
    ...legacy,
    reportSourceLabel: record.source === 'workorder' ? '任务报工' : '快速报工',
    reportDate: (record.createdAt || '').slice(0, 10) || '—',
    specModel: master?.specModel || '—',
    material: master?.material || '—',
    workCenter: resolveReporterWorkCenter(record.reporter),
    defectItems: resolveDefectReasonLabel({ ...record, ...legacy }, items),
    defectReason: legacy.defectReasonLabel,
    reportType: config?.reportType || resolveReportMode(record.reportMode) || record.reportMode || '—',
    salaryMethod: config?.salaryMethod || '—',
    calcMethod:
      config?.reportType && config?.salaryMethod
        ? `${config.reportType}+${config.salaryMethod}`
        : '—',
    salaryAmount: wage.salaryAmount,
  }
}

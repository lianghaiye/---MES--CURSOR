import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { personnelList } from '@/mock/personnel'

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
  return {
    ...record,
    reportSourceLabel: record.source === 'workorder' ? '任务报工' : '快速报工',
    reportDate: (record.createdAt || '').slice(0, 10) || '—',
    specModel: master?.specModel || '—',
    material: master?.material || '—',
    workCenter: resolveReporterWorkCenter(record.reporter),
    defectItems: record.defectItemNames?.length ? record.defectItemNames.join('、') : '—',
    reportType: record.reportMode || '—',
  }
}

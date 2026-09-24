import { cell, numCell } from './exportFieldHelpers'

function moneyCell(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return ''
  return num.toFixed(2)
}

/** 工序报工列表 — 导出报工明细字段 */
export const processReportExportFields = [
  { key: 'status', title: '状态', getValue: (row) => cell(row, 'status') },
  {
    key: 'reportSourceLabel',
    title: '报工方式',
    getValue: (row) => cell(row, 'reportSourceLabel'),
  },
  { key: 'workOrderNo', title: '工单号', getValue: (row) => cell(row, 'workOrderNo') },
  { key: 'taskNo', title: '任务编号', getValue: (row) => cell(row, 'taskNo') },
  { key: 'productName', title: '产品名称', getValue: (row) => cell(row, 'productName') },
  { key: 'productCode', title: '产品编码', getValue: (row) => cell(row, 'productCode') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'processName', title: '工序名称', getValue: (row) => cell(row, 'processName') },
  { key: 'reportType', title: '报工类型', getValue: (row) => cell(row, 'reportType') },
  { key: 'reportDate', title: '报工日期', getValue: (row) => cell(row, 'reportDate') },
  { key: 'createdAt', title: '报工时间', getValue: (row) => cell(row, 'createdAt') },
  {
    key: 'scheduleQty',
    title: '排产数',
    getValue: (row) => numCell(row.scheduleQty),
  },
  { key: 'goodQty', title: '良品数', getValue: (row) => numCell(row.goodQty) },
  { key: 'defectQty', title: '不良品数', getValue: (row) => numCell(row.defectQty) },
  {
    key: 'finishedQty',
    title: '报工总数',
    getValue: (row) => numCell(row.finishedQty),
  },
  { key: 'defectReason', title: '不良原因', getValue: (row) => cell(row, 'defectReason') },
  { key: 'reporter', title: '报工人', getValue: (row) => cell(row, 'reporter') },
  { key: 'workCenter', title: '工作中心', getValue: (row) => cell(row, 'workCenter') },
  { key: 'team', title: '班组', getValue: (row) => cell(row, 'team') },
  { key: 'salaryMethod', title: '计薪方式', getValue: (row) => cell(row, 'salaryMethod') },
  {
    key: 'salaryAmount',
    title: '计薪(元)',
    getValue: (row) => moneyCell(row.salaryAmount),
  },
  { key: 'startTime', title: '开始时间', getValue: (row) => cell(row, 'startTime') },
  { key: 'endTime', title: '结束时间', getValue: (row) => cell(row, 'endTime') },
  { key: 'remark', title: '备注', getValue: (row) => cell(row, 'remark') },
]

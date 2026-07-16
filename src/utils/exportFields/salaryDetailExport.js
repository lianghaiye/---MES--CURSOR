import { cell, numCell } from './exportFieldHelpers'

function formatOptionalNum(val) {
  if (val == null || val === '') return ''
  return numCell(val)
}

export const salaryDetailExportFields = [
  { key: 'employeeName', title: '员工姓名', getValue: (row) => cell(row, 'employeeName') },
  { key: 'sourceLabel', title: '来源', getValue: (row) => cell(row, 'sourceLabel') },
  { key: 'workOrderCode', title: '工单编号', getValue: (row) => cell(row, 'workOrderCode') },
  { key: 'taskNo', title: '任务编号', getValue: (row) => cell(row, 'taskNo') },
  { key: 'processName', title: '工序名称', getValue: (row) => cell(row, 'processName') },
  { key: 'reportType', title: '报工类型', getValue: (row) => cell(row, 'reportType') },
  { key: 'reportTime', title: '报工时间', getValue: (row) => cell(row, 'reportTime') },
  { key: 'goodQty', title: '良品数', getValue: (row) => numCell(row.goodQty) },
  { key: 'defectQty', title: '不良品数', getValue: (row) => numCell(row.defectQty) },
  { key: 'defectReason', title: '不良原因', getValue: (row) => cell(row, 'defectReason') },
  { key: 'workHours', title: '报工工时', getValue: (row) => numCell(row.workHours) },
  {
    key: 'adjustedGoodQty',
    title: '调整良品数',
    getValue: (row) => formatOptionalNum(row.adjustedGoodQty),
  },
  {
    key: 'adjustedDefectQty',
    title: '调整不良品数',
    getValue: (row) => formatOptionalNum(row.adjustedDefectQty),
  },
  {
    key: 'adjustedWorkHours',
    title: '调整工时',
    getValue: (row) => formatOptionalNum(row.adjustedWorkHours),
  },
  {
    key: 'subsidyReportQty',
    title: '补贴报工数',
    getValue: (row) => numCell(row.subsidyReportQty),
  },
  { key: 'subsidyHours', title: '补贴工时', getValue: (row) => numCell(row.subsidyHours) },
  { key: 'finalPieceQty', title: '最终计件数', getValue: (row) => numCell(row.finalPieceQty) },
  { key: 'accountHours', title: '最终核算工时', getValue: (row) => numCell(row.accountHours) },
  { key: 'salaryMethod', title: '计薪方式', getValue: (row) => cell(row, 'salaryMethod') },
  { key: 'goodWage', title: '良品工资', getValue: (row) => numCell(row.goodWage) },
  { key: 'defectWage', title: '不良品工资', getValue: (row) => numCell(row.defectWage) },
  { key: 'prepWage', title: '准备工时工资', getValue: (row) => numCell(row.prepWage) },
  { key: 'subsidyAmount', title: '补贴金额', getValue: (row) => numCell(row.subsidyAmount) },
  {
    key: 'qualityDeduction',
    title: '质量扣款',
    getValue: (row) => numCell(row.qualityDeduction),
  },
  { key: 'salaryAmount', title: '计薪(元)', getValue: (row) => numCell(row.salaryAmount) },
]

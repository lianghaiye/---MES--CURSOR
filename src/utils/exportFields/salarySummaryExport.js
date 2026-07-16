import { cell, numCell } from './exportFieldHelpers'

export const salarySummaryExportFields = [
  { key: 'employeeNo', title: '员工工号', getValue: (row) => cell(row, 'employeeNo') },
  { key: 'employeeName', title: '员工姓名', getValue: (row) => cell(row, 'employeeName') },
  { key: 'positions', title: '员工岗位', getValue: (row) => cell(row, 'positions') },
  { key: 'workCenter', title: '工作中心', getValue: (row) => cell(row, 'workCenter') },
  { key: 'taskCount', title: '完成任务数', getValue: (row) => numCell(row.taskCount) },
  { key: 'reportQty', title: '报工总数', getValue: (row) => numCell(row.reportQty) },
  { key: 'workHours', title: '总工时', getValue: (row) => numCell(row.workHours) },
  { key: 'subsidyAmount', title: '补贴金额', getValue: (row) => numCell(row.subsidyAmount) },
  {
    key: 'qualityDeduction',
    title: '质量扣款',
    getValue: (row) => numCell(row.qualityDeduction),
  },
  { key: 'salaryAmount', title: '计薪(元)', getValue: (row) => numCell(row.salaryAmount) },
]

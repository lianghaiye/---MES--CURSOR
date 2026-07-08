/** 工序报工详情 — 报工详情 Tab 表格列与合计行 */

export const processReportExecutorHint =
  '实际完成报工的人员（小程序报工时选择的执行人）'

export const processReportOperatorHint =
  '在终端提交本条报工记录的人员；组长代报时为组长，自报时与执行人相同'

export const processReportDetailLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '任务状态', key: 'taskStatus', width: 90, fixed: 'left' },
  { title: '推送状态', key: 'pushStatus', width: 100, fixed: 'left' },
  { title: '任务编号', dataIndex: 'taskNo', width: 130 },
  { title: '工序名称', dataIndex: 'processName', width: 110 },
  { title: '执行人', key: 'reporter', dataIndex: 'reporter', width: 90 },
  { title: '操作人', key: 'operator', dataIndex: 'operator', width: 90 },
  { title: '班组', dataIndex: 'team', width: 100 },
  { title: '报工类型', dataIndex: 'reportType', width: 100 },
  { title: '排产数', key: 'scheduleQty', dataIndex: 'scheduleQty', width: 96, align: 'right' },
  { title: '良品数', dataIndex: 'goodQty', width: 80, align: 'right' },
  { title: '不良品数', dataIndex: 'defectQty', width: 88, align: 'right' },
  { title: '核算工时', key: 'listAccountHours', width: 90, align: 'right' },
  { title: '不良原因', dataIndex: 'defectReason', width: 120, ellipsis: true },
  { title: '计薪方式', dataIndex: 'salaryMethod', width: 100 },
  { title: '计薪(元)', key: 'salaryAmount', width: 100, align: 'right' },
  { title: '任务开始时间', dataIndex: 'taskStartTime', width: 150 },
  { title: '任务结束时间', dataIndex: 'taskEndTime', width: 150 },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
  { title: '现场图片', key: 'sceneImages', width: 140 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
]

export function buildProcessReportDetailSummaryCells(summary, formatAccountHours, formatMoney) {
  const totalCols = 1 + processReportDetailLineColumns.length + 1
  const cells = Array.from({ length: totalCols }, (_, index) => ({
    index,
    content: '',
    align: undefined,
  }))
  cells[1].content = '合计'
  cells[10].content = String(summary.goodQty)
  cells[10].align = 'right'
  cells[11].content = String(summary.defectQty)
  cells[11].align = 'right'
  cells[12].content = formatAccountHours(summary.accountHours, true)
  cells[12].align = 'right'
  cells[15].content = formatMoney(summary.salaryAmount)
  cells[15].align = 'right'
  return cells
}

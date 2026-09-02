/**
 * 工序报工 - 快速报工 MOCK（四种报工类型+计薪方式各一条）
 * 物料编码与 laborHourDemoSeed / 物料主数据 LH-MAT-01~04 对齐
 */
import dayjs from 'dayjs'
import { DEMO_MATERIAL_DEFS } from '@/mock/laborHourDemoSeed'

function formatReportDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(n) {
  return dayjs().subtract(n, 'day').format('YYYY-MM-DD')
}

function dateTime(day, time) {
  return `${day} ${time}`
}

function createQuick(partial) {
  const goodQty = Number(partial.goodQty) || 0
  const defectQty = Number(partial.defectQty) || 0
  return {
    source: 'quick',
    workOrderNo: '',
    workOrderId: '',
    finishedQty: goodQty + defectQty,
    defectItemIds: [],
    defectItemNames: [],
    defectReason: '',
    rejectReason: '',
    team: partial.team || '',
    status: partial.status || '待审核',
    ...partial,
    goodQty,
    defectQty,
  }
}

const LH = Object.fromEntries(DEMO_MATERIAL_DEFS.map((d) => [d.code, d]))

export function createProcessReportQuickSeed() {
  const today = formatReportDate()
  const yesterday = daysAgo(1)

  return [
    // 批量计件 + 计件工资
    createQuick({
      id: 'pr-quick-bc-p',
      processName: LH['LH-MAT-01'].processName,
      productName: LH['LH-MAT-01'].name,
      productCode: LH['LH-MAT-01'].code,
      reportMode: LH['LH-MAT-01'].reportType,
      goodQty: 7,
      defectQty: 3,
      defectBreakdown: [
        { id: 'di-2', name: '有气孔', qty: 1 },
        { id: 'di-6', name: '尺寸超差', qty: 2 },
      ],
      team: '焊接车间',
      reporter: '张三',
      startTime: '08:00',
      endTime: '11:00',
      taskStartTime: dateTime(today, '08:00'),
      taskEndTime: dateTime(today, '11:00'),
      createdAt: dateTime(today, '11:20'),
      timeLabel: '今天 11:20',
      remark: '快速报工-批量计件计件',
    }),
    // 批量计件 + 计时工资
    createQuick({
      id: 'pr-quick-bc-t',
      processName: LH['LH-MAT-02'].processName,
      productName: LH['LH-MAT-02'].name,
      productCode: LH['LH-MAT-02'].code,
      reportMode: LH['LH-MAT-02'].reportType,
      goodQty: 5,
      defectQty: 2,
      defectBreakdown: [
        { id: 'di-3', name: '有沙眼', qty: 1 },
        { id: 'di-2', name: '有气孔', qty: 1 },
      ],
      team: '总装小组',
      reporter: '王装配',
      startTime: '09:30',
      endTime: '11:00',
      taskStartTime: dateTime(today, '09:30'),
      taskEndTime: dateTime(today, '11:00'),
      createdAt: dateTime(today, '11:15'),
      timeLabel: '今天 11:15',
      remark: '快速报工-批量计件计时',
    }),
    // 时长报工 + 计时工资
    createQuick({
      id: 'pr-quick-du-p',
      processName: LH['LH-MAT-03'].processName,
      productName: LH['LH-MAT-03'].name,
      productCode: LH['LH-MAT-03'].code,
      reportMode: LH['LH-MAT-03'].reportType,
      goodQty: 4,
      defectQty: 0,
      workHours: 3.2,
      team: '装配车间',
      reporter: '李四',
      startTime: '13:00',
      endTime: '16:12',
      taskStartTime: dateTime(yesterday, '13:00'),
      taskEndTime: dateTime(yesterday, '16:12'),
      status: '已审核',
      createdAt: dateTime(yesterday, '16:30'),
      timeLabel: '昨天 16:30',
      remark: '快速报工-时长计时',
    }),
    // 时长报工 + 计时工资
    createQuick({
      id: 'pr-quick-du-t',
      processName: LH['LH-MAT-04'].processName,
      productName: LH['LH-MAT-04'].name,
      productCode: LH['LH-MAT-04'].code,
      reportMode: LH['LH-MAT-04'].reportType,
      goodQty: 3,
      defectQty: 2,
      defectBreakdown: [
        { id: 'di-6', name: '尺寸超差', qty: 1 },
        { id: 'di-1', name: '其他', qty: 1 },
      ],
      workHours: 2.0,
      team: '质检组',
      reporter: '王检验',
      startTime: '10:00',
      endTime: '12:00',
      taskStartTime: dateTime(today, '10:00'),
      taskEndTime: dateTime(today, '12:00'),
      createdAt: dateTime(today, '12:10'),
      timeLabel: '今天 12:10',
      remark: '快速报工-时长计时',
    }),
  ]
}

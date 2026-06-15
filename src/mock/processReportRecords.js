import { breakdownToLegacy, ensureDefectBreakdown } from '@/utils/defectBreakdown'
import { resolveDefectItemsByIds } from '@/store/defectItemStore'

export const PROCESS_REPORT_STORAGE_KEY = 'i_doms_mobile_process_report_records'
export const PROCESS_REPORT_SEED_VERSION_KEY = 'i_doms_process_report_seed_v'
export const PROCESS_REPORT_SEED_VERSION = '3'
export const PROCESS_REPORT_WO_LOG_KEY = 'i_doms_process_report_wo_logs'

export const RECORD_STATUS = ['待审核', '已审核', '已拒绝']

export function formatReportDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function createSeed() {
  const today = formatReportDate()
  return [
    {
      id: 'pr-1',
      source: 'workorder',
      workOrderNo: 'WO202505280-002',
      workOrderId: 'wo-init-2',
      taskNo: `T${today.replace(/-/g, '')}001`,
      processName: '领料',
      productName: '上导轴承座',
      productCode: 'CP2510002',
      reportMode: '批量计件',
      goodQty: 20,
      defectQty: 2,
      finishedQty: 22,
      workHours: null,
      startTime: '08:30',
      endTime: '10:15',
      taskStartTime: `${today} 08:30`,
      taskEndTime: `${today} 10:15`,
      defectBreakdown: [{ id: 'di-2', name: '有气孔', qty: 2 }],
      defectItemIds: ['di-2'],
      defectItemNames: ['有气孔'],
      defectReason: '有气孔×2',
      defectReasonLabel: '有气孔×2',
      team: '装配一组',
      remark: '',
      status: '待审核',
      rejectReason: '',
      reporter: '孙琴丽',
      createdAt: `${today} 14:30`,
      timeLabel: '今天 14:30',
    },
    {
      id: 'pr-1b',
      source: 'workorder',
      workOrderNo: 'WO202505280-002',
      workOrderId: 'wo-init-2',
      taskNo: `T${today.replace(/-/g, '')}002`,
      processName: '轴承装配',
      productName: '上导轴承座',
      productCode: 'CP2510002',
      reportMode: '批量计件',
      goodQty: 18,
      defectQty: 0,
      finishedQty: 18,
      workHours: null,
      startTime: '10:30',
      endTime: '12:00',
      taskStartTime: `${today} 10:30`,
      taskEndTime: `${today} 12:00`,
      defectItemIds: [],
      defectItemNames: [],
      defectReason: '',
      team: '装配一组',
      remark: '第二批装配',
      status: '待审核',
      rejectReason: '',
      reporter: '张三',
      createdAt: `${today} 15:10`,
      timeLabel: '今天 15:10',
    },
    {
      id: 'pr-2',
      source: 'quick',
      workOrderNo: '',
      processName: '热处理',
      productName: '泵壳',
      productCode: 'BK-2024-01',
      reportMode: '时长报工',
      goodQty: 12,
      defectQty: 0,
      finishedQty: 12,
      workHours: 4.5,
      startTime: '08:00',
      endTime: '12:30',
      taskStartTime: `${today} 08:00`,
      taskEndTime: `${today} 12:30`,
      defectItemIds: [],
      defectItemNames: [],
      remark: '炉温已复核',
      status: '待审核',
      rejectReason: '',
      reporter: '王五',
      createdAt: `${today} 10:15`,
      timeLabel: '今天 10:15',
    },
    {
      id: 'pr-3',
      source: 'workorder',
      workOrderNo: 'WO202505280-001',
      workOrderId: 'wo-init-1',
      taskNo: 'T20260610001',
      processName: '粗车',
      productName: '下导轴承座毛坯',
      productCode: 'CP2510001',
      reportMode: '批量计件',
      goodQty: 10,
      defectQty: 1,
      finishedQty: 11,
      workHours: null,
      startTime: '09:00',
      endTime: '11:30',
      taskStartTime: '2026-06-10 09:00',
      taskEndTime: '2026-06-10 11:30',
      defectBreakdown: [{ id: 'di-6', name: '尺寸超差', qty: 1 }],
      defectItemIds: ['di-6'],
      defectItemNames: ['尺寸超差'],
      defectReason: '尺寸超差×1',
      defectReasonLabel: '尺寸超差×1',
      team: '加工小组',
      remark: '',
      status: '已审核',
      rejectReason: '',
      reporter: '张三',
      createdAt: '2026-06-10 16:20',
      timeLabel: '昨天 16:20',
    },
    {
      id: 'pr-4',
      source: 'quick',
      workOrderNo: '',
      processName: '装配',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      reportMode: '时长报工',
      goodQty: 0,
      defectQty: 0,
      finishedQty: 0,
      workHours: 3.0,
      startTime: '13:00',
      endTime: '16:00',
      taskStartTime: '2026-06-09 13:00',
      taskEndTime: '2026-06-09 16:00',
      defectItemIds: [],
      defectItemNames: [],
      remark: '',
      status: '已拒绝',
      rejectReason: '工时填写不完整，请重新报工',
      reporter: '张三',
      createdAt: '2026-06-09 15:40',
      timeLabel: '前天 15:40',
    },
  ]
}

export function normalizeProcessReport(row) {
  const items = resolveDefectItemsByIds(row.defectItemIds || [])
  const defectBreakdown = ensureDefectBreakdown(row, items)
  const legacy = breakdownToLegacy(defectBreakdown)
  return {
    ...row,
    source: row.source || 'quick',
    status: row.status || '待审核',
    rejectReason: row.rejectReason || '',
    ...legacy,
    defectReason: row.defectReason || legacy.defectReasonLabel,
  }
}

export function createProcessReportSeed() {
  return createSeed().map(normalizeProcessReport)
}

export function filterProcessReports(list, filters = {}) {
  let rows = [...list]
  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status)
  }
  if (filters.source) {
    rows = rows.filter((r) => r.source === filters.source)
  }
  if (filters.keyword?.trim()) {
    const kw = filters.keyword.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.workOrderNo?.toLowerCase().includes(kw) ||
        r.productName?.toLowerCase().includes(kw) ||
        r.productCode?.toLowerCase().includes(kw) ||
        r.processName?.toLowerCase().includes(kw) ||
        r.reporter?.toLowerCase().includes(kw),
    )
  }
  if (filters.dateRange?.length === 2) {
    const [start, end] = filters.dateRange
    rows = rows.filter((r) => {
      const d = (r.createdAt || '').slice(0, 10)
      return d >= start && d <= end
    })
  }
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

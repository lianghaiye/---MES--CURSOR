/**
 * 报工确认 - WEB 端（与小程序共用 storage key）
 * 流程：工单下发生成数据 → 主任调整/补贴/推送 → 工人确认 → 同步工时工资
 */

import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { resolveReportMode, normalizeReportMode } from '@/utils/reportMode'
import { getProcessByName } from '@/store/processConfigStore'
import { resolveProcessExecutionMode, shouldSplitCollaborativeTasks } from '@/utils/taskExecutionMode'
import { enrichLaborLine } from '@/utils/laborHourCalc'
import { buildLaborHourRecord } from '@/mock/laborHourManagement'
import { laborHourState, recalcOrder } from '@/store/laborHourStore'

export const REPORT_CONFIRM_STORAGE_KEY = 'i_doms_report_confirm_lines'
export const REPORT_CONFIRM_SEED_VERSION = '1'
export const REPORT_CONFIRM_SEED_VERSION_KEY = 'i_doms_report_confirm_seed_v'

export const CONFIRM_STATUS = {
  PENDING: '待确认',
  WORKER_PENDING: '待工人确认',
  CONFIRMED: '已确认',
}

const LABOR_BY_CODE = {
  'SJ-2024-A': {
    点焊: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 8.5 },
    打磨: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 6.2 },
    装配: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 38 },
  },
  'BX-2024-03': {
    车削: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 12 },
    铣削: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 15 },
  },
  'BK-2024-01': {
    热处理: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 42 },
  },
  'FL-2024-C': {
    点焊: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 9 },
    砂轮切割: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 9 },
  },
  CP2610004: {
    精车: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 45 },
    精磨: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 45 },
  },
}

function formatNow() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function resolveLabor(productCode, processName) {
  const map = LABOR_BY_CODE[productCode] || {}
  const hit = map[processName] || {}
  const cfg = resolveLaborConfig(productCode, processName)
  const reportType = resolveReportMode(hit.reportType || cfg?.reportType || '批量计件')
  const salaryMethod = hit.salaryMethod || cfg?.salaryMethod || '计件工资'
  return {
    reportType,
    salaryMethod,
    pieceRate: hit.pieceRate || cfg?.pieceRate || 0,
    standardHourlyRate: hit.standardHourlyRate || cfg?.standardHourlyRate || 0,
  }
}

function calcSalary(line) {
  const cfg = resolveLabor(line.productCode, line.processName)
  const good = Number(line.adjustedGoodQty ?? line.goodQty) || 0
  const subsidyQty = Number(line.subsidyReportQty) || 0
  const duration = Number(line.adjustedDuration ?? line.reportDuration) || 0
  const subsidyHours = Number(line.subsidyHours) || 0
  if (cfg.salaryMethod === '计件工资') {
    return Math.round((good * cfg.pieceRate + subsidyQty * cfg.pieceRate) * 100) / 100
  }
  const hours = duration + subsidyHours
  return Math.round(hours * cfg.standardHourlyRate * 100) / 100
}

function enrichLine(line) {
  const labor = resolveLabor(line.productCode, line.processName)
  return {
    ...line,
    reportType: labor.reportType,
    salaryMethod: labor.salaryMethod,
    reportTypeLabel: `${labor.reportType}+${labor.salaryMethod}`,
    calculatedSalary: line.confirmStatus === CONFIRM_STATUS.CONFIRMED ? calcSalary(line) : null,
  }
}

function createSeedLines() {
  const today = dayjs().format('YYYY-MM-DD')
  const now = formatNow()
  return [
    {
      id: 'rc-001',
      taskNo: 'T20260602011',
      workOrderId: 'wo-pr-1',
      workOrderNo: 'WO-062',
      workOrderName: '货架支架生产工单',
      processName: '点焊',
      processSeq: 1,
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      executor: '张三',
      reportTime: `${today} 08:00:00`,
      taskQty: 25,
      goodQty: 25,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
    },
    {
      id: 'rc-002',
      taskNo: 'T20260602012',
      workOrderId: 'wo-pr-1',
      workOrderNo: 'WO-062',
      workOrderName: '货架支架生产工单',
      processName: '打磨',
      processSeq: 2,
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      executor: '王五',
      reportTime: `${today} 08:00:00`,
      taskQty: 25,
      goodQty: 25,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
    },
    {
      id: 'rc-003',
      taskNo: 'T20260602022',
      workOrderId: 'wo-pr-5',
      workOrderNo: 'WO-068',
      workOrderName: '深井潜水泵生产工单',
      processName: '精车',
      processSeq: 2,
      productName: '深井潜水泵',
      productCode: 'CP2610004',
      executor: '李四',
      reportTime: `${today} 08:15:00`,
      taskQty: 8,
      goodQty: 8,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 12,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
    },
    {
      id: 'rc-004',
      taskNo: 'T202609090001',
      workOrderId: 'wo-demo-1',
      workOrderNo: 'WO-DEMO-01',
      workOrderName: '精磨演示工单',
      processName: '精磨',
      processSeq: 1,
      productName: '演示轴套',
      productCode: 'CP2610004',
      executor: '张三',
      reportTime: `${today} 09:30:00`,
      taskQty: 12,
      goodQty: 12,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 12,
      remark: '',
      confirmStatus: CONFIRM_STATUS.WORKER_PENDING,
      pushedAt: `${today} 10:00:00`,
    },
    {
      id: 'rc-005',
      taskNo: 'T202609090002',
      workOrderId: 'wo-demo-2',
      workOrderNo: 'WO-DEMO-02',
      workOrderName: '砂轮切割演示工单',
      processName: '砂轮切割',
      processSeq: 1,
      productName: '法兰盘',
      productCode: 'FL-2024-C',
      executor: '张三',
      reportTime: `${today} 11:20:00`,
      taskQty: 10,
      goodQty: 10,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '备注内容',
      confirmStatus: CONFIRM_STATUS.CONFIRMED,
      adjustedGoodQty: 10,
      adjustedDuration: 0,
      subsidyReportQty: 1,
      adjustReason: '调整原因',
      subsidyReason: '补贴原因',
      calculatedSalary: 99,
      pushedAt: `${today} 11:30:00`,
      workerConfirmedAt: now,
    },
  ].map(enrichLine)
}

function loadFromStorage() {
  if (localStorage.getItem(REPORT_CONFIRM_SEED_VERSION_KEY) !== REPORT_CONFIRM_SEED_VERSION) {
    const seed = createSeedLines()
    localStorage.setItem(REPORT_CONFIRM_STORAGE_KEY, JSON.stringify(seed))
    localStorage.setItem(REPORT_CONFIRM_SEED_VERSION_KEY, REPORT_CONFIRM_SEED_VERSION)
    return seed
  }
  try {
    const raw = localStorage.getItem(REPORT_CONFIRM_STORAGE_KEY)
    if (raw) return JSON.parse(raw).map(enrichLine)
  } catch {
    /* ignore */
  }
  return createSeedLines()
}

function persist() {
  localStorage.setItem(REPORT_CONFIRM_STORAGE_KEY, JSON.stringify(reportConfirmState.lines))
}

export const reportConfirmState = reactive({
  lines: loadFromStorage(),
})

watch(
  () => reportConfirmState.lines,
  () => persist(),
  { deep: true },
)

export function reloadReportConfirmLines() {
  reportConfirmState.lines = loadFromStorage()
  return reportConfirmState.lines
}

export function getDirectorConfirmLines(filters = {}) {
  let rows = reportConfirmState.lines.filter((l) => l.confirmStatus === CONFIRM_STATUS.PENDING)
  if (filters.workOrderNo?.trim()) {
    const kw = filters.workOrderNo.trim().toLowerCase()
    rows = rows.filter((r) => (r.workOrderNo || '').toLowerCase().includes(kw))
  }
  if (filters.productName?.trim()) {
    const kw = filters.productName.trim().toLowerCase()
    rows = rows.filter((r) => (r.productName || '').toLowerCase().includes(kw))
  }
  if (filters.executor?.trim()) {
    const kw = filters.executor.trim()
    rows = rows.filter((r) => (r.executor || '').includes(kw))
  }
  return rows.map(enrichLine)
}

export function getLineById(id) {
  const line = reportConfirmState.lines.find((l) => l.id === id)
  return line ? enrichLine(line) : null
}

export function adjustConfirmLine(id, payload = {}) {
  const line = reportConfirmState.lines.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  if (line.confirmStatus !== CONFIRM_STATUS.PENDING) {
    return { ok: false, message: '仅待确认数据可调整' }
  }
  if (payload.goodQty != null) line.adjustedGoodQty = Math.max(0, Number(payload.goodQty) || 0)
  if (payload.defectQty != null)
    line.adjustedDefectQty = Math.max(0, Number(payload.defectQty) || 0)
  if (payload.reportDuration != null)
    line.adjustedDuration = Math.max(0, Number(payload.reportDuration) || 0)
  if (payload.remark != null) line.remark = payload.remark
  if (payload.adjustReason != null) line.adjustReason = payload.adjustReason
  Object.assign(line, enrichLine(line))
  return { ok: true, line: enrichLine(line) }
}

export function subsidyConfirmLine(id, payload = {}) {
  const line = reportConfirmState.lines.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  if (line.confirmStatus !== CONFIRM_STATUS.PENDING) {
    return { ok: false, message: '仅待确认数据可补贴' }
  }
  const labor = resolveLabor(line.productCode, line.processName)
  if (labor.salaryMethod === '计件工资') {
    line.subsidyReportQty = Math.max(0, Number(payload.subsidyReportQty) || 0)
  } else {
    line.subsidyHours = Math.max(0, Number(payload.subsidyHours) || 0)
  }
  if (payload.subsidyReason != null) line.subsidyReason = payload.subsidyReason
  Object.assign(line, enrichLine(line))
  return { ok: true, line: enrichLine(line) }
}

export function pushConfirmToWorker(id) {
  const line = reportConfirmState.lines.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  if (line.confirmStatus !== CONFIRM_STATUS.PENDING) {
    return { ok: false, message: '当前状态不可推送' }
  }
  line.confirmStatus = CONFIRM_STATUS.WORKER_PENDING
  line.pushedAt = formatNow()
  Object.assign(line, enrichLine(line))
  return { ok: true, line: enrichLine(line), message: '已推送给工人确认' }
}

export function workerConfirmLine(id) {
  const line = reportConfirmState.lines.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  if (line.confirmStatus !== CONFIRM_STATUS.WORKER_PENDING) {
    return { ok: false, message: '当前状态不可确认' }
  }
  line.confirmStatus = CONFIRM_STATUS.CONFIRMED
  line.workerConfirmedAt = formatNow()
  line.calculatedSalary = calcSalary(line)
  Object.assign(line, enrichLine(line))
  syncConfirmLineToLaborHour(line)
  return { ok: true, line: enrichLine(line), message: '确认成功' }
}

/** 工人确认后写入工时工资模块 */
export function syncConfirmLineToLaborHour(line) {
  const orderId = `lh-${line.workOrderId}`
  let order = laborHourState.orders.find(
    (o) => o.id === orderId || o.workOrderId === line.workOrderId,
  )
  const laborLine = {
    id: `lhl-rc-${line.id}`,
    confirmLineId: line.id,
    taskNo: line.taskNo,
    processName: line.processName,
    executor: line.executor,
    reportQty: line.goodQty,
    reportDuration: line.reportDuration,
    adjustedReportQty: line.adjustedGoodQty ?? line.goodQty,
    adjustedDuration: line.adjustedDuration ?? line.reportDuration,
    subsidyReportQty: line.subsidyReportQty || 0,
    subsidyHours: line.subsidyHours || 0,
    adjustReason: line.adjustReason || '',
    subsidyReason: line.subsidyReason || '',
    remark: line.remark || '',
    auditStatus: '待审核',
    taskStatus: '已报工',
    pushStatus: '',
    operator: line.executor || '',
    taskStartTime: line.reportTime,
    taskEndTime: line.workerConfirmedAt || line.reportTime,
  }
  const config = resolveLaborConfig(line.productCode, line.processName)
  const enriched = enrichLaborLine(laborLine, config)

  if (!order) {
    order = buildLaborHourRecord({
      id: orderId,
      workOrderId: line.workOrderId,
      workOrderCode: line.workOrderNo,
      workOrderName: line.workOrderName,
      materialCode: line.productCode,
      materialName: line.productName,
      scheduleQty: line.taskQty,
      createdAt: line.reportTime,
      latestSubmitAt: line.workerConfirmedAt || formatNow(),
      lines: [enriched],
    })
    laborHourState.orders.unshift(recalcOrder(order))
    return
  }

  const idx = order.lines.findIndex((l) => l.confirmLineId === line.id || l.id === enriched.id)
  if (idx >= 0) {
    order.lines[idx] = { ...order.lines[idx], ...enriched }
  } else {
    order.lines.push({ ...enriched, seq: order.lines.length + 1 })
  }
  order.latestSubmitAt = line.workerConfirmedAt || formatNow()
  Object.assign(order, recalcOrder(order))
}

export function generateLinesFromWorkOrder(wo, orderCategory = '生产工单') {
  if (!wo?.processes?.length) return []
  const isDisassembly = orderCategory === '拆解工单'
  const productName = isDisassembly
    ? wo.itemName || wo.productName || ''
    : wo.productName || wo.itemName || ''
  const productCode = isDisassembly
    ? wo.itemCode || wo.materialCode || wo.productCode || ''
    : wo.materialCode || wo.productCode || wo.itemCode || ''
  const scheduleQty = wo.scheduleQty ?? wo.planQty ?? 0
  const created = []
  wo.processes.forEach((p, i) => {
    const processSeq = p.index ?? p.seq ?? i + 1
    const procConfig = getProcessByName(p.name)
    const enriched = {
      ...p,
      reportMode: normalizeReportMode(p.reportMode || procConfig?.reportMode),
      taskExecutionMode: resolveProcessExecutionMode({
        taskExecutionMode: p.taskExecutionMode ?? procConfig?.taskExecutionMode,
      }),
    }

    if (shouldSplitCollaborativeTasks(enriched)) {
      ;(p.executors || []).forEach((executorName, idx) => {
        const slot = idx + 1
        const lineId = `rc-${wo.id}-${processSeq}-${String(slot).padStart(2, '0')}`
        const exists = reportConfirmState.lines.find((l) => l.id === lineId)
        if (exists) return
        const labor = resolveLabor(productCode, p.name)
        const line = enrichLine({
          id: lineId,
          taskNo: `T${dayjs().format('YYYYMMDD')}${String(processSeq).padStart(3, '0')}-${String(slot).padStart(2, '0')}`,
          workOrderId: wo.id,
          workOrderNo: wo.code,
          workOrderName: wo.name,
          processName: p.name,
          processSeq,
          collaborationSlot: slot,
          collaborationTotal: p.executors.length,
          taskExecutionMode: 'collaborative',
          productName,
          productCode,
          executor: executorName,
          reportTime: formatNow(),
          taskQty: scheduleQty,
          goodQty: scheduleQty,
          defectQty: 0,
          scrapQty: 0,
          reportDuration: labor.reportType === '时长报工' ? Math.round(scheduleQty * 0.5 * 10) / 10 : 0,
          remark: '',
          confirmStatus: CONFIRM_STATUS.PENDING,
          orderCategory,
        })
        reportConfirmState.lines.unshift(line)
        created.push(line)
      })
      return
    }

    const exists = reportConfirmState.lines.find(
      (l) => l.workOrderId === wo.id && l.processName === p.name && !l.collaborationSlot,
    )
    if (exists) return
    const labor = resolveLabor(productCode, p.name)
    const line = enrichLine({
      id: `rc-${wo.id}-${processSeq}`,
      taskNo: `T${dayjs().format('YYYYMMDD')}${String(processSeq).padStart(3, '0')}`,
      workOrderId: wo.id,
      workOrderNo: wo.code,
      workOrderName: wo.name,
      processName: p.name,
      processSeq,
      productName,
      productCode,
      executor: p.executors?.[0] || '',
      reportTime: formatNow(),
      taskQty: scheduleQty,
      goodQty: scheduleQty,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: labor.reportType === '时长报工' ? Math.round(scheduleQty * 0.5 * 10) / 10 : 0,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
      orderCategory,
    })
    reportConfirmState.lines.unshift(line)
    created.push(line)
  })
  return created
}

export function calcConfirmStats() {
  const all = reportConfirmState.lines
  return {
    pending: all.filter((l) => l.confirmStatus === CONFIRM_STATUS.PENDING).length,
    workerPending: all.filter((l) => l.confirmStatus === CONFIRM_STATUS.WORKER_PENDING).length,
    confirmed: all.filter((l) => l.confirmStatus === CONFIRM_STATUS.CONFIRMED).length,
    total: all.length,
  }
}

export { enrichLine, calcSalary }

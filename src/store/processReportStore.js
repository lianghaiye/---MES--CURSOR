import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  PROCESS_REPORT_STORAGE_KEY,
  PROCESS_REPORT_SEED_VERSION,
  PROCESS_REPORT_SEED_VERSION_KEY,
  PROCESS_REPORT_WO_LOG_KEY,
  createProcessReportSeed,
  filterProcessReports,
  normalizeProcessReport,
  createProcessReportWoLogSeed,
  createProcessReportQuickLogSeed,
  PROCESS_REPORT_QUICK_LOG_KEY,
} from '@/mock/processReportRecords'
import { enrichProcessReportRecord } from '@/utils/processReportEnrich'
import {
  buildProcessReportQuickBundle,
  buildProcessReportWorkOrderBundle,
  calcProcessReportStats,
} from '@/utils/processReportWorkOrder'
import { calcAutoDurationHours } from '@/utils/laborHourCalc'
import {
  resolveLaborConfig,
  resolveWageRateDisplayMode,
  resolveSalaryMethodOptions,
} from '@/utils/laborConfigResolver'
import { breakdownToLegacy } from '@/utils/defectBreakdown'
import { isAuditSalaryPush } from '@/store/functionParamStore'
import {
  isPushedToMobile,
  PUSH_STATUS,
  TASK_STATUS,
  updateMobileWageStatus,
  upsertMobileWageItemFromProcessReport,
} from '@/utils/mobileLaborWagePush'
import { persistJson, safeRemoveItem, safeSetItem } from '@/utils/safeStorage'
import { pushMobileTasks } from '@/utils/mobileTaskDispatch'

function syncRecordToMobile(record) {
  if (!isPushedToMobile(record.pushStatus)) return
  if (record.source === 'quick') {
    const logsMap = loadQuickLogs()
    const bundle = buildProcessReportQuickBundle(
      record.id,
      processReportState.records,
      logsMap[record.id] || [],
    )
    if (!bundle) return
    const line = bundle.lines.find((l) => l.id === record.id)
    if (line) upsertMobileWageItemFromProcessReport(bundle, line)
    return
  }
  if (!record.workOrderId) return
  const bundle = buildProcessReportWorkOrderBundle(
    record.workOrderId,
    processReportState.records,
    loadWoLogs()[record.workOrderId] || [],
  )
  if (!bundle) return
  const line = bundle.lines.find((l) => l.id === record.id)
  if (line) upsertMobileWageItemFromProcessReport(bundle, line)
}

function clearProcessReportStorage() {
  safeRemoveItem(PROCESS_REPORT_STORAGE_KEY)
  safeRemoveItem(PROCESS_REPORT_SEED_VERSION_KEY)
  safeRemoveItem(PROCESS_REPORT_WO_LOG_KEY)
  safeRemoveItem(PROCESS_REPORT_QUICK_LOG_KEY)
}

function persistSeedBundle(seed) {
  persistJson(PROCESS_REPORT_STORAGE_KEY, seed)
  safeSetItem(PROCESS_REPORT_SEED_VERSION_KEY, PROCESS_REPORT_SEED_VERSION)
  persistJson(PROCESS_REPORT_WO_LOG_KEY, createProcessReportWoLogSeed())
  persistJson(PROCESS_REPORT_QUICK_LOG_KEY, createProcessReportQuickLogSeed())
}

function shouldReseed() {
  return localStorage.getItem(PROCESS_REPORT_SEED_VERSION_KEY) !== PROCESS_REPORT_SEED_VERSION
}

function loadRecords() {
  try {
    return loadRecordsInner()
  } catch (err) {
    console.error('[process-report] load records failed, reseeding', err)
    clearProcessReportStorage()
    try {
      return loadRecordsInner()
    } catch (err2) {
      console.error('[process-report] reseed failed, using in-memory seed', err2)
      return createProcessReportSeed()
    }
  }
}

function loadRecordsInner() {
  if (shouldReseed()) {
    const seed = createProcessReportSeed()
    persistSeedBundle(seed)
    return seed
  }
  try {
    const raw = localStorage.getItem(PROCESS_REPORT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(normalizeProcessReport)
      }
    }
  } catch {
    /* ignore */
  }
  const seed = createProcessReportSeed()
  persistSeedBundle(seed)
  return seed
}

function loadQuickLogs() {
  try {
    const raw = localStorage.getItem(PROCESS_REPORT_QUICK_LOG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function saveQuickLogs(map) {
  persistJson(PROCESS_REPORT_QUICK_LOG_KEY, map)
}

function loadWoLogs() {
  try {
    const raw = localStorage.getItem(PROCESS_REPORT_WO_LOG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function saveWoLogs(map) {
  persistJson(PROCESS_REPORT_WO_LOG_KEY, map)
}

function saveRecords(records) {
  persistJson(PROCESS_REPORT_STORAGE_KEY, records)
}

export const processReportState = reactive({
  records: loadRecords(),
})

export function reloadProcessReports() {
  processReportState.records = loadRecords()
}

/** 重置工序报工本地演示数据（localStorage 损坏或页面空白时可调用） */
export function resetProcessReportMockData() {
  clearProcessReportStorage()
  processReportState.records = loadRecords()
}

/** 返工单关联的工序报工任务 */
export function listProcessReportsByReworkOrderId(reworkOrderId) {
  if (!reworkOrderId) return []
  return processReportState.records
    .filter((r) => r.reworkOrderId === reworkOrderId)
    .map(enrichProcessReportRecord)
}

/**
 * 创建返工单后：按重做工序生成工序报工「待报工」任务，并同步小程序待办
 */
export function createReworkProcessReportTasks(reworkOrder, workOrder = null) {
  if (!reworkOrder?.id || !(reworkOrder.processes || []).length) {
    return { ok: false, message: '返工单无重做工序', records: [], mobileCount: 0 }
  }
  const wo = workOrder
  const stamp = Date.now()
  const dateStr = dayjs().format('YYYYMMDD')
  const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const records = []
  const mobileTasks = []

  ;(reworkOrder.processes || []).forEach((line, index) => {
    const processName = line.processName
    const targetQty = Math.max(0, Number(line.qty) || Number(reworkOrder.qty) || 0)
    const woProc = (wo?.processes || []).find((p) => p.name === processName)
    const originalExecutors = line.originalExecutors?.length
      ? [...line.originalExecutors]
      : [...(woProc?.executors || [])]
    const reporter = String(line.reworkAssignee || '').trim() || originalExecutors[0] || ''
    const taskExecutors = reporter ? [reporter] : [...originalExecutors]
    const team =
      woProc?.resourceType === '工人小组' || woProc?.resourceType === '小组'
        ? originalExecutors.join('、')
        : wo?.workCenter || ''
    const taskNo = `RW${dateStr}${String((stamp % 1000) + index + 1).padStart(3, '0')}`
    const id = `pr-rw-${reworkOrder.id}-${index}`

    records.push(
      normalizeProcessReport({
        id,
        source: 'workorder',
        isRework: true,
        reworkOrderId: reworkOrder.id,
        reworkNo: reworkOrder.reworkNo,
        workOrderId: reworkOrder.workOrderId || wo?.id || '',
        workOrderNo: reworkOrder.workOrderNo || wo?.code || '',
        taskNo,
        productCode: reworkOrder.productCode || wo?.productCode || wo?.materialCode || '',
        productName: reworkOrder.productName || wo?.productName || '',
        processName,
        reporter,
        operator: reporter || '系统',
        originalExecutors,
        reworkAssignee: reporter,
        goodQty: 0,
        defectQty: 0,
        finishedQty: 0,
        scheduleQty: targetQty,
        targetQty,
        reportMode: woProc?.reportMode || '批量计件',
        team,
        status: '待报工',
        taskStatus: '待报工',
        remark: `返工：${reworkOrder.reason || ''}`.trim(),
        createdAt,
        reportedAt: '',
        defectItemIds: [],
        defectItemNames: [],
        defectReason: '',
        rejectReason: '',
        images: [],
        reportQtyMode: 'schedule',
        wageQtyMode: 'reported',
        workItems: [],
        reworkAppliedQty: 0,
      }),
    )

    mobileTasks.push({
      id: `mobile-rw-${reworkOrder.id}-${index}`,
      taskNo,
      workOrderId: reworkOrder.workOrderId || wo?.id || '',
      workOrderCode: reworkOrder.workOrderNo || wo?.code || '',
      workOrderName: wo?.name || '',
      processName,
      processSeq: line.processIndex || index + 1,
      productName: reworkOrder.productName || wo?.productName || '',
      itemCode: reworkOrder.productCode || wo?.productCode || '',
      expectedQty: targetQty,
      scheduleQty: targetQty,
      executor: reporter,
      executors: taskExecutors,
      claimTargets: [],
      taskStatus: '待报工',
      placement: 'todo',
      isRework: true,
      reworkOrderId: reworkOrder.id,
      reworkNo: reworkOrder.reworkNo,
      processReportId: id,
      orderCategory: wo?.orderCategory || '生产工单',
      createdAt,
      remark: `返工任务 · ${reworkOrder.reworkNo}`,
    })
  })

  processReportState.records = [...records, ...processReportState.records]
  saveRecords(processReportState.records)
  const mobileCount = pushMobileTasks(mobileTasks)
  reworkOrder.processReportTaskIds = records.map((r) => r.id)
  return { ok: true, records, mobileCount, message: `已生成 ${records.length} 条返工任务` }
}

/** 工序报工：对待报工返工任务提交报工，并冲减返工单待重做 */
export function submitReworkProcessReportTask(recordId, payload = {}, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === recordId)
  if (!row) return { ok: false, message: '任务不存在' }
  if (!row.isRework) return { ok: false, message: '非返工任务' }
  if (row.status !== '待报工') return { ok: false, message: '仅待报工任务可提交' }
  const goodQty = Number(payload.goodQty)
  if (!(goodQty > 0)) return { ok: false, message: '报工数量须大于 0' }
  const target = Math.max(0, Number(row.targetQty ?? row.scheduleQty) || 0)
  if (target > 0 && goodQty > target + 1e-9) {
    return { ok: false, message: `超过待重做数量（${target}）` }
  }

  // eslint-disable-next-line global-require
  const { reportAgainstReworkOrder } = require('@/store/reworkOrderStore')
  const applyRes = reportAgainstReworkOrder(row.reworkOrderId, {
    processName: row.processName,
    goodQty,
    reporter: payload.reporter || row.reporter || operator,
    remark: payload.remark || '',
    processReportId: row.id,
    taskNo: row.taskNo,
  })
  if (!applyRes.ok) return applyRes

  const updated = updateRecord(recordId, {
    goodQty,
    defectQty: Number(payload.defectQty) || 0,
    finishedQty: goodQty + (Number(payload.defectQty) || 0),
    status: '待审核',
    taskStatus: TASK_STATUS.REPORTED,
    reporter: payload.reporter || row.reporter || operator,
    operator: payload.reporter || row.reporter || operator,
    remark: payload.remark != null ? payload.remark : row.remark,
    reworkAppliedQty: goodQty,
    reportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  return { ok: true, record: updated, message: applyRes.message }
}

/** 关闭返工单时取消尚未报工的返工任务 */
export function cancelReworkProcessReportTasks(reworkOrderId) {
  if (!reworkOrderId) return 0
  let count = 0
  processReportState.records.forEach((row, idx) => {
    if (row.reworkOrderId !== reworkOrderId || row.status !== '待报工') return
    processReportState.records[idx] = {
      ...row,
      status: '已取消',
      taskStatus: '已取消',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    count += 1
  })
  if (count) saveRecords(processReportState.records)
  return count
}

/** 批量导入报工记录（Excel） */
export function importProcessReportRecords(payloads = []) {
  if (!Array.isArray(payloads) || !payloads.length) {
    return { ok: false, message: '无有效导入数据', records: [] }
  }
  const stamp = Date.now()
  const woIdByNo = new Map()
  const records = payloads.map((payload, index) => {
    const goodQty = Number(payload.goodQty) || 0
    const defectQty = Number(payload.defectQty) || 0
    const source = payload.source === 'quick' ? 'quick' : 'workorder'
    const createdAt = payload.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
    let workOrderId = ''
    if (source === 'workorder') {
      const woNo = String(payload.workOrderNo || '').trim()
      if (woNo && woIdByNo.has(woNo)) {
        workOrderId = woIdByNo.get(woNo)
      } else {
        workOrderId = payload.workOrderId || `wo-import-${stamp}-${index}`
        if (woNo) woIdByNo.set(woNo, workOrderId)
      }
    }
    return normalizeProcessReport({
      id: `pr-import-${stamp}-${index}`,
      source,
      workOrderId,
      workOrderNo: payload.workOrderNo || '',
      taskNo:
        payload.taskNo ||
        `T${dayjs(createdAt).format('YYYYMMDD')}${String(index + 1).padStart(3, '0')}`,
      productCode: payload.productCode || '',
      productName: payload.productName || '',
      processName: payload.processName || '',
      reporter: payload.reporter || '',
      operator: payload.operator || payload.reporter || '导入',
      goodQty,
      defectQty,
      finishedQty: payload.finishedQty != null ? Number(payload.finishedQty) : goodQty + defectQty,
      reportMode: payload.reportMode || '批量计件',
      team: payload.team || '',
      status: payload.status || '待审核',
      remark: payload.remark || '',
      startTime: payload.startTime || '',
      endTime: payload.endTime || '',
      taskStartTime: payload.taskStartTime || '',
      taskEndTime: payload.taskEndTime || '',
      createdAt,
      defectItemIds: [],
      defectItemNames: [],
      defectReason: '',
      rejectReason: '',
      images: [],
      reportQtyMode: 'schedule',
      wageQtyMode: 'reported',
      workItems: [],
    })
  })
  processReportState.records = [...records, ...processReportState.records]
  saveRecords(processReportState.records)
  return { ok: true, message: `成功导入 ${records.length} 条`, records }
}

export function getProcessReportStats() {
  return calcProcessReportStats(processReportState.records)
}

export function getProcessReports(filters = {}) {
  return filterProcessReports(processReportState.records, filters).map(enrichProcessReportRecord)
}

export function getProcessReportById(id) {
  const row = processReportState.records.find((r) => r.id === id)
  return row ? enrichProcessReportRecord(row) : null
}

export function getProcessReportWorkOrderBundle(workOrderId) {
  processReportState.records = processReportState.records.map(normalizeProcessReport)
  const logsMap = loadWoLogs()
  return buildProcessReportWorkOrderBundle(
    workOrderId,
    processReportState.records,
    logsMap[workOrderId] || [],
  )
}

export function getProcessReportQuickBundle(recordId) {
  processReportState.records = processReportState.records.map(normalizeProcessReport)
  const logsMap = loadQuickLogs()
  return buildProcessReportQuickBundle(
    recordId,
    processReportState.records,
    logsMap[recordId] || [],
  )
}

function appendQuickReportLog(recordId, entry) {
  const logsMap = loadQuickLogs()
  const list = logsMap[recordId] || []
  list.unshift({
    id: `pr-qlog-${Date.now()}`,
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operator: entry.operator || 'admin1',
    action: entry.action,
    target: entry.target || '',
    remark: entry.remark || '',
  })
  logsMap[recordId] = list
  saveQuickLogs(logsMap)
}

function appendRecordLog(row, entry) {
  if (row.source === 'quick') {
    appendQuickReportLog(row.id, entry)
    return
  }
  if (row.workOrderId) {
    appendWorkOrderLog(row.workOrderId, entry)
  }
}

function appendWorkOrderLog(workOrderId, entry) {
  const logsMap = loadWoLogs()
  const list = logsMap[workOrderId] || []
  list.unshift({
    id: `pr-log-${Date.now()}`,
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operator: entry.operator || 'admin1',
    action: entry.action,
    target: entry.target || '',
    remark: entry.remark || '',
  })
  logsMap[workOrderId] = list
  saveWoLogs(logsMap)
}

function updateRecord(id, patch) {
  const idx = processReportState.records.findIndex((r) => r.id === id)
  if (idx === -1) return null
  Object.assign(processReportState.records[idx], patch)
  saveRecords(processReportState.records)
  const updated = enrichProcessReportRecord(processReportState.records[idx])
  syncRecordToMobile(processReportState.records[idx])
  return updated
}

export function approveProcessReport(id, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.status === '待报工') {
    return { ok: false, message: '待报工任务请先报工再审核' }
  }
  if (row.status === '已取消') {
    return { ok: false, message: '已取消任务不可审核' }
  }
  if (row.taskStatus === TASK_STATUS.AUDITED || row.status === '已审核') {
    return { ok: false, message: '该记录已审核' }
  }
  const patch = {
    status: '已审核',
    taskStatus: TASK_STATUS.AUDITED,
    auditedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    auditor: operator,
  }
  if (isAuditSalaryPush() && row.pushStatus === PUSH_STATUS.NOT_PUSHED) {
    patch.pushStatus = PUSH_STATUS.PUSHED
    patch.pushedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
  const updated = updateRecord(id, patch)
  if (!isAuditSalaryPush() || row.pushStatus !== PUSH_STATUS.NOT_PUSHED) {
    updateMobileWageStatus(id, { taskStatus: TASK_STATUS.AUDITED })
  }
  appendRecordLog(row, {
    operator,
    action: '通过',
    target: row.taskNo || row.processName,
    remark: '审核通过',
  })
  return { ok: true, record: updated }
}

export function rejectProcessReport(id, reason, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.taskStatus === TASK_STATUS.AUDITED || row.status === '已审核') {
    return { ok: false, message: '已审核记录不可拒绝' }
  }
  if (row.status === '待报工' || row.status === '已取消') {
    return { ok: false, message: '待报工/已取消任务不可审核拒绝' }
  }
  if (!reason?.trim()) return { ok: false, message: '请填写拒绝原因' }

  // 返工任务已冲减待重做：拒绝时回滚
  if (row.isRework && Number(row.reworkAppliedQty) > 0 && row.reworkOrderId) {
    // eslint-disable-next-line global-require
    const { rollbackReworkOrderReport } = require('@/store/reworkOrderStore')
    rollbackReworkOrderReport(row.reworkOrderId, {
      processName: row.processName,
      goodQty: row.reworkAppliedQty,
      remark: `工序报工拒绝回滚：${reason.trim()}`,
    })
  }

  const updated = updateRecord(id, {
    status: '已拒绝',
    rejectReason: reason.trim(),
    auditedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    auditor: operator,
    reworkAppliedQty: 0,
  })
  appendRecordLog(row, {
    operator,
    action: '拒绝',
    target: row.taskNo || row.processName,
    remark: reason.trim(),
  })
  return { ok: true, record: updated }
}

export function batchApproveProcessReports(ids, operator = 'admin1') {
  const pending = ids.filter((id) => {
    const row = processReportState.records.find((r) => r.id === id)
    return row?.taskStatus === TASK_STATUS.REPORTED && row?.status !== '已审核'
  })
  if (!pending.length) return { ok: false, message: '请选择待审核记录' }
  pending.forEach((id) => approveProcessReport(id, operator))
  return { ok: true, message: `已通过 ${pending.length} 条` }
}

export function batchRejectProcessReports(ids, reason, operator = 'admin1') {
  if (!reason?.trim()) return { ok: false, message: '请填写拒绝原因' }
  const pending = ids.filter((id) => {
    const row = processReportState.records.find((r) => r.id === id)
    return row?.taskStatus === TASK_STATUS.REPORTED && row?.status !== '已审核'
  })
  if (!pending.length) return { ok: false, message: '请选择待审核记录' }
  pending.forEach((id) => rejectProcessReport(id, reason, operator))
  return { ok: true, message: `已拒绝 ${pending.length} 条` }
}

export function adjustProcessReportLine(recordId, payload = {}, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === recordId)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.taskStatus === TASK_STATUS.AUDITED || row.status === '已审核') {
    return { ok: false, message: '已审核数据不可调整' }
  }

  const patch = {
    adjustedBy: operator,
    adjustedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  if (payload.adjustedGoodQty != null) patch.adjustedGoodQty = payload.adjustedGoodQty
  if (payload.adjustedDefectQty != null) patch.adjustedDefectQty = payload.adjustedDefectQty
  if (payload.adjustedWorkHours != null) patch.adjustedWorkHours = payload.adjustedWorkHours
  if (payload.adjustReason != null) patch.adjustReason = payload.adjustReason
  if (payload.adjustedDefectBreakdown != null) {
    const legacy = breakdownToLegacy(payload.adjustedDefectBreakdown)
    patch.adjustedDefectBreakdown = legacy.defectBreakdown
  }
  if (payload.subsidyMethod != null) patch.subsidyMethod = payload.subsidyMethod
  if (payload.subsidyReportQty != null)
    patch.subsidyReportQty = Number(payload.subsidyReportQty) || 0
  if (payload.subsidyHours != null) patch.subsidyHours = Number(payload.subsidyHours) || 0
  if (payload.subsidyFixedAmount != null) {
    patch.subsidyFixedAmount = Number(payload.subsidyFixedAmount) || 0
  }
  if (payload.manualQualityDeduction != null) {
    patch.manualQualityDeduction = Number(payload.manualQualityDeduction) || 0
  }
  if (payload.subsidyMethod === 'fixed') {
    patch.subsidyReportQty = 0
    patch.subsidyHours = 0
  } else if (payload.subsidyMethod === 'qty') {
    patch.subsidyFixedAmount = 0
  }

  const config = resolveLaborConfig(row.productCode, row.processName)
  if (config?.reportType === '批量计件' && config?.salaryMethod === '计时工资') {
    const qty = patch.adjustedGoodQty ?? row.adjustedGoodQty ?? row.goodQty ?? 0
    patch.adjustedWorkHours = calcAutoDurationHours(config, qty)
  }

  updateRecord(recordId, patch)
  const hasSubsidy =
    (payload.subsidyMethod === 'fixed' && Number(payload.subsidyFixedAmount) > 0) ||
    (payload.subsidyMethod === 'qty' &&
      (Number(payload.subsidyReportQty) > 0 || Number(payload.subsidyHours) > 0))
  appendRecordLog(row, {
    operator,
    action: hasSubsidy ? '调整/补贴' : '调整',
    target: row.taskNo || row.processName,
    remark: payload.adjustReason || '',
  })
  return { ok: true }
}

/** 协作主行：同一调整写回多条子任务 */
export function adjustProcessReportLines(recordIds = [], payload = {}, operator = 'admin1') {
  const ids = [...new Set((recordIds || []).filter(Boolean))]
  if (!ids.length) return { ok: false, message: '未选择可调整记录' }
  let okCount = 0
  let lastError = ''
  ids.forEach((id) => {
    const res = adjustProcessReportLine(id, payload, operator)
    if (res.ok) okCount += 1
    else lastError = res.message || lastError
  })
  if (!okCount) return { ok: false, message: lastError || '调整失败' }
  return {
    ok: true,
    message: ids.length > 1 ? `已同步调整 ${okCount} 条协作成员` : '调整已保存',
    okCount,
  }
}

export function subsidyProcessReportLine(recordId, payload = {}) {
  return adjustProcessReportLine(recordId, {
    subsidyMethod: Number(payload.subsidyReportQty) > 0 ? 'qty' : 'fixed',
    subsidyReportQty: payload.subsidyReportQty,
    subsidyHours: payload.subsidyHours,
    adjustReason: payload.subsidyReason,
  })
}

/** 修改任务计薪单价（仅影响当前报工记录，不写回主数据） */
export function updateProcessReportWageRate(recordId, payload = {}, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === recordId)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.taskStatus === TASK_STATUS.AUDITED || row.status === '已审核') {
    return { ok: false, message: '已审核数据不可修改单价' }
  }

  const config = resolveLaborConfig(row.productCode, row.processName)
  const mode = resolveWageRateDisplayMode(config)
  if (!mode) return { ok: false, message: '当前计薪方式不支持修改单价' }

  const patch = { adjustedBy: operator, adjustedAt: dayjs().format('YYYY-MM-DD HH:mm') }
  if (mode === 'piece') {
    const val = Number(payload.rate)
    if (!Number.isFinite(val) || val < 0) return { ok: false, message: '请输入有效的单件计价单价' }
    patch.overridePieceRate = val
  } else {
    const val = Number(payload.rate)
    if (!Number.isFinite(val) || val < 0) return { ok: false, message: '请输入有效的标准计时单价' }
    patch.overrideStandardHourlyRate = val
  }

  updateRecord(recordId, patch)
  appendRecordLog(row, {
    operator,
    action: '修改单价',
    target: row.taskNo || row.processName,
    remark:
      mode === 'piece'
        ? `单件计价单价调整为 ¥${patch.overridePieceRate}`
        : `标准计时单价调整为 ¥${patch.overrideStandardHourlyRate}`,
  })
  return { ok: true }
}

/** 修改任务计薪方式（仅影响当前报工记录，不写回主数据） */
export function updateProcessReportSalaryMethod(recordId, payload = {}, operator = 'admin1') {
  const row = processReportState.records.find((r) => r.id === recordId)
  if (!row) return { ok: false, message: '记录不存在' }
  if (row.taskStatus === TASK_STATUS.AUDITED || row.status === '已审核') {
    return { ok: false, message: '已审核数据不可修改计薪方式' }
  }

  const config = resolveLaborConfig(row.productCode, row.processName)
  if (!config) return { ok: false, message: '未找到工时配置' }

  const options = resolveSalaryMethodOptions(config.reportType)
  if (options.length <= 1) {
    return { ok: false, message: '当前报工类型不支持修改计薪方式' }
  }

  const next = payload.salaryMethod
  if (!next || !options.includes(next)) {
    return { ok: false, message: '请选择有效的计薪方式' }
  }

  const patch = { adjustedBy: operator, adjustedAt: dayjs().format('YYYY-MM-DD HH:mm') }
  if (next === config.salaryMethod) {
    patch.overrideSalaryMethod = null
  } else {
    patch.overrideSalaryMethod = next
  }

  updateRecord(recordId, patch)
  appendRecordLog(row, {
    operator,
    action: '修改计薪方式',
    target: row.taskNo || row.processName,
    remark: `计薪方式调整为 ${next}`,
  })
  return { ok: true }
}

export function auditProcessReportLine(recordId, result, reason = '', operator = 'admin1') {
  if (result === 'reject') {
    return rejectProcessReport(recordId, reason, operator)
  }
  return approveProcessReport(recordId, operator)
}

export function pushProcessReportLines(ids, operator = 'admin1') {
  const rows = ids.map((id) => processReportState.records.find((r) => r.id === id)).filter(Boolean)
  if (!rows.length) return { ok: false, message: '请选择待推送明细' }
  const pushable = rows.filter((r) => r.pushStatus === PUSH_STATUS.NOT_PUSHED)
  if (!pushable.length) return { ok: false, message: '所选明细当前状态不可推送' }

  pushable.forEach((row) => {
    updateRecord(row.id, {
      pushStatus: PUSH_STATUS.PUSHED,
      pushedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    })
    appendRecordLog(row, {
      operator,
      action: '推送',
      target: row.taskNo || row.processName,
      remark: '推送至小程序工时工资',
    })
  })

  return { ok: true, count: pushable.length, message: `已推送 ${pushable.length} 条` }
}

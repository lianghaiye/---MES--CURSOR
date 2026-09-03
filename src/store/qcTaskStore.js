import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { resolveQcGatePolicy } from '@/utils/qcGatePolicy'
import { matchQcTemplate } from '@/utils/qcTemplateMatchService'
import {
  aggregateLineConclusions,
  ensureFieldsWithSystemFixedItems,
  resolveQcResultFromFieldValues,
} from '@/utils/qcConclusionField'
import { QC_TASK_RESULT, QC_TASK_RESULT_OPTIONS } from '@/constants/qcTaskResult'
import { cloneMockIncomingQcTasks } from '@/mock/qcTasks'

export { QC_TASK_RESULT, QC_TASK_RESULT_OPTIONS }

const STORAGE_KEY = 'i_doms_qc_tasks'
const STORAGE_VERSION = 2
const SEED_VERSION_KEY = 'i_doms_qc_tasks_seed_v'
const CURRENT_SEED_VERSION = '3'

export const QC_TASK_STATUS = {
  PENDING: '待质检',
  IN_PROGRESS: '检验中',
  COMPLETED: '已完成',
  CANCELLED: '已终止',
}

const QC_NO_PREFIX = {
  来料质检: 'LLZJ',
  外协回货检: 'WXHJ',
  生产过程检: 'GCZJ',
  成品检: 'CPZJ',
  出厂质检: 'CCZJ',
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function markSeeded() {
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === STORAGE_VERSION && Array.isArray(parsed.tasks)) {
        return parsed.tasks
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function initTasks() {
  if (shouldReseed()) {
    markSeeded()
    return cloneMockIncomingQcTasks()
  }
  return loadFromStorage() || cloneMockIncomingQcTasks()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: STORAGE_VERSION, tasks: qcTaskState.tasks }),
  )
}

export function generateQcTaskNo(bizScope) {
  const prefixKey = QC_NO_PREFIX[bizScope] || 'QC'
  const datePart = dayjs().format('YYYYMMDD')
  const prefix = `${prefixKey}${datePart}`
  let maxSeq = 0
  qcTaskState.tasks.forEach((t) => {
    const no = t.qcNo
    if (!no || !no.startsWith(prefix)) return
    const seq = parseInt(no.slice(prefix.length), 10)
    if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
  })
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

export function createQcTaskLineItem(partial = {}) {
  const templateFields = Array.isArray(partial.templateFields)
    ? cloneTemplateFieldsSnapshot(partial.templateFields)
    : []
  return {
    id: partial.id || `qtl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: partial.itemCode || '',
    itemName: partial.itemName || '',
    specModel: partial.specModel || '',
    unit: partial.unit || '件',
    inspectQty: partial.inspectQty ?? partial.qty ?? 0,
    inspectMethod: partial.inspectMethod || '',
    lineQcResult: partial.lineQcResult,
    treatmentPlan: partial.treatmentPlan,
    fieldValues: Array.isArray(partial.fieldValues) ? [...partial.fieldValues] : [],
    sourceLineId: partial.sourceLineId,
    templateId: partial.templateId || '',
    templateCode: partial.templateCode || '',
    templateName: partial.templateName || '',
    templateMatchSource: partial.templateMatchSource || '',
    ...partial,
    templateFields: Array.isArray(partial.templateFields)
      ? cloneTemplateFieldsSnapshot(partial.templateFields)
      : templateFields,
  }
}

/** 冻结模板字段快照到质检行（补齐系统固定项：方式/数量/结果） */
export function cloneTemplateFieldsSnapshot(fields = []) {
  return ensureFieldsWithSystemFixedItems(fields || []).map((f) => ({
    ...f,
    options: f.options ? [...f.options] : [],
    optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
    optionResults: f.optionResults ? { ...f.optionResults } : undefined,
  }))
}

/** 按物料匹配模板并绑定到行（建单时冻结） */
export function bindQcLineTemplate(linePartial = {}, { bizScope, categoryCode, categoryKey } = {}) {
  const itemCode = linePartial.itemCode || linePartial.productCode || ''
  const matched = matchQcTemplate({
    bizScope,
    itemCode,
    categoryCode: categoryCode || linePartial.categoryCode,
    categoryKey: categoryKey || linePartial.categoryKey,
  })
  if (!matched.ok) {
    return { ok: false, message: matched.message || `物料 ${itemCode || '—'} 未匹配到模板` }
  }
  const template = matched.template
  const line = createQcTaskLineItem({
    ...linePartial,
    templateId: template.id,
    templateCode: template.code,
    templateName: template.name,
    templateMatchSource: matched.matchSource,
    templateFields: cloneTemplateFieldsSnapshot(template.fields),
    inspectMethod:
      linePartial.inspectMethod || resolveInspectMethodFromTemplate(template) || '抽检',
  })
  return { ok: true, line, template, matchSource: matched.matchSource }
}

/** 单头模板摘要：多行模板不一致时标记「多模板」 */
export function summarizeTaskTemplates(lineItems = []) {
  const lines = lineItems || []
  const names = [...new Set(lines.map((l) => l.templateName || l.templateCode).filter(Boolean))]
  const codes = [...new Set(lines.map((l) => l.templateCode).filter(Boolean))]
  const first = lines[0]
  if (names.length <= 1) {
    return {
      multiTemplate: false,
      templateId: first?.templateId || '',
      templateCode: codes[0] || '',
      templateName: names[0] || '',
      templateFields: cloneTemplateFieldsSnapshot(first?.templateFields || []),
      inspectMethod: first?.inspectMethod || '抽检',
    }
  }
  return {
    multiTemplate: true,
    templateId: '',
    templateCode: codes.join('、'),
    templateName: '多模板',
    templateFields: [],
    inspectMethod: '',
  }
}

function resolveInspectMethodFromTemplate(template) {
  const fields = template?.fields || []
  const hit =
    fields.find((f) => f.code === 'QC_INSPECT_METHOD') ||
    fields.find((f) => String(f.name || '').trim() === '质检方式')
  const def = hit?.defaultValue
  if (def === '抽检' || def === '全检') return def
  return ''
}

export function createQcTask(partial = {}) {
  const bizScope = partial.bizScope || '来料质检'
  const template = partial.template || null
  // 门控仅跟功能参数按业务类型，不再读工序/模板
  const gatePolicy =
    partial.gatePolicy ||
    resolveQcGatePolicy({
      bizScope,
    })

  return {
    id: partial.id || `qctask-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    qcNo: partial.qcNo || generateQcTaskNo(bizScope),
    bizScope,
    qcStatus: partial.qcStatus || QC_TASK_STATUS.PENDING,
    qcResult: partial.qcResult || '',
    templateId: template?.id || partial.templateId || '',
    templateCode: template?.code || partial.templateCode || '',
    templateName: template?.name || partial.templateName || '',
    gatePolicy,
    inspectMethod: partial.inspectMethod || resolveInspectMethodFromTemplate(template) || '抽检',
    inspectDate: partial.inspectDate || dayjs().format('YYYY-MM-DD'),
    sourceType: partial.sourceType || '',
    sourceDocNo: partial.sourceDocNo || '',
    sourceDocId: partial.sourceDocId || '',
    workOrderNo: partial.workOrderNo || '',
    workOrderId: partial.workOrderId || '',
    processCode: partial.processCode || '',
    processName: partial.processName || '',
    processIndex: partial.processIndex ?? null,
    scheduleBatchId: partial.scheduleBatchId || '',
    scheduleBatchNo: partial.scheduleBatchNo ?? null,
    itemCode: partial.itemCode || '',
    itemName: partial.itemName || '',
    specModel: partial.specModel || '',
    unit: partial.unit || '',
    supplier: partial.supplier || '',
    inboundOrderNo: partial.inboundOrderNo || '',
    inboundOrderId: partial.inboundOrderId || '',
    inboundOrderIds: Array.isArray(partial.inboundOrderIds) ? [...partial.inboundOrderIds] : [],
    /** web | miniprogram — 录入端，WEB/小程序共用同一任务与提交接口 */
    entryChannel: partial.entryChannel || '',
    inspector: partial.inspector || '',
    inspectedAt: partial.inspectedAt || '',
    multiTemplate: Boolean(partial.multiTemplate),
    creator: partial.creator || 'admin1',
    remark: partial.remark || '',
    treatmentPlan: partial.treatmentPlan || '',
    lineItems: Array.isArray(partial.lineItems)
      ? partial.lineItems.map((l) => createQcTaskLineItem(l))
      : [],
    templateFields: Array.isArray(partial.templateFields)
      ? partial.templateFields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] }))
      : Array.isArray(template?.fields)
        ? template.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] }))
        : [],
    createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: partial.updatedAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export const qcTaskState = reactive({
  tasks: initTasks(),
})

watch(
  () => qcTaskState.tasks,
  () => persist(),
  { deep: true },
)

export function listQcTasks(filter = {}) {
  return qcTaskState.tasks.filter((t) => {
    if (filter.bizScope && t.bizScope !== filter.bizScope) return false
    if (filter.workOrderNo && t.workOrderNo !== filter.workOrderNo) return false
    if (filter.workOrderId && t.workOrderId !== filter.workOrderId) return false
    if (filter.sourceDocId && t.sourceDocId !== filter.sourceDocId) return false
    if (filter.sourceType && t.sourceType !== filter.sourceType) return false
    if (filter.qcStatus && t.qcStatus !== filter.qcStatus) return false
    if (filter.processCode && t.processCode !== filter.processCode) return false
    if (filter.scheduleBatchId && t.scheduleBatchId !== filter.scheduleBatchId) return false
    return true
  })
}

export function getQcTaskById(id) {
  return qcTaskState.tasks.find((t) => t.id === id) || null
}

export function findQcTaskByKey(key = {}) {
  const {
    bizScope,
    sourceType,
    sourceDocId,
    sourceLineId,
    workOrderId,
    processCode,
    scheduleBatchId,
  } = key
  return (
    qcTaskState.tasks.find((t) => {
      if (bizScope && t.bizScope !== bizScope) return false
      if (sourceType && t.sourceType !== sourceType) return false
      if (sourceDocId && t.sourceDocId !== sourceDocId) return false
      if (workOrderId && t.workOrderId !== workOrderId) return false
      if (processCode && t.processCode !== processCode) return false
      if (scheduleBatchId && t.scheduleBatchId !== scheduleBatchId) return false
      if (sourceLineId) {
        const hit = (t.lineItems || []).some((l) => l.sourceLineId === sourceLineId)
        if (!hit && t.sourceLineId !== sourceLineId) return false
      }
      return true
    }) || null
  )
}

export function addQcTask(partial = {}) {
  const row = createQcTask(partial)
  qcTaskState.tasks.unshift(row)
  return row
}

export function updateQcTask(id, patch = {}) {
  const row = getQcTaskById(id)
  if (!row) return null
  Object.assign(row, patch, { updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') })
  return row
}

/**
 * 提交检验：从模板「检验结论」字段挖掘任务级 qcResult，并完成任务
 * WEB / 小程序共用本接口（entryChannel 区分录入端）
 */
export function submitQcTaskInspection(
  id,
  { lineItems, inspector = 'admin1', inspectMethod, entryChannel = 'web', remark } = {},
) {
  const row = getQcTaskById(id)
  if (!row) return { ok: false, message: '质检任务不存在' }
  if (row.qcStatus === QC_TASK_STATUS.CANCELLED) {
    return { ok: false, message: '已终止任务不可提交' }
  }
  if (row.qcStatus === QC_TASK_STATUS.COMPLETED) {
    return { ok: false, message: '任务已完成' }
  }

  const nextLines = Array.isArray(lineItems) ? lineItems : row.lineItems || []
  const lineResults = nextLines.map((line) => {
    const fields =
      (Array.isArray(line.templateFields) && line.templateFields.length
        ? line.templateFields
        : row.templateFields) || []
    return resolveQcResultFromFieldValues(fields, line.fieldValues)
  })
  if (lineResults.some((r) => !r)) {
    return { ok: false, message: '请填写各物料的质检结果' }
  }

  const qcResult = aggregateLineConclusions(lineResults)
  const summary = summarizeTaskTemplates(nextLines)
  const headerMethod =
    inspectMethod ||
    summary.inspectMethod ||
    [...new Set(nextLines.map((l) => l.inspectMethod).filter(Boolean))].join('、') ||
    row.inspectMethod

  Object.assign(row, {
    lineItems: nextLines.map((line, idx) => ({
      ...line,
      lineQcResult: line.lineQcResult || lineResults[idx] || '',
    })),
    qcStatus: QC_TASK_STATUS.COMPLETED,
    qcResult,
    multiTemplate: summary.multiTemplate,
    templateId: summary.templateId || row.templateId,
    templateCode: summary.templateCode || row.templateCode,
    templateName: summary.templateName || row.templateName,
    inspectMethod: headerMethod,
    inspector,
    inspectedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    entryChannel: entryChannel || row.entryChannel || 'web',
    remark: remark != null ? remark : row.remark,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  return { ok: true, task: row, qcResult }
}

/** 开始检验（待质检 → 检验中），WEB/小程序打开录入页时调用 */
export function startQcTaskInspection(id, { entryChannel = 'web' } = {}) {
  const row = getQcTaskById(id)
  if (!row) return { ok: false, message: '质检任务不存在' }
  if (row.qcStatus === QC_TASK_STATUS.CANCELLED) {
    return { ok: false, message: '已终止任务不可检验' }
  }
  if (row.qcStatus === QC_TASK_STATUS.COMPLETED) {
    return { ok: false, message: '任务已完成' }
  }
  if (row.qcStatus === QC_TASK_STATUS.PENDING) {
    row.qcStatus = QC_TASK_STATUS.IN_PROGRESS
    row.entryChannel = entryChannel
    row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
  return { ok: true, task: row }
}

export function canInspectQcTask(task) {
  if (!task) return false
  return task.qcStatus === QC_TASK_STATUS.PENDING || task.qcStatus === QC_TASK_STATUS.IN_PROGRESS
}

/** 质检单回写入库单号 */
export function attachQcTaskInboundOrder(id, { inboundOrderNo, inboundOrderId } = {}) {
  const row = getQcTaskById(id)
  if (!row) return null
  const nos = String(row.inboundOrderNo || '')
    .split(/[、,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const nextNo = String(inboundOrderNo || '').trim()
  if (nextNo && !nos.includes(nextNo)) nos.push(nextNo)
  const ids = new Set(row.inboundOrderIds || [])
  if (inboundOrderId) ids.add(inboundOrderId)
  if (row.inboundOrderId) ids.add(row.inboundOrderId)
  Object.assign(row, {
    inboundOrderNo: nos.join('、'),
    inboundOrderId: inboundOrderId || row.inboundOrderId || [...ids][0] || '',
    inboundOrderIds: [...ids],
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  return row
}

export const QC_TASK_STATUS_OPTIONS = Object.values(QC_TASK_STATUS)

export function filterQcTasks(list = [], filters = {}) {
  const qcNo = String(filters.qcNo || '').trim()
  const itemCode = String(filters.itemCode || '').trim()
  const itemName = String(filters.itemName || '').trim()
  const sourceDocNo = String(filters.sourceDocNo || '').trim()
  const workOrderNo = String(filters.workOrderNo || '').trim()

  return (list || []).filter((row) => {
    if (filters.bizScope && row.bizScope !== filters.bizScope) return false
    if (filters.qcStatus && row.qcStatus !== filters.qcStatus) return false
    if (filters.qcResult && row.qcResult !== filters.qcResult) return false
    if (qcNo && !(row.qcNo || '').includes(qcNo)) return false
    if (itemCode && !(row.itemCode || '').includes(itemCode)) return false
    if (itemName && !(row.itemName || '').includes(itemName)) return false
    if (sourceDocNo && !(row.sourceDocNo || '').includes(sourceDocNo)) return false
    if (workOrderNo && !(row.workOrderNo || '').includes(workOrderNo)) return false
    return true
  })
}

export function cancelQcTasks(ids = []) {
  let count = 0
  ;(ids || []).forEach((id) => {
    const row = getQcTaskById(id)
    if (!row) return
    if (row.qcStatus === QC_TASK_STATUS.COMPLETED) return
    if (row.qcStatus === QC_TASK_STATUS.CANCELLED) return
    row.qcStatus = QC_TASK_STATUS.CANCELLED
    row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    count += 1
  })
  return { ok: true, count }
}

/** 手动创建质检任务 */
export function createManualQcTask(payload = {}) {
  const bizScope = payload.bizScope || '来料质检'
  const itemCode = String(payload.itemCode || '').trim()
  if (!itemCode) return { ok: false, message: '请输入物料编码' }

  const inspectQty = Number(payload.inspectQty)
  if (!Number.isFinite(inspectQty) || inspectQty <= 0) {
    return { ok: false, message: '检验数量须大于 0' }
  }

  const built = buildQcTaskFromTemplateMatch({
    bizScope,
    templateCode: payload.templateCode,
    itemCode,
    inspectMethod: payload.inspectMethod,
    sourceType: payload.sourceType || 'manual',
    sourceDocId: payload.sourceDocId || '',
    sourceDocNo: payload.sourceDocNo || '',
    workOrderNo: payload.workOrderNo || '',
    workOrderId: payload.workOrderId || '',
    processCode: payload.processCode || '',
    processName: payload.processName || '',
    itemName: payload.itemName || '',
    specModel: payload.specModel || '',
    unit: payload.unit || '件',
    remark: payload.remark || '',
    lineItems: [
      createQcTaskLineItem({
        sourceLineId: payload.sourceLineId,
        itemCode,
        itemName: payload.itemName || '',
        specModel: payload.specModel || '',
        unit: payload.unit || '件',
        inspectQty,
      }),
    ],
  })
  if (!built.ok) return { ok: false, message: built.message || '创建失败' }

  const task = addQcTask(built.task)
  return { ok: true, task }
}

/**
 * 采购收货生成来料质检单（一单多行；每行独立匹配并冻结质检模板）
 * @param {{ receipt, lineIds?: string[], qcNo?: string, remark?: string }} payload
 */
export function createIncomingQcFromReceipt(payload = {}) {
  const receipt = payload.receipt
  if (!receipt?.id) return { ok: false, message: '收货单无效' }

  const allLines = receipt.lineItems || receipt.lines || []
  const lineIdSet =
    Array.isArray(payload.lineIds) && payload.lineIds.length
      ? new Set(payload.lineIds.map(String))
      : null
  const selectedLines = allLines.filter((l) => {
    if (!l) return false
    if (lineIdSet && !lineIdSet.has(String(l.id))) return false
    return (Number(l.receiptQty) || Number(l.qty) || 0) > 0
  })
  if (!selectedLines.length) return { ok: false, message: '请至少保留一行质检清单' }

  const customNo = String(payload.qcNo || '').trim()
  if (customNo) {
    const dup = qcTaskState.tasks.find((t) => t.qcNo === customNo)
    if (dup) return { ok: false, message: '质检单号已存在' }
  }

  const boundLines = []
  for (const line of selectedLines) {
    const bound = bindQcLineTemplate(
      {
        sourceLineId: line.id,
        itemCode: line.itemCode || line.productCode || '',
        itemName: line.itemName || line.productName || '',
        productCode: line.productCode || line.itemCode || '',
        productName: line.productName || line.itemName || '',
        specModel: line.specModel || '',
        material: line.material || line.materialGrade || '',
        variantSummary: line.variantSummary || '',
        categoryCode: line.categoryCode || '',
        categoryKey: line.categoryKey || '',
        unit: line.unit || '件',
        purchaseQty: line.purchaseQty,
        receiptQty: line.receiptQty ?? line.qty,
        receivingWarehouse: line.receivingWarehouse || line.warehouse || '',
        inspectQty: line.receiptQty ?? line.qty ?? 0,
      },
      { bizScope: '来料质检' },
    )
    if (!bound.ok) return { ok: false, message: bound.message || '模板匹配失败' }
    boundLines.push(bound.line)
  }

  const first = boundLines[0]
  const summary = summarizeTaskTemplates(boundLines)
  const task = createQcTask({
    bizScope: '来料质检',
    sourceType: 'purchase_receipt',
    sourceDocId: receipt.id,
    sourceDocNo: receipt.receiptNo || '',
    itemCode: first.itemCode || '',
    itemName: first.itemName || '',
    specModel: first.specModel || '',
    unit: first.unit || '件',
    supplier: receipt.supplier || '',
    creator: receipt.purchaser || receipt.creator || 'admin1',
    remark: payload.remark || '',
    multiTemplate: summary.multiTemplate,
    templateId: summary.templateId,
    templateCode: summary.templateCode,
    templateName: summary.templateName,
    templateFields: summary.templateFields,
    inspectMethod: summary.inspectMethod || first.inspectMethod || '抽检',
    lineItems: boundLines,
    qcStatus: QC_TASK_STATUS.PENDING,
    qcNo: customNo || undefined,
  })

  const saved = addQcTask(task)
  return { ok: true, task: saved }
}

export function sumTaskInspectQty(task) {
  const lines = task?.lineItems || []
  if (!lines.length) return 0
  return lines.reduce((s, l) => s + (Number(l.inspectQty) || 0), 0)
}

export function buildQcTaskFromTemplateMatch({
  bizScope,
  templateCode,
  itemCode,
  categoryCode,
  ...rest
}) {
  const matched = matchQcTemplate({ bizScope, templateCode, itemCode, categoryCode })
  if (!matched.ok) return { ok: false, message: matched.message || '未匹配到模板' }
  const template = matched.template
  const task = createQcTask({
    ...rest,
    bizScope,
    template,
    templateCode: template.code,
    inspectMethod: rest.inspectMethod || resolveInspectMethodFromTemplate(template) || '抽检',
  })
  return { ok: true, task, matchSource: matched.matchSource }
}

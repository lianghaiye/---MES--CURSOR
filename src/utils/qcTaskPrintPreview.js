/**
 * 来料质检单打印预览：按质检模板输出各产品行检验明细
 */

import { isQcConclusionField, isQcInspectRemarkField } from '@/utils/qcConclusionField'
import {
  buildStandardText,
  evaluateFieldAgainstStandard,
  formatFieldValueWithUnit,
} from '@/utils/qcFieldStandard'
import {
  evaluateComplexOrSimpleField,
  formatComplexValueSummary,
  isComplexField,
  isCompositeField,
  isMatrixField,
  normalizeComplexValue,
} from '@/utils/qcComplexField'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

const STORAGE_PREFIX = 'qc-task-print-preview:'

function formatPrintFieldValue(value) {
  if (value === 0) return '0'
  const s = String(value ?? '').trim()
  return s
}

function formatPrintQty(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Math.round(n * 10000) / 10000)
}

function judgeLabel(judge, { complex = false } = {}) {
  if (judge === 'pass') return complex ? '合格' : '达标'
  if (judge === 'fail') return complex ? '不合格' : '未达标'
  return ''
}

function formatProductInfo(line = {}) {
  return [
    line.itemCode || line.productCode,
    line.itemName || line.productName,
    line.specModel,
    line.material,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join('/')
}

function formatReturnExchange(line = {}) {
  const parts = []
  const r = Number(line.returnQty)
  const e = Number(line.exchangeQty)
  if (Number.isFinite(r) && r > 0) parts.push(`退货 ${formatPrintQty(r)}`)
  if (Number.isFinite(e) && e > 0) parts.push(`换货 ${formatPrintQty(e)}`)
  return parts.join(' / ')
}

function resolveFields(line, task) {
  if (Array.isArray(line?.templateFields) && line.templateFields.length) return line.templateFields
  return task?.templateFields || []
}

function buildValueMap(line) {
  const map = {}
  ;(line?.fieldValues || []).forEach((v) => {
    const code = v.fieldCode || v.code
    if (code) map[code] = v.value ?? v.fieldValue
  })
  if (line?.fieldMap && typeof line.fieldMap === 'object') {
    Object.assign(map, line.fieldMap)
  }
  return map
}

function isPrintableField(field) {
  if (!field?.code) return false
  if (field.code === 'QC_INSPECT_METHOD' || field.code === 'QC_INSPECT_QTY') return false
  if (isQcConclusionField(field)) return false
  return true
}

/**
 * 按模板展开一行质检明细的检验项（含复合子项）
 */
export function buildQcLineTemplatePrintRows(line, task) {
  const fields = resolveFields(line, task).filter(isPrintableField)
  const valueMap = buildValueMap(line)
  const rows = []

  fields.forEach((field) => {
    const raw = valueMap[field.code]
    if (isComplexField(field)) {
      const value = normalizeComplexValue(field, raw)
      const groupJudge = evaluateComplexOrSimpleField(field, value)
      rows.push({
        name: field.name || field.code,
        standard: field.type === 'composite' ? '复合项' : '多点项',
        measured: formatComplexValueSummary(field, value) || '—',
        judge: judgeLabel(groupJudge, { complex: true }),
        isGroup: true,
      })
      if (isCompositeField(field)) {
        ;(field.children || []).forEach((child) => {
          const v = value.children?.[child.code]
          rows.push({
            name: `- ${child.name || child.code}`,
            standard: buildStandardText(child) || '—',
            measured: formatFieldValueWithUnit(child, v) || '—',
            judge: judgeLabel(evaluateFieldAgainstStandard(child, v), { complex: true }),
            isChild: true,
          })
        })
      } else if (isMatrixField(field)) {
        const cols = field.matrixColumns || []
        ;(value.rows || []).forEach((r, idx) => {
          const cells = cols
            .map((c) => {
              const cell = r?.[c.code]
              const text =
                cell === undefined || cell === null || cell === ''
                  ? '—'
                  : formatFieldValueWithUnit({ ...c, type: c.type || 'number' }, cell)
              return `${c.name || c.code}:${text}`
            })
            .join('; ')
          rows.push({
            name: `- 测点${r._label || idx + 1}`,
            standard: '—',
            measured: cells || '—',
            judge: '',
            isChild: true,
          })
        })
      }
      return
    }

    const displayValue = formatFieldValueWithUnit(field, raw)
    const empty = !displayValue || displayValue === '—' || displayValue === '-'
    rows.push({
      name: field.name || field.code,
      standard: buildStandardText(field) || (isQcInspectRemarkField(field) ? '—' : '—'),
      measured: empty ? '—' : displayValue,
      judge: judgeLabel(evaluateFieldAgainstStandard(field, raw)),
      isGroup: false,
      isChild: false,
    })
  })

  return rows
}

function buildLineSheetBlock(line, index, task) {
  const inspectRows = buildQcLineTemplatePrintRows(line, task)
  return {
    seq: index + 1,
    productInfo: formatProductInfo(line) || '—',
    productName: formatPrintFieldValue(line.itemName || line.productName),
    productCode: formatPrintFieldValue(line.itemCode || line.productCode),
    specModel: formatPrintFieldValue(line.specModel),
    material: formatPrintFieldValue(line.material),
    templateName: formatPrintFieldValue(line.templateName || task?.templateName),
    inspectMethod: formatPrintFieldValue(line.inspectMethod || task?.inspectMethod),
    receiptQty: formatPrintQty(line.receiptQty),
    inspectQty: formatPrintQty(line.inspectQty),
    unit: formatPrintFieldValue(line.unit),
    receivingWarehouse: formatPrintFieldValue(line.receivingWarehouse),
    lineQcResult: formatPrintFieldValue(line.lineQcResult),
    treatmentPlan: formatPrintFieldValue(line.treatmentPlan),
    acceptInboundQty: formatPrintQty(line.acceptInboundQty),
    returnExchange: formatReturnExchange(line),
    inspectRows,
  }
}

function resolvePrintTitle(task) {
  const scope = task?.bizScope || '来料质检'
  if (scope === '外协回货检') return '外协回货质检单'
  if (scope === '生产过程检') return '生产过程质检单'
  if (scope === '成品检') return '成品质检单'
  return '来料质检单'
}

/** 构建单张质检单打印数据（按模板展开明细） */
export function buildQcTaskPrintPayload(task, options = {}) {
  if (!task) return null

  const lines = (task.lineItems || []).map((line, index) => buildLineSheetBlock(line, index, task))

  const basicFields = [
    { label: '质检状态', value: task.qcStatus },
    { label: '质检结果', value: task.qcResult },
    { label: '供应商', value: task.supplier },
    { label: '来源单据', value: task.sourceDocNo },
    { label: '质检模板', value: task.templateName },
    { label: '质检方式', value: task.inspectMethod },
    { label: '入库单号', value: task.inboundOrderNo },
    { label: '质检人', value: task.inspector },
    { label: '质检时间', value: formatDateTimeMinute(task.inspectedAt) },
    { label: '创建人', value: task.creator },
    { label: '创建时间', value: formatDateTimeMinute(task.createdAt) },
    { label: '备注', value: task.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  return {
    qcNo: formatPrintFieldValue(task.qcNo),
    orderNo: formatPrintFieldValue(task.qcNo),
    title: resolvePrintTitle(task),
    subtitle: '',
    basicFields,
    lineBlocks: lines,
    summary: {
      lineCount: String(lines.length),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildQcTaskBatchPrintPayload(tasks, options = {}) {
  const sheets = (tasks || []).map((task) => buildQcTaskPrintPayload(task, options)).filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveQcTaskPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadQcTaskPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openQcTaskPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveQcTaskPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'quality-qc-task-preview', query })
  window.open(href, '_blank')
}

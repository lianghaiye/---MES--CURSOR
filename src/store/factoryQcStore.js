import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  cloneFactoryQcRecords,
  createQcLineItem,
  resolveHeaderQcResult,
} from '@/mock/factoryQcRecords'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import { aggregateLineConclusions, resolveQcResultFromFieldValues } from '@/utils/qcConclusionField'
import { bindQcLineTemplate, summarizeTaskTemplates } from '@/store/qcTaskStore'
import { ensureQcTemplateDemoSeed } from '@/store/qcTemplateStore'

const STORAGE_KEY = 'i_doms_factory_qc'
const STORAGE_VERSION = 5
const QC_NO_PREFIX = 'CCZJ'
export const FACTORY_QC_BIZ_SCOPE = '出厂质检'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === STORAGE_VERSION && Array.isArray(parsed.records)) {
        return parsed.records
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: STORAGE_VERSION, records: factoryQcState.records }),
  )
}

/** 生成出厂质检单号：CCZJ + yyyyMMdd + 4位流水（按当日已有单号递增） */
export function generateFactoryQcNo() {
  const datePart = dayjs().format('YYYYMMDD')
  const prefix = `${QC_NO_PREFIX}${datePart}`
  let maxSeq = 0
  factoryQcState.records.forEach((r) => {
    const no = r.qcNo
    if (!no || !no.startsWith(prefix)) return
    const seq = parseInt(no.slice(prefix.length), 10)
    if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
  })
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

export const factoryQcState = reactive({
  records: loadFromStorage() || cloneFactoryQcRecords(),
})

watch(
  () => factoryQcState.records,
  () => persist(),
  { deep: true },
)

export function addFactoryQc(record) {
  factoryQcState.records.unshift(record)
  return record
}

export function updateFactoryQc(id, patch) {
  const idx = factoryQcState.records.findIndex((r) => r.id === id)
  if (idx === -1) return null
  Object.assign(factoryQcState.records[idx], patch)
  return factoryQcState.records[idx]
}

export function deleteFactoryQc(id) {
  const idx = factoryQcState.records.findIndex((r) => r.id === id)
  if (idx === -1) return false
  factoryQcState.records.splice(idx, 1)
  return true
}

export function findQcBySalesOrderNo(salesOrderNo) {
  return factoryQcState.records.find(
    (r) => r.salesOrderNo === salesOrderNo && r.qcStatus !== '已终止',
  )
}

export function getFactoryQcById(id) {
  if (!id) return null
  return factoryQcState.records.find((r) => r.id === id) || null
}

/** 阻止确认出库的质检结果 */
export const QC_RESULTS_BLOCK_OUTBOUND = ['质检不通过', '部分通过']

export const QC_RESULT_PASS = '质检通过'

export function qcResultBlocksOutbound(qcResult) {
  return QC_RESULTS_BLOCK_OUTBOUND.includes(qcResult)
}

export function findPendingQcByOutboundDocNo(outboundDocNo) {
  return factoryQcState.records.find(
    (r) => r.outboundDocNo === outboundDocNo && r.qcStatus === '待质检',
  )
}

export function isFactoryQcFailedLine(line) {
  const r = line?.lineQcResult
  return r === '不合格' || r === QC_TASK_RESULT.FAIL || r === '质检不通过'
}

/** 按出厂质检业务类型匹配模板并绑定到明细行 */
export function bindFactoryQcLines(rawLines = []) {
  ensureQcTemplateDemoSeed()
  const boundLines = []
  for (const line of rawLines) {
    const bound = bindQcLineTemplate(
      {
        ...line,
        itemCode: line.itemCode || '',
        itemName: line.itemName || '',
        productCode: line.itemCode || '',
        productName: line.itemName || '',
        specModel: line.specModel || '',
        unit: line.unit || '件',
        shipQty: line.shipQty,
        shipWarehouse: line.shipWarehouse,
        outboundLineId: line.outboundLineId,
        receiptQty: line.shipQty ?? line.receiptQty ?? 0,
        inspectQty: line.inspectQty ?? line.shipQty ?? 0,
      },
      { bizScope: FACTORY_QC_BIZ_SCOPE },
    )
    if (!bound.ok) {
      return { ok: false, message: bound.message || '模板匹配失败' }
    }
    boundLines.push({
      ...bound.line,
      shipQty: line.shipQty ?? bound.line.receiptQty,
      shipWarehouse: line.shipWarehouse || '',
      outboundLineId: line.outboundLineId,
      receiptQty: line.shipQty ?? bound.line.receiptQty,
    })
  }
  const summary = summarizeTaskTemplates(boundLines)
  return { ok: true, lineItems: boundLines, summary }
}

/** 打开录入页时：历史待质检单若未绑模板则补绑并落盘 */
export function ensureFactoryQcTemplates(record) {
  if (!record) return null
  const lines = record.lineItems || []
  const needBind = lines.some((l) => !(Array.isArray(l.templateFields) && l.templateFields.length))
  if (!needBind) return record

  const bound = bindFactoryQcLines(lines)
  if (!bound.ok) return record

  Object.assign(record, {
    lineItems: bound.lineItems,
    multiTemplate: bound.summary.multiTemplate,
    templateId: bound.summary.templateId,
    templateCode: bound.summary.templateCode,
    templateName: bound.summary.templateName,
    templateFields: bound.summary.templateFields,
    inspectMethod: bound.summary.inspectMethod || record.inspectMethod || '抽检',
  })
  return record
}

/** 供模板录入页使用的任务形态 */
export function toFactoryQcInspectTask(record) {
  if (!record) return null
  const ensured = ensureFactoryQcTemplates(record)
  return {
    ...ensured,
    bizScope: FACTORY_QC_BIZ_SCOPE,
    sourceDocNo: ensured.outboundDocNo || ensured.sourceOrderNo || '',
    supplier: ensured.customerName || '',
    lineItems: (ensured.lineItems || []).map((line) => ({
      ...line,
      receiptQty: line.receiptQty ?? line.shipQty,
      inspectQty: line.inspectQty ?? line.shipQty,
    })),
  }
}

function mapFailedQcLinesToNewTask(outbound, previousQc) {
  const failedLines = (previousQc.lineItems || []).filter((l) => isFactoryQcFailedLine(l))
  return failedLines.map((qcLine) => {
    const obLine =
      (outbound.lineItems || []).find(
        (l) => l.itemCode === qcLine.itemCode || l.id === qcLine.outboundLineId,
      ) || {}
    return createQcLineItem({
      itemName: qcLine.itemName || obLine.itemName,
      itemCode: qcLine.itemCode || obLine.itemCode,
      specModel: qcLine.specModel || obLine.specModel,
      shipQty: obLine.shipQty ?? qcLine.shipQty,
      shipWarehouse: qcLine.shipWarehouse || obLine.shipWarehouse,
      unit: qcLine.unit || obLine.unit,
      inspectQty: obLine.shipQty ?? qcLine.shipQty,
      outboundLineId: obLine.id,
    })
  })
}

/** 从销售出库单发起出厂质检（支持复检：仅带入不合格明细） */
export function createFactoryQcFromOutbound(outbound, options = {}) {
  const { retryFromQc = null } = options

  const pending = findPendingQcByOutboundDocNo(outbound.docNo)
  if (pending) {
    return { ok: false, message: '该出库单已有进行中的出厂质检任务' }
  }

  let rawLines
  if (retryFromQc) {
    rawLines = mapFailedQcLinesToNewTask(outbound, retryFromQc)
    if (!rawLines.length) {
      return { ok: false, message: '没有不合格的出库明细，无法重新发起出厂质检' }
    }
  } else {
    const existingActive = findQcBySalesOrderNo(outbound.salesOrderNo)
    if (existingActive?.qcStatus === '待质检') {
      return { ok: false, message: `销售单「${outbound.salesOrderNo}」已有待质检任务` }
    }
    rawLines = (outbound.lineItems || []).map((line) =>
      createQcLineItem({
        itemName: line.itemName,
        itemCode: line.itemCode,
        specModel: line.specModel,
        shipQty: line.shipQty,
        shipWarehouse: line.shipWarehouse,
        unit: line.unit,
        inspectQty: line.shipQty,
        outboundLineId: line.id,
      }),
    )
  }

  if (!rawLines.length) {
    return { ok: false, message: '出库单无明细，无法发起出厂质检' }
  }

  const bound = bindFactoryQcLines(rawLines)
  if (!bound.ok) return bound

  const qcNo = generateFactoryQcNo()
  const summary = bound.summary

  const record = {
    id: `fqc-${Date.now()}`,
    qcStatus: '待质检',
    qcResult: '',
    qcNo,
    salesOrderNo: outbound.salesOrderNo,
    sourceOrderNo: outbound.docNo,
    customerName: outbound.customerName,
    source: '销售发货',
    inspector: '',
    inspectedAt: '',
    creator: options.creator || 'admin1',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    outboundDocNo: outbound.docNo,
    multiTemplate: summary.multiTemplate,
    templateId: summary.templateId,
    templateCode: summary.templateCode,
    templateName: summary.templateName,
    templateFields: summary.templateFields,
    inspectMethod: summary.inspectMethod || '抽检',
    inspectDate: dayjs().format('YYYY-MM-DD'),
    remark: retryFromQc
      ? `复检（原质检单 ${retryFromQc.qcNo || retryFromQc.id}）`
      : outbound.remark || '',
    lineItems: bound.lineItems,
    retryFromQcId: retryFromQc?.id || '',
  }

  addFactoryQc(record)
  const tip = retryFromQc
    ? `已重新生成待质检任务，质检单号 ${qcNo}（仅含不合格明细）`
    : `已生成出厂质检任务，质检单号 ${qcNo}`
  return { ok: true, message: tip, record }
}

export function canInspect(record) {
  return record?.qcStatus === '待质检'
}

export function canTerminate(record) {
  return record?.qcStatus === '待质检'
}

function lineHasTemplateFill(line) {
  return (
    (Array.isArray(line.templateFields) && line.templateFields.length > 0) ||
    (Array.isArray(line.fieldValues) && line.fieldValues.length > 0)
  )
}

/** 保存质检结果（模板录入 / 兼容旧弹窗） */
export function submitFactoryQcInspection(id, payload) {
  const record = factoryQcState.records.find((r) => r.id === id)
  if (!record) return { ok: false, message: '质检任务不存在' }
  if (record.qcStatus !== '待质检') {
    return { ok: false, message: '仅待质检任务可执行质检' }
  }

  const lines = payload.lineItems || []
  const useTemplate = lines.some((l) => lineHasTemplateFill(l))

  if (useTemplate) {
    const lineResults = lines.map((line) => {
      const fields =
        (Array.isArray(line.templateFields) && line.templateFields.length
          ? line.templateFields
          : record.templateFields) || []
      return resolveQcResultFromFieldValues(fields, line.fieldValues)
    })
    if (lineResults.some((r) => !r)) {
      return { ok: false, message: '请填写各物料的质检结果' }
    }

    for (const line of lines) {
      const inspectQty = Number(line.inspectQty)
      const shipQty = Number(line.shipQty ?? line.receiptQty)
      if (shipQty > 0 && inspectQty > shipQty) {
        return { ok: false, message: `「${line.itemName}」检验数量不能大于发货数量` }
      }
    }

    const qcResult = aggregateLineConclusions(lineResults)
    const summary = summarizeTaskTemplates(lines)
    const qcNo = record.qcNo || generateFactoryQcNo()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const headerMethod =
      payload.inspectMethod ||
      summary.inspectMethod ||
      [...new Set(lines.map((l) => l.inspectMethod).filter(Boolean))].join('、') ||
      record.inspectMethod

    Object.assign(record, {
      qcNo,
      qcStatus: '已完成',
      qcResult,
      multiTemplate: summary.multiTemplate,
      templateId: summary.templateId || record.templateId,
      templateCode: summary.templateCode || record.templateCode,
      templateName: summary.templateName || record.templateName,
      inspectMethod: headerMethod,
      inspectDate: payload.inspectDate || record.inspectDate || dayjs().format('YYYY-MM-DD'),
      remark: payload.remark != null ? payload.remark : record.remark,
      lineItems: lines.map((line, idx) => ({
        ...line,
        shipQty: line.shipQty ?? line.receiptQty,
        receiptQty: line.receiptQty ?? line.shipQty,
        lineQcResult: line.lineQcResult || lineResults[idx] || '',
      })),
      inspector: payload.inspector || 'admin1',
      inspectedAt: now,
    })

    return {
      ok: true,
      message: `质检完成，单号 ${qcNo}，结果：${qcResult}`,
      qcNo,
      qcResult,
    }
  }

  for (const line of lines) {
    if (!line.lineQcResult) {
      return { ok: false, message: '请为每条明细选择质检结果' }
    }
    const inspectQty = Number(line.inspectQty)
    const shipQty = Number(line.shipQty)
    if (!inspectQty && inspectQty !== 0) {
      return { ok: false, message: '请填写检验数量' }
    }
    if (inspectQty > shipQty) {
      return { ok: false, message: `「${line.itemName}」检验数量不能大于发货数量` }
    }
    if (isFactoryQcFailedLine(line) && !line.treatmentPlan) {
      return { ok: false, message: `「${line.itemName}」不合格时请填写处理方案` }
    }
  }

  const qcNo = record.qcNo || generateFactoryQcNo()
  const qcResult = resolveHeaderQcResult(lines)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  Object.assign(record, {
    qcNo,
    qcStatus: '已完成',
    qcResult,
    inspectMethod: payload.inspectMethod,
    inspectDate: payload.inspectDate,
    remark: payload.remark || '',
    lineItems: lines,
    inspector: payload.inspector || 'admin1',
    inspectedAt: now,
  })

  return {
    ok: true,
    message: `质检完成，单号 ${qcNo}，结果：${qcResult}`,
    qcNo,
    qcResult,
  }
}

export function terminateFactoryQc(id) {
  const record = factoryQcState.records.find((r) => r.id === id)
  if (!record) return { ok: false, message: '质检任务不存在' }
  if (!canTerminate(record)) {
    return { ok: false, message: '仅待质检任务可终止' }
  }
  record.qcStatus = '已终止'
  return { ok: true, message: '已终止' }
}

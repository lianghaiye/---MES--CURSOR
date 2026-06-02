import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  cloneFactoryQcRecords,
  createQcLineItem,
  resolveHeaderQcResult,
} from '@/mock/factoryQcRecords'

const STORAGE_KEY = 'i_doms_factory_qc'
const QC_NO_PREFIX = 'CCZJ'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.records)) return parsed.records
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: factoryQcState.records }))
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

function mapFailedQcLinesToNewTask(outbound, previousQc) {
  const failedLines = (previousQc.lineItems || []).filter((l) => l.lineQcResult === '不合格')
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

  let lineItems
  if (retryFromQc) {
    lineItems = mapFailedQcLinesToNewTask(outbound, retryFromQc)
    if (!lineItems.length) {
      return { ok: false, message: '没有不合格的出库明细，无法重新发起出厂质检' }
    }
  } else {
    const existingActive = findQcBySalesOrderNo(outbound.salesOrderNo)
    if (existingActive?.qcStatus === '待质检') {
      return { ok: false, message: `销售单「${outbound.salesOrderNo}」已有待质检任务` }
    }
    lineItems = (outbound.lineItems || []).map((line) =>
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

  if (!lineItems.length) {
    return { ok: false, message: '出库单无明细，无法发起出厂质检' }
  }

  const qcNo = generateFactoryQcNo()

  const record = {
    id: `fqc-${Date.now()}`,
    qcStatus: '待质检',
    qcResult: '',
    qcNo,
    salesOrderNo: outbound.salesOrderNo,
    sourceOrderNo: outbound.salesOrderNo,
    customerName: outbound.customerName,
    source: '销售发货',
    inspector: '',
    inspectedAt: '',
    outboundDocNo: outbound.docNo,
    inspectMethod: '抽检',
    inspectDate: dayjs().format('YYYY-MM-DD'),
    remark: retryFromQc ? `复检（原质检单 ${retryFromQc.qcNo || retryFromQc.id}）` : outbound.remark || '',
    lineItems,
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

/** 保存质检结果 */
export function submitFactoryQcInspection(id, payload) {
  const record = factoryQcState.records.find((r) => r.id === id)
  if (!record) return { ok: false, message: '质检任务不存在' }
  if (record.qcStatus !== '待质检') {
    return { ok: false, message: '仅待质检任务可执行质检' }
  }

  const lines = payload.lineItems || []
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
    if (line.lineQcResult === '不合格' && !line.treatmentPlan) {
      return { ok: false, message: `「${line.itemName}」不合格时请填写处理方案` }
    }
  }

  const qcNo = record.qcNo || generateFactoryQcNo()
  const qcResult = resolveHeaderQcResult(lines)
  const now = dayjs().format('YYYY-MM-DD HH:mm')

  Object.assign(record, {
    qcNo,
    qcStatus: '已完成',
    qcResult,
    inspectMethod: payload.inspectMethod,
    inspectDate: payload.inspectDate,
    remark: payload.remark || '',
    lineItems: lines,
    inspector: 'admin1',
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

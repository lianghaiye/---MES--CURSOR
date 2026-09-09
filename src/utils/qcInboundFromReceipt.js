/**
 * 来料/外协回货：质检与收货入库联动
 * - 入库状态以收货单为准，质检列表只读展示
 * - 按质检结果决定能否入库，以及是否按「合格入库数量」带入
 */
import { QC_TASK_RESULT, QC_TASK_STATUS, listQcTasks } from '@/store/qcTaskStore'
import { getPurchaseReceiptById, purchaseReceiptState } from '@/store/purchaseReceiptStore'
import { getOutsourcingReceiptById, outsourcingReceiptState } from '@/store/outsourcingReceiptStore'

/** @param {string} [bizScope] */
export function isOutsourcingQcScope(bizScope) {
  return bizScope === '外协回货检'
}

/** 按收货单号查找采购收货 */
export function getPurchaseReceiptByNo(receiptNo) {
  const no = String(receiptNo || '').trim()
  if (!no) return null
  void purchaseReceiptState.receipts
  return purchaseReceiptState.receipts.find((r) => String(r.receiptNo || '').trim() === no) || null
}

/** 按收货单号查找外协收货 */
export function getOutsourcingReceiptByNo(receiptNo) {
  const no = String(receiptNo || '').trim()
  if (!no) return null
  void outsourcingReceiptState.receipts
  return (
    outsourcingReceiptState.receipts.find((r) => String(r.receiptNo || '').trim() === no) || null
  )
}

/**
 * 解析质检单关联收货单：先 id，再来源单号（兼容 mock/历史脏数据）
 * @param {object} task
 */
export function resolveSourceReceiptForQcTask(task) {
  if (!task) return null
  void purchaseReceiptState.receipts
  void outsourcingReceiptState.receipts
  if (isOutsourcingQcScope(task.bizScope) || task.sourceType === 'outsourcing_receipt') {
    return (
      (task.sourceDocId && getOutsourcingReceiptById(task.sourceDocId)) ||
      getOutsourcingReceiptByNo(task.sourceDocNo) ||
      null
    )
  }
  return (
    (task.sourceDocId && getPurchaseReceiptById(task.sourceDocId)) ||
    getPurchaseReceiptByNo(task.sourceDocNo) ||
    null
  )
}

/**
 * 取收货单关联的有效质检单（优先已完成，再按更新时间）
 * @param {string} receiptId
 * @param {{ bizScope?: string, receiptNo?: string }} [opts]
 */
export function findInboundQcTaskForReceipt(receiptId, opts = {}) {
  if (!receiptId && !opts.receiptNo) return null
  let list = listQcTasks({
    ...(receiptId ? { sourceDocId: receiptId } : {}),
    ...(opts.bizScope ? { bizScope: opts.bizScope } : {}),
  }).filter((t) => t.qcStatus !== QC_TASK_STATUS.CANCELLED)

  // id 对不上时，用来源单号兜底
  if (!list.length && opts.receiptNo) {
    const no = String(opts.receiptNo).trim()
    list = listQcTasks(opts.bizScope ? { bizScope: opts.bizScope } : {})
      .filter((t) => t.qcStatus !== QC_TASK_STATUS.CANCELLED)
      .filter((t) => String(t.sourceDocNo || '').trim() === no)
  }

  if (!list.length) return null
  const completed = list.filter((t) => t.qcStatus === QC_TASK_STATUS.COMPLETED)
  const pool = completed.length ? completed : list
  return [...pool].sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )[0]
}

/** 按行汇总合格入库数量：itemCode → qty */
export function buildQcAcceptInboundQtyHints(task) {
  const hints = {}
  ;(task?.lineItems || []).forEach((line) => {
    const code = String(line.itemCode || line.productCode || '').trim()
    if (!code) return
    if (line.acceptInboundQty == null || line.acceptInboundQty === '') return
    const q = Number(line.acceptInboundQty)
    if (!Number.isFinite(q) || q < 0) return
    hints[code] = (hints[code] || 0) + q
  })
  return Object.keys(hints).length ? hints : null
}

/**
 * 评估能否从该质检单生成入库
 * @returns {{ ok: boolean, message?: string, mode: string, qtyHints: Record<string, number>|null, enforceQtyCap: boolean }}
 */
export function evaluateQcInboundGate(task) {
  if (!task) {
    return { ok: true, mode: 'no_qc', qtyHints: null, enforceQtyCap: false }
  }
  if (task.qcStatus === QC_TASK_STATUS.CANCELLED) {
    return { ok: true, mode: 'no_qc', qtyHints: null, enforceQtyCap: false }
  }
  if (task.qcStatus !== QC_TASK_STATUS.COMPLETED) {
    return {
      ok: false,
      message: '请先完成质检后再生成入库单',
      mode: 'unfinished',
      qtyHints: null,
      enforceQtyCap: false,
    }
  }
  if (task.qcResult === QC_TASK_RESULT.FAIL) {
    return {
      ok: false,
      message: '质检不通过的单据不可生成入库单',
      mode: 'fail',
      qtyHints: null,
      enforceQtyCap: false,
    }
  }
  if (task.qcResult === QC_TASK_RESULT.PASS) {
    return { ok: true, mode: 'pass', qtyHints: null, enforceQtyCap: false }
  }
  if (task.qcResult === QC_TASK_RESULT.PARTIAL) {
    const qtyHints = buildQcAcceptInboundQtyHints(task)
    const hasQty = qtyHints && Object.values(qtyHints).some((q) => Number(q) > 0)
    if (!hasQty) {
      return {
        ok: false,
        message: '部分通过单据需填写合格入库数量后方可生成入库单',
        mode: 'partial',
        qtyHints: null,
        enforceQtyCap: true,
      }
    }
    return { ok: true, mode: 'partial', qtyHints, enforceQtyCap: true }
  }
  return { ok: true, mode: 'unknown', qtyHints: null, enforceQtyCap: false }
}

/**
 * 按收货单评估入库门控（查找关联质检）
 * @param {string} receiptId
 * @param {{ bizScope?: string, receiptNo?: string }} [opts]
 */
export function evaluateReceiptInboundByQc(receiptId, opts = {}) {
  const task = findInboundQcTaskForReceipt(receiptId, opts)
  const gate = evaluateQcInboundGate(task)
  return { ...gate, task }
}

/**
 * 质检列表展示用入库状态（读关联收货，依赖 store 响应式）
 * @param {object} task
 */
export function resolveQcTaskInboundStatus(task) {
  const receipt = resolveSourceReceiptForQcTask(task)
  return receipt?.inboundStatus || (task?.sourceDocId || task?.sourceDocNo ? '待入库' : '')
}

export function inboundStatusTagColor(status) {
  const map = {
    待入库: 'default',
    入库中: 'processing',
    部分入库: 'warning',
    已入库: 'success',
  }
  return map[status] || 'default'
}

/** 质检结果 → 收货单质检状态文案 */
export function mapQcResultToReceiptQcStatus(qcResult) {
  if (qcResult === QC_TASK_RESULT.PASS) return '质检通过'
  if (qcResult === QC_TASK_RESULT.FAIL) return '质检不通过'
  if (qcResult === QC_TASK_RESULT.PARTIAL) return '部分通过'
  return ''
}

/**
 * 将合格入库提示应用到明细行（支持 itemCode / productCode）
 * @param {object[]} lines
 * @param {Record<string, number>|null} hints
 * @param {{ enforceQtyCap?: boolean, syncTotal?: (line: object) => void }} [opts]
 */
export function applyQcQtyHintsToInboundLines(lines = [], hints, opts = {}) {
  if (!hints || typeof hints !== 'object') return
  const enforce = opts.enforceQtyCap === true
  lines.forEach((line) => {
    const code = String(line.itemCode || line.productCode || '').trim()
    if (!code || !(code in hints)) {
      if (enforce) {
        // 部分通过且该物料无合格入库数 → 本次不入
        line.qty = 0
        line.qcMaxQty = 0
        if (typeof opts.syncTotal === 'function') opts.syncTotal(line)
      }
      return
    }
    const hint = Number(hints[code])
    if (!Number.isFinite(hint) || hint < 0) return
    const remain = Number(line.remainingQty)
    const cap = Number.isFinite(remain) ? Math.max(0, remain) : hint
    const next = Math.min(hint, cap)
    line.qty = next
    if (enforce) line.qcMaxQty = next
    if (typeof opts.syncTotal === 'function') opts.syncTotal(line)
  })
}

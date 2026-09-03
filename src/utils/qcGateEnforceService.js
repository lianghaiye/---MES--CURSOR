import { getQcGatePolicyByBizScope } from '@/store/functionParamStore'
import { QC_TASK_RESULT, QC_TASK_STATUS, listQcTasks } from '@/store/qcTaskStore'
import { getFactoryQcById, QC_RESULT_PASS, qcResultBlocksOutbound } from '@/store/factoryQcStore'
import { workOrderState } from '@/store/workOrderStore'

export const QC_GATE_MODE = {
  HARD: 'hard',
  SOFT: 'soft',
}

const OPEN_STATUSES = new Set([QC_TASK_STATUS.PENDING, QC_TASK_STATUS.IN_PROGRESS])

/** 入库类：仅「质检不通过」算不合格；让步/通过不拦 */
function inboundResultBlocks(result) {
  return result === QC_TASK_RESULT.FAIL || result === '质检不通过' || result === '不合格'
}

/** 过程检 / 出厂检：不通过、部分通过都拦 */
function processOrOutboundResultBlocks(result) {
  return (
    result === QC_TASK_RESULT.FAIL ||
    result === QC_TASK_RESULT.PARTIAL ||
    result === '质检不通过' ||
    result === '部分通过' ||
    result === '不合格'
  )
}

export function getGateMode(bizScope) {
  return getQcGatePolicyByBizScope(bizScope) === QC_GATE_MODE.SOFT
    ? QC_GATE_MODE.SOFT
    : QC_GATE_MODE.HARD
}

export function isHardGate(bizScope) {
  return getGateMode(bizScope) === QC_GATE_MODE.HARD
}

function findWorkOrder({ workOrderId, workOrderNo } = {}) {
  const id = String(workOrderId || '').trim()
  const no = String(workOrderNo || '').trim()
  return (
    (workOrderState.orders || []).find(
      (o) => (id && o.id === id) || (no && (o.orderNo === no || o.workOrderNo === no)),
    ) || null
  )
}

/** 入库单 → 需校验的质检业务类型 */
export function resolveInboundQcBizScopes(order = {}) {
  const type = String(order.inboundType || '').trim()
  const sourceType = String(order.sourceType || '').trim()
  const scopes = new Set()

  if (type === '采购入库' || sourceType.includes('采购')) {
    scopes.add('来料质检')
  }
  if (type.includes('外协') || sourceType.includes('外协')) {
    scopes.add('外协回货检')
  }

  const isProductionInbound =
    ['生产入库', '完工入库', '成品入库', '半成品入库'].includes(type) ||
    sourceType.includes('工单') ||
    sourceType.includes('生产') ||
    (Array.isArray(order.workOrders) && order.workOrders.length)

  // 成品检：生产类入库必检；其它入库只要已关联成品检任务也纳入门控
  if (isProductionInbound) {
    scopes.add('成品检')
  } else if (findRelatedInboundQcTasks(order, ['成品检']).length) {
    scopes.add('成品检')
  }
  return [...scopes]
}

function collectInboundMatchKeys(order = {}) {
  const itemCodes = new Set()
  ;(order.lineItems || []).forEach((l) => {
    if (l.itemCode) itemCodes.add(String(l.itemCode).trim())
  })
  const docNos = new Set(
    [
      order.docNo,
      order.sourceOrderNo,
      order.salesOrderNo,
      order.purchaseOrderId,
      ...(order.workOrders || []).map((w) => w.orderNo || w.workOrderNo),
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean),
  )
  return { itemCodes, docNos }
}

export function findRelatedInboundQcTasks(order, bizScopes = []) {
  const scopes = bizScopes.length ? bizScopes : resolveInboundQcBizScopes(order)
  if (!scopes.length) return []
  const { itemCodes, docNos } = collectInboundMatchKeys(order)

  return listQcTasks({}).filter((t) => {
    if (!scopes.includes(t.bizScope)) return false
    if (t.qcStatus === QC_TASK_STATUS.CANCELLED) return false

    if (docNos.has(String(t.sourceDocNo || '').trim())) return true
    if (docNos.has(String(t.workOrderNo || '').trim())) return true
    if (t.itemCode && itemCodes.has(String(t.itemCode).trim())) return true
    return (t.lineItems || []).some((l) => itemCodes.has(String(l.itemCode || '').trim()))
  })
}

/**
 * 入库门控
 * 强：未检（无任务/待检中）拦；不合格拦；让步/通过不拦
 * 弱：仅 warnings，不阻断
 */
export function evaluateInboundQcGate(order) {
  const scopes = resolveInboundQcBizScopes(order)
  if (!scopes.length) {
    return { ok: true, blocked: false, warnings: [], messages: [] }
  }

  const warnings = []
  const hardMessages = []

  scopes.forEach((scope) => {
    const mode = getGateMode(scope)
    const tasks = findRelatedInboundQcTasks(order, [scope])
    const issues = []

    if (!tasks.length) {
      issues.push(`未找到「${scope}」质检记录（视为未检）`)
    } else {
      const open = tasks.filter((t) => OPEN_STATUSES.has(t.qcStatus))
      if (open.length) {
        issues.push(`「${scope}」尚有未完成质检（${open.map((t) => t.qcNo || t.id).join('、')}）`)
      }
      const failed = tasks.filter(
        (t) => t.qcStatus === QC_TASK_STATUS.COMPLETED && inboundResultBlocks(t.qcResult),
      )
      if (failed.length) {
        issues.push(`「${scope}」质检不合格（${failed.map((t) => t.qcNo || t.id).join('、')}）`)
      }
    }

    if (!issues.length) return
    const text = issues.join('；')
    if (mode === QC_GATE_MODE.HARD) hardMessages.push(text)
    else warnings.push(text)
  })

  if (hardMessages.length) {
    return {
      ok: false,
      blocked: true,
      warnings,
      messages: hardMessages,
      message: hardMessages.join('；'),
    }
  }
  return { ok: true, blocked: false, warnings, messages: [] }
}

function resolveProcessIndex(workOrder, processHint = {}) {
  const list = workOrder?.processes || []
  if (!list.length) return null
  if (Number.isFinite(Number(processHint.processIndex))) {
    return Number(processHint.processIndex)
  }
  const name = String(processHint.name || processHint.processName || '').trim()
  const code = String(processHint.processCode || processHint.code || '').trim()
  const id = String(processHint.processConfigId || '').trim()
  const hitIdx = list.findIndex((p) => {
    if (id && String(p.processConfigId || p.id || '') === id) return true
    if (code && String(p.code || p.processCode || '') === code) return true
    if (name && String(p.name || p.processName || '') === name) return true
    return false
  })
  if (hitIdx < 0) return null
  const hit = list[hitIdx]
  return hit.index ?? hitIdx + 1
}

/**
 * 过程检门控（报工）
 * 强：上游未完成 / 不通过 / 部分通过 → 拦
 * 弱：仅 warnings
 */
export function evaluateProcessReportQcGate({ workOrderId, workOrderNo, processes = [] } = {}) {
  const mode = getGateMode('生产过程检')
  const workOrder = findWorkOrder({ workOrderId, workOrderNo })
  if (!workOrder) {
    return { ok: true, blocked: false, warnings: [], messages: [] }
  }

  const tasks = [
    ...listQcTasks({ workOrderId: workOrder.id }),
    ...(workOrder.orderNo
      ? listQcTasks({}).filter(
          (t) => t.workOrderNo === workOrder.orderNo && t.workOrderId !== workOrder.id,
        )
      : []),
  ]

  const reportingIndexes = (processes || [])
    .filter((p) => !p.deleted)
    .map((p) => resolveProcessIndex(workOrder, p))
    .filter((n) => Number.isFinite(n))

  if (!reportingIndexes.length) {
    return { ok: true, blocked: false, warnings: [], messages: [] }
  }

  const issues = []
  reportingIndexes.forEach((idx) => {
    const upstream = tasks.filter((t) => {
      const ti = Number(t.processIndex)
      return Number.isFinite(ti) && ti < idx
    })
    const open = upstream.filter((t) => OPEN_STATUSES.has(t.qcStatus))
    if (open.length) {
      issues.push(
        `工序#${idx} 上游质检未完成（${open.map((t) => t.processName || t.qcNo).join('、')}）`,
      )
    }
    const bad = upstream.filter(
      (t) => t.qcStatus === QC_TASK_STATUS.COMPLETED && processOrOutboundResultBlocks(t.qcResult),
    )
    if (bad.length) {
      issues.push(
        `工序#${idx} 上游质检不通过/部分通过（${bad.map((t) => t.processName || t.qcNo).join('、')}）`,
      )
    }
  })

  if (!issues.length) {
    return { ok: true, blocked: false, warnings: [], messages: [] }
  }

  const text = issues.join('；')
  if (mode === QC_GATE_MODE.HARD) {
    return { ok: false, blocked: true, warnings: [], messages: [text], message: text }
  }
  return { ok: true, blocked: false, warnings: [text], messages: [] }
}

/**
 * 出厂检门控（确认出库）
 * 强：未发起/未完成/不通过/部分通过 → 拦
 * 弱：仅 warnings，仍可出库
 */
export function evaluateOutboundQcGate(order) {
  if (!order || order.outboundType !== '销售出库') {
    return { ok: true, blocked: false, warnings: [], messages: [] }
  }

  const mode = getGateMode('出厂质检')
  const issues = []

  if (!order.factoryQcId) {
    issues.push('尚未发起出厂质检（视为未检）')
  } else {
    const qc = getFactoryQcById(order.factoryQcId)
    if (!qc) {
      issues.push('出厂质检记录不存在（视为未检）')
    } else if (qc.qcStatus === '待质检' || qc.qcStatus === '检验中') {
      issues.push(`出厂质检尚未完成（${qc.qcNo || ''}）`)
    } else if (qc.qcStatus === '已完成') {
      if (qcResultBlocksOutbound(qc.qcResult) || qc.qcResult !== QC_RESULT_PASS) {
        issues.push(`出厂质检结果为「${qc.qcResult || '未通过'}」`)
      }
    } else {
      issues.push(`出厂质检状态为「${qc.qcStatus}」`)
    }
  }

  if (!issues.length) {
    return { ok: true, blocked: false, warnings: [], messages: [] }
  }

  const text = issues.join('；')
  if (mode === QC_GATE_MODE.HARD) {
    return {
      ok: false,
      blocked: true,
      warnings: [],
      messages: [text],
      message: text,
      qcBlocked: true,
    }
  }
  return { ok: true, blocked: false, warnings: [text], messages: [] }
}

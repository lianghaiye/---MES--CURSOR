import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  createPurchaseSettle,
  createPurchaseSettleLine,
  PURCHASE_SETTLE_STATUS,
  PURCHASE_SETTLE_GENERATE_MODE,
  PURCHASE_SETTLE_LINE_DISPUTE_STATUS,
  PURCHASE_SETTLE_LINE_DISPUTE_RESULT,
  PURCHASE_SETTLE_LINE_DISPUTE_SCOPE,
  seedPurchaseSettles,
} from '@/mock/purchaseSettles'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { getSupplierById, getSupplierByName, supplierState } from '@/store/supplierStore'
import { getRemainSettleQty, hasSettleUnit, resolvePricingQty } from '@/utils/settleUnit'
import {
  inboundDateInWindow,
  isPeriodSettleCycle,
  resolvePeriodWindows,
} from '@/utils/purchaseSettlePeriod'
import {
  listSettleableReturnLinesByPeriod,
  listSettleableReturnLinesForPurchaseOrder,
  getEffectiveRemainReturnSettleQty,
  applyReturnSettledQty,
  releaseReturnSettledQty,
  isReturnEligibleForSettle,
  returnDateInWindow,
} from '@/utils/purchaseSettleReturn'
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { roundNumber } from '@/utils/numberFormat'
import {
  getLineBookAmount,
  getLineEffectiveAmount,
  getLineHangAmount,
  roundDispute,
} from '@/utils/purchaseSettleDispute'
import {
  refreshAccountStatusForSettle,
  refreshAllPurchaseOrderAccountStatus,
} from '@/utils/purchaseOrderSettleAccount'
import { ensurePurchaseSettleDemoInboundOrders } from '@/mock/purchaseSettleDemoInboundSeed'

/** 确认前可编辑/占量状态：草稿、对账中 */
export function isPurchaseSettlePreConfirm(status) {
  return status === PURCHASE_SETTLE_STATUS.DRAFT || status === PURCHASE_SETTLE_STATUS.RECONCILING
}

/** 合并入库正数行 + 退货红冲行；有任一可结算则出组 */
function mergeSettlePreviewLines(inboundLines = [], returnLines = []) {
  return [...inboundLines, ...returnLines]
}

function hasSettlePreviewQty(row) {
  const q = Number(row?.settleQty) || 0
  return Math.abs(q) > 1e-9
}

export const purchaseSettleState = reactive({
  settles: seedPurchaseSettles(),
})

/** 对账 seed 依赖的入库明细补齐（避免确认时「关联入库明细不存在」） */
try {
  inboundOrderState.orders = ensurePurchaseSettleDemoInboundOrders(inboundOrderState.orders)
} catch {
  /* ignore */
}

function notifyPoAccountStatus(settle) {
  try {
    refreshAccountStatusForSettle(settle, purchaseSettleState.settles)
  } catch {
    /* ignore */
  }
}

try {
  refreshAllPurchaseOrderAccountStatus(purchaseSettleState.settles)
} catch {
  /* ignore */
}

function nextSettleNo() {
  const d = dayjs().format('YYYYMMDD')
  const seq = String(purchaseSettleState.settles.length + 1).padStart(3, '0')
  return `PS${d}${seq}`
}

function round2(n) {
  const r = roundNumber(Number(n) || 0, 4)
  return Number.isFinite(r) ? r : 0
}

function resolveSupplierCycle(supplierName, po, supplierRecord) {
  const supplier = supplierRecord || getSupplierByName(supplierName)
  if (supplier?.settlementCycle) return supplier.settlementCycle
  if (po?.settlementCycle) return po.settlementCycle
  return ''
}

function latestDateOf(dates = []) {
  const list = dates
    .filter(Boolean)
    .map((d) => String(d).slice(0, 10))
    .sort()
  return list.length ? list[list.length - 1] : ''
}

/**
 * 账期起算 + 账期天数 → 计划付款日（整单一个付款日）
 * - 开票日：供应商开票日，系统取不到则需人工补录，未补录时付款日为空
 * - 到货日：关联收货单确认/收货时间的最晚一天
 * - 验收日：关联入库日的最晚一天
 * - 对账日：对账单确认日（未确认时暂用对账单据日，确认后再刷新）
 */
function resolvePaymentMeta(
  supplierName,
  { settleDate, confirmedAt, invoiceDate, lineItems } = {},
) {
  const supplier = getSupplierByName(supplierName)
  const days = Number(supplier?.paymentTermDays)
  const paymentTermDays = Number.isFinite(days) && days > 0 ? days : 30
  const paymentTermStart = supplier?.paymentTermStart || '对账日'

  let baseDate = ''
  if (paymentTermStart === '开票日') {
    baseDate = invoiceDate ? String(invoiceDate).slice(0, 10) : ''
  } else if (paymentTermStart === '验收日') {
    baseDate = latestDateOf(
      (lineItems || []).map((row) => {
        const order = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
        return order?.inboundDate || order?.createdAt || ''
      }),
    )
  } else if (paymentTermStart === '到货日') {
    let purchaseReceiptState
    try {
      // 避免循环依赖：按需取收货 store
      purchaseReceiptState = require('@/store/purchaseReceiptStore').purchaseReceiptState
    } catch {
      purchaseReceiptState = null
    }
    baseDate = latestDateOf(
      (lineItems || []).map((row) => {
        const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
        const receiptId = inbound?.purchaseReceiptId
        const receipt = receiptId
          ? purchaseReceiptState?.receipts?.find((r) => r.id === receiptId)
          : null
        // 收货确认时间优先；无收货链路时回退入库日，避免完全算不出
        return (
          receipt?.receivedAt ||
          receipt?.updatedAt ||
          receipt?.createdAt ||
          inbound?.inboundDate ||
          inbound?.createdAt ||
          ''
        )
      }),
    )
  } else {
    // 对账日
    baseDate = confirmedAt
      ? String(confirmedAt).slice(0, 10)
      : settleDate || dayjs().format('YYYY-MM-DD')
  }

  return {
    paymentTermStart,
    paymentTermDays,
    plannedPaymentDate: baseDate
      ? dayjs(baseDate).add(paymentTermDays, 'day').format('YYYY-MM-DD')
      : '',
  }
}

/**
 * 草稿/对账中结算单已占用的可结算量（确认前即占量，避免跨规则重复出单）
 */
export function getDraftOccupiedSettleQty(inboundOrderId, inboundLineId, excludeSettleId = '') {
  if (!inboundOrderId || !inboundLineId) return 0
  let occupied = 0
  purchaseSettleState.settles.forEach((settle) => {
    if (!isPurchaseSettlePreConfirm(settle.status)) return
    if (excludeSettleId && settle.id === excludeSettleId) return
    ;(settle.lineItems || []).forEach((row) => {
      if (row.inboundOrderId === inboundOrderId && row.inboundLineId === inboundLineId) {
        occupied += Number(row.settleQty) || 0
      }
    })
  })
  return round2(occupied)
}

/** 剩余可结算量 = 总量 − 已确认 − 草稿占用 */
export function getEffectiveRemainSettleQty(line, inboundOrderId, excludeSettleId = '') {
  const base = getRemainSettleQty(line)
  const occupied = getDraftOccupiedSettleQty(inboundOrderId, line?.id, excludeSettleId)
  return Math.max(0, round2(base - occupied))
}

function buildSettleableRow(order, line, po) {
  const remain = getEffectiveRemainSettleQty(line, order.id)
  if (!(remain > 0)) return null
  if ((line.lineStatus || '待入库') !== '已入库') return null
  const poLine = (po?.lineItems || []).find((l) => l.id === line.poLineId) || null
  const unitPrice = Number(poLine?.unitPriceInTax ?? poLine?.unitPriceExTax ?? line.unitPrice ?? 0)
  const settleUnit = hasSettleUnit(line)
    ? line.settleUnit
    : hasSettleUnit(poLine || {})
      ? poLine.settleUnit
      : ''
  return {
    key: `${order.id}:${line.id}`,
    inboundOrderId: order.id,
    inboundDocNo: order.docNo,
    inboundLineId: line.id,
    poLineId: line.poLineId || poLine?.id || '',
    purchaseOrderId: po?.id || order.purchaseOrderId || '',
    purchaseOrderNo: po?.orderNo || order.purchaseOrderNo || '',
    itemCode: line.itemCode,
    itemName: line.itemName,
    settleUnit: settleUnit || line.unit || '件',
    remainSettleQty: remain,
    settleQty: remain,
    unitPrice,
    amount: round2(remain * unitPrice),
    sourceLine: line,
    poLine,
  }
}

export function listPurchaseSettles() {
  return purchaseSettleState.settles
}

export function getPurchaseSettleById(id) {
  return purchaseSettleState.settles.find((s) => s.id === id) || null
}

export function listSettlesByPurchaseOrderId(purchaseOrderId) {
  if (!purchaseOrderId) return []
  return purchaseSettleState.settles.filter((s) => {
    if (s.purchaseOrderId === purchaseOrderId) return true
    return (s.lineItems || []).some((l) => l.purchaseOrderId === purchaseOrderId)
  })
}

export function findSettleBySupplierPeriod(supplierId, supplierName, periodKey) {
  return (
    purchaseSettleState.settles.find((s) => {
      if (s.periodKey !== periodKey) return false
      if (supplierId && s.supplierId && s.supplierId === supplierId) return true
      return s.supplier === supplierName
    }) || null
  )
}

/** 可结算的入库行：已入库、挂采购单、仍有剩余结算量 */
export function listSettleableInboundLines(purchaseOrderId) {
  const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
  if (!po) return []
  const orders = inboundOrderState.orders.filter((o) => o.purchaseOrderId === purchaseOrderId)
  const rows = []
  orders.forEach((order) => {
    ;(order.lineItems || []).forEach((line) => {
      const row = buildSettleableRow(order, line, po)
      if (row) rows.push(row)
    })
  })
  return rows
}

/** 采购单维度：可结算入库 + 可红冲出库退货 */
export function listSettleableLinesForPurchaseOrder(purchaseOrderId) {
  return mergeSettlePreviewLines(
    listSettleableInboundLines(purchaseOrderId),
    listSettleableReturnLinesForPurchaseOrder(purchaseOrderId),
  )
}

/**
 * 按入库业务日窗口筛选可结算行（可按供应商名过滤）
 */
export function listSettleableInboundLinesByPeriod({
  supplierId,
  supplierName,
  periodStart,
  periodEnd,
} = {}) {
  const supplier =
    (supplierId && getSupplierById(supplierId)) ||
    (supplierName ? getSupplierByName(supplierName) : null)
  const targetName = supplier?.name || supplierName || ''

  const rows = []
  inboundOrderState.orders.forEach((order) => {
    if (!order.purchaseOrderId) return
    if (!inboundDateInWindow(order, periodStart, periodEnd)) return
    const po = purchaseOrderState.orders.find((o) => o.id === order.purchaseOrderId)
    if (!po) return
    const orderSupplier = po.supplier || order.supplier || ''
    if (targetName && orderSupplier !== targetName) return
    ;(order.lineItems || []).forEach((line) => {
      const row = buildSettleableRow(order, line, po)
      if (row) rows.push(row)
    })
  })
  return rows
}

/** 账期窗内：可结算入库 + 出库业务日落在窗内的退货红冲 */
export function listSettleableLinesByPeriod(params = {}) {
  return mergeSettlePreviewLines(
    listSettleableInboundLinesByPeriod(params),
    listSettleableReturnLinesByPeriod(params),
  )
}

/**
 * 预览账期对账：按供应商聚合
 * - 传入 periodStart/periodEnd 时：一律用该固定窗扫描（手工「按账期生成」）
 * - 未传起止时：按供应商结算周期把会计月切窗（规则调度等内部仍可用）
 * @param {{
 *   yearMonth: string,
 *   periodStart?: string,
 *   periodEnd?: string,
 *   supplierIds?: string[],
 *   supplierNames?: string[],
 *   halfParts?: ('H1'|'H2')[],
 *   allowAppend?: boolean
 * }} params
 */
export function previewPeriodSettles(params = {}) {
  const {
    yearMonth,
    periodStart: fixedStart,
    periodEnd: fixedEnd,
    supplierIds,
    supplierNames,
    halfParts,
    allowAppend = false,
  } = params
  if (!yearMonth) return { ok: false, message: '请选择会计期间', groups: [] }
  if (fixedStart || fixedEnd) {
    if (!fixedStart || !fixedEnd) {
      return { ok: false, message: '请选择期间起止', groups: [] }
    }
    if (dayjs(fixedStart).isAfter(dayjs(fixedEnd), 'day')) {
      return { ok: false, message: '期间开始不能晚于结束', groups: [] }
    }
  }

  const suppliers = collectCandidateSuppliers(supplierIds, supplierNames)
  if (!suppliers.length) return { ok: false, message: '没有可参与账期对账的供应商', groups: [] }

  const groups = []
  const messages = []
  const useFixed = !!(fixedStart && fixedEnd)

  for (const supplier of suppliers) {
    const cycle = resolveSupplierCycle(supplier.name, null, supplier)
    if (!isPeriodSettleCycle(cycle)) continue

    let windows
    if (useFixed) {
      windows = [
        {
          periodKey: yearMonth,
          periodStart: fixedStart,
          periodEnd: fixedEnd,
          label: `${yearMonth}（${fixedStart}~${fixedEnd}）`,
          settlementCycle: cycle,
        },
      ]
    } else {
      const winRes = resolvePeriodWindows(cycle, yearMonth, { halfParts })
      if (!winRes.ok) {
        if (cycle === '季结') messages.push(`${supplier.name}：${winRes.message}`)
        continue
      }
      windows = winRes.windows
    }

    for (const win of windows) {
      const lines = listSettleableLinesByPeriod({
        supplierId: supplier.id,
        supplierName: supplier.name,
        periodStart: win.periodStart,
        periodEnd: win.periodEnd,
      })
      const existing = findSettleBySupplierPeriod(supplier.id, supplier.name, win.periodKey)
      const totalAmount = round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))
      const key = `${supplier.id || supplier.name}:${win.periodKey}`
      groups.push({
        key,
        supplierId: supplier.id || '',
        supplier: supplier.name,
        settlementCycle: cycle,
        periodKey: win.periodKey,
        periodStart: win.periodStart,
        periodEnd: win.periodEnd,
        periodLabel: win.label,
        lineCount: lines.length,
        totalAmount,
        lineItems: lines,
        exists: !!existing,
        existingSettleNo: existing?.settleNo || '',
        existingStatus: existing?.status || '',
        skipByDefault: !!existing && !allowAppend,
        selectable: lines.length > 0 && (!existing || allowAppend),
      })
    }
  }

  return {
    ok: true,
    groups,
    message: messages.length ? messages.join('；') : '',
  }
}

/**
 * 按固定日期窗预览：一供应商一窗（不按结算周期再切分）
 * 用于结算规则「按入库」自动执行
 */
export function previewSettlesByFixedWindow(params = {}) {
  const {
    periodStart,
    periodEnd,
    periodKey,
    periodLabel,
    supplierIds,
    supplierNames,
    settlementCycles,
    allowAppend = false,
  } = params
  if (!periodStart || !periodEnd) {
    return { ok: false, message: '请指定扫描起止日期', groups: [] }
  }

  let suppliers = collectCandidateSuppliers(supplierIds, supplierNames)
  if (settlementCycles?.length) {
    const cycleSet = new Set(settlementCycles)
    suppliers = suppliers.filter((s) => cycleSet.has(resolveSupplierCycle(s.name, null, s)))
  }
  // 规则场景：若指定了供应商但无账期周期，仍允许纳入（按入库不强制周期）
  if (supplierIds?.length || supplierNames?.length) {
    const extra = []
    if (supplierIds?.length) {
      supplierIds.forEach((id) => {
        const s = getSupplierById(id)
        if (s && !suppliers.some((x) => x.id === s.id)) extra.push(s)
      })
    }
    if (supplierNames?.length) {
      supplierNames.forEach((name) => {
        const s = getSupplierByName(name)
        if (s && !suppliers.some((x) => x.name === s.name)) extra.push(s)
        else if (!s && !suppliers.some((x) => x.name === name)) {
          extra.push({ id: '', name, settlementCycle: '' })
        }
      })
    }
    suppliers = [...suppliers, ...extra]
  }

  // 无供应商筛选时：从窗内可结算入库/退货反推供应商（不强制账期周期）
  if (!supplierIds?.length && !supplierNames?.length) {
    const nameMap = new Map()
    inboundOrderState.orders.forEach((order) => {
      if (!order.purchaseOrderId) return
      if (!inboundDateInWindow(order, periodStart, periodEnd)) return
      const po = purchaseOrderState.orders.find((o) => o.id === order.purchaseOrderId)
      const name = po?.supplier || order.supplier
      if (!name) return
      if (nameMap.has(name)) return
      const s = getSupplierByName(name)
      nameMap.set(name, s || { id: '', name, settlementCycle: po?.settlementCycle || '' })
    })
    void purchaseReturnState.returns
    ;(purchaseReturnState.returns || []).forEach((ret) => {
      if (!isReturnEligibleForSettle(ret)) return
      if (!returnDateInWindow(ret, periodStart, periodEnd)) return
      const po =
        purchaseOrderState.orders.find((o) => o.id === ret.purchaseOrderId) ||
        purchaseOrderState.orders.find((o) => o.orderNo === ret.purchaseOrderNo)
      const name = po?.supplier || ret.supplier
      if (!name || nameMap.has(name)) return
      const s = getSupplierByName(name)
      nameMap.set(name, s || { id: '', name, settlementCycle: po?.settlementCycle || '' })
    })
    suppliers = [...nameMap.values()]
    if (settlementCycles?.length) {
      const cycleSet = new Set(settlementCycles)
      suppliers = suppliers.filter((s) =>
        cycleSet.has(resolveSupplierCycle(s.name, null, s) || s.settlementCycle),
      )
    }
  }

  if (!suppliers.length) return { ok: false, message: '扫描窗口内没有可结算供应商', groups: [] }

  const keyBase = periodKey || `fixed-${periodStart}_${periodEnd}`
  const groups = []
  for (const supplier of suppliers) {
    const cycle =
      resolveSupplierCycle(supplier.name, null, supplier) || supplier.settlementCycle || ''
    const lines = listSettleableLinesByPeriod({
      supplierId: supplier.id,
      supplierName: supplier.name,
      periodStart,
      periodEnd,
    })
    const winKey = `${keyBase}:${supplier.id || supplier.name}`
    const existing = findSettleBySupplierPeriod(supplier.id, supplier.name, winKey)
    const totalAmount = round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))
    groups.push({
      key: `${supplier.id || supplier.name}:${winKey}`,
      supplierId: supplier.id || '',
      supplier: supplier.name,
      settlementCycle: cycle,
      periodKey: winKey,
      periodStart,
      periodEnd,
      periodLabel: periodLabel || `${periodStart}~${periodEnd}`,
      lineCount: lines.length,
      totalAmount,
      lineItems: lines,
      exists: !!existing,
      existingSettleNo: existing?.settleNo || '',
      existingStatus: existing?.status || '',
      skipByDefault: !!existing && !allowAppend,
      selectable: lines.length > 0 && (!existing || allowAppend),
    })
  }

  return { ok: true, groups, message: '' }
}

function collectCandidateSuppliers(supplierIds, supplierNames) {
  let list = supplierState.suppliers.filter((s) => s.status !== '停用')

  if (supplierIds?.length) {
    const idSet = new Set(supplierIds)
    list = list.filter((s) => idSet.has(s.id))
  } else if (supplierNames?.length) {
    const nameSet = new Set(supplierNames)
    list = list.filter((s) => nameSet.has(s.name))
  } else {
    const names = new Set()
    inboundOrderState.orders.forEach((order) => {
      if (!order.purchaseOrderId) return
      const po = purchaseOrderState.orders.find((o) => o.id === order.purchaseOrderId)
      const name = po?.supplier || order.supplier
      if (name) names.add(name)
    })
    list = list.filter((s) => names.has(s.name))
    names.forEach((name) => {
      if (list.some((s) => s.name === name)) return
      const cycle = resolveSupplierCycle(name)
      if (isPeriodSettleCycle(cycle)) {
        list.push({ id: '', name, settlementCycle: cycle })
        return
      }
      const po = purchaseOrderState.orders.find((o) => o.supplier === name)
      const poCycle = po?.settlementCycle
      if (isPeriodSettleCycle(poCycle)) {
        list.push({ id: '', name, settlementCycle: poCycle })
      }
    })
  }

  return list.filter((s) => isPeriodSettleCycle(resolveSupplierCycle(s.name, null, s)))
}

/**
 * 根据预览勾选批量创建草稿结算单
 * @param {Array} selectedGroups preview 中的 group
 * @param {{ settleDate?: string, remark?: string, allowAppend?: boolean }} options
 */
export function createSettlesFromPeriod(selectedGroups = [], options = {}) {
  if (!selectedGroups.length) return { ok: false, message: '请至少勾选一组账期结算', settles: [] }

  const created = []
  const skipped = []

  for (const group of selectedGroups) {
    const existing = findSettleBySupplierPeriod(group.supplierId, group.supplier, group.periodKey)
    if (existing && !options.allowAppend) {
      skipped.push(`${group.supplier} / ${group.periodKey} 已有结算单「${existing.settleNo}」`)
      continue
    }

    const lines = (group.lineItems || []).filter((l) => hasSettlePreviewQty(l))
    if (!lines.length) {
      skipped.push(`${group.supplier} / ${group.periodKey} 无可结算明细`)
      continue
    }

    const lineItems = []
    for (const row of lines) {
      const built = buildSettleLineFromPreviewRow(row, { sourceType: 'inbound' })
      if (!built.ok) {
        return { ok: false, message: built.message, settles: created }
      }
      lineItems.push(built.line)
    }

    const poNos = [...new Set(lineItems.map((l) => l.purchaseOrderNo).filter(Boolean))]
    const settleDate = options.settleDate || dayjs().format('YYYY-MM-DD')
    const totalAmount = round2(lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0))
    const payMeta = resolvePaymentMeta(group.supplier, { settleDate, lineItems })
    const settle = createPurchaseSettle({
      id: `ps-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      settleNo: nextSettleNo(),
      status: PURCHASE_SETTLE_STATUS.DRAFT,
      generateMode: PURCHASE_SETTLE_GENERATE_MODE.PERIOD,
      purchaseOrderId: poNos.length === 1 ? lineItems[0].purchaseOrderId : '',
      purchaseOrderNo: poNos.length === 1 ? poNos[0] : poNos.length ? '多单' : '',
      purchaseOrderNos: poNos,
      supplierId: group.supplierId || '',
      supplier: group.supplier,
      settlementCycle: group.settlementCycle,
      periodKey: group.periodKey,
      periodStart: group.periodStart,
      periodEnd: group.periodEnd,
      settleDate,
      settleTarget: 'inbound',
      bookAmount: totalAmount,
      disputeAmount: 0,
      confirmedAmount: totalAmount,
      ...payMeta,
      remark:
        options.remark || `账期生成 ${group.periodKey}（${group.periodStart}~${group.periodEnd}）`,
      lineItems,
      totalAmount,
    })
    purchaseSettleState.settles.unshift(settle)
    notifyPoAccountStatus(settle)
    created.push(settle)
  }

  if (!created.length) {
    return {
      ok: false,
      message: skipped.length ? skipped.join('；') : '未生成任何结算单',
      settles: [],
      skipped,
    }
  }

  const msg = `已生成 ${created.length} 张结算单${skipped.length ? `；跳过：${skipped.join('；')}` : ''}`
  return { ok: true, settles: created, skipped, message: msg }
}

function getPoCompletedAt(po) {
  if (!po) return ''
  if (po.completedAt) return String(po.completedAt).slice(0, 10)
  if (po.status === '已完成' && po.updatedAt) return String(po.updatedAt).slice(0, 10)
  return ''
}

export function findSettleByPeriodKey(periodKey) {
  if (!periodKey) return null
  return purchaseSettleState.settles.find((s) => s.periodKey === periodKey) || null
}

/**
 * 按账期预览（按已完成采购单）：完成日落在期间窗内的采购单各一组
 * @param {{
 *   yearMonth: string,
 *   periodStart: string,
 *   periodEnd: string,
 *   supplierIds?: string[],
 *   allowAppend?: boolean
 * }} params
 */
export function previewPeriodSettlesByPurchaseOrder(params = {}) {
  const { yearMonth, periodStart, periodEnd, supplierIds, allowAppend = false } = params
  if (!yearMonth) return { ok: false, message: '请选择会计期间', groups: [] }
  if (!periodStart || !periodEnd) return { ok: false, message: '请选择期间起止', groups: [] }
  if (dayjs(periodStart).isAfter(dayjs(periodEnd), 'day')) {
    return { ok: false, message: '期间开始不能晚于结束', groups: [] }
  }

  const supplierIdSet = supplierIds?.length ? new Set(supplierIds) : null
  const groups = []

  purchaseOrderState.orders.forEach((po) => {
    if (po.status !== '已完成') return
    const completed = getPoCompletedAt(po)
    if (!completed) return
    if (completed < periodStart || completed > periodEnd) return

    const supplier = getSupplierByName(po.supplier)
    if (supplierIdSet) {
      if (!supplier || !supplierIdSet.has(supplier.id)) return
    } else {
      const cycle = resolveSupplierCycle(po.supplier, po, supplier)
      if (!isPeriodSettleCycle(cycle)) return
    }

    const lines = listSettleableLinesForPurchaseOrder(po.id)
    const periodKey = `${yearMonth}:po:${po.id}`
    const existing = findSettleByPeriodKey(periodKey)
    const totalAmount = round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))
    const cycle = resolveSupplierCycle(po.supplier, po, supplier)
    groups.push({
      key: periodKey,
      kind: 'po',
      purchaseOrderId: po.id,
      purchaseOrderNo: po.orderNo,
      supplierId: supplier?.id || '',
      supplier: po.supplier,
      settlementCycle: cycle,
      periodKey,
      periodStart,
      periodEnd,
      periodLabel: `${yearMonth}（完成日 ${completed}）`,
      createdAt: po.createdAt || '',
      completedAt: po.completedAt || completed,
      lineCount: lines.length,
      totalAmount,
      lineItems: lines,
      exists: !!existing,
      existingSettleNo: existing?.settleNo || '',
      existingStatus: existing?.status || '',
      skipByDefault: !!existing && !allowAppend,
      selectable: lines.length > 0 && (!existing || allowAppend),
    })
  })

  return { ok: true, groups, message: '' }
}

/**
 * 按账期勾选的采购单组批量生成对账单
 */
export function createSettlesFromPeriodPurchaseOrders(selectedGroups = [], options = {}) {
  if (!selectedGroups.length) {
    return { ok: false, message: '请至少勾选一张采购单', settles: [] }
  }

  const created = []
  const skipped = []

  for (const group of selectedGroups) {
    const existing = findSettleByPeriodKey(group.periodKey)
    if (existing && !options.allowAppend) {
      skipped.push(`${group.purchaseOrderNo || group.supplier} 已有对账单「${existing.settleNo}」`)
      continue
    }
    const lines = (group.lineItems || []).filter((l) => hasSettlePreviewQty(l))
    if (!lines.length) {
      skipped.push(`${group.purchaseOrderNo || group.supplier} 无可结算明细`)
      continue
    }
    const res = createSettleFromPurchaseOrder(group.purchaseOrderId, {
      settleDate: options.settleDate || dayjs().format('YYYY-MM-DD'),
      remark:
        options.remark ||
        `账期按采购单生成 ${group.periodKey}（${group.periodStart}~${group.periodEnd}）`,
      lineItems: lines,
    })
    if (!res.ok) {
      skipped.push(`${group.purchaseOrderNo}：${res.message}`)
      continue
    }
    res.settle.periodKey = group.periodKey
    res.settle.periodStart = group.periodStart
    res.settle.periodEnd = group.periodEnd
    res.settle.generateMode = PURCHASE_SETTLE_GENERATE_MODE.PERIOD
    res.settle.settleTarget = 'purchase_order'
    created.push(res.settle)
  }

  if (!created.length) {
    return {
      ok: false,
      message: skipped.length ? skipped.join('；') : '未生成任何对账单',
      settles: [],
      skipped,
    }
  }

  return {
    ok: true,
    settles: created,
    skipped,
    message: `已生成 ${created.length} 张对账单${skipped.length ? `；跳过：${skipped.join('；')}` : ''}`,
  }
}

/**
 * 预览行落库：入库正数 / 退货红冲
 * @param {{ sourceType?: 'inbound'|'purchase' }} opts 非退货行写入的 sourceType
 */
function buildSettleLineFromPreviewRow(row, opts = {}) {
  const qty = Number(row.settleQty) || 0
  if (!hasSettlePreviewQty(row)) {
    return { ok: false, message: '结算数量不能为 0' }
  }

  // 退货红冲
  if (row.sourceType === 'return' || row.returnOrderId) {
    if (!(qty < 0)) {
      return { ok: false, message: '退货对账数量须为负数' }
    }
    // eslint-disable-next-line global-require
    const { getPurchaseReturnById } = require('@/store/purchaseReturnStore')
    const ret = getPurchaseReturnById(row.returnOrderId)
    const rLine = (ret?.lineItems || []).find(
      (l) => l.id === (row.returnLineId || row.inboundLineId),
    )
    if (!ret || !rLine) {
      return { ok: false, message: '关联退货明细不存在' }
    }
    const remain = getEffectiveRemainReturnSettleQty(rLine, ret.id)
    if (Math.abs(qty) > remain + 1e-9) {
      return {
        ok: false,
        message: `退货「${rLine.productName || rLine.productCode}」可红冲数量不足（剩余 ${remain}）`,
      }
    }
    const unitPrice = Number(row.unitPrice) || 0
    return {
      ok: true,
      line: createPurchaseSettleLine({
        sourceType: 'return',
        returnOrderId: ret.id,
        returnOrderNo: ret.returnNo || row.returnOrderNo || '',
        returnLineId: rLine.id,
        outboundOrderId: row.outboundOrderId || ret.outboundOrderId || '',
        outboundDocNo: row.outboundDocNo || ret.outboundOrderNo || '',
        purchaseOrderId: row.purchaseOrderId || ret.purchaseOrderId || '',
        purchaseOrderNo: row.purchaseOrderNo || ret.purchaseOrderNo || '',
        poLineId: row.poLineId || rLine.poLineId || '',
        itemCode: rLine.productCode || rLine.itemCode || '',
        itemName: rLine.productName || rLine.itemName || '',
        specModel: rLine.specModel || '',
        material: rLine.material || '',
        settleUnit: row.settleUnit || rLine.unit || '',
        settleQty: qty,
        unitPrice,
        amount: round2(qty * unitPrice),
      }),
    }
  }

  // 入库正数
  if (!(qty > 0)) {
    return { ok: false, message: '入库结算数量须大于 0' }
  }
  const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
  const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
  if (!line) {
    return { ok: false, message: '入库明细不存在' }
  }
  const remain = getEffectiveRemainSettleQty(line, row.inboundOrderId)
  if (qty > remain + 1e-9) {
    return {
      ok: false,
      message: `「${line.itemName || line.itemCode}」可结算数量不足（剩余 ${remain}，含草稿占用）`,
    }
  }
  const unitPrice = Number(row.unitPrice) || 0
  const sourceType = opts.sourceType === 'purchase' ? 'purchase' : 'inbound'
  return {
    ok: true,
    line: createPurchaseSettleLine({
      sourceType,
      inboundOrderId: row.inboundOrderId,
      inboundDocNo: row.inboundDocNo || inbound.docNo,
      inboundLineId: row.inboundLineId,
      poLineId: row.poLineId || line.poLineId,
      purchaseOrderId: row.purchaseOrderId || '',
      purchaseOrderNo: row.purchaseOrderNo || '',
      itemCode: line.itemCode,
      itemName: line.itemName,
      specModel: line.specModel || '',
      material: line.material || '',
      settleUnit: row.settleUnit || line.settleUnit || line.unit || '',
      settleQty: qty,
      unitPrice,
      amount: round2(qty * unitPrice),
    }),
  }
}

export function createSettleFromPurchaseOrder(purchaseOrderId, payload = {}) {
  const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
  if (!po) return { ok: false, message: '采购单不存在' }
  if (po.status !== '已完成') {
    return {
      ok: false,
      message: po.status === '已终结' ? '已终结的采购单不进入对账' : '仅已完成的采购单可生成对账单',
    }
  }
  const selected = payload.lineItems || []
  if (!selected.length) return { ok: false, message: '请至少选择一行结算明细' }

  const supplier = getSupplierByName(po.supplier)
  const lineItems = []
  for (const row of selected) {
    const built = buildSettleLineFromPreviewRow(
      {
        ...row,
        purchaseOrderId: po.id,
        purchaseOrderNo: po.orderNo,
      },
      { sourceType: 'purchase' },
    )
    if (!built.ok) return { ok: false, message: built.message }
    // 非退货行强制挂本采购单
    if (built.line.sourceType !== 'return') {
      built.line.purchaseOrderId = po.id
      built.line.purchaseOrderNo = po.orderNo
      built.line.sourceType = 'purchase'
    }
    lineItems.push(built.line)
  }

  const settleDate = payload.settleDate || dayjs().format('YYYY-MM-DD')
  const totalAmount = round2(lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0))
  const payMeta = resolvePaymentMeta(po.supplier, { settleDate, lineItems })
  const settle = createPurchaseSettle({
    id: `ps-${Date.now()}`,
    settleNo: payload.settleNo || nextSettleNo(),
    status: PURCHASE_SETTLE_STATUS.DRAFT,
    generateMode: PURCHASE_SETTLE_GENERATE_MODE.PO,
    purchaseOrderId: po.id,
    purchaseOrderNo: po.orderNo,
    purchaseOrderNos: [po.orderNo],
    supplierId: supplier?.id || '',
    supplier: po.supplier,
    settlementCycle: resolveSupplierCycle(po.supplier, po),
    periodKey: payload.periodKey || '',
    periodStart: payload.periodStart || '',
    periodEnd: payload.periodEnd || '',
    settleDate,
    settleTarget: 'purchase_order',
    bookAmount: totalAmount,
    disputeAmount: 0,
    confirmedAmount: totalAmount,
    ...payMeta,
    remark: payload.remark || '',
    lineItems,
    totalAmount,
  })
  purchaseSettleState.settles.unshift(settle)
  notifyPoAccountStatus(settle)
  return { ok: true, settle, message: `已生成对账单「${settle.settleNo}」` }
}

/** 草稿 → 对账中 */
export function markPurchaseSettleReconciling(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (settle.status !== PURCHASE_SETTLE_STATUS.DRAFT) {
    return { ok: false, message: '仅草稿可标记为对账中' }
  }
  settle.status = PURCHASE_SETTLE_STATUS.RECONCILING
  settle.reconcilingAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  settle.reconciler = 'admin1'
  notifyPoAccountStatus(settle)
  return { ok: true, settle, message: '已标记为对账中' }
}

export function confirmPurchaseSettle(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '结算单不存在' }
  if (settle.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '结算单已确认' }
  }
  if (!isPurchaseSettlePreConfirm(settle.status)) {
    return { ok: false, message: '当前状态不可确认对账' }
  }
  // 争议挂起不阻断确认：确认金额 = 账面 − 行争议扣减；待处理争议可确认后继续核销
  syncSettleDisputeTotals(settle)
  for (const row of settle.lineItems || []) {
    if (row.sourceType === 'fee' || row.sourceType === 'adjust') continue
    const qty = Number(row.settleQty) || 0
    if (row.sourceType === 'return' || row.returnOrderId) {
      // eslint-disable-next-line global-require
      const { getPurchaseReturnById } = require('@/store/purchaseReturnStore')
      const ret = getPurchaseReturnById(row.returnOrderId)
      const rLine = (ret?.lineItems || []).find((l) => l.id === row.returnLineId)
      if (!ret || !rLine) return { ok: false, message: '关联退货明细不存在' }
      const remain = getEffectiveRemainReturnSettleQty(rLine, ret.id, settle.id)
      if (Math.abs(qty) > remain + 1e-9) {
        return {
          ok: false,
          message: `退货「${rLine.productName || rLine.productCode}」可红冲数量不足（剩余 ${remain}）`,
        }
      }
      continue
    }
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    if (!line) return { ok: false, message: '关联入库明细不存在' }
    // 确认本单时排除自身草稿占用
    const remain = getEffectiveRemainSettleQty(line, row.inboundOrderId, settle.id)
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」可结算数量不足（剩余 ${remain}，含其它草稿占用）`,
      }
    }
  }
  for (const row of settle.lineItems || []) {
    if (row.sourceType === 'fee' || row.sourceType === 'adjust') continue
    if (row.sourceType === 'return' || row.returnOrderId) {
      applyReturnSettledQty(row.returnOrderId, row.returnLineId, row.settleQty)
      continue
    }
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    if (!line) continue
    line.settledSettleQty = round2(
      (Number(line.settledSettleQty) || 0) + (Number(row.settleQty) || 0),
    )
  }
  settle.status = PURCHASE_SETTLE_STATUS.CONFIRMED
  settle.confirmer = 'admin1'
  settle.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  // 对账日起算：确认后重算计划付款日
  if ((settle.paymentTermStart || '对账日') === '对账日') {
    const payMeta = resolvePaymentMeta(settle.supplier, {
      settleDate: settle.settleDate,
      confirmedAt: settle.confirmedAt,
      lineItems: settle.lineItems,
    })
    settle.paymentTermDays = payMeta.paymentTermDays
    settle.plannedPaymentDate = payMeta.plannedPaymentDate
  }
  notifyPoAccountStatus(settle)
  return { ok: true, settle, message: '结算单已确认' }
}

/**
 * 确认后反确认：仅未开票且未付款时可纠错回草稿，并释放入库/退货占量
 */
export function unconfirmPurchaseSettle(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '结算单不存在' }
  if (settle.status !== PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '仅已确认对账单可反确认' }
  }
  if (settle.invoiceStatus === '已开票' || settle.invoiceStatus === '部分收票') {
    return { ok: false, message: '已收票不可反确认' }
  }
  if ((settle.invoiceRecords || []).length > 0) {
    return { ok: false, message: '已收票不可反确认' }
  }
  if (settle.paymentStatus === '已付款' || (Number(settle.paidAmount) || 0) > 0) {
    return { ok: false, message: '已登记付款不可反确认' }
  }

  for (const row of settle.lineItems || []) {
    if (row.sourceType === 'fee' || row.sourceType === 'adjust') continue
    if (row.sourceType === 'return' || row.returnOrderId) {
      releaseReturnSettledQty(row.returnOrderId, row.returnLineId, row.settleQty)
      continue
    }
    if (!row.inboundOrderId || !row.inboundLineId) continue
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    if (!line) continue
    line.settledSettleQty = round2(
      Math.max(0, (Number(line.settledSettleQty) || 0) - (Number(row.settleQty) || 0)),
    )
  }

  settle.status = PURCHASE_SETTLE_STATUS.DRAFT
  settle.confirmer = ''
  settle.confirmedAt = ''
  notifyPoAccountStatus(settle)
  return { ok: true, settle, message: '已反确认为草稿' }
}

export function deletePurchaseSettle(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '结算单不存在' }
  if (settle.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '已确认结算单不可删除' }
  }
  const snapshot = { ...settle, lineItems: [...(settle.lineItems || [])] }
  const idx = purchaseSettleState.settles.findIndex((s) => s.id === settleId)
  if (idx >= 0) purchaseSettleState.settles.splice(idx, 1)
  notifyPoAccountStatus(snapshot)
  return { ok: true, message: '已删除' }
}

const FEE_TYPE_OPTIONS = ['运费', '尾差', '调价补差', '其他费用']

function recalcSettleBookAmounts(settle) {
  if (!settle) return
  const total = round2((settle.lineItems || []).reduce((s, l) => s + (Number(l.amount) || 0), 0))
  settle.totalAmount = total
  settle.bookAmount = total
  syncSettleDisputeTotals(settle)
}

/**
 * 草稿：追加补差/费用行（运费、尾差、调价补差等）
 * @param {{ feeType?: string, itemName?: string, amount: number, remark?: string }} payload
 */
export function addPurchaseSettleFeeLine(settleId, payload = {}) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (!isPurchaseSettlePreConfirm(settle.status)) {
    return { ok: false, message: '仅草稿或对账中可追加费用/补差行' }
  }
  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || Math.abs(amount) < 1e-9) {
    return { ok: false, message: '请填写非零金额（可为负）' }
  }
  const feeType = String(payload.feeType || '其他费用').trim() || '其他费用'
  const itemName = String(payload.itemName || feeType).trim() || feeType
  const line = createPurchaseSettleLine({
    sourceType: 'fee',
    feeType,
    itemCode: 'FEE',
    itemName,
    settleUnit: '项',
    settleQty: 1,
    unitPrice: amount,
    amount: round2(amount),
    purchaseOrderNo: settle.purchaseOrderNo || '',
    purchaseOrderId: settle.purchaseOrderId || '',
    disputeRemark: '',
    remark: String(payload.remark || '').trim(),
  })
  if (!settle.lineItems) settle.lineItems = []
  settle.lineItems.push(line)
  recalcSettleBookAmounts(settle)
  return { ok: true, settle, line, message: '已追加费用/补差行' }
}

/** 草稿：删除费用/补差行 */
export function removePurchaseSettleFeeLine(settleId, lineId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (!isPurchaseSettlePreConfirm(settle.status)) {
    return { ok: false, message: '仅草稿或对账中可删除费用行' }
  }
  const idx = (settle.lineItems || []).findIndex((l) => l.id === lineId)
  if (idx < 0) return { ok: false, message: '明细不存在' }
  const line = settle.lineItems[idx]
  if (line.sourceType !== 'fee' && line.sourceType !== 'adjust') {
    return { ok: false, message: '仅可删除费用/补差行' }
  }
  if (line.disputeStatus === 'open' || line.disputeStatus === 'resolved') {
    return { ok: false, message: '该行已挂争议，请先处理后再删' }
  }
  settle.lineItems.splice(idx, 1)
  recalcSettleBookAmounts(settle)
  return { ok: true, settle, message: '已删除费用行' }
}

export { FEE_TYPE_OPTIONS }

function settleConfirmAmount(settle) {
  if (!settle) return 0
  if (settle.confirmedAmount != null && settle.confirmedAmount !== '') {
    return Number(settle.confirmedAmount) || 0
  }
  const book =
    settle.bookAmount != null && settle.bookAmount !== ''
      ? Number(settle.bookAmount) || 0
      : Number(settle.totalAmount) || 0
  // 无显式确认额时按行有效额汇总（对方主张模型）
  const fromLines = (settle.lineItems || []).reduce((s, l) => s + getLineEffectiveAmount(l), 0)
  if ((settle.lineItems || []).length) return round2(fromLines)
  return round2(book)
}

function settleOpeningRemain(settle) {
  if (!settle) return 0
  if (settle.openingBalance == null || settle.openingBalance === '') return 0
  const opening = Number(settle.openingBalance) || 0
  const paid = Number(settle.openingPaidAmount) || 0
  return Math.max(0, round2(opening - paid))
}

function settlePeriodRemain(settle) {
  if (!settle || settle.status !== PURCHASE_SETTLE_STATUS.CONFIRMED) return 0
  const due = settleConfirmAmount(settle)
  const paid = Number(settle.paidAmount) || 0
  return Math.max(0, round2(due - paid))
}

/** 兼容旧单字段：无 invoiceRecords 时从 invoiceNo 迁移 */
export function ensureSettleInvoiceRecords(settle) {
  if (!settle) return []
  if (!Array.isArray(settle.invoiceRecords)) settle.invoiceRecords = []
  if (
    !settle.invoiceRecords.length &&
    settle.invoiceNo &&
    (settle.invoiceStatus === '已开票' || settle.invoiceStatus === '部分收票')
  ) {
    settle.invoiceRecords.push({
      id: `inv-legacy-${settle.id}`,
      invoiceNo: settle.invoiceNo,
      invoiceDate: settle.invoiceDate || '',
      invoiceAmount:
        settle.invoiceAmount != null && settle.invoiceAmount !== ''
          ? round2(Number(settle.invoiceAmount) || 0)
          : settleConfirmAmount(settle),
      invoiceTaxAmount:
        settle.invoiceTaxAmount != null && settle.invoiceTaxAmount !== ''
          ? round2(Number(settle.invoiceTaxAmount) || 0)
          : null,
      invoiceRemark: settle.invoiceRemark || '',
      invoicer: settle.invoicer || 'admin1',
      invoicedAt: settle.invoicedAt || settle.invoiceDate || '',
    })
  }
  return settle.invoiceRecords
}

/** 累计已收票面（含税） */
export function settleInvoicedTotal(settle) {
  if (!settle) return 0
  const records = ensureSettleInvoiceRecords(settle)
  if (records.length) {
    return round2(records.reduce((s, r) => s + (Number(r.invoiceAmount) || 0), 0))
  }
  if (settle.invoiceAmount != null && settle.invoiceAmount !== '') {
    return round2(Number(settle.invoiceAmount) || 0)
  }
  return 0
}

/** 还可收票额 = 确认额 − 已收票面 */
export function settleInvoiceRemainToReceive(settle) {
  if (!settle) return 0
  return Math.max(0, round2(settleConfirmAmount(settle) - settleInvoicedTotal(settle)))
}

/** 累计票面 − 本期已付（仅展示用，不限制付款） */
export function settleInvoicePayableRemain(settle) {
  if (!settle) return null
  const invoiced = settleInvoicedTotal(settle)
  if (invoiced <= 1e-9 && !(ensureSettleInvoiceRecords(settle).length > 0)) return null
  const paid = Number(settle.paidAmount) || 0
  return round2(invoiced - paid)
}

function syncSettleInvoiceSummary(settle) {
  if (!settle) return
  const records = ensureSettleInvoiceRecords(settle)
  const total = settleInvoicedTotal(settle)
  const due = settleConfirmAmount(settle)
  if (!records.length && total <= 1e-9) {
    settle.invoiceStatus = ''
    return
  }
  settle.invoiceStatus = total + 1e-9 >= due ? '已开票' : '部分收票'
  const latest = records[0] || records[records.length - 1]
  const byTime = [...records].sort((a, b) =>
    String(b.invoicedAt || b.invoiceDate || '').localeCompare(
      String(a.invoicedAt || a.invoiceDate || ''),
    ),
  )
  const head = byTime[0] || latest
  settle.invoiceNo = records
    .map((r) => r.invoiceNo)
    .filter(Boolean)
    .join('、')
  settle.invoiceAmount = total
  settle.invoiceTaxAmount = round2(
    records.reduce((s, r) => s + (Number(r.invoiceTaxAmount) || 0), 0),
  )
  settle.invoiceDate = head?.invoiceDate || ''
  settle.invoicer = head?.invoicer || settle.invoicer || ''
  settle.invoicedAt = head?.invoicedAt || settle.invoicedAt || ''
  settle.invoiceRemark = head?.invoiceRemark || settle.invoiceRemark || ''
}

function syncSettlePaymentStatus(settle) {
  if (!settle || settle.status !== PURCHASE_SETTLE_STATUS.CONFIRMED) return
  const openRem = settleOpeningRemain(settle)
  const periodRem = settlePeriodRemain(settle)
  const paidAny =
    (Number(settle.paidAmount) || 0) > 0 || (Number(settle.openingPaidAmount) || 0) > 0
  if (openRem <= 1e-9 && periodRem <= 1e-9) {
    settle.paymentStatus = '已付款'
  } else if (paidAny) {
    settle.paymentStatus = '部分付款'
  } else {
    settle.paymentStatus = ''
  }
}

/**
 * 资金概览口径（应付）：
 * 期末 = 期初 + 本期应付 − 期初已付 − 本期已付
 * - 期初：单据 openingBalance；未填时用同供应商「本单之前已确认且未付清」的应付余额估算
 * - 本期应付：本单确认金额
 * - 本期已付：本单 paidAmount（冲本期确认额）
 * - 期初已付：openingPaidAmount（账龄付款可先冲期初）
 */
export function resolveSettleFundOverview(settle) {
  if (!settle) {
    return {
      openingBalance: 0,
      openingPaid: 0,
      openingRemain: 0,
      periodPayable: 0,
      periodPaid: 0,
      endingBalance: 0,
    }
  }
  let opening = settle.openingBalance
  if (opening == null || opening === '') {
    const created = settle.createdAt || ''
    opening = purchaseSettleState.settles.reduce((sum, s) => {
      if (s.id === settle.id) return sum
      if (s.status !== PURCHASE_SETTLE_STATUS.CONFIRMED) return sum
      const sameSupplier =
        (settle.supplierId && s.supplierId && s.supplierId === settle.supplierId) ||
        s.supplier === settle.supplier
      if (!sameSupplier) return sum
      if (created && s.createdAt && String(s.createdAt) >= String(created)) return sum
      const due = settleConfirmAmount(s)
      const paid = Number(s.paidAmount) || 0
      const openRem = settleOpeningRemain(s)
      return sum + Math.max(0, round2(due - paid)) + openRem
    }, 0)
  } else {
    opening = Number(opening) || 0
  }
  const openingPaid = Number(settle.openingPaidAmount) || 0
  const periodPayable = settleConfirmAmount(settle)
  const periodPaid = Number(settle.paidAmount) || 0
  return {
    openingBalance: round2(opening),
    openingPaid: round2(openingPaid),
    openingRemain: round2(Math.max(0, opening - openingPaid)),
    periodPayable: round2(periodPayable),
    periodPaid: round2(periodPaid),
    endingBalance: round2(opening + periodPayable - openingPaid - periodPaid),
  }
}

/** 按明细行争议汇总整单确认额 / 调整额 */
export function syncSettleDisputeTotals(settle) {
  if (!settle) return settle
  const book =
    settle.bookAmount != null && settle.bookAmount !== ''
      ? Number(settle.bookAmount) || 0
      : Number(settle.totalAmount) || 0
  const confirmed = round2(
    (settle.lineItems || []).reduce((s, l) => s + getLineEffectiveAmount(l), 0),
  )
  const adjust = round2(confirmed - book)
  const openCount = (settle.lineItems || []).filter(
    (l) => l.disputeStatus === PURCHASE_SETTLE_LINE_DISPUTE_STATUS.OPEN,
  ).length
  // disputeAmount：账面相对确认额的净减少（正=少认；负=多认）；兼容旧展示
  settle.disputeAmount = round2(book - confirmed)
  settle.confirmedAmount = confirmed
  settle.disputeAdjustAmount = adjust
  settle.disputeRemark =
    openCount > 0
      ? `有 ${openCount} 行待处理争议`
      : adjust !== 0
        ? '争议已处理，确认金额已按结论调整'
        : ''
  ;(settle.lineItems || []).forEach((l) => {
    if (!l.disputeStatus) return
    // 行上 disputeAmount：挂出金额（差额=|差|，整笔=|账面|）
    l.disputeAmount = getLineHangAmount(l)
  })
  return settle
}

/**
 * 草稿·行级登记争议
 * @param {{ lineId: string, scope?: 'diff'|'full', claimAmount?: number, disputeRemark?: string, diffType?: string }} payload
 */
export function registerPurchaseSettleLineDispute(settleId, payload = {}) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (!isPurchaseSettlePreConfirm(settle.status)) {
    return { ok: false, message: '仅草稿或对账中可登记争议；确认后争议只读' }
  }
  const line = (settle.lineItems || []).find((l) => l.id === payload.lineId)
  if (!line) return { ok: false, message: '结算明细不存在' }
  if (line.disputeStatus === PURCHASE_SETTLE_LINE_DISPUTE_STATUS.RESOLVED) {
    return { ok: false, message: '该行争议已闭环，不可再登记；如需改结论请先说明后重新处理' }
  }

  const scope =
    payload.scope === PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL || payload.scope === 'full'
      ? PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL
      : PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.DIFF
  const book = getLineBookAmount(line)
  const claimRaw = payload.claimAmount != null ? payload.claimAmount : payload.disputeClaimAmount

  if (scope === PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.DIFF) {
    if (claimRaw == null || claimRaw === '') {
      return { ok: false, message: '差额争议请填写对方主张金额' }
    }
    const claim = roundDispute(claimRaw)
    if (Math.abs(claim - book) < 1e-9) {
      return { ok: false, message: '对方主张与本行账面相同，无需登记争议' }
    }
    line.disputeClaimAmount = claim
  } else {
    // 整笔：主张可选（谈拢时再定）；未填则清空
    if (claimRaw != null && claimRaw !== '') {
      line.disputeClaimAmount = roundDispute(claimRaw)
    } else {
      line.disputeClaimAmount = null
    }
  }

  line.disputeScope = scope
  line.disputeDiffType = String(payload.diffType || '价差').trim() || '价差'
  line.disputeAgreedAmount = null
  line.disputeRemark = String(payload.disputeRemark || '').trim()
  line.disputeStatus = PURCHASE_SETTLE_LINE_DISPUTE_STATUS.OPEN
  line.disputeResult = ''
  line.disputeResolutionRemark = ''
  line.disputeResolvedAt = ''
  syncSettleDisputeTotals(settle)
  try {
    // eslint-disable-next-line global-require
    const { upsertAccrualFromSettleLine } = require('@/store/purchaseDisputeAccrualStore')
    upsertAccrualFromSettleLine(settle, line, { diffType: line.disputeDiffType })
  } catch {
    /* ignore */
  }
  const tip =
    scope === PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL
      ? '已登记整笔争议：本行暂不计入确认应付'
      : '已登记差额争议并挂账（确认额仍按账面）'
  return { ok: true, settle, line, message: tip }
}

/**
 * 处理行争议闭环（可在确认前/后）
 * - ours / cancelled：按本行账面
 * - theirs：按对方主张
 * - split：按谈妥金额（payload.agreedAmount）
 */
export function resolvePurchaseSettleLineDispute(settleId, payload = {}) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (
    !isPurchaseSettlePreConfirm(settle.status) &&
    settle.status !== PURCHASE_SETTLE_STATUS.CONFIRMED
  ) {
    return { ok: false, message: '当前状态不可处理争议' }
  }
  const line = (settle.lineItems || []).find((l) => l.id === payload.lineId)
  if (!line) return { ok: false, message: '结算明细不存在' }
  if (line.disputeStatus !== PURCHASE_SETTLE_LINE_DISPUTE_STATUS.OPEN) {
    return { ok: false, message: '仅「待处理」争议可闭环' }
  }
  const result = payload.result
  const remark = String(payload.resolutionRemark || '').trim()
  if (!remark) return { ok: false, message: '请填写处理结论说明' }

  if (result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.OURS) {
    line.disputeAgreedAmount = null
  } else if (result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.THEIRS) {
    if (line.disputeClaimAmount == null || line.disputeClaimAmount === '') {
      return { ok: false, message: '采纳对方前请先登记对方主张金额（可改争议补填）' }
    }
    line.disputeAgreedAmount = null
  } else if (result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.CANCELLED) {
    line.disputeAgreedAmount = null
  } else if (result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.SPLIT) {
    const agreedRaw =
      payload.agreedAmount != null ? payload.agreedAmount : payload.finalDisputeAmount
    if (agreedRaw == null || agreedRaw === '') {
      return { ok: false, message: '请填写折中谈妥金额' }
    }
    line.disputeAgreedAmount = roundDispute(agreedRaw)
  } else {
    return { ok: false, message: '请选择处理结论' }
  }

  line.disputeStatus = PURCHASE_SETTLE_LINE_DISPUTE_STATUS.RESOLVED
  line.disputeResult = result
  line.disputeResolutionRemark = remark
  line.disputeResolvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  syncSettleDisputeTotals(settle)
  try {
    // eslint-disable-next-line global-require
    const { closeAccrualFromSettleLine } = require('@/store/purchaseDisputeAccrualStore')
    closeAccrualFromSettleLine(settle, line, { result, resolutionRemark: remark })
  } catch {
    /* ignore */
  }
  return { ok: true, settle, line, message: '争议已闭环' }
}

/** @deprecated 整单争议已废弃，保留兼容调用 → 请用行级 API */
export function updatePurchaseSettleDispute(settleId) {
  return {
    ok: false,
    message: '请改为在结算明细行上登记/处理争议',
    settle: getPurchaseSettleById(settleId),
  }
}

/** 已确认对账单：追加一笔收票（支持分次；累计满确认额为已开票） */
export function registerPurchaseSettleInvoice(settleId, payload = {}) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (settle.status !== PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '请先确认对账后再收票' }
  }
  ensureSettleInvoiceRecords(settle)
  const remain = settleInvoiceRemainToReceive(settle)
  if (remain <= 1e-9) {
    return { ok: false, message: '票面已收齐，无需再登记' }
  }
  const invoiceDate = String(payload.invoiceDate || '').trim()
  if (!invoiceDate) return { ok: false, message: '请填写开票日期' }
  const invoiceNo = String(payload.invoiceNo || '').trim()
  if (!invoiceNo) return { ok: false, message: '请填写发票号码' }
  const dup = settle.invoiceRecords.some((r) => r.invoiceNo === invoiceNo)
  if (dup) return { ok: false, message: '该发票号码已登记' }

  let amount =
    payload.invoiceAmount != null && payload.invoiceAmount !== ''
      ? round2(Number(payload.invoiceAmount) || 0)
      : remain
  if (!(amount > 0)) return { ok: false, message: '票面金额须大于 0' }
  if (amount > remain + 1e-9) {
    return { ok: false, message: `本次票面不能超过未收票余额（¥ ${remain}）` }
  }
  const taxRate = payload.taxRate != null && payload.taxRate !== '' ? Number(payload.taxRate) : null
  const tax =
    payload.invoiceTaxAmount != null && payload.invoiceTaxAmount !== ''
      ? round2(Number(payload.invoiceTaxAmount) || 0)
      : null
  const invoicedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  settle.invoiceRecords.unshift({
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    invoiceNo,
    invoiceDate,
    invoiceAmount: amount,
    taxRate: Number.isFinite(taxRate) ? taxRate : null,
    invoiceTaxAmount: tax,
    invoiceRemark: String(payload.invoiceRemark || '').trim(),
    invoicer: 'admin1',
    invoicedAt,
  })
  syncSettleInvoiceSummary(settle)

  if ((settle.paymentTermStart || '对账日') === '开票日') {
    const earliest = [...settle.invoiceRecords]
      .map((r) => String(r.invoiceDate || '').slice(0, 10))
      .filter(Boolean)
      .sort()[0]
    const payMeta = resolvePaymentMeta(settle.supplier, {
      settleDate: settle.settleDate,
      confirmedAt: settle.confirmedAt,
      invoiceDate: earliest || invoiceDate,
      lineItems: settle.lineItems,
    })
    settle.paymentTermDays = payMeta.paymentTermDays
    settle.plannedPaymentDate = payMeta.plannedPaymentDate
  }

  return {
    ok: true,
    settle,
    message:
      settle.invoiceStatus === '已开票'
        ? '收票登记成功，票面已收齐'
        : `收票登记成功（部分收票，未收票余额 ¥ ${settleInvoiceRemainToReceive(settle)}）`,
  }
}

function settleAgingSortKey(settle) {
  return (
    String(settle.plannedPaymentDate || '').slice(0, 10) ||
    String(settle.settleDate || '').slice(0, 10) ||
    String(settle.confirmedAt || '').slice(0, 10) ||
    String(settle.createdAt || '')
  )
}

function sameSettleSupplier(a, b) {
  if (!a || !b) return false
  if (a.supplierId && b.supplierId && a.supplierId === b.supplierId) return true
  return Boolean(a.supplier && b.supplier && a.supplier === b.supplier)
}

/** 本期确认额未付（不含手工期初） */
function settleUnpaidRemain(settle) {
  return settlePeriodRemain(settle)
}

/**
 * 同供应商已确认且本期仍有未付的对账单（账龄排序）
 */
export function listAgingUnpaidSettles(supplierId, supplierName) {
  return purchaseSettleState.settles
    .filter((s) => {
      if (s.status !== PURCHASE_SETTLE_STATUS.CONFIRMED) return false
      const same =
        (supplierId && s.supplierId && s.supplierId === supplierId) ||
        (supplierName && s.supplier === supplierName)
      if (!same) return false
      return settlePeriodRemain(s) > 1e-9
    })
    .sort((a, b) => settleAgingSortKey(a).localeCompare(settleAgingSortKey(b)))
}

function pushAllocQueueItem(queue, item) {
  if (!(item.remainBefore > 0)) return
  queue.push(item)
}

/**
 * 付款分配预览
 * @param {{ entrySettleId: string, payAmount: number, mode?: 'aging'|'current'|'currentFirst' }}
 * - aging：先冲本单手工期初，再按账龄冲各单本期未付
 * - current：只冲本单本期确认未付
 * - currentFirst：先付清本单（期初+本期），剩余再按账龄冲其他账单
 * 预览始终带出整条可冲抵队列；金额不足时后续行本次分配为 0，不消失
 */
export function previewAgingPaymentAllocation({
  entrySettleId,
  supplierId,
  supplierName,
  payAmount,
  mode = 'aging',
} = {}) {
  const entry =
    (entrySettleId && getPurchaseSettleById(entrySettleId)) ||
    purchaseSettleState.settles.find(
      (s) =>
        (supplierId && s.supplierId === supplierId) ||
        (supplierName && s.supplier === supplierName),
    )
  const pay = Number(payAmount)
  const allocMode = mode === 'current' || mode === 'currentFirst' ? mode : 'aging'

  if (!entry) {
    return { ok: false, message: '对账单不存在', totalUnpaid: 0, allocations: [], mode: allocMode }
  }

  const queue = []
  const openRem = settleOpeningRemain(entry)
  const entryPeriodRem = settlePeriodRemain(entry)

  if (allocMode === 'current') {
    pushAllocQueueItem(queue, {
      type: 'period',
      settleId: entry.id,
      settleNo: entry.settleNo,
      targetLabel: '本期确认',
      periodKey: entry.periodKey || '',
      remainBefore: entryPeriodRem,
    })
  } else if (allocMode === 'currentFirst') {
    pushAllocQueueItem(queue, {
      type: 'opening',
      settleId: entry.id,
      settleNo: entry.settleNo,
      targetLabel: '期初余额',
      periodKey: entry.periodKey || '',
      remainBefore: openRem,
    })
    pushAllocQueueItem(queue, {
      type: 'period',
      settleId: entry.id,
      settleNo: entry.settleNo,
      targetLabel: '本期确认',
      periodKey: entry.periodKey || '',
      remainBefore: entryPeriodRem,
    })
    listAgingUnpaidSettles(entry.supplierId, entry.supplier).forEach((s) => {
      if (s.id === entry.id) return
      pushAllocQueueItem(queue, {
        type: 'period',
        settleId: s.id,
        settleNo: s.settleNo,
        targetLabel: '历史账单',
        periodKey: s.periodKey || '',
        remainBefore: settlePeriodRemain(s),
      })
    })
  } else {
    // aging：先期初，再全供应商本期未付按账龄
    pushAllocQueueItem(queue, {
      type: 'opening',
      settleId: entry.id,
      settleNo: entry.settleNo,
      targetLabel: '期初余额',
      periodKey: entry.periodKey || '',
      remainBefore: openRem,
    })
    listAgingUnpaidSettles(entry.supplierId, entry.supplier).forEach((s) => {
      pushAllocQueueItem(queue, {
        type: 'period',
        settleId: s.id,
        settleNo: s.settleNo,
        targetLabel: s.id === entry.id ? '本期确认' : '历史账单',
        periodKey: s.periodKey || '',
        remainBefore: settlePeriodRemain(s),
      })
    })
  }

  const totalUnpaid = round2(queue.reduce((s, row) => s + row.remainBefore, 0))
  const safePay = Number.isFinite(pay) && pay > 0 ? pay : 0
  let left = safePay
  const allocations = queue.map((item) => {
    const apply = left > 1e-9 ? round2(Math.min(item.remainBefore, left)) : 0
    if (apply > 0) left = round2(left - apply)
    return {
      ...item,
      applyAmount: apply,
      remainAfter: round2(item.remainBefore - apply),
    }
  })

  if (!(pay > 0)) {
    return {
      ok: false,
      message: '付款金额须大于 0',
      totalUnpaid,
      allocations,
      mode: allocMode,
    }
  }
  if (pay > totalUnpaid + 1e-9) {
    return {
      ok: false,
      message:
        allocMode === 'current'
          ? `只付本单时不能超过本单本期未付（¥ ${totalUnpaid}）`
          : `付款不能超过可冲抵合计（¥ ${totalUnpaid}）`,
      totalUnpaid,
      allocations,
      mode: allocMode,
    }
  }
  return {
    ok: true,
    totalUnpaid,
    allocations,
    unallocated: left,
    mode: allocMode,
  }
}

function pushPaymentRecord(
  settle,
  { amount, paidAt, paidBy, remark, batchId, targetType, entrySettleId, entrySettleNo },
) {
  if (!Array.isArray(settle.paymentRecords)) settle.paymentRecords = []
  settle.paymentRecords.unshift({
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    batchId: batchId || '',
    amount,
    targetType: targetType || 'period',
    targetSettleId: settle.id,
    targetSettleNo: settle.settleNo || '',
    entrySettleId: entrySettleId || settle.id,
    entrySettleNo: entrySettleNo || settle.settleNo || '',
    paidAt,
    paidBy,
    remark,
  })
  settle.lastPaidAt = paidAt
  settle.lastPaidBy = paidBy
  settle.lastPaidRemark = remark
}

function applyOpeningPayment(settle, applyAmount, meta) {
  settle.openingPaidAmount = round2((Number(settle.openingPaidAmount) || 0) + applyAmount)
  pushPaymentRecord(settle, { ...meta, amount: applyAmount, targetType: 'opening' })
  syncSettlePaymentStatus(settle)
}

function applyPeriodPayment(settle, applyAmount, meta) {
  settle.paidAmount = round2((Number(settle.paidAmount) || 0) + applyAmount)
  pushPaymentRecord(settle, { ...meta, amount: applyAmount, targetType: 'period' })
  syncSettlePaymentStatus(settle)
}

/**
 * 登记付款
 * @param payload.allocateMode 'aging' | 'current' | 'currentFirst'
 * @param payload.allocateByAging 兼容旧参数：false→current，true→aging
 */
export function registerPurchaseSettlePayment(settleId, payload = {}) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (settle.status !== PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '请先确认对账' }
  }
  const pay = Number(payload.payAmount)
  if (!(pay > 0)) return { ok: false, message: '付款金额须大于 0' }

  let mode = payload.allocateMode
  if (!mode) mode = payload.allocateByAging === false ? 'current' : 'aging'
  if (mode !== 'current' && mode !== 'currentFirst') mode = 'aging'

  const paidAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const paidBy = 'admin1'
  const remark = String(payload.remark || '').trim()
  const batchId = `pay-batch-${Date.now()}`

  const preview = previewAgingPaymentAllocation({
    entrySettleId: settleId,
    payAmount: pay,
    mode,
  })
  if (!preview.ok) return { ok: false, message: preview.message, totalUnpaid: preview.totalUnpaid }

  const meta = {
    paidAt,
    paidBy,
    remark,
    batchId,
    entrySettleId: settle.id,
    entrySettleNo: settle.settleNo || '',
  }
  preview.allocations.forEach((row) => {
    if (!(row.applyAmount > 0)) return
    const target = getPurchaseSettleById(row.settleId)
    if (!target) return
    if (row.type === 'opening') applyOpeningPayment(target, row.applyAmount, meta)
    else applyPeriodPayment(target, row.applyAmount, meta)
  })

  const appliedRows = preview.allocations.filter((a) => a.applyAmount > 0)
  const cleared = appliedRows.filter((a) => a.remainAfter <= 1e-9).length
  const latest = getPurchaseSettleById(settleId)
  return {
    ok: true,
    settle: latest,
    allocations: preview.allocations,
    message:
      appliedRows.length > 1
        ? `已分配 ${appliedRows.length} 笔（其中 ${cleared} 笔已冲清）`
        : latest.paymentStatus === '已付款'
          ? '已登记付款，本单已付清'
          : '已登记付款',
  }
}

/** 更新对账单期初（上线切账 / 与系统滚动差额调整）；留空则恢复自动汇总 */
export function updatePurchaseSettleOpeningBalance(settleId, openingBalance) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '对账单不存在' }
  if (
    settle.status !== PURCHASE_SETTLE_STATUS.DRAFT &&
    settle.status !== PURCHASE_SETTLE_STATUS.RECONCILING
  ) {
    return { ok: false, message: '仅草稿或对账中可维护期初' }
  }
  if (openingBalance === '' || openingBalance == null) {
    settle.openingBalance = null
    return { ok: true, settle, message: '已恢复为系统自动汇总期初' }
  }
  const n = Number(openingBalance)
  if (!Number.isFinite(n)) return { ok: false, message: '期初金额无效' }
  settle.openingBalance = round2(n)
  return { ok: true, settle, message: '期初已更新' }
}

export { settleUnpaidRemain, settleOpeningRemain, settlePeriodRemain, sameSettleSupplier }

/**
 * 某对账单相关的付款批次（含同批次冲往期/他单的分配明细）
 * - 本单作为登记入口，或本单被冲抵，都会出现
 * - 按批次汇总：本次实付合计 + 各对账单分配行
 */
export function listSettlePaymentBatches(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return []

  const localRecords = Array.isArray(settle.paymentRecords) ? settle.paymentRecords : []
  const batchIds = new Set()
  const orphanKeys = []

  localRecords.forEach((r) => {
    if (r.batchId) batchIds.add(r.batchId)
    else orphanKeys.push(r.id)
  })

  // 本单作为登记入口、但本单金额为 0 的极端情况：仍按 entrySettleId 捞批次
  purchaseSettleState.settles.forEach((s) => {
    ;(s.paymentRecords || []).forEach((r) => {
      if (r.entrySettleId === settleId && r.batchId) batchIds.add(r.batchId)
    })
  })

  const batches = []

  batchIds.forEach((batchId) => {
    const allocations = []
    purchaseSettleState.settles.forEach((s) => {
      ;(s.paymentRecords || []).forEach((r) => {
        if (r.batchId !== batchId) return
        allocations.push({
          id: r.id,
          settleId: s.id,
          settleNo: r.targetSettleNo || s.settleNo || '',
          targetType: r.targetType || 'period',
          amount: Number(r.amount) || 0,
          isCurrent: s.id === settleId,
          paidAt: r.paidAt,
          paidBy: r.paidBy,
          remark: r.remark || '',
          entrySettleId: r.entrySettleId || '',
          entrySettleNo: r.entrySettleNo || '',
        })
      })
    })
    if (!allocations.length) return
    allocations.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
      if (a.targetType !== b.targetType) return a.targetType === 'opening' ? -1 : 1
      return String(a.settleNo).localeCompare(String(b.settleNo))
    })
    const head = allocations[0]
    const entrySettleId = head.entrySettleId || settleId
    batches.push({
      id: batchId,
      batchId,
      paidAt: head.paidAt || '',
      paidBy: head.paidBy || '',
      remark: head.remark || '',
      totalAmount: round2(allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0)),
      currentAmount: round2(
        allocations.filter((a) => a.isCurrent).reduce((s, a) => s + (Number(a.amount) || 0), 0),
      ),
      relatedAmount: round2(
        allocations.filter((a) => !a.isCurrent).reduce((s, a) => s + (Number(a.amount) || 0), 0),
      ),
      entrySettleId,
      entrySettleNo: head.entrySettleNo || '',
      isEntry: entrySettleId === settleId,
      allocations,
    })
  })

  // 无 batchId 的历史单行
  orphanKeys.forEach((rid) => {
    const r = localRecords.find((x) => x.id === rid)
    if (!r) return
    batches.push({
      id: rid,
      batchId: '',
      paidAt: r.paidAt || '',
      paidBy: r.paidBy || '',
      remark: r.remark || '',
      totalAmount: Number(r.amount) || 0,
      currentAmount: Number(r.amount) || 0,
      relatedAmount: 0,
      entrySettleId: settleId,
      entrySettleNo: settle.settleNo || '',
      isEntry: true,
      allocations: [
        {
          id: r.id,
          settleId,
          settleNo: settle.settleNo || '',
          targetType: r.targetType || 'period',
          amount: Number(r.amount) || 0,
          isCurrent: true,
          paidAt: r.paidAt,
          paidBy: r.paidBy,
          remark: r.remark || '',
          entrySettleId: settleId,
          entrySettleNo: settle.settleNo || '',
        },
      ],
    })
  })

  return batches.sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')))
}

/** 对账单费用/补差行金额合计（计入账面的追加额度） */
export function calcSettleFeeAdjustAmount(settle) {
  if (!settle) return 0
  return round2(
    (settle.lineItems || []).reduce((sum, line) => {
      if (line.sourceType !== 'fee' && line.sourceType !== 'adjust') return sum
      return sum + (Number(line.amount) || 0)
    }, 0),
  )
}

/** PO 详情账单/发票/付款 Tab 展示行 */
export function buildPoSettleTabRows(purchaseOrderId) {
  return listSettlesByPurchaseOrderId(purchaseOrderId).map((s) => {
    const confirmed = settleConfirmAmount(s)
    const paid = Number(s.paidAmount) || 0
    let paymentStatus = s.paymentStatus || ''
    if (!paymentStatus && paid > 0) {
      paymentStatus = paid + 1e-9 >= confirmed ? '已付款' : '部分付款'
    }
    return {
      id: s.id,
      settleNo: s.settleNo,
      periodKey: s.periodKey || '',
      amount: s.totalAmount,
      bookAmount: s.bookAmount != null && s.bookAmount !== '' ? s.bookAmount : s.totalAmount,
      confirmedAmount: confirmed,
      feeAdjustAmount: calcSettleFeeAdjustAmount(s),
      settledAt: s.confirmedAt || s.createdAt,
      status: s.status,
      invoiceStatus: s.invoiceStatus || '',
      invoiceNo: s.invoiceNo || '',
      invoiceDate: s.invoiceDate || '',
      invoiceAmount: s.invoiceAmount,
      paidAmount: paid,
      paymentStatus,
      plannedPaymentDate: s.plannedPaymentDate || '',
      lastPaidAt: s.lastPaidAt || '',
      lastPaidRemark: s.lastPaidRemark || '',
    }
  })
}

export {
  resolvePricingQty,
  PURCHASE_SETTLE_STATUS,
  PURCHASE_SETTLE_GENERATE_MODE,
  PURCHASE_SETTLE_LINE_DISPUTE_STATUS,
  PURCHASE_SETTLE_LINE_DISPUTE_RESULT,
  PURCHASE_SETTLE_LINE_DISPUTE_SCOPE,
}

import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  createPurchaseSettle,
  createPurchaseSettleLine,
  PURCHASE_SETTLE_STATUS,
  PURCHASE_SETTLE_GENERATE_MODE,
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
import { roundNumber } from '@/utils/numberFormat'

export const purchaseSettleState = reactive({
  settles: seedPurchaseSettles(),
})

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
 * 草稿结算单已占用的可结算量（确认前即占量，避免跨规则重复出单）
 */
export function getDraftOccupiedSettleQty(inboundOrderId, inboundLineId, excludeSettleId = '') {
  if (!inboundOrderId || !inboundLineId) return 0
  let occupied = 0
  purchaseSettleState.settles.forEach((settle) => {
    if (settle.status !== PURCHASE_SETTLE_STATUS.DRAFT) return
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
      const lines = listSettleableInboundLinesByPeriod({
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

  // 无供应商筛选时：从窗内可结算入库反推供应商（不强制账期周期）
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
    const lines = listSettleableInboundLinesByPeriod({
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

    const lines = (group.lineItems || []).filter((l) => (Number(l.settleQty) || 0) > 0)
    if (!lines.length) {
      skipped.push(`${group.supplier} / ${group.periodKey} 无可结算明细`)
      continue
    }

    const lineItems = []
    for (const row of lines) {
      const qty = Number(row.settleQty) || 0
      const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
      const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
      if (!line) {
        return { ok: false, message: '入库明细不存在', settles: created }
      }
      const remain = getEffectiveRemainSettleQty(line, row.inboundOrderId)
      if (qty > remain + 1e-9) {
        return {
          ok: false,
          message: `「${line.itemName || line.itemCode}」可结算数量不足（剩余 ${remain}，含草稿占用）`,
          settles: created,
        }
      }
      const unitPrice = Number(row.unitPrice) || 0
      lineItems.push(
        createPurchaseSettleLine({
          inboundOrderId: row.inboundOrderId,
          inboundDocNo: row.inboundDocNo || inbound.docNo,
          inboundLineId: row.inboundLineId,
          poLineId: row.poLineId || line.poLineId,
          purchaseOrderId: row.purchaseOrderId || '',
          purchaseOrderNo: row.purchaseOrderNo || '',
          itemCode: line.itemCode,
          itemName: line.itemName,
          settleUnit: row.settleUnit || line.settleUnit || line.unit || '',
          settleQty: qty,
          unitPrice,
          amount: round2(qty * unitPrice),
        }),
      )
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

    const lines = listSettleableInboundLines(po.id)
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
    const lines = (group.lineItems || []).filter((l) => (Number(l.settleQty) || 0) > 0)
    if (!lines.length) {
      skipped.push(`${group.purchaseOrderNo || group.supplier} 无可结算入库`)
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
    const qty = Number(row.settleQty) || 0
    if (!(qty > 0)) return { ok: false, message: '结算数量须大于 0' }
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    if (!line) return { ok: false, message: '入库明细不存在' }
    const remain = getEffectiveRemainSettleQty(line, row.inboundOrderId)
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」可结算数量不足（剩余 ${remain}，含草稿占用）`,
      }
    }
    const unitPrice = Number(row.unitPrice) || 0
    lineItems.push(
      createPurchaseSettleLine({
        inboundOrderId: row.inboundOrderId,
        inboundDocNo: row.inboundDocNo || inbound.docNo,
        inboundLineId: row.inboundLineId,
        poLineId: row.poLineId || line.poLineId,
        purchaseOrderId: po.id,
        purchaseOrderNo: po.orderNo,
        itemCode: line.itemCode,
        itemName: line.itemName,
        settleUnit: row.settleUnit || line.settleUnit || line.unit || '',
        settleQty: qty,
        unitPrice,
        amount: round2(qty * unitPrice),
      }),
    )
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
  return { ok: true, settle, message: `已生成对账单「${settle.settleNo}」` }
}

export function confirmPurchaseSettle(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '结算单不存在' }
  if (settle.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '结算单已确认' }
  }
  for (const row of settle.lineItems || []) {
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
    if (!line) return { ok: false, message: '关联入库明细不存在' }
    // 确认本单时排除自身草稿占用
    const remain = getEffectiveRemainSettleQty(line, row.inboundOrderId, settle.id)
    const qty = Number(row.settleQty) || 0
    if (qty > remain + 1e-9) {
      return {
        ok: false,
        message: `「${line.itemName || line.itemCode}」可结算数量不足（剩余 ${remain}，含其它草稿占用）`,
      }
    }
  }
  for (const row of settle.lineItems || []) {
    const inbound = inboundOrderState.orders.find((o) => o.id === row.inboundOrderId)
    const line = inbound?.lineItems?.find((l) => l.id === row.inboundLineId)
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
  return { ok: true, settle, message: '结算单已确认' }
}

export function deletePurchaseSettle(settleId) {
  const settle = getPurchaseSettleById(settleId)
  if (!settle) return { ok: false, message: '结算单不存在' }
  if (settle.status === PURCHASE_SETTLE_STATUS.CONFIRMED) {
    return { ok: false, message: '已确认结算单不可删除' }
  }
  const idx = purchaseSettleState.settles.findIndex((s) => s.id === settleId)
  if (idx >= 0) purchaseSettleState.settles.splice(idx, 1)
  return { ok: true, message: '已删除' }
}

/** PO 详情结算 Tab 展示行 */
export function buildPoSettleTabRows(purchaseOrderId) {
  return listSettlesByPurchaseOrderId(purchaseOrderId).map((s) => ({
    id: s.id,
    settleNo: s.settleNo,
    amount: s.totalAmount,
    settledAt: s.confirmedAt || s.createdAt,
    status: s.status,
  }))
}

export { resolvePricingQty, PURCHASE_SETTLE_STATUS, PURCHASE_SETTLE_GENERATE_MODE }

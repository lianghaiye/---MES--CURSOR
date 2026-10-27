import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  CONTRACT_CASH_DIRECTION,
  CONTRACT_PAYMENT_STATUS,
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  PAYMENT_LINK_TYPE,
  PAYMENT_PLAN_BASE,
  resolveContractCashDirection,
} from '@/constants/salesContract'
import {
  calcContractExecutedAmount,
  getOrdersLinkedToContract,
  getOutsourcingOrdersLinkedToContract,
  getPurchaseOrdersLinkedToContract,
  getSalesContractByNo,
  salesContractState,
} from '@/store/salesContractStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'

const STORAGE_KEY = 'i_doms_sales_payments'
const DATA_VERSION = 3

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/**
 * MOCK 回款流水：
 * - HT-20260528-001：部分回款（预付款到账 5 万）
 * - HT-20260915-STD：全部回清（状态=已回清），金额按节点比例拆满 58 万
 */
function seedPayments() {
  return [
    {
      id: 'spay-1',
      paymentNo: 'HK20261001-001',
      linkType: PAYMENT_LINK_TYPE.CONTRACT,
      contractNo: 'HT-20260528-001',
      salesOrderNo: '',
      customerName: '华东机械制造有限公司',
      nodeName: '预付款',
      amount: 50000,
      paymentMethod: '银行转账',
      receivedAt: '2026-10-05',
      remark: '框架合同预付款到账',
      createdAt: '2026-10-05 14:00',
      creator: 'admin',
    },
    {
      id: 'spay-cleared-1',
      paymentNo: 'HK20260920-001',
      linkType: PAYMENT_LINK_TYPE.CONTRACT,
      contractNo: 'HT-20260915-STD',
      salesOrderNo: '',
      customerName: '齐鲁石化装备分公司',
      nodeName: '预付款',
      amount: 174000,
      paymentMethod: '银行转账',
      invoiceNo: 'FP20260920001',
      receivedAt: '2026-09-20',
      remark: 'MOCK：已回清合同-预付款',
      createdAt: '2026-09-20 10:00',
      creator: 'admin',
    },
    {
      id: 'spay-cleared-2',
      paymentNo: 'HK20260928-002',
      linkType: PAYMENT_LINK_TYPE.CONTRACT,
      contractNo: 'HT-20260915-STD',
      salesOrderNo: '',
      customerName: '齐鲁石化装备分公司',
      nodeName: '发货款',
      amount: 290000,
      paymentMethod: '银行转账',
      invoiceNo: 'FP20260928002',
      receivedAt: '2026-09-28',
      remark: 'MOCK：已回清合同-发货款',
      createdAt: '2026-09-28 15:30',
      creator: 'admin',
    },
    {
      id: 'spay-cleared-3',
      paymentNo: 'HK20261008-003',
      linkType: PAYMENT_LINK_TYPE.CONTRACT,
      contractNo: 'HT-20260915-STD',
      salesOrderNo: '',
      customerName: '齐鲁石化装备分公司',
      nodeName: '验收款',
      amount: 87000,
      paymentMethod: '承兑汇票',
      invoiceNo: 'FP20261008003',
      receivedAt: '2026-10-08',
      remark: 'MOCK：已回清合同-验收款',
      createdAt: '2026-10-08 11:20',
      creator: 'admin',
    },
    {
      id: 'spay-cleared-4',
      paymentNo: 'HK20261015-004',
      linkType: PAYMENT_LINK_TYPE.CONTRACT,
      contractNo: 'HT-20260915-STD',
      salesOrderNo: '',
      customerName: '齐鲁石化装备分公司',
      nodeName: '质保金',
      amount: 29000,
      paymentMethod: '银行转账',
      invoiceNo: 'FP20261015004',
      receivedAt: '2026-10-15',
      remark: 'MOCK：已回清合同-质保金',
      createdAt: '2026-10-15 16:00',
      creator: 'admin',
    },
  ]
}

function mergeSeedPayments(existing) {
  const list = Array.isArray(existing) ? [...existing] : []
  const ids = new Set(list.map((p) => p.id))
  seedPayments().forEach((row) => {
    if (!ids.has(row.id)) list.push(normalizePayment(row))
  })
  return list
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      let payments = Array.isArray(parsed.payments)
        ? parsed.payments.map(normalizePayment)
        : seedPayments().map(normalizePayment)
      const plans = Array.isArray(parsed.plans) ? parsed.plans.map(normalizePlan) : []
      const version = parsed.version || 1
      // v3：补齐「已回清」演示数据
      if (version < 3) payments = mergeSeedPayments(payments)
      return { payments, plans, version: Math.max(version, DATA_VERSION) }
    }
  } catch {
    /* ignore */
  }
  return { payments: seedPayments().map(normalizePayment), plans: [], version: DATA_VERSION }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: DATA_VERSION,
      payments: salesPaymentState.payments,
      plans: salesPaymentState.plans,
    }),
  )
}

function normalizeSalesOrderNos(row = {}) {
  if (Array.isArray(row.salesOrderNos) && row.salesOrderNos.length) {
    return row.salesOrderNos.map((n) => String(n || '').trim()).filter(Boolean)
  }
  if (row.salesOrderNo) return [String(row.salesOrderNo).trim()].filter(Boolean)
  return []
}

export function normalizePayment(row = {}) {
  const salesOrderNos = normalizeSalesOrderNos(row)
  return {
    id: row.id || `spay-${Date.now()}`,
    paymentNo: row.paymentNo || '',
    linkType: row.linkType || PAYMENT_LINK_TYPE.CONTRACT,
    contractNo: row.contractNo || '',
    /** 兼容旧字段：取首个订单号 */
    salesOrderNo: salesOrderNos[0] || row.salesOrderNo || '',
    /** 可挂多张销售订单 */
    salesOrderNos,
    customerName: row.customerName || '',
    nodeName: row.nodeName || '',
    amount: round2(row.amount),
    paymentMethod: row.paymentMethod || '',
    invoiceNo: row.invoiceNo || '',
    receivedAt: row.receivedAt || '',
    remark: row.remark || '',
    createdAt: row.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    creator: row.creator || 'admin',
  }
}

export function normalizePlan(row = {}) {
  const termDays = row.termDays != null && row.termDays !== '' ? Number(row.termDays) : null
  const startDate = row.startDate ? String(row.startDate).slice(0, 10) : ''
  const planDate = row.planDate ? String(row.planDate).slice(0, 10) : ''
  const dueDate = row.dueDate || planDate || calcDueDate(startDate, termDays) || ''
  return {
    id: row.id || `spplan-${Date.now()}`,
    contractId: row.contractId || '',
    contractNo: row.contractNo || '',
    customerName: row.customerName || '',
    name: row.name || '合同回款',
    ratio: row.ratio != null && row.ratio !== '' ? Number(row.ratio) : null,
    planAmount: round2(row.planAmount),
    termStartType: row.termStartType || '',
    termDays: Number.isFinite(termDays) ? termDays : null,
    startDate,
    planDate,
    dueDate,
    invoiceAmount: round2(row.invoiceAmount),
    invoiceNo: row.invoiceNo || '',
    paymentMethod: row.paymentMethod || '',
    sort: Number(row.sort) || 0,
    createdAt: row.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: row.updatedAt || dayjs().format('YYYY-MM-DD HH:mm'),
  }
}

const loaded = loadFromStorage()

export const salesPaymentState = reactive({
  payments: loaded.payments,
  plans: loaded.plans,
})

watch(
  () => [salesPaymentState.payments, salesPaymentState.plans],
  () => persist(),
  { deep: true },
)

function generatePaymentNo() {
  return `HK${dayjs().format('YYYYMMDD')}-${String(salesPaymentState.payments.length + 1).padStart(
    3,
    '0',
  )}`
}

/** 起算日 + 账期天数 → 到期日 */
export function calcDueDate(startDate, termDays) {
  const days = Number(termDays)
  if (!startDate || !Number.isFinite(days) || days < 0) return ''
  const d = dayjs(startDate)
  if (!d.isValid()) return ''
  return d.add(days, 'day').format('YYYY-MM-DD')
}

function outboundConfirmAt(ob) {
  return ob?.confirmedAt || ob?.auditDate || ob?.outboundTime || ob?.completedAt || ''
}

/**
 * 发货日起算：合同关联销售订单 → 最早一张发货单 → 关联销售出库确认日
 */
export function resolveShipmentStartDate(contract) {
  const contractNo = contract?.contractNo
  if (!contractNo) return ''
  const orders = getOrdersLinkedToContract(contractNo) || []
  const soIds = new Set(orders.map((o) => o.id).filter(Boolean))
  const soNos = new Set(orders.map((o) => o.orderNo).filter(Boolean))
  const deliveries = (deliveryOrderState.orders || []).filter(
    (d) => soIds.has(d.salesOrderId) || soNos.has(d.salesOrderNo) || soNos.has(d.sourceOrderNo),
  )
  if (!deliveries.length) return ''
  deliveries.sort((a, b) =>
    String(a.documentDate || a.createdAt || '').localeCompare(
      String(b.documentDate || b.createdAt || ''),
    ),
  )
  const ob = findLinkedSalesOutbound(deliveries[0])
  const raw = outboundConfirmAt(ob)
  if (!raw) return ''
  const d = dayjs(raw)
  return d.isValid() ? d.format('YYYY-MM-DD') : String(raw).slice(0, 10)
}

/**
 * 按账期起算类型尝试自动带出起算日；取不到则返回空，交给用户后补
 */
export function resolveAutoStartDate(contract, termStartType) {
  const type = termStartType || ''
  if (type === '合同签订日') {
    const signed =
      contract?.signedAt || contract?.validFrom || contract?.approvedAt || contract?.createdAt || ''
    return signed ? String(signed).slice(0, 10) : ''
  }
  if (type === '发货日') {
    return resolveShipmentStartDate(contract)
  }
  if (type === '到货日') {
    return resolveArrivalStartDate(contract)
  }
  // 验收日 / 开票日 / 对账日 / 自定义：不自动带入，合同中后补
  return ''
}

/** 支出合同到货日：关联采购/外协入库单最早确认入库时间 */
export function resolveArrivalStartDate(contract) {
  const contractNo = contract?.contractNo
  if (!contractNo) return ''
  const pos = getPurchaseOrdersLinkedToContract(contractNo) || []
  const wxs = getOutsourcingOrdersLinkedToContract(contractNo) || []
  const poIds = new Set(pos.map((o) => o.id).filter(Boolean))
  const wxIds = new Set(wxs.map((o) => o.id).filter(Boolean))
  const poNos = new Set(pos.map((o) => o.orderNo).filter(Boolean))
  const wxNos = new Set(wxs.map((o) => o.orderNo).filter(Boolean))
  // eslint-disable-next-line global-require
  const { inboundOrderState } = require('@/store/inboundOrderStore')
  void inboundOrderState.orders
  const hits = (inboundOrderState.orders || []).filter((o) => {
    if (o.contractNo && o.contractNo === contractNo) return true
    if (o.purchaseOrderId && poIds.has(o.purchaseOrderId)) return true
    if (o.outsourcingOrderId && wxIds.has(o.outsourcingOrderId)) return true
    if (o.sourceOrderNo && (poNos.has(o.sourceOrderNo) || wxNos.has(o.sourceOrderNo))) return true
    return false
  })
  if (!hits.length) return ''
  const dates = hits
    .map((o) => String(o.confirmedAt || o.inboundDate || o.approvedAt || '').slice(0, 10))
    .filter((d) => d && dayjs(d).isValid())
    .sort()
  return dates[0] || ''
}

function ratioTextOf(planAmount, ratio, total) {
  if (ratio != null && ratio !== '') {
    const pct = Number(ratio) <= 1 ? Number(ratio) * 100 : Number(ratio)
    return `${round2(pct)}%`
  }
  if (total > 0 && planAmount > 0) return `${round2((planAmount / total) * 100)}%`
  return '—'
}

/**
 * 合同回款计划基数
 * - 框架合同：可选「额度金额」或「销售订单金额」（关联有效订单含税合计）
 * - 标准合同：额度优先，否则明细合计
 */
export function resolveContractPaymentBaseAmount(contract) {
  if (!contract) return 0
  if (contract.contractType === CONTRACT_TYPE.FRAMEWORK) {
    if (
      contract.paymentPlanBase === PAYMENT_PLAN_BASE.ORDERS ||
      contract.paymentPlanBase === PAYMENT_PLAN_BASE.PURCHASE_ORDERS
    ) {
      return round2(calcContractExecutedAmount(contract))
    }
    if (contract.limitAmount != null && contract.limitAmount !== '') {
      return round2(contract.limitAmount)
    }
    return 0
  }
  if (contract.limitAmount != null && contract.limitAmount !== '') {
    return round2(contract.limitAmount)
  }
  const taxInclusive = contract.taxInclusive !== false
  return round2(
    (contract.lineItems || []).reduce((s, l) => {
      const amt = taxInclusive ? (l.amountInTax ?? l.amountExTax) : (l.amountExTax ?? l.amountInTax)
      return s + (Number(amt) || 0)
    }, 0),
  )
}

function buildPlanDraftsFromContract(contract) {
  const total = resolveContractPaymentBaseAmount(contract)
  const defaultTermType = '开票日'
  const termDays =
    contract.paymentTermDays != null && contract.paymentTermDays !== ''
      ? Number(contract.paymentTermDays)
      : 30
  const nodes = contract.paymentNodes || []
  const now = dayjs().format('YYYY-MM-DD HH:mm')

  if (!nodes.length && total > 0) {
    const startDate = resolveAutoStartDate(contract, defaultTermType)
    return [
      normalizePlan({
        id: `spplan-${contract.id}-all`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        customerName: contract.customerName || '',
        name: '合同回款',
        ratio: 1,
        planAmount: total,
        termStartType: defaultTermType,
        termDays,
        startDate,
        dueDate: calcDueDate(startDate, termDays),
        sort: 0,
        createdAt: now,
        updatedAt: now,
      }),
    ]
  }

  return nodes.map((node, index) => {
    const planAmount =
      node.amount != null && node.amount !== ''
        ? round2(node.amount)
        : node.ratio != null
          ? round2(total * Number(node.ratio))
          : 0
    // 每个节点可有独立起算类型（预付款=签订日、发货款=发货日…）
    const nodeTermType = node.termStartType || defaultTermType
    const startDate = resolveAutoStartDate(contract, nodeTermType)
    const nodePlanDate = node.planDate ? String(node.planDate).slice(0, 10) : ''
    const fromTerm = calcDueDate(startDate, termDays)
    return normalizePlan({
      id: `spplan-${contract.id}-${index}-${node.name || index}`,
      contractId: contract.id,
      contractNo: contract.contractNo,
      customerName: contract.customerName || '',
      name: node.name || `节点${index + 1}`,
      ratio: node.ratio != null ? Number(node.ratio) : null,
      planAmount,
      termStartType: nodeTermType,
      termDays,
      startDate,
      dueDate: nodePlanDate || fromTerm,
      planDate: nodePlanDate,
      sort: index,
      createdAt: now,
      updatedAt: now,
    })
  })
}

/**
 * 合同生效后生成落库回款计划；已存在且非强制重建则保留用户已填起算日/开票/方式
 */
export function ensurePaymentPlansForContract(contract, { rebuild = false } = {}) {
  if (!contract?.contractNo) return { ok: false, message: '合同无效' }
  if (contract.status !== CONTRACT_STATUS.ACTIVE && contract.status !== CONTRACT_STATUS.COMPLETED) {
    return { ok: false, message: '仅生效/已完成合同生成回款计划' }
  }

  const existing = salesPaymentState.plans.filter((p) => p.contractNo === contract.contractNo)
  if (existing.length && !rebuild) {
    return { ok: true, data: existing, created: false }
  }

  const drafts = buildPlanDraftsFromContract(contract)
  if (!drafts.length) {
    return { ok: false, message: '合同无回款节点且无金额，无法生成计划' }
  }

  // 重建时：尽量把已填起算日/开票/方式按节点名合并回来
  const prevByName = {}
  existing.forEach((p) => {
    prevByName[p.name] = p
  })
  const merged = drafts.map((d) => {
    const prev = prevByName[d.name]
    if (!prev) return d
    const startDate = prev.startDate || d.startDate
    const termDays = prev.termDays != null ? prev.termDays : d.termDays
    const planDate = d.planDate || prev.planDate || ''
    const fromTerm = calcDueDate(startDate, termDays)
    return normalizePlan({
      ...d,
      startDate,
      termDays,
      planDate,
      dueDate: fromTerm || planDate || prev.dueDate || d.dueDate,
      invoiceAmount: prev.invoiceAmount,
      invoiceNo: prev.invoiceNo,
      paymentMethod: prev.paymentMethod,
      createdAt: prev.createdAt || d.createdAt,
    })
  })

  for (let i = salesPaymentState.plans.length - 1; i >= 0; i -= 1) {
    if (salesPaymentState.plans[i].contractNo === contract.contractNo) {
      salesPaymentState.plans.splice(i, 1)
    }
  }
  salesPaymentState.plans.push(...merged)
  return { ok: true, data: merged, created: true }
}

/** 为当前生效/已完成合同补齐落库计划（兼容旧数据） */
export function ensureAllPaymentPlans() {
  void salesContractState.contracts
  salesContractState.contracts
    .filter((c) => c.status === CONTRACT_STATUS.ACTIVE || c.status === CONTRACT_STATUS.COMPLETED)
    .forEach((c) => ensurePaymentPlansForContract(c))
}

export function getPlansByContractNo(contractNo) {
  return salesPaymentState.plans
    .filter((p) => p.contractNo === contractNo)
    .slice()
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

/**
 * 更新计划节点：补写起算日、开票金额、回款方式等
 */
export function updatePaymentPlanNode(planId, patch = {}) {
  const row = salesPaymentState.plans.find((p) => p.id === planId)
  if (!row) return { ok: false, message: '回款计划节点不存在' }

  if (patch.startDate !== undefined) {
    row.startDate = patch.startDate ? String(patch.startDate).slice(0, 10) : ''
  }
  if (patch.termDays !== undefined) {
    row.termDays = patch.termDays != null && patch.termDays !== '' ? Number(patch.termDays) : null
  }
  if (patch.termStartType !== undefined) {
    row.termStartType = patch.termStartType || ''
  }
  if (patch.invoiceAmount !== undefined) {
    row.invoiceAmount = round2(patch.invoiceAmount)
  }
  if (patch.invoiceNo !== undefined) {
    row.invoiceNo = patch.invoiceNo || ''
  }
  if (patch.paymentMethod !== undefined) {
    row.paymentMethod = patch.paymentMethod || ''
  }
  if (patch.planAmount !== undefined) {
    row.planAmount = round2(patch.planAmount)
  }
  if (patch.planDate !== undefined) {
    row.planDate = patch.planDate ? String(patch.planDate).slice(0, 10) : ''
  }

  // 有起算日则按账期重算到期日；否则保留节点计划回款时间
  const fromTerm = calcDueDate(row.startDate, row.termDays)
  row.dueDate = fromTerm || row.planDate || row.dueDate || ''
  row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  return { ok: true, data: row }
}

/**
 * 按当前回款基数（额度/订单金额）刷新未结清节点的计划金额（比例拆分）
 */
export function refreshPlanAmountsFromContractBase(contract) {
  if (!contract?.contractNo) return { ok: false, message: '合同无效' }
  ensurePaymentPlansForContract(contract)
  const total = resolveContractPaymentBaseAmount(contract)
  const plans = getPlansByContractNo(contract.contractNo)
  if (!plans.length) return { ok: false, message: '暂无回款计划' }
  const now = dayjs().format('YYYY-MM-DD HH:mm')
  plans.forEach((p) => {
    const paidMeta = paidMetaByContract(contract.contractNo)[p.name]
    const paid = paidMeta?.paid || 0
    // 已回清的节点不改计划金额
    if (paid > 0 && paid + 0.001 >= Number(p.planAmount || 0)) return
    if (p.ratio != null && Number.isFinite(Number(p.ratio))) {
      p.planAmount = round2(total * Number(p.ratio))
      p.updatedAt = now
    }
  })
  return { ok: true, data: plans, baseAmount: total }
}

function paidMetaByContract(contractNo) {
  /** @type {Record<string, { paid: number, actualDate: string, paymentMethod: string }>} */
  const map = {}
  salesPaymentState.payments
    .filter((p) => p.contractNo === contractNo)
    .forEach((p) => {
      const key = p.nodeName || '未指定节点'
      if (!map[key]) map[key] = { paid: 0, actualDate: '', paymentMethod: '' }
      map[key].paid = round2(map[key].paid + (Number(p.amount) || 0))
      const at = String(p.receivedAt || '').slice(0, 10)
      if (at && (!map[key].actualDate || at > map[key].actualDate)) {
        map[key].actualDate = at
      }
      if (p.paymentMethod) map[key].paymentMethod = p.paymentMethod
    })
  return map
}

function enrichPlanRow(plan, paidMeta, total) {
  const meta = paidMeta[plan.name] ||
    paidMeta['未指定节点'] || { paid: 0, actualDate: '', paymentMethod: '' }
  const paid = meta.paid || 0
  const unpaid = round2(Math.max(0, round2(plan.planAmount) - paid))
  const dueDate = plan.dueDate || calcDueDate(plan.startDate, plan.termDays)
  const overdue = unpaid > 0 && dueDate && dayjs().format('YYYY-MM-DD') > dueDate
  const invoiceAmount = round2(plan.invoiceAmount)
  let invoiceStatus = '未开票'
  if (invoiceAmount > 0 && invoiceAmount + 0.001 >= Number(plan.planAmount || 0)) {
    invoiceStatus = '已开票'
  } else if (invoiceAmount > 0) {
    invoiceStatus = '部分开票'
  }
  return {
    ...plan,
    ratioText: ratioTextOf(plan.planAmount, plan.ratio, total),
    paid,
    unpaid,
    dueDate,
    actualDate: meta.actualDate || '',
    paymentTermStart: plan.termStartType,
    paymentMethod: plan.paymentMethod || meta.paymentMethod || '',
    overdue,
    invoiceStatus,
  }
}

/**
 * 读取合同落库回款计划（无则自动生成），并叠加登记流水
 */
export function buildContractPaymentPlan(contract) {
  if (!contract) return []
  ensurePaymentPlansForContract(contract)
  const plans = getPlansByContractNo(contract.contractNo)
  if (!plans.length) return []
  const total = resolveContractPaymentBaseAmount(contract)
  const paidMeta = paidMetaByContract(contract.contractNo)
  return plans.map((p) => enrichPlanRow(p, paidMeta, total))
}

export function resolveContractPaymentStatus(planRows = []) {
  const planTotal = round2(planRows.reduce((s, n) => s + (Number(n.planAmount) || 0), 0))
  const paidTotal = round2(planRows.reduce((s, n) => s + (Number(n.paid) || 0), 0))
  const unpaidTotal = round2(Math.max(0, planTotal - paidTotal))
  const hasOverdue = planRows.some((n) => n.overdue)
  if (hasOverdue && unpaidTotal > 0) return CONTRACT_PAYMENT_STATUS.OVERDUE
  if (planTotal <= 0)
    return paidTotal > 0 ? CONTRACT_PAYMENT_STATUS.CLEARED : CONTRACT_PAYMENT_STATUS.UNPAID
  if (paidTotal <= 0) return CONTRACT_PAYMENT_STATUS.UNPAID
  if (unpaidTotal <= 0) return CONTRACT_PAYMENT_STATUS.CLEARED
  return CONTRACT_PAYMENT_STATUS.PARTIAL
}

/** 节点进度：当前未清节点序号 / 总节点数；全部结清则为 N/N */
export function resolveNodeProgress(planRows = []) {
  const total = planRows.length
  if (!total) return { current: 0, total: 0, text: '—' }
  const firstUnpaid = planRows.findIndex((n) => (Number(n.unpaid) || 0) > 0)
  const current = firstUnpaid < 0 ? total : firstUnpaid + 1
  return { current, total, text: `${current}/${total}` }
}

export function buildContractPaymentSummary(contract) {
  if (!contract) return null
  const planRows = buildContractPaymentPlan(contract)
  const planTotal = round2(planRows.reduce((s, n) => s + (Number(n.planAmount) || 0), 0))
  const paidTotal = round2(planRows.reduce((s, n) => s + (Number(n.paid) || 0), 0))
  const unpaidTotal = round2(Math.max(0, planTotal - paidTotal))
  const progress = resolveNodeProgress(planRows)
  const clearedNodeCount = planRows.filter((n) => (Number(n.unpaid) || 0) <= 0).length
  const collectionRate = planTotal > 0 ? round2((paidTotal / planTotal) * 100) : 0
  const overdueNodes = planRows.filter((n) => n.overdue)
  const overdueNodeNames = overdueNodes.map((n) => n.name).filter(Boolean)
  return {
    id: contract.id,
    contractId: contract.id,
    contractNo: contract.contractNo,
    contractName: contract.contractName || '',
    customerName: contract.customerName || '',
    contractType: contract.contractType,
    contractStatus: contract.status,
    paymentStatus: resolveContractPaymentStatus(planRows),
    /** 节点回款逾期：有任一未清且超期节点即为逾期 */
    overdueStatus: overdueNodes.length ? '逾期' : '未逾期',
    overdueNodeNames,
    overdueNodeText: overdueNodeNames.length ? `${overdueNodeNames.join('、')}逾期` : '未逾期',
    nodeProgress: progress.text,
    currentNode: progress.current,
    nodeTotal: progress.total,
    clearedNodeCount,
    clearedNodeText: `${clearedNodeCount}/${progress.total} 节点已回`,
    planTotal,
    paidTotal,
    unpaidTotal,
    collectionRate,
    paymentTermStart:
      [...new Set(planRows.map((n) => n.termStartType).filter(Boolean))].join(' / ') || '',
    paymentTermDays:
      contract.paymentTermDays != null && contract.paymentTermDays !== ''
        ? Number(contract.paymentTermDays)
        : 30,
    overdueAmount: round2(overdueNodes.reduce((s, n) => s + (Number(n.unpaid) || 0), 0)),
    planRows,
  }
}

export function listContractPaymentSummaries() {
  void salesPaymentState.payments
  void salesPaymentState.plans
  void salesContractState.contracts
  ensureAllPaymentPlans()
  return salesContractState.contracts
    .filter((c) => c.status === CONTRACT_STATUS.ACTIVE || c.status === CONTRACT_STATUS.COMPLETED)
    .filter((c) => resolveContractCashDirection(c) === CONTRACT_CASH_DIRECTION.INCOME)
    .map((c) => buildContractPaymentSummary(c))
    .filter((row) => row && (row.planTotal > 0 || row.paidTotal > 0 || row.nodeTotal > 0))
}

function isInCurrentMonth(dateStr) {
  const d = dayjs(dateStr)
  if (!d.isValid()) return false
  const now = dayjs()
  return d.year() === now.year() && d.month() === now.month()
}

export function calcPaymentDashboardStats(summaries) {
  const list = Array.isArray(summaries) ? summaries : listContractPaymentSummaries()
  const activeContractCount = list.filter((r) => r.contractStatus === CONTRACT_STATUS.ACTIVE).length
  const planTotal = round2(list.reduce((s, r) => s + (Number(r.planTotal) || 0), 0))
  const paidTotal = round2(list.reduce((s, r) => s + (Number(r.paidTotal) || 0), 0))
  const unpaidTotal = round2(list.reduce((s, r) => s + (Number(r.unpaidTotal) || 0), 0))
  const overdueAmount = round2(list.reduce((s, r) => s + (Number(r.overdueAmount) || 0), 0))
  const collectionRate = planTotal > 0 ? round2((paidTotal / planTotal) * 100) : 0

  // 本月已收：到账日落在本月的回款登记合计
  const monthPaidTotal = round2(
    salesPaymentState.payments
      .filter((p) => isInCurrentMonth(p.receivedAt))
      .filter((p) => {
        const c = getSalesContractByNo(p.contractNo)
        return !c || resolveContractCashDirection(c) === CONTRACT_CASH_DIRECTION.INCOME
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0),
  )

  // 本月待收：到期日落在本月且尚未回清的节点未收合计
  const monthUnpaidTotal = round2(
    list.reduce((sum, row) => {
      const nodes = row.planRows || []
      return (
        sum +
        nodes.reduce((s, n) => {
          if (!(Number(n.unpaid) > 0)) return s
          if (!isInCurrentMonth(n.dueDate)) return s
          return s + (Number(n.unpaid) || 0)
        }, 0)
      )
    }, 0),
  )

  /** 本月有待回款节点的合同数（工作台待办） */
  const monthDueContractCount = list.filter((row) =>
    (row.planRows || []).some((n) => Number(n.unpaid) > 0 && isInCurrentMonth(n.dueDate)),
  ).length

  return {
    activeContractCount,
    planTotal,
    paidTotal,
    unpaidTotal,
    monthPaidTotal,
    monthUnpaidTotal,
    monthDueContractCount,
    overdueAmount,
    collectionRate,
  }
}

export function addSalesPayment(payload) {
  const amount = round2(payload.amount)
  if (!(amount > 0)) return { ok: false, message: '请填写回款金额' }
  if (!payload.linkType) return { ok: false, message: '请选择挂接对象' }
  if (payload.linkType === PAYMENT_LINK_TYPE.CONTRACT && !payload.contractNo) {
    return { ok: false, message: '请选择合同' }
  }
  const salesOrderNos = normalizeSalesOrderNos(payload)
  if (payload.linkType === PAYMENT_LINK_TYPE.SALES_ORDER && !salesOrderNos.length) {
    return { ok: false, message: '请选择销售订单' }
  }

  let customerName = payload.customerName || ''
  let contractNo = payload.contractNo || ''
  if (payload.linkType === PAYMENT_LINK_TYPE.CONTRACT) {
    const c = getSalesContractByNo(contractNo)
    customerName = customerName || c?.customerName || ''
    if (c) ensurePaymentPlansForContract(c)
  } else {
    const o = findSalesOrderByOrderNo(salesOrderNos[0])
    customerName = customerName || o?.customerName || ''
    contractNo = contractNo || o?.contractNo || ''
    const c = contractNo ? getSalesContractByNo(contractNo) : null
    if (c) ensurePaymentPlansForContract(c)
  }

  const row = normalizePayment({
    ...payload,
    id: `spay-${Date.now()}`,
    paymentNo: payload.paymentNo || generatePaymentNo(),
    customerName,
    contractNo,
    salesOrderNos,
    salesOrderNo: salesOrderNos[0] || '',
    amount,
    paymentMethod: payload.paymentMethod || '',
    invoiceNo: payload.invoiceNo || '',
    receivedAt: payload.receivedAt || dayjs().format('YYYY-MM-DD'),
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  salesPaymentState.payments.unshift(row)

  // 登记时同步节点上的回款方式；可选同步开票金额/发票号码
  if (contractNo && payload.nodeName) {
    const plan = salesPaymentState.plans.find(
      (p) => p.contractNo === contractNo && p.name === payload.nodeName,
    )
    if (plan) {
      if (payload.paymentMethod) plan.paymentMethod = payload.paymentMethod
      if (payload.invoiceAmount != null && payload.invoiceAmount !== '') {
        plan.invoiceAmount = round2(payload.invoiceAmount)
      }
      if (payload.invoiceNo) plan.invoiceNo = String(payload.invoiceNo).trim()
      if (payload.startDate) {
        plan.startDate = String(payload.startDate).slice(0, 10)
        plan.dueDate = calcDueDate(plan.startDate, plan.termDays) || plan.planDate || plan.dueDate
      }
      plan.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
    }
  }

  return { ok: true, data: row }
}

export function deleteSalesPayment(id) {
  const idx = salesPaymentState.payments.findIndex((p) => p.id === id)
  if (idx < 0) return { ok: false, message: '回款记录不存在' }
  salesPaymentState.payments.splice(idx, 1)
  return { ok: true }
}

export function sumPaymentsByContract(contractNo) {
  if (!contractNo) return 0
  return round2(
    salesPaymentState.payments
      .filter((p) => p.contractNo === contractNo)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0),
  )
}

export function sumPaymentsBySalesOrder(salesOrderNo) {
  if (!salesOrderNo) return 0
  return round2(
    salesPaymentState.payments
      .filter((p) => {
        const nos = Array.isArray(p.salesOrderNos) ? p.salesOrderNos : []
        return p.salesOrderNo === salesOrderNo || nos.includes(salesOrderNo)
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0),
  )
}

// 启动时为已有生效合同补齐计划
ensureAllPaymentPlans()

import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { PAYMENT_LINK_TYPE } from '@/constants/salesContract'
import { getSalesContractByNo } from '@/store/salesContractStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'

const STORAGE_KEY = 'i_doms_sales_payments'
const DATA_VERSION = 1

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

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
      receivedAt: '2026-10-05',
      remark: '框架合同预付款到账',
      createdAt: '2026-10-05 14:00',
      creator: 'admin',
    },
  ]
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.payments)) return parsed.payments.map(normalizePayment)
    }
  } catch {
    /* ignore */
  }
  return seedPayments()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, payments: salesPaymentState.payments }),
  )
}

export function normalizePayment(row = {}) {
  return {
    id: row.id || `spay-${Date.now()}`,
    paymentNo: row.paymentNo || '',
    linkType: row.linkType || PAYMENT_LINK_TYPE.CONTRACT,
    contractNo: row.contractNo || '',
    salesOrderNo: row.salesOrderNo || '',
    customerName: row.customerName || '',
    nodeName: row.nodeName || '',
    amount: round2(row.amount),
    receivedAt: row.receivedAt || '',
    remark: row.remark || '',
    createdAt: row.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    creator: row.creator || 'admin',
  }
}

export const salesPaymentState = reactive({
  payments: loadFromStorage(),
})

watch(
  () => salesPaymentState.payments,
  () => persist(),
  { deep: true },
)

function generatePaymentNo() {
  return `HK${dayjs().format('YYYYMMDD')}-${String(salesPaymentState.payments.length + 1).padStart(
    3,
    '0',
  )}`
}

export function addSalesPayment(payload) {
  const amount = round2(payload.amount)
  if (!(amount > 0)) return { ok: false, message: '请填写回款金额' }
  if (!payload.linkType) return { ok: false, message: '请选择挂接对象' }
  if (payload.linkType === PAYMENT_LINK_TYPE.CONTRACT && !payload.contractNo) {
    return { ok: false, message: '请选择合同' }
  }
  if (payload.linkType === PAYMENT_LINK_TYPE.SALES_ORDER && !payload.salesOrderNo) {
    return { ok: false, message: '请选择销售订单' }
  }

  let customerName = payload.customerName || ''
  let contractNo = payload.contractNo || ''
  if (payload.linkType === PAYMENT_LINK_TYPE.CONTRACT) {
    const c = getSalesContractByNo(contractNo)
    customerName = customerName || c?.customerName || ''
  } else {
    const o = findSalesOrderByOrderNo(payload.salesOrderNo)
    customerName = customerName || o?.customerName || ''
    contractNo = contractNo || o?.contractNo || ''
  }

  const row = normalizePayment({
    ...payload,
    id: `spay-${Date.now()}`,
    paymentNo: payload.paymentNo || generatePaymentNo(),
    customerName,
    contractNo,
    amount,
    receivedAt: payload.receivedAt || dayjs().format('YYYY-MM-DD'),
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  salesPaymentState.payments.unshift(row)
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
      .filter((p) => p.salesOrderNo === salesOrderNo)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0),
  )
}

/**
 * 按合同节点汇总：计划金额、已回、未回、是否逾期
 */
export function buildContractPaymentPlan(contract) {
  if (!contract) return []
  const total =
    contract.limitAmount != null && contract.limitAmount !== ''
      ? Number(contract.limitAmount)
      : (contract.lineItems || []).reduce((s, l) => s + (Number(l.amountExTax) || 0), 0)
  const paidByNode = {}
  salesPaymentState.payments
    .filter((p) => p.contractNo === contract.contractNo)
    .forEach((p) => {
      const key = p.nodeName || '未指定节点'
      paidByNode[key] = round2((paidByNode[key] || 0) + (Number(p.amount) || 0))
    })

  const start = contract.paymentTermStart || '开票日'
  const days = Number(contract.paymentTermDays)
  const baseDate = contract.approvedAt || contract.createdAt || ''
  const dueDate =
    Number.isFinite(days) && days >= 0 && baseDate
      ? dayjs(baseDate).add(days, 'day').format('YYYY-MM-DD')
      : ''

  return (contract.paymentNodes || []).map((node) => {
    const planAmount =
      node.amount != null && node.amount !== ''
        ? round2(node.amount)
        : node.ratio != null
          ? round2(total * Number(node.ratio))
          : 0
    const paid = paidByNode[node.name] || 0
    const unpaid = round2(Math.max(0, planAmount - paid))
    const overdue = unpaid > 0 && dueDate && dayjs().format('YYYY-MM-DD') > dueDate
    return {
      ...node,
      planAmount,
      paid,
      unpaid,
      dueDate,
      paymentTermStart: start,
      overdue,
    }
  })
}

import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'
import { CONTRACT_STATUS, CONTRACT_TYPE, DEFAULT_PAYMENT_NODES } from '@/constants/salesContract'

const STORAGE_KEY = 'i_doms_sales_contracts'
const LEGACY_FRAMEWORK_KEY = 'i_doms_framework_contracts'
const DATA_VERSION = 1

function createPaymentNode(partial = {}) {
  return {
    id: partial.id || `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: partial.name || '',
    /** 0~1；与 amount 二选一为主，也可都填（金额优先） */
    ratio: partial.ratio != null && partial.ratio !== '' ? Number(partial.ratio) : null,
    amount: partial.amount != null && partial.amount !== '' ? Number(partial.amount) : null,
    remark: partial.remark || '',
  }
}

export function createDefaultPaymentNodes() {
  return DEFAULT_PAYMENT_NODES.map((item) => createPaymentNode({ ...item }))
}

function seedContracts() {
  return [
    {
      id: 'sc-fc-1',
      contractNo: 'HT-20260528-001',
      contractName: '华东机械年度框架合同',
      customerName: '华东机械制造有限公司',
      contractType: CONTRACT_TYPE.FRAMEWORK,
      defaultDiscountRate: 0.95,
      settlementCycle: '月结',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      limitAmount: 5000000,
      limitQty: null,
      allowExceedQuota: true,
      priceItems: [
        {
          id: 'fci-1',
          productCode: 'MD-200-BLK',
          productId: '',
          agreementDiscountRate: 0.9,
        },
      ],
      lineItems: [],
      paymentNodes: createDefaultPaymentNodes(),
      attachments: [],
      remark: '战略合作客户框架价',
      status: CONTRACT_STATUS.ACTIVE,
      createdAt: '2026-01-05 10:00',
      updatedAt: '2026-01-05 10:00',
      approvedAt: '2026-01-05 11:00',
      approvedBy: 'admin',
    },
    {
      id: 'sc-st-1',
      contractNo: 'HT-20261001-STD',
      contractName: '华东机械潜水电泵供货合同',
      customerName: '华东机械制造有限公司',
      contractType: CONTRACT_TYPE.STANDARD,
      defaultDiscountRate: 1,
      settlementCycle: '月结',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      validFrom: '2026-10-01',
      validTo: '2027-03-31',
      limitAmount: 320000,
      limitQty: 2,
      allowExceedQuota: false,
      priceItems: [],
      lineItems: [
        {
          id: 'sci-1',
          productCode: 'CP2610004',
          productName: '潜水电泵 QJ200-40/3',
          qty: 2,
          unit: '台',
          unitPriceExTax: 160000,
          amountExTax: 320000,
          deliveryDate: '2026-11-30',
        },
      ],
      paymentNodes: createDefaultPaymentNodes(),
      attachments: [],
      remark: '标准合同示例',
      status: CONTRACT_STATUS.ACTIVE,
      createdAt: '2026-10-01 09:00',
      updatedAt: '2026-10-01 09:30',
      approvedAt: '2026-10-01 10:00',
      approvedBy: 'admin',
    },
  ]
}

function migrateFromFramework(list = []) {
  return list.map((item) =>
    normalizeContractRecord({
      ...item,
      contractType: item.contractType || CONTRACT_TYPE.FRAMEWORK,
      allowExceedQuota: item.allowExceedQuota !== false,
      limitAmount: item.limitAmount ?? null,
      limitQty: item.limitQty ?? null,
      lineItems: item.lineItems || [],
      paymentNodes: Array.isArray(item.paymentNodes)
        ? item.paymentNodes.map(createPaymentNode)
        : createDefaultPaymentNodes(),
      attachments: item.attachments || [],
    }),
  )
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.contracts)) {
        return parsed.contracts.map(normalizeContractRecord)
      }
      if (Array.isArray(parsed.contracts)) {
        return parsed.contracts.map(normalizeContractRecord)
      }
    }
    const legacy = localStorage.getItem(LEGACY_FRAMEWORK_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed.contracts) && parsed.contracts.length) {
        return migrateFromFramework(parsed.contracts)
      }
    }
  } catch {
    /* ignore */
  }
  return seedContracts()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, contracts: salesContractState.contracts }),
  )
}

export function normalizeContractRecord(row = {}) {
  return {
    id: row.id || `sc-${Date.now()}`,
    contractNo: row.contractNo || '',
    contractName: row.contractName || '',
    customerName: row.customerName || '',
    contractType: row.contractType || CONTRACT_TYPE.FRAMEWORK,
    defaultDiscountRate: normalizeDiscountRate(row.defaultDiscountRate, 1),
    settlementCycle: row.settlementCycle || '',
    paymentTermStart: row.paymentTermStart || '',
    paymentTermDays:
      row.paymentTermDays != null && row.paymentTermDays !== ''
        ? Number(row.paymentTermDays)
        : null,
    validFrom: row.validFrom || '',
    validTo: row.validTo || '',
    limitAmount: row.limitAmount != null && row.limitAmount !== '' ? Number(row.limitAmount) : null,
    limitQty: row.limitQty != null && row.limitQty !== '' ? Number(row.limitQty) : null,
    allowExceedQuota: row.allowExceedQuota !== false,
    priceItems: Array.isArray(row.priceItems) ? row.priceItems : [],
    lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
    paymentNodes: Array.isArray(row.paymentNodes)
      ? row.paymentNodes.map(createPaymentNode)
      : createDefaultPaymentNodes(),
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    remark: row.remark || '',
    status: row.status || CONTRACT_STATUS.DRAFT,
    sourceSalesOrderId: row.sourceSalesOrderId || '',
    sourceSalesOrderNo: row.sourceSalesOrderNo || '',
    createdAt: row.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: row.updatedAt || dayjs().format('YYYY-MM-DD HH:mm'),
    approvedAt: row.approvedAt || '',
    approvedBy: row.approvedBy || '',
    terminatedAt: row.terminatedAt || '',
    terminateReason: row.terminateReason || '',
  }
}

export const salesContractState = reactive({
  contracts: loadFromStorage(),
})

watch(
  () => salesContractState.contracts,
  () => persist(),
  { deep: true },
)

export function listSalesContracts({ contractType, customerName, status } = {}) {
  return salesContractState.contracts.filter((item) => {
    if (contractType && item.contractType !== contractType) return false
    if (customerName && item.customerName !== customerName) return false
    if (status && item.status !== status) return false
    return true
  })
}

export function getSalesContractById(id) {
  if (!id) return null
  return salesContractState.contracts.find((item) => item.id === id) || null
}

export function getSalesContractByNo(contractNo) {
  if (!contractNo) return null
  return salesContractState.contracts.find((item) => item.contractNo === contractNo) || null
}

/** 生效中且在有效期内的合同选项（下单用） */
export function getActiveSalesContractOptions(customerName = '', contractType = '') {
  const today = dayjs().format('YYYY-MM-DD')
  return salesContractState.contracts
    .filter((item) => item.status === CONTRACT_STATUS.ACTIVE)
    .filter((item) => !customerName || item.customerName === customerName)
    .filter((item) => !contractType || item.contractType === contractType)
    .filter((item) => {
      if (item.validFrom && today < item.validFrom) return false
      if (item.validTo && today > item.validTo) return false
      return true
    })
    .map((item) => ({
      label: `${item.contractNo} · ${item.contractName || item.contractType}`,
      value: item.contractNo,
      contract: item,
    }))
}

/** 框架合同价解析（兼容原 resolveFrameworkContractPrice） */
export function resolveContractPrice(contract, productId, productCode, baseListPrice = 0) {
  if (!contract) {
    return {
      listUnitPriceExTax: baseListPrice,
      lineDiscountRate: 1,
      priceSource: 'product',
    }
  }

  const defaultRate = normalizeDiscountRate(contract.defaultDiscountRate, 1)
  const items = [
    ...(contract.priceItems || []),
    ...(contract.lineItems || []).map((line) => ({
      productId: line.productId,
      productCode: line.productCode,
      agreementUnitPriceExTax: line.unitPriceExTax,
      agreementDiscountRate: line.agreementDiscountRate,
    })),
  ]
  const hit =
    items.find((item) => item.productId && item.productId === productId) ||
    items.find((item) => item.productCode && item.productCode === productCode)

  if (hit?.agreementUnitPriceExTax != null && hit.agreementUnitPriceExTax !== '') {
    const agreementPrice = Number(hit.agreementUnitPriceExTax) || 0
    const baseList = baseListPrice > 0 ? baseListPrice : agreementPrice
    const rate = baseList > 0 ? agreementPrice / baseList : 1
    return {
      listUnitPriceExTax: baseList,
      lineDiscountRate: normalizeDiscountRate(rate, 1),
      priceSource: 'contract',
    }
  }

  if (hit?.agreementDiscountRate != null && hit.agreementDiscountRate !== '') {
    return {
      listUnitPriceExTax: baseListPrice,
      lineDiscountRate: normalizeDiscountRate(hit.agreementDiscountRate, defaultRate),
      priceSource: 'contract',
    }
  }

  if (contract.contractType === CONTRACT_TYPE.FRAMEWORK) {
    return {
      listUnitPriceExTax: baseListPrice,
      lineDiscountRate: defaultRate,
      priceSource: defaultRate < 1 ? 'contract' : 'product',
    }
  }

  return {
    listUnitPriceExTax: baseListPrice,
    lineDiscountRate: 1,
    priceSource: 'product',
  }
}

export function getOrdersLinkedToContract(contractNo) {
  if (!contractNo) return []
  // 延迟加载，避免 frameworkContractStore → salesContractStore → salesOrderStore → productionPlanStore 循环依赖
  // eslint-disable-next-line global-require
  const { salesOrderState } = require('@/store/salesOrderStore')
  void salesOrderState.orders
  return (salesOrderState.orders || []).filter((o) => o.contractNo === contractNo)
}

/** 已执行金额：关联销售订单含税/不含税合计 */
export function calcContractExecutedAmount(contract) {
  if (!contract?.contractNo) return 0
  const orders = getOrdersLinkedToContract(contract.contractNo)
  return (
    Math.round(
      orders.reduce((sum, o) => sum + (Number(o.totalAmountInTax ?? o.totalAmountExTax) || 0), 0) *
        100,
    ) / 100
  )
}

export function calcContractExecutedQty(contract) {
  if (!contract?.contractNo) return 0
  const orders = getOrdersLinkedToContract(contract.contractNo)
  return orders.reduce((sum, o) => {
    const lines = o.lineItems || []
    return sum + lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)
  }, 0)
}

export function getContractQuotaSummary(contract) {
  const executedAmount = calcContractExecutedAmount(contract)
  const executedQty = calcContractExecutedQty(contract)
  const limitAmount =
    contract?.limitAmount != null && contract.limitAmount !== ''
      ? Number(contract.limitAmount)
      : null
  const limitQty =
    contract?.limitQty != null && contract.limitQty !== '' ? Number(contract.limitQty) : null
  const remainAmount =
    limitAmount != null ? Math.round((limitAmount - executedAmount) * 100) / 100 : null
  const remainQty = limitQty != null ? Math.round((limitQty - executedQty) * 1000) / 1000 : null
  return {
    limitAmount,
    limitQty,
    executedAmount,
    executedQty,
    remainAmount,
    remainQty,
    allowExceedQuota: contract?.allowExceedQuota !== false,
  }
}

/**
 * 下单前额度预警（不拦单）
 * @returns {{ warn: boolean, message: string }}
 */
export function checkContractQuotaWarning(contract, nextOrderAmount = 0, nextOrderQty = 0) {
  if (!contract) return { warn: false, message: '' }
  const quota = getContractQuotaSummary(contract)
  const messages = []
  if (quota.limitAmount != null) {
    const after = Math.round((quota.executedAmount + Number(nextOrderAmount || 0)) * 100) / 100
    if (after > quota.limitAmount) {
      messages.push(
        `订单后累计金额 ${after} 将超过合同额度 ${quota.limitAmount}${
          quota.allowExceedQuota
            ? '（合同允许超额度，仅预警）'
            : '（合同不允许超额度，仅预警不拦截）'
        }`,
      )
    }
  }
  if (quota.limitQty != null) {
    const after = Math.round((quota.executedQty + Number(nextOrderQty || 0)) * 1000) / 1000
    if (after > quota.limitQty) {
      messages.push(
        `订单后累计数量 ${after} 将超过合同数量上限 ${quota.limitQty}${
          quota.allowExceedQuota
            ? '（合同允许超额度，仅预警）'
            : '（合同不允许超额度，仅预警不拦截）'
        }`,
      )
    }
  }
  return { warn: messages.length > 0, message: messages.join('；') }
}

export function addSalesContract(payload) {
  const row = normalizeContractRecord({
    ...payload,
    id: payload.id || `sc-${Date.now()}`,
    status: payload.status || CONTRACT_STATUS.DRAFT,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  if (!row.contractNo?.trim()) return { ok: false, message: '请输入合同编号' }
  if (!row.customerName?.trim()) return { ok: false, message: '请选择客户' }
  if (salesContractState.contracts.some((c) => c.contractNo === row.contractNo)) {
    return { ok: false, message: '合同编号已存在' }
  }
  salesContractState.contracts.unshift(row)
  return { ok: true, data: row }
}

export function updateSalesContract(id, patch) {
  const idx = salesContractState.contracts.findIndex((c) => c.id === id)
  if (idx < 0) return { ok: false, message: '合同不存在' }
  const nextNo = patch.contractNo != null ? String(patch.contractNo).trim() : null
  if (nextNo) {
    const dup = salesContractState.contracts.some((c) => c.id !== id && c.contractNo === nextNo)
    if (dup) return { ok: false, message: '合同编号已存在' }
  }
  salesContractState.contracts[idx] = normalizeContractRecord({
    ...salesContractState.contracts[idx],
    ...patch,
    id,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  return { ok: true, data: salesContractState.contracts[idx] }
}

export function deleteSalesContract(id) {
  const idx = salesContractState.contracts.findIndex((c) => c.id === id)
  if (idx < 0) return { ok: false, message: '合同不存在' }
  const row = salesContractState.contracts[idx]
  if (row.status === CONTRACT_STATUS.ACTIVE) {
    return { ok: false, message: '生效中的合同不可删除，请先终止' }
  }
  salesContractState.contracts.splice(idx, 1)
  return { ok: true }
}

export function submitSalesContract(id) {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (row.status !== CONTRACT_STATUS.DRAFT && row.status !== CONTRACT_STATUS.TERMINATED) {
    return { ok: false, message: '仅草稿可提交审核' }
  }
  return updateSalesContract(id, { status: CONTRACT_STATUS.PENDING })
}

export function approveSalesContract(id, operator = 'admin') {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (row.status !== CONTRACT_STATUS.PENDING && row.status !== CONTRACT_STATUS.DRAFT) {
    return { ok: false, message: '当前状态不可审核' }
  }
  return updateSalesContract(id, {
    status: CONTRACT_STATUS.ACTIVE,
    approvedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    approvedBy: operator,
  })
}

export function terminateSalesContract(id, reason = '') {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (row.status !== CONTRACT_STATUS.ACTIVE) {
    return { ok: false, message: '仅生效中的合同可终止' }
  }
  return updateSalesContract(id, {
    status: CONTRACT_STATUS.TERMINATED,
    terminatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    terminateReason: reason || '',
  })
}

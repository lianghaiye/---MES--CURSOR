import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'

const STORAGE_KEY = 'i_doms_framework_contracts'

function seedContracts() {
  return [
    {
      id: 'fc-1',
      contractNo: 'HT-20260528-001',
      contractName: '华东机械年度框架合同',
      customerName: '华东机械制造有限公司',
      contractType: '框架合同',
      defaultDiscountRate: 0.95,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      priceItems: [
        {
          id: 'fci-1',
          productCode: 'MD-200-BLK',
          productId: '',
          agreementDiscountRate: 0.9,
        },
      ],
      remark: '战略合作客户框架价',
      status: '生效中',
      createdAt: '2026-01-05 10:00',
      updatedAt: '2026-01-05 10:00',
    },
  ]
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.contracts)) return parsed.contracts
    }
  } catch {
    /* ignore */
  }
  return seedContracts()
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ contracts: frameworkContractState.contracts }),
  )
}

export const frameworkContractState = reactive({
  contracts: loadFromStorage(),
})

watch(
  () => frameworkContractState.contracts,
  () => persist(),
  { deep: true },
)

export function getFrameworkContractOptions(customerName = '') {
  const today = dayjs().format('YYYY-MM-DD')
  return frameworkContractState.contracts
    .filter((item) => item.status === '生效中')
    .filter((item) => !customerName || item.customerName === customerName)
    .filter((item) => {
      if (item.validFrom && today < item.validFrom) return false
      if (item.validTo && today > item.validTo) return false
      return true
    })
    .map((item) => ({
      label: `${item.contractNo} · ${item.contractName}`,
      value: item.contractNo,
      contract: item,
    }))
}

export function getFrameworkContractByNo(contractNo) {
  if (!contractNo) return null
  return frameworkContractState.contracts.find((item) => item.contractNo === contractNo) || null
}

/** 框架合同对产品行的折扣覆盖（在客户协议价之后） */
export function resolveFrameworkContractPrice(contract, productId, productCode, baseListPrice = 0) {
  if (!contract) {
    return {
      listUnitPriceExTax: baseListPrice,
      lineDiscountRate: 1,
      priceSource: 'product',
    }
  }

  const defaultRate = normalizeDiscountRate(contract.defaultDiscountRate, 1)
  const hit =
    (contract.priceItems || []).find((item) => item.productId && item.productId === productId) ||
    (contract.priceItems || []).find((item) => item.productCode && item.productCode === productCode)

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

  return {
    listUnitPriceExTax: baseListPrice,
    lineDiscountRate: defaultRate,
    priceSource: defaultRate < 1 ? 'contract' : 'product',
  }
}

export function addFrameworkContract(payload) {
  const row = {
    id: payload.id || `fc-${Date.now()}`,
    contractNo: payload.contractNo?.trim(),
    contractName: payload.contractName?.trim() || '',
    customerName: payload.customerName?.trim() || '',
    contractType: payload.contractType || '框架合同',
    defaultDiscountRate: payload.defaultDiscountRate ?? 1,
    validFrom: payload.validFrom || '',
    validTo: payload.validTo || '',
    priceItems: payload.priceItems || [],
    remark: payload.remark || '',
    status: payload.status || '生效中',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  if (!row.contractNo) return { ok: false, message: '请输入合同编号' }
  if (frameworkContractState.contracts.some((c) => c.contractNo === row.contractNo)) {
    return { ok: false, message: '合同编号已存在' }
  }
  frameworkContractState.contracts.unshift(row)
  return { ok: true, data: row }
}

export function updateFrameworkContract(id, patch) {
  const idx = frameworkContractState.contracts.findIndex((c) => c.id === id)
  if (idx < 0) return { ok: false, message: '框架合同不存在' }
  frameworkContractState.contracts[idx] = {
    ...frameworkContractState.contracts[idx],
    ...patch,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  return { ok: true, data: frameworkContractState.contracts[idx] }
}

export function deleteFrameworkContract(id) {
  const idx = frameworkContractState.contracts.findIndex((c) => c.id === id)
  if (idx < 0) return { ok: false, message: '框架合同不存在' }
  frameworkContractState.contracts.splice(idx, 1)
  return { ok: true }
}

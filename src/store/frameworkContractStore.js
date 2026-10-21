/**
 * 兼容层：原框架合同 store 转发到统一销售合同台账。
 * 新功能请直接使用 salesContractStore。
 */
import {
  addSalesContract,
  deleteSalesContract,
  getActiveSalesContractOptions,
  getSalesContractByNo,
  listSalesContracts,
  resolveContractPrice,
  salesContractState,
  updateSalesContract,
} from '@/store/salesContractStore'
import { CONTRACT_TYPE } from '@/constants/salesContract'

export const frameworkContractState = {
  get contracts() {
    return listSalesContracts({ contractType: CONTRACT_TYPE.FRAMEWORK })
  },
}

export function getFrameworkContractOptions(customerName = '') {
  return getActiveSalesContractOptions(customerName, CONTRACT_TYPE.FRAMEWORK)
}

export function getFrameworkContractByNo(contractNo) {
  const row = getSalesContractByNo(contractNo)
  if (!row) return null
  if (row.contractType && row.contractType !== CONTRACT_TYPE.FRAMEWORK) return row
  return row
}

export function resolveFrameworkContractPrice(contract, productId, productCode, baseListPrice = 0) {
  return resolveContractPrice(contract, productId, productCode, baseListPrice)
}

export function addFrameworkContract(payload) {
  return addSalesContract({
    ...payload,
    contractType: CONTRACT_TYPE.FRAMEWORK,
    status: payload.status || '生效中',
  })
}

export function updateFrameworkContract(id, patch) {
  return updateSalesContract(id, patch)
}

export function deleteFrameworkContract(id) {
  return deleteSalesContract(id)
}

/** 供调试：暴露统一状态 */
export { salesContractState }

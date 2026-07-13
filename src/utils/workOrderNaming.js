import dayjs from 'dayjs'
import {
  generateDisassemblyOrderCode,
  generateDisassemblyOrderName,
} from '@/utils/disassemblyWorkOrder'

export function resolveOrderField(custom, fallback) {
  const trimmed = typeof custom === 'string' ? custom.trim() : ''
  return trimmed || fallback()
}

export function isDuplicateOrderCode(code, existingCodes = [], excludeCode = '') {
  if (!code) return false
  return existingCodes.some((c) => c === code && c !== excludeCode)
}

/** 生产工单编号：WO + 年月日 + - + 3位流水 */
export function generateProductionWorkOrderCode(existingCodes = [], refDate = dayjs()) {
  const prefix = `WO${refDate.format('YYYYMMDD')}-`
  const maxSeq = (existingCodes || []).reduce((max, code) => {
    if (!String(code).startsWith(prefix)) return max
    const n = parseInt(String(code).slice(prefix.length), 10)
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

export function generateProductionWorkOrderName(productName, category = '生产工单') {
  return `${productName || ''}${category}`
}

/** 总装工单编号：ZZGD + 年月日 + 3位流水 */
export function generateAssemblyWorkOrderCode(existingCodes = [], refDate = dayjs()) {
  const prefix = `ZZGD${refDate.format('YYYYMMDD')}`
  const maxSeq = (existingCodes || []).reduce((max, code) => {
    if (!String(code).startsWith(prefix)) return max
    const n = parseInt(String(code).slice(prefix.length), 10)
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

export function generateAssemblyWorkOrderName(productName, orderCategory = '总装工单') {
  const suffix = orderCategory === '部装工单' ? '部装工单' : '总装工单'
  return `${productName || ''}${suffix}`
}

/** 质检工单编号：ZJGD + 年月日 + 3位流水 */
export function generateQcWorkOrderCode(existingCodes = [], refDate = dayjs()) {
  const prefix = `ZJGD${refDate.format('YYYYMMDD')}`
  const maxSeq = (existingCodes || []).reduce((max, code) => {
    if (!String(code).startsWith(prefix)) return max
    const n = parseInt(String(code).slice(prefix.length), 10)
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

export function generateQcWorkOrderName(productName) {
  return `${productName || ''}质检工单`
}

export { generateDisassemblyOrderCode, generateDisassemblyOrderName }

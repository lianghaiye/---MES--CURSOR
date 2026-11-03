/**
 * 全系统统一紧急度：特急 > 紧急 > 正常
 * 选项可取自系统/业务字典 code=urgency；字典未就绪时用兜底值。
 *
 * 注意：本文件不得顶层 import store/dictResolve，避免与工单 store 形成循环依赖
 *（normalizeUrgency 会在 workOrderStore 模块初始化时被调用）。
 */

export const URGENCY_DICT_CODE = 'urgency'

export const URGENCY = {
  CRITICAL: '特急',
  URGENT: '紧急',
  NORMAL: '正常',
}

/** 字典兜底（与系统字典种子一致） */
export const URGENCY_FALLBACK_VALUES = [URGENCY.CRITICAL, URGENCY.URGENT, URGENCY.NORMAL]

/**
 * 规范化紧急度（兼容旧同义词）
 * 加急 → 特急；普通 → 正常；已是特急/紧急/正常则原样
 */
export function normalizeUrgency(value) {
  const u = String(value || '').trim()
  if (!u) return URGENCY.NORMAL
  if (u === URGENCY.CRITICAL || u === '加急') return URGENCY.CRITICAL
  if (u === URGENCY.URGENT || u === '紧急') return URGENCY.URGENT
  if (u === URGENCY.NORMAL || u === '普通' || u === '正常') return URGENCY.NORMAL
  return URGENCY.NORMAL
}

function readDictOptions() {
  try {
    // 运行时再取，避免 constants ↔ store 循环依赖
    const { getEffectiveDictOptions } = require('@/utils/dictResolve')
    return getEffectiveDictOptions(URGENCY_DICT_CODE)
  } catch {
    return null
  }
}

function readDictValues() {
  try {
    const { getEffectiveDictValues } = require('@/utils/dictResolve')
    return getEffectiveDictValues(URGENCY_DICT_CODE)
  } catch {
    return null
  }
}

export function getUrgencyValues() {
  const fromDict = readDictValues()
  return fromDict?.length ? fromDict : [...URGENCY_FALLBACK_VALUES]
}

export function getUrgencyOptions() {
  const fromDict = readDictOptions()
  if (fromDict?.length) return fromDict
  return URGENCY_FALLBACK_VALUES.map((v) => ({ label: v, value: v }))
}

/**
 * 兼容旧 `import { urgencyOptions } from '...'`
 * 静态兜底；下拉请优先用 getUrgencyOptions()
 */
export const urgencyOptions = URGENCY_FALLBACK_VALUES

export function urgencyRank(value) {
  const u = normalizeUrgency(value)
  if (u === URGENCY.CRITICAL) return 3
  if (u === URGENCY.URGENT) return 2
  return 1
}

export function urgencyLabel(value) {
  return normalizeUrgency(value)
}

export function urgencyTagColor(value) {
  const u = normalizeUrgency(value)
  if (u === URGENCY.CRITICAL) return 'error'
  if (u === URGENCY.URGENT) return 'warning'
  return 'default'
}

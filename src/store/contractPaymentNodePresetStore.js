import { reactive, watch } from 'vue'
import {
  CONTRACT_CASH_DIRECTION,
  CONTRACT_TYPE,
  defaultPaymentNodesFor,
} from '@/constants/salesContract'

const STORAGE_KEY = 'i_doms_contract_payment_node_presets'
const DATA_VERSION = 2

function makeNode(partial = {}) {
  return {
    id: partial.id || `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: partial.name || '',
    ratio: partial.ratio != null && partial.ratio !== '' ? Number(partial.ratio) : null,
    amount: partial.amount != null && partial.amount !== '' ? Number(partial.amount) : null,
    termStartType: partial.termStartType || '',
    planDate: partial.planDate ? String(partial.planDate).slice(0, 10) : '',
    remark: partial.remark || '',
  }
}

function cloneDefaultNodes(cashDirection) {
  return defaultPaymentNodesFor(cashDirection).map((item) => makeNode({ ...item }))
}

function normalizeNodes(list, cashDirection) {
  if (!Array.isArray(list) || !list.length) return cloneDefaultNodes(cashDirection)
  return list.map((item) => makeNode(item))
}

function nodesFingerprint(list) {
  return JSON.stringify(
    (list || []).map((n) => ({
      name: n.name || '',
      ratio: n.ratio,
      termStartType: n.termStartType || '',
    })),
  )
}

function emptyBucket(cashDirection) {
  const defaults = cloneDefaultNodes(cashDirection)
  return {
    shared: true,
    standard: defaults,
    framework: cloneDefaultNodes(cashDirection),
  }
}

function normalizeBucket(raw, cashDirection) {
  const standard = normalizeNodes(raw?.standard, cashDirection)
  const framework = normalizeNodes(raw?.framework, cashDirection)
  const shared =
    typeof raw?.shared === 'boolean'
      ? raw.shared
      : nodesFingerprint(standard) === nodesFingerprint(framework)
  return { shared, standard, framework }
}

function resolveDirection(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? CONTRACT_CASH_DIRECTION.EXPENSE
    : CONTRACT_CASH_DIRECTION.INCOME
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && parsed.income && parsed.expense) {
        return {
          income: normalizeBucket(parsed.income, CONTRACT_CASH_DIRECTION.INCOME),
          expense: normalizeBucket(parsed.expense, CONTRACT_CASH_DIRECTION.EXPENSE),
        }
      }
      // 旧版只有标准/框架，视为收入合同预设
      if (parsed.standard || parsed.framework) {
        return {
          income: normalizeBucket(parsed, CONTRACT_CASH_DIRECTION.INCOME),
          expense: emptyBucket(CONTRACT_CASH_DIRECTION.EXPENSE),
        }
      }
    }
  } catch {
    /* ignore */
  }
  return {
    income: emptyBucket(CONTRACT_CASH_DIRECTION.INCOME),
    expense: emptyBucket(CONTRACT_CASH_DIRECTION.EXPENSE),
  }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: DATA_VERSION,
      income: {
        shared: contractPaymentNodePresetState.income.shared,
        standard: contractPaymentNodePresetState.income.standard,
        framework: contractPaymentNodePresetState.income.framework,
      },
      expense: {
        shared: contractPaymentNodePresetState.expense.shared,
        standard: contractPaymentNodePresetState.expense.standard,
        framework: contractPaymentNodePresetState.expense.framework,
      },
    }),
  )
}

const loaded = load()

export const contractPaymentNodePresetState = reactive({
  income: loaded.income,
  expense: loaded.expense,
})

watch(contractPaymentNodePresetState, () => persist(), { deep: true })

export function getPresetBucket(cashDirection) {
  return resolveDirection(cashDirection) === CONTRACT_CASH_DIRECTION.EXPENSE
    ? contractPaymentNodePresetState.expense
    : contractPaymentNodePresetState.income
}

/** 按收支方向 + 合同类型取公司级预设节点（深拷贝，避免表单改到预设） */
export function getPresetPaymentNodes(contractType, cashDirection) {
  const isFramework = contractType === CONTRACT_TYPE.FRAMEWORK
  const bucket = getPresetBucket(cashDirection)
  const source = bucket.shared ? bucket.standard : isFramework ? bucket.framework : bucket.standard
  return normalizeNodes(source, cashDirection).map((n) =>
    makeNode({ ...n, id: `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }),
  )
}

export function savePaymentNodePresets({ cashDirection, shared, standard, framework } = {}) {
  const bucket = getPresetBucket(cashDirection)
  const dir = resolveDirection(cashDirection)
  if (typeof shared === 'boolean') {
    bucket.shared = shared
  }
  if (Array.isArray(standard)) {
    bucket.standard = normalizeNodes(standard, dir)
  }
  if (Array.isArray(framework)) {
    bucket.framework = normalizeNodes(framework, dir)
  }
  if (bucket.shared) {
    const one = normalizeNodes(bucket.standard, dir)
    bucket.standard = one
    bucket.framework = normalizeNodes(one, dir)
  }
  return { ok: true }
}

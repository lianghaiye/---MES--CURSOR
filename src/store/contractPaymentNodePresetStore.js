import { reactive, watch } from 'vue'
import { CONTRACT_TYPE, DEFAULT_PAYMENT_NODES } from '@/constants/salesContract'

const STORAGE_KEY = 'i_doms_contract_payment_node_presets'

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

function cloneDefaultNodes() {
  return DEFAULT_PAYMENT_NODES.map((item) => makeNode({ ...item }))
}

function normalizeNodes(list) {
  if (!Array.isArray(list) || !list.length) return cloneDefaultNodes()
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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const standard = normalizeNodes(parsed.standard)
      const framework = normalizeNodes(parsed.framework)
      const shared =
        typeof parsed.shared === 'boolean'
          ? parsed.shared
          : nodesFingerprint(standard) === nodesFingerprint(framework)
      return { standard, framework, shared }
    }
  } catch {
    /* ignore */
  }
  const defaults = cloneDefaultNodes()
  return {
    standard: defaults,
    framework: cloneDefaultNodes(),
    shared: true,
  }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      shared: contractPaymentNodePresetState.shared,
      standard: contractPaymentNodePresetState.standard,
      framework: contractPaymentNodePresetState.framework,
    }),
  )
}

const loaded = load()

export const contractPaymentNodePresetState = reactive({
  shared: loaded.shared,
  standard: loaded.standard,
  framework: loaded.framework,
})

watch(contractPaymentNodePresetState, () => persist(), { deep: true })

/** 按合同类型取公司级预设节点（深拷贝，避免表单改到预设） */
export function getPresetPaymentNodes(contractType) {
  const isFramework = contractType === CONTRACT_TYPE.FRAMEWORK
  const source = contractPaymentNodePresetState.shared
    ? contractPaymentNodePresetState.standard
    : isFramework
      ? contractPaymentNodePresetState.framework
      : contractPaymentNodePresetState.standard
  return normalizeNodes(source).map((n) =>
    makeNode({ ...n, id: `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }),
  )
}

export function savePaymentNodePresets({ shared, standard, framework } = {}) {
  if (typeof shared === 'boolean') {
    contractPaymentNodePresetState.shared = shared
  }
  if (Array.isArray(standard)) {
    contractPaymentNodePresetState.standard = normalizeNodes(standard)
  }
  if (Array.isArray(framework)) {
    contractPaymentNodePresetState.framework = normalizeNodes(framework)
  }
  if (contractPaymentNodePresetState.shared) {
    // 共用时两边落同一份
    const one = normalizeNodes(contractPaymentNodePresetState.standard)
    contractPaymentNodePresetState.standard = one
    contractPaymentNodePresetState.framework = normalizeNodes(one)
  }
  return { ok: true }
}

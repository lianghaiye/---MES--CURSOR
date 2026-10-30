import { reactive, watch } from 'vue'
import { DEFAULT_PAYMENT_NODES } from '@/constants/salesContract'

const STORAGE_KEY = 'i_doms_sales_order_payment_node_presets'
const DATA_VERSION = 1

function makeNode(partial = {}) {
  return {
    id: partial.id || `sopn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: partial.name || '',
    ratio: partial.ratio != null && partial.ratio !== '' ? Number(partial.ratio) : null,
    amount: partial.amount != null && partial.amount !== '' ? Number(partial.amount) : null,
    termStartType: partial.termStartType || '',
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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.nodes)) {
        return { nodes: normalizeNodes(parsed.nodes) }
      }
    }
  } catch {
    /* ignore */
  }
  return { nodes: cloneDefaultNodes() }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: DATA_VERSION,
      nodes: salesOrderPaymentNodePresetState.nodes,
    }),
  )
}

const loaded = load()

export const salesOrderPaymentNodePresetState = reactive({
  nodes: loaded.nodes,
})

watch(salesOrderPaymentNodePresetState, () => persist(), { deep: true })

/** 公司级订单回款节点预设（深拷贝，避免表单改到预设） */
export function getOrderPresetPaymentNodes() {
  return normalizeNodes(salesOrderPaymentNodePresetState.nodes).map((n) =>
    makeNode({ ...n, id: `sopn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }),
  )
}

export function saveOrderPaymentNodePresets(nodes = []) {
  salesOrderPaymentNodePresetState.nodes = normalizeNodes(nodes)
  return { ok: true }
}

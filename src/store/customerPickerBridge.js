import { reactive } from 'vue'

/**
 * 选客弹窗 → 新标签「新增客户」→ 保存后回填原表单
 */
export const customerPickerBridge = reactive({
  /** @type {null | { returnPath: string, returnTitle?: string }} */
  pending: null,
  /** @type {null | { id: string, name: string }} */
  created: null,
})

function tabBasePath(p) {
  return String(p || '').split('?')[0]
}

export function beginCustomerCreateFromPicker({ returnPath, returnTitle } = {}) {
  customerPickerBridge.pending = {
    returnPath: returnPath || '',
    returnTitle: returnTitle || '',
  }
  customerPickerBridge.created = null
}

/**
 * 标记新建客户待回填。若内存 pending 丢失，可用 fallbackPending（来自路由 query）补回。
 * @returns {null | { returnPath: string, returnTitle?: string }}
 */
export function markCustomerCreatedFromPicker(customer, fallbackPending) {
  if (!customerPickerBridge.pending && fallbackPending?.returnPath) {
    customerPickerBridge.pending = {
      returnPath: fallbackPending.returnPath,
      returnTitle: fallbackPending.returnTitle || '',
    }
  }
  if (!customerPickerBridge.pending) return null
  if (!customer?.id && !customer?.name) return null
  customerPickerBridge.created = {
    id: customer.id || '',
    name: customer.name || '',
  }
  return { ...customerPickerBridge.pending }
}

/** 当前路由是否为发起「新增客户」的表单页（仅该页应消费回填） */
export function isCustomerPickerReturnRoute(
  currentPathOrFull,
  pending = customerPickerBridge.pending,
) {
  if (!pending?.returnPath) return false
  const current = tabBasePath(currentPathOrFull)
  const expected = tabBasePath(pending.returnPath)
  return Boolean(current && expected && current === expected)
}

export function consumeCreatedCustomerFromPicker() {
  const created = customerPickerBridge.created
  customerPickerBridge.created = null
  customerPickerBridge.pending = null
  return created
}

export function clearCustomerPickerBridge() {
  customerPickerBridge.pending = null
  customerPickerBridge.created = null
}

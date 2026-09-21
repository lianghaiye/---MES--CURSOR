/**
 * 产品/物料标签打印：sessionStorage + 页内预览打印
 * 二维码内容 = 产品/物料编码，供小程序扫码匹配
 */
import { message } from 'ant-design-vue'

const STORAGE_PREFIX = 'product-label-print-preview:'
export const PRODUCT_LABEL_PRINT_PATH = '/product-process/product-label-print-preview'

/**
 * @param {import('vue-router').Router} router
 * @param {(path: string, title?: string) => void} openTab
 * @param {Array<object>} items
 * @param {{ copies?: number }} [opts]
 */
export function openProductLabelPrintPreview(router, openTab, items = [], opts = {}) {
  const list = (Array.isArray(items) ? items : [])
    .map((item) => normalizeLabelItem(item))
    .filter((item) => item.code)
  if (!list.length) {
    message.warning('请先选择有编码的产品/物料')
    return { ok: false }
  }
  const copies = Math.min(99, Math.max(1, Number(opts.copies) || 1))
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const payload = {
    copies,
    items: list,
    createdAt: new Date().toISOString(),
  }
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${token}`, JSON.stringify(payload))
  } catch (err) {
    console.error('[productLabelPrint] save failed', err)
    message.error('无法打开打印预览')
    return { ok: false }
  }
  const path = `${PRODUCT_LABEL_PRINT_PATH}?token=${encodeURIComponent(token)}`
  openTab?.(path, `打印标签(${list.length})`)
  router.push(path)
  return { ok: true, path }
}

export function loadProductLabelPrintPayload(token) {
  if (!token) return null
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${token}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function normalizeLabelItem(item) {
  const code = String(item?.code || item?.itemCode || '').trim()
  return {
    id: item?.id || code,
    code,
    name: String(item?.name || item?.itemName || '').trim(),
    specModel: String(item?.specModel || item?.spec || '').trim(),
    material: String(item?.material || '').trim(),
    barcodeType: String(item?.barcodeType || '').trim(),
    inventoryUnit: String(item?.inventoryUnit || item?.stockUnit || item?.unit || '').trim(),
  }
}

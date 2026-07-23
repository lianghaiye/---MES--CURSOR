import { buildWorkOrderDetail } from '@/mock/workOrderDetail'
import {
  formatWorkOrderPlanDateRange,
  resolveWorkOrderDeliveryDate,
  resolveWorkOrderVariantSummary,
} from '@/utils/workOrderBasicFields'
import {
  formatProcessExecutors,
  formatProcessFeedingSummary,
} from '@/utils/workOrderProcessDisplay'

const STORAGE_PREFIX = 'work-order-print-preview:'

function formatPrintFieldValue(value) {
  if (value === 0) return '0'
  return String(value ?? '').trim()
}

function formatPrintPlanDateRange(range) {
  const text = formatWorkOrderPlanDateRange(range)
  return text === '—' ? '' : text
}

function printProcessText(value) {
  const text = String(value ?? '').trim()
  if (!text || text === '—') return ''
  return text
}

function printProcessFeeding(process) {
  return printProcessText(formatProcessFeedingSummary(process))
}

function printProcessExecutors(process) {
  return printProcessText(formatProcessExecutors(process))
}

/** 构建工单打印/预览数据 */
export function buildWorkOrderPrintPayload(workOrder, options = {}) {
  if (!workOrder) return null

  const detail = buildWorkOrderDetail(workOrder)
  const processes = (detail?.processes || workOrder.processes || []).map((p, index) => ({
    seq: index + 1,
    name: printProcessText(p.name),
    processContent: printProcessText(p.processContent),
    feeding: printProcessFeeding(p),
    executors: printProcessExecutors(p),
    finishDate: printProcessText(p.finishDate),
    inspection: printProcessText(p.inspection),
    remark: printProcessText(p.remark),
  }))

  const basicFields = [
    { label: '销售单号', value: workOrder.sourceOrderNo },
    { label: '交付日期', value: resolveWorkOrderDeliveryDate(workOrder) },
    { label: '产品名称', value: workOrder.productName },
    { label: '规格型号', value: workOrder.specModel },
    { label: '材质', value: workOrder.material },
    { label: '变体属性', value: resolveWorkOrderVariantSummary(workOrder) },
    { label: '图号', value: workOrder.drawingNo },
    { label: '排产数量', value: workOrder.scheduleQty },
    { label: '工作中心', value: workOrder.workCenter },
    { label: '预入仓库', value: workOrder.warehouse },
    { label: '紧急度', value: workOrder.urgency },
    {
      label: '计划日期',
      value: formatPrintPlanDateRange(workOrder.planDateRange),
    },
    { label: '负责人', value: workOrder.owner },
    { label: '技术参数', value: workOrder.techParams, wide: true },
    { label: '配套要求', value: workOrder.matchingRequirements, wide: true },
    { label: '工单备注', value: workOrder.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  return {
    code: formatPrintFieldValue(workOrder.code),
    name: formatPrintFieldValue(workOrder.name),
    productName: formatPrintFieldValue(workOrder.productName || workOrder.name),
    orderCategory: formatPrintFieldValue(workOrder.orderCategory || '生产工单'),
    basicFields,
    processes,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

/** 构建批量工单打印数据 */
export function buildWorkOrderBatchPrintPayload(workOrders, options = {}) {
  const sheets = (workOrders || [])
    .map((wo) => buildWorkOrderPrintPayload(wo, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveWorkOrderPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadWorkOrderPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openWorkOrderPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveWorkOrderPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'production-work-order-preview', query })
  window.open(href, '_blank')
}

export function openWorkOrderBatchPrintPreview(router, workOrders, options = {}) {
  const payload = buildWorkOrderBatchPrintPayload(workOrders, options)
  if (!payload) return
  openWorkOrderPrintPreview(router, payload, options)
}

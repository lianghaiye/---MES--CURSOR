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
import { buildWorkOrderDispatchEbomSnapshot } from '@/utils/workOrderEbomTree'

const STORAGE_PREFIX = 'work-order-print-preview:'

/** 打印内容：仅工单 / 工单+BOM */
export const WORK_ORDER_PRINT_CONTENT = {
  ORDER_ONLY: 'order_only',
  ORDER_WITH_BOM: 'order_with_bom',
}

export const WORK_ORDER_PRINT_CONTENT_OPTIONS = [
  { label: '仅工单', value: WORK_ORDER_PRINT_CONTENT.ORDER_ONLY },
  { label: '工单+BOM', value: WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM },
]

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

function formatPrintQty(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Math.round(n * 10000) / 10000)
}

/** 将 EBOM 物料树展平为打印清单行（含子件层级） */
export function flattenWorkOrderPrintBomMaterials(materials = [], out = []) {
  for (const m of materials || []) {
    if (!m) continue
    out.push({
      itemName: formatPrintFieldValue(m.name || m.itemName),
      itemCode: formatPrintFieldValue(m.code || m.itemCode || m.materialCode),
      specModel: formatPrintFieldValue(m.spec || m.specModel),
      material: formatPrintFieldValue(m.material),
      drawingNo: formatPrintFieldValue(m.drawingNo),
      blankSizeText: formatPrintFieldValue(m.blankSizeText),
      unitQty: formatPrintQty(m.unitUsage ?? m.unitQty),
      unit: formatPrintFieldValue(m.unit),
    })
    if (Array.isArray(m.children) && m.children.length) {
      flattenWorkOrderPrintBomMaterials(m.children, out)
    }
  }
  return out
}

function buildPrintBomLines(workOrder) {
  const snapshot = buildWorkOrderDispatchEbomSnapshot(workOrder)
  const materials = snapshot?.materials || []
  const flat = flattenWorkOrderPrintBomMaterials(materials)
  return flat.map((row, index) => ({
    seq: index + 1,
    ...row,
  }))
}

/** 构建工单打印/预览数据 */
export function buildWorkOrderPrintPayload(workOrder, options = {}) {
  if (!workOrder) return null

  const printContent =
    options.printContent === WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM
      ? WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM
      : WORK_ORDER_PRINT_CONTENT.ORDER_ONLY

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

  const bomLines =
    printContent === WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM ? buildPrintBomLines(workOrder) : []

  return {
    code: formatPrintFieldValue(workOrder.code),
    name: formatPrintFieldValue(workOrder.name),
    productName: formatPrintFieldValue(workOrder.productName || workOrder.name),
    orderCategory: formatPrintFieldValue(workOrder.orderCategory || '生产工单'),
    basicFields,
    processes,
    bomLines,
    printContent,
    includeBom: printContent === WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM,
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
    printContent: options.printContent || WORK_ORDER_PRINT_CONTENT.ORDER_ONLY,
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

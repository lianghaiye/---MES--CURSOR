import { buildWorkOrderDetail } from '@/mock/workOrderDetail'
import {
  formatWorkOrderPlanDateRange,
  resolveWorkOrderDeliveryDate,
  resolveWorkOrderVariantSummary,
} from '@/utils/workOrderBasicFields'
import {
  formatProcessExecutors,
  formatWorkOrderProcessConfigText,
  formatWorkOrderProcessExecutionMode,
} from '@/utils/workOrderProcessDisplay'
import { formatBlankingMaterialsSummary } from '@/utils/blankingSettleMaterial'
import { buildWorkOrderDispatchEbomSnapshot } from '@/utils/workOrderEbomTree'
import {
  WORK_ORDER_QR_MODE,
  WORK_ORDER_QR_SCOPE,
  buildWorkOrderQrScanPath,
  issueWorkOrderQrToken,
} from '@/utils/workOrderQrToken'
import QRCode from 'qrcode'

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

function printProcessExecutors(process) {
  return printProcessText(formatProcessExecutors(process))
}

function printBlankingMaterials(process) {
  return printProcessText(formatBlankingMaterialsSummary(process))
}

function printOutsourceStatus(process) {
  return printProcessText(process?.outsourceStatus)
}

function formatPrintQty(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Math.round(n * 10000) / 10000)
}

async function buildQrBlock({ token, tip }) {
  if (!token) return null
  const path = buildWorkOrderQrScanPath(token)
  let dataUrl = ''
  try {
    dataUrl = await QRCode.toDataURL(path, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
  } catch {
    dataUrl = ''
  }
  return { token, tip: tip || '', path, dataUrl }
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

function normalizeQrOptions(options = {}) {
  const qrEnabled = Boolean(options.qrEnabled)
  const qrMode = [
    WORK_ORDER_QR_MODE.ORDER,
    WORK_ORDER_QR_MODE.PROCESS,
    WORK_ORDER_QR_MODE.BOTH,
  ].includes(options.qrMode)
    ? options.qrMode
    : WORK_ORDER_QR_MODE.ORDER
  return { qrEnabled, qrMode }
}

/** 构建工单打印/预览数据 */
export async function buildWorkOrderPrintPayload(workOrder, options = {}) {
  if (!workOrder) return null

  const printContent =
    options.printContent === WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM
      ? WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM
      : WORK_ORDER_PRINT_CONTENT.ORDER_ONLY

  const { qrEnabled, qrMode } = normalizeQrOptions(options)
  const needOrderQr =
    qrEnabled && (qrMode === WORK_ORDER_QR_MODE.ORDER || qrMode === WORK_ORDER_QR_MODE.BOTH)
  const needProcessQr =
    qrEnabled && (qrMode === WORK_ORDER_QR_MODE.PROCESS || qrMode === WORK_ORDER_QR_MODE.BOTH)

  const detail = buildWorkOrderDetail(workOrder)
  const rawProcesses = detail?.processes || workOrder.processes || []
  const processes = []
  for (let index = 0; index < rawProcesses.length; index += 1) {
    const p = rawProcesses[index]
    const seq = Number(p.seq) > 0 ? Number(p.seq) : index + 1
    const row = {
      seq,
      id: p.id || '',
      name: printProcessText(p.name),
      processConfig: printProcessText(formatWorkOrderProcessConfigText(p)),
      resourceType: printProcessText(p.resourceType || '工人'),
      executionMode: printProcessText(formatWorkOrderProcessExecutionMode(p)),
      executors: printProcessExecutors(p),
      blankingMaterials: printBlankingMaterials(p),
      outsourceStatus: printOutsourceStatus(p),
      processContent: printProcessText(p.processContent),
      qr: null,
    }
    if (needProcessQr && workOrder.id) {
      const token = issueWorkOrderQrToken({
        scope: WORK_ORDER_QR_SCOPE.PROCESS,
        workOrderId: workOrder.id,
        processSeq: seq,
        processName: p.name,
      })
      row.qr = await buildQrBlock({
        token,
        tip: `${formatPrintFieldValue(workOrder.code)} · ${printProcessText(p.name) || `工序${seq}`}`,
      })
    }
    processes.push(row)
  }

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
    { label: '负责人', value: workOrder.owner },
    {
      label: '计划日期',
      value: formatPrintPlanDateRange(workOrder.planDateRange),
      wide: true,
    },
    { label: '技术参数', value: workOrder.techParams, wide: true },
    { label: '配套要求', value: workOrder.matchingRequirements, wide: true },
    { label: '工单备注', value: workOrder.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const bomLines =
    printContent === WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM ? buildPrintBomLines(workOrder) : []

  let qrOrder = null
  if (needOrderQr && workOrder.id) {
    const token = issueWorkOrderQrToken({
      scope: WORK_ORDER_QR_SCOPE.ORDER,
      workOrderId: workOrder.id,
    })
    qrOrder = await buildQrBlock({
      token,
      tip: `工单 ${formatPrintFieldValue(workOrder.code)} · 扫码查看工序任务`,
    })
  }

  return {
    workOrderId: workOrder.id || '',
    code: formatPrintFieldValue(workOrder.code),
    name: formatPrintFieldValue(workOrder.name),
    productName: formatPrintFieldValue(workOrder.productName || workOrder.name),
    orderCategory: formatPrintFieldValue(workOrder.orderCategory || '生产工单'),
    basicFields,
    processes,
    bomLines,
    qrOrder,
    qrEnabled,
    qrMode,
    printContent,
    includeBom: printContent === WORK_ORDER_PRINT_CONTENT.ORDER_WITH_BOM,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

/** 构建批量工单打印数据 */
export async function buildWorkOrderBatchPrintPayload(workOrders, options = {}) {
  const sheets = []
  for (const wo of workOrders || []) {
    const sheet = await buildWorkOrderPrintPayload(wo, options)
    if (sheet) sheets.push(sheet)
  }
  if (!sheets.length) return null
  const { qrEnabled, qrMode } = normalizeQrOptions(options)
  return {
    sheets,
    printContent: options.printContent || WORK_ORDER_PRINT_CONTENT.ORDER_ONLY,
    qrEnabled,
    qrMode,
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

export async function openWorkOrderBatchPrintPreview(router, workOrders, options = {}) {
  const payload = await buildWorkOrderBatchPrintPayload(workOrders, options)
  if (!payload) return
  openWorkOrderPrintPreview(router, payload, options)
}

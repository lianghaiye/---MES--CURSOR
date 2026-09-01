/**
 * 外协订单打印：派单工 / 发料出库单
 */

import { formatNumber } from '@/utils/numberFormat'

export const OUTSOURCING_PRINT_TEMPLATE = {
  DISPATCH: '派单工',
  ISSUE: '发料出库单',
}

const STORAGE_PREFIX = 'outsourcing-order-print-preview:'

function formatPrintFieldValue(value) {
  if (value === 0) return '0'
  return String(value ?? '').trim()
}

function formatPrintQty(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Math.round(n * 10000) / 10000)
}

function formatPrintMoney(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  return formatNumber(n, 4, { empty: '' })
}

/** 计划日期：开始日期 ~ 结束日期 */
export function formatOutsourcingPlanDateRange(order) {
  const start = String(order?.planStartDate || '').trim()
  const end = String(order?.planEndDate || order?.planDate || '').trim()
  if (start && end) return start === end ? start : `${start} ~ ${end}`
  if (end) return end
  if (start) return start
  return ''
}

function resolveIssueOrderNo(order, warehouse) {
  const wh = String(warehouse || '').trim()
  const orders = order?.issueOrders || []
  if (!orders.length) return ''
  const hit =
    orders.find((o) => String(o.shipWarehouse || '').trim() === wh) ||
    (orders.length === 1 ? orders[0] : null)
  return String(hit?.issueOrderNo || '').trim()
}

/** 派单工：外协加工派工单（给供应商看加工内容与计价） */
export function buildOutsourcingDispatchPrintPayload(order, options = {}) {
  if (!order) return null

  const lineItems = (order.lineItems || []).map((line, index) => ({
    seq: index + 1,
    productName: formatPrintFieldValue(line.productName || line.itemName),
    productCode: formatPrintFieldValue(line.productCode || line.itemCode),
    specModel: formatPrintFieldValue(line.specModel),
    variantSummary: formatPrintFieldValue(line.variantSummary),
    material: formatPrintFieldValue(line.material),
    drawingNo: formatPrintFieldValue(line.drawingNo),
    planQty: formatPrintQty(line.planQty),
    unit: formatPrintFieldValue(line.unit),
    billingMethod: formatPrintFieldValue(line.billingMethod),
    unitPriceInTax: formatPrintMoney(line.unitPriceInTax),
    unitPriceExTax: formatPrintMoney(line.unitPriceExTax),
    totalPriceInTax: formatPrintMoney(line.totalPriceInTax),
    totalPriceExTax: formatPrintMoney(line.totalPriceExTax),
    remark: formatPrintFieldValue(line.remark),
  }))

  const basicFields = [
    { label: '外协单号', value: order.orderNo },
    { label: '工单名称', value: order.workOrderName },
    { label: '供应商', value: order.supplier },
    { label: '销售单号', value: order.salesOrderNo },
    { label: '计划日期', value: formatOutsourcingPlanDateRange(order) },
    { label: '供货期/天', value: order.leadTimeDays },
    { label: '联系人', value: order.contactPerson },
    { label: '联系电话', value: order.contactPhone },
    { label: '结算类型', value: order.settlementType },
    { label: '结算周期', value: order.settlementCycle },
    { label: '结算方式', value: order.settlementMethod },
    { label: '单据状态', value: order.status },
    { label: '备注', value: order.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value),
  }))

  const totalQty = (order.lineItems || []).reduce((s, l) => s + (Number(l.planQty) || 0), 0)
  const amountInTax = (order.lineItems || []).reduce(
    (s, l) => s + (Number(l.totalPriceInTax) || 0),
    0,
  )
  const amountExTax = (order.lineItems || []).reduce(
    (s, l) => s + (Number(l.totalPriceExTax) || 0),
    0,
  )

  return {
    templateType: OUTSOURCING_PRINT_TEMPLATE.DISPATCH,
    orderNo: formatPrintFieldValue(order.orderNo),
    title: '外协派工单',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalQty: formatPrintQty(totalQty),
      amountInTax: formatPrintMoney(amountInTax),
      amountExTax: formatPrintMoney(amountExTax),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

/**
 * 发料出库单：按出货仓库拆页
 * 计划数量取计划值；发料数量留空（现场手填）
 */
export function buildOutsourcingIssuePrintPayload(order, options = {}) {
  if (!order) return null

  const groups = new Map()
  ;(order.lineItems || []).forEach((line) => {
    const wh = String(line.shipWarehouse || '未指定仓库').trim() || '未指定仓库'
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push(line)
  })

  if (!groups.size) {
    groups.set('未指定仓库', [])
  }

  const sheets = []
  let sheetIndex = 0
  groups.forEach((lines, warehouse) => {
    sheetIndex += 1
    const lineItems = lines.map((line, index) => {
      const plan = Number(line.planQty) || 0
      return {
        seq: index + 1,
        productName: formatPrintFieldValue(line.productName || line.itemName),
        productCode: formatPrintFieldValue(line.productCode || line.itemCode),
        specModel: formatPrintFieldValue(line.specModel),
        material: formatPrintFieldValue(line.material),
        drawingNo: formatPrintFieldValue(line.drawingNo),
        planQty: formatPrintQty(plan),
        issueQty: '',
        unit: formatPrintFieldValue(line.unit),
        shipWarehouse: formatPrintFieldValue(line.shipWarehouse || warehouse),
        remark: formatPrintFieldValue(line.remark),
      }
    })

    const totalPlanQty = lines.reduce((s, l) => s + (Number(l.planQty) || 0), 0)

    const issueOrderNo = resolveIssueOrderNo(order, warehouse)
    const basicFields = [
      { label: '出库单号', value: issueOrderNo },
      { label: '工单名称', value: order.workOrderName },
      { label: '供应商', value: order.supplier },
      { label: '销售单号', value: order.salesOrderNo },
      { label: '出货仓库', value: warehouse },
      { label: '计划日期', value: formatOutsourcingPlanDateRange(order) },
      { label: '发料状态', value: order.issueStatus },
      { label: '联系人', value: order.contactPerson },
      { label: '联系电话', value: order.contactPhone },
      { label: '备注', value: order.remark, wide: true },
    ].map((field) => ({
      ...field,
      value: formatPrintFieldValue(field.value),
    }))

    sheets.push({
      templateType: OUTSOURCING_PRINT_TEMPLATE.ISSUE,
      orderNo: formatPrintFieldValue(order.orderNo),
      title: '外协发料出库单',
      warehouse: formatPrintFieldValue(warehouse),
      sheetSeq: sheetIndex,
      basicFields,
      lineItems,
      summary: {
        lineCount: String(lineItems.length),
        totalQty: formatPrintQty(totalPlanQty),
      },
      paper: options.paper || 'A4',
      orientation: options.orientation || 'portrait',
      printedAt: new Date().toISOString(),
    })
  })

  if (sheets.length === 1) return sheets[0]
  return {
    sheets,
    templateType: OUTSOURCING_PRINT_TEMPLATE.ISSUE,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildOutsourcingPrintPayload(order, templateType, options = {}) {
  if (templateType === OUTSOURCING_PRINT_TEMPLATE.ISSUE) {
    return buildOutsourcingIssuePrintPayload(order, options)
  }
  return buildOutsourcingDispatchPrintPayload(order, options)
}

/** 批量：多张外协订单；发料出库单会按仓库继续拆页 */
export function buildOutsourcingBatchPrintPayload(orders, templateType, options = {}) {
  const sheets = []
  ;(orders || []).forEach((order) => {
    const payload = buildOutsourcingPrintPayload(order, templateType, options)
    if (!payload) return
    if (payload.sheets?.length) sheets.push(...payload.sheets)
    else sheets.push(payload)
  })
  if (!sheets.length) return null
  return {
    sheets,
    templateType,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveOutsourcingPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadOutsourcingPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openOutsourcingPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveOutsourcingPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'procurement-outsourcing-order-preview', query })
  window.open(href, '_blank')
}

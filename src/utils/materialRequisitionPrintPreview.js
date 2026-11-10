/**
 * 领料单打印预览：与采购申请/出库单同款 sessionStorage + 新窗口预览
 */

const STORAGE_PREFIX = 'material-requisition-print-preview:'

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

function formatSourceWorkOrders(line) {
  const sources = line?.sourceWorkOrders || []
  if (!sources.length) return ''
  return sources
    .map((s) => {
      const code = s.workOrderCode || s.code || ''
      const qty = s.qty != null && s.qty !== '' ? `×${formatPrintQty(s.qty)}` : ''
      return `${code}${qty}`.trim()
    })
    .filter(Boolean)
    .join('、')
}

/** 构建单张领料单打印数据（含明细） */
export function buildMaterialRequisitionPrintPayload(record, options = {}) {
  if (!record) return null

  const lineItems = (record.lines || []).map((line, index) => ({
    seq: index + 1,
    itemCode: formatPrintFieldValue(line.itemCode || line.materialCode),
    itemName: formatPrintFieldValue(line.itemName || line.materialName),
    specModel: formatPrintFieldValue(line.specModel),
    material: formatPrintFieldValue(line.material),
    drawingNo: formatPrintFieldValue(line.drawingNo),
    blankSizeText: formatPrintFieldValue(line.blankSizeText),
    shipQty: formatPrintQty(line.shipQty ?? line.planQty ?? line.qty),
    unit: formatPrintFieldValue(line.unit),
    shipWarehouse: formatPrintFieldValue(line.shipWarehouse || line.warehouse),
    sourceWorkOrders: formatSourceWorkOrders(line),
    remark: formatPrintFieldValue(line.remark),
  }))

  // 三列网格：申请人占 1 格，申请时间跨后 2 格（值区约等于三个小值格宽度）
  const basicFields = [
    { label: '领用车间', value: record.workshop },
    { label: '领入仓库', value: record.receiveWarehouse },
    { label: '出库单号', value: record.outboundDocNo },
    { label: '申请人', value: record.applicant },
    { label: '申请时间', value: record.createdAt, span: 2 },
    { label: '备注', value: record.remark, wide: true },
  ].map((field) => ({
    ...field,
    value: formatPrintFieldValue(field.value === '—' ? '' : field.value),
  }))

  const totalShipQty = (record.lines || []).reduce(
    (s, l) => s + (Number(l.shipQty ?? l.planQty ?? l.qty) || 0),
    0,
  )

  return {
    reqNo: formatPrintFieldValue(record.reqNo),
    title: '领料单',
    basicFields,
    lineItems,
    summary: {
      lineCount: String(lineItems.length),
      totalShipQty: formatPrintQty(totalShipQty || record.totalQty),
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function buildMaterialRequisitionBatchPrintPayload(records, options = {}) {
  const sheets = (records || [])
    .map((row) => buildMaterialRequisitionPrintPayload(row, options))
    .filter(Boolean)
  if (!sheets.length) return null
  return {
    sheets,
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    printedAt: new Date().toISOString(),
  }
}

export function saveMaterialRequisitionPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadMaterialRequisitionPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function openMaterialRequisitionPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveMaterialRequisitionPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'production-material-requisition-preview', query })
  window.open(href, '_blank')
}

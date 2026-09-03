/**
 * 工业标识：申请单 + SN 件码 + 生命周期
 * 销售审核预申请；补货入库当场申请；工单完工入库挂载预申请码
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'

export const LABEL_SOURCE = {
  SALES_ORDER: 'sales_order',
  REPLENISH: 'replenish',
  MANUAL: 'manual',
}

export const LABEL_STATUS = {
  ACTIVE: '有效',
  VOID: '作废',
}

export const LABEL_LIFECYCLE = {
  SALES_ORDER: 'sales_order',
  PRODUCTION_WO: 'production_wo',
  ASSEMBLY_WO: 'assembly_wo',
  REPLENISH: 'replenish',
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
}

export const REQUEST_STATUS = {
  PENDING: '待提交',
  PROCESSING: '处理中',
  ALL_SUCCESS: '全部成功',
  PARTIAL: '部分成功',
  ALL_FAIL: '全部失败',
  VOIDED: '已作废',
}

const STORAGE_KEY = 'i_doms_industrial_labels_v1'
const SEED_VERSION_KEY = 'i_doms_industrial_labels_seed_v'
const SEED_VERSION = '2'

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      requests: industrialLabelState.requests,
      labels: industrialLabelState.labels,
      seq: industrialLabelState.seq,
    }),
  )
}

function nextRequestNo() {
  const day = dayjs().format('YYMMDD')
  industrialLabelState.seq += 1
  return `GYHLBS${day}${String(industrialLabelState.seq).padStart(3, '0')}`
}

function nextLabelCode(batchNo = '', index = 1) {
  const stamp = dayjs().format('YYYYMMDDHHmmss')
  const safeBatch = String(batchNo || 'GEN')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 12)
  return `${safeBatch || 'BX'}${stamp}${String(index).padStart(4, '0')}`
}

function buildSeed() {
  const req1 = {
    id: 'ilreq-demo-1',
    orderNo: 'GYHLBS250520001',
    sourceType: LABEL_SOURCE.MANUAL,
    batchNo: 'BATCH-2025-0520-A',
    status: REQUEST_STATUS.ALL_SUCCESS,
    remark: '第一批次标识申请（演示）',
    createTime: '2025-05-20 09:30:00',
    productNames: '智能水泵X1-标准型',
    productCount: 1,
    batchNos: 'BATCH-2025-0520-A',
    totalCount: 2,
    successCount: 2,
    failCount: 0,
    productDetails: [
      {
        productName: '智能水泵X1-标准型',
        batchNo: 'BATCH-2025-0520-A',
        quantity: 2,
        successCount: 2,
        failCount: 0,
        templateName: '标准泵铭牌',
      },
    ],
  }
  const labels = [
    {
      id: 'ilbl-demo-1',
      labelCode: 'BXBZ2025052009300001',
      status: LABEL_STATUS.ACTIVE,
      qrStatus: '已绑定',
      requestOrderNo: 'GYHLBS250520001',
      sourceType: LABEL_SOURCE.MANUAL,
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      productCode: '',
      productName: '智能水泵X1-标准型',
      batchNo: 'BATCH-2025-0520-A',
      templateName: '系统全局模板',
      pieceId: '',
      pieceSerialNo: '',
      boundAtInbound: true,
      regTime: '2025-05-20 09:31:00',
      lifecycle: [],
      operationLogs: [
        {
          type: '注册',
          detail: '系统自动注册标识',
          operator: 'system',
          time: '2025-05-20 09:31:00',
        },
      ],
    },
    {
      id: 'ilbl-demo-2',
      labelCode: 'BXBZ2025052009300002',
      status: LABEL_STATUS.ACTIVE,
      qrStatus: '待绑定',
      requestOrderNo: 'GYHLBS250520001',
      sourceType: LABEL_SOURCE.MANUAL,
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      productCode: '',
      productName: '智能水泵X1-标准型',
      batchNo: 'BATCH-2025-0520-A',
      templateName: '系统全局模板',
      pieceId: '',
      pieceSerialNo: '',
      boundAtInbound: false,
      regTime: '2025-05-20 09:31:00',
      lifecycle: [],
      operationLogs: [
        {
          type: '注册',
          detail: '系统自动注册标识',
          operator: 'system',
          time: '2025-05-20 09:31:00',
        },
      ],
    },
  ]
  return { requests: [req1], labels, seq: 10 }
}

const stored = loadStorage()
const seedNeeded = localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION

export const industrialLabelState = reactive({
  requests: stored?.requests || [],
  labels: stored?.labels || [],
  seq: stored?.seq || 0,
})

if (seedNeeded && !stored?.requests?.length) {
  const seed = buildSeed()
  industrialLabelState.requests = seed.requests
  industrialLabelState.labels = seed.labels
  industrialLabelState.seq = seed.seq
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
  persist()
} else if (seedNeeded) {
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
}

watch(
  () => [industrialLabelState.requests, industrialLabelState.labels, industrialLabelState.seq],
  () => persist(),
  { deep: true },
)

function summarizeRequest(req) {
  const lines = req.productDetails || []
  req.productNames =
    lines
      .map((l) => l.productName)
      .filter(Boolean)
      .join('、') || '—'
  req.productCount = lines.length
  req.batchNos = [...new Set(lines.map((l) => l.batchNo).filter(Boolean))].join('、') || '—'
  req.totalCount = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)
  req.successCount = lines.reduce((s, l) => s + (Number(l.successCount) || 0), 0)
  req.failCount = lines.reduce((s, l) => s + (Number(l.failCount) || 0), 0)
  if (req.status === REQUEST_STATUS.VOIDED) return req
  if (req.failCount <= 0 && req.successCount > 0) req.status = REQUEST_STATUS.ALL_SUCCESS
  else if (req.successCount <= 0 && req.failCount > 0) req.status = REQUEST_STATUS.ALL_FAIL
  else if (req.successCount > 0 && req.failCount > 0) req.status = REQUEST_STATUS.PARTIAL
  return req
}

/**
 * 生成 SN（mock 同步成功；forceFail 用于演示失败）
 */
function generateLabelsForRequest(req, { forceFail = false } = {}) {
  const created = []
  let globalIdx = industrialLabelState.labels.length + 1
  ;(req.productDetails || []).forEach((line) => {
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0))
    if (forceFail) {
      line.successCount = 0
      line.failCount = qty
      return
    }
    let ok = 0
    for (let i = 0; i < qty; i += 1) {
      globalIdx += 1
      const label = {
        id: `ilbl-${Date.now()}-${globalIdx}-${Math.random().toString(36).slice(2, 5)}`,
        labelCode: nextLabelCode(req.batchNo || line.batchNo, globalIdx),
        status: LABEL_STATUS.ACTIVE,
        qrStatus: '待绑定',
        requestOrderNo: req.orderNo,
        sourceType: req.sourceType || LABEL_SOURCE.MANUAL,
        salesOrderId: req.salesOrderId || '',
        salesOrderNo: req.salesOrderNo || '',
        salesLineId: line.salesLineId || '',
        replenishDocNo: req.replenishDocNo || '',
        productCode: line.productCode || '',
        productName: line.productName || '',
        batchNo: line.batchNo || req.batchNo || '',
        templateName: line.templateName || '标准泵铭牌',
        pieceId: '',
        pieceSerialNo: '',
        boundAtInbound: false,
        regTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        lifecycle: [],
        operationLogs: [
          {
            type: '注册',
            detail: '系统自动注册标识',
            operator: 'system',
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          },
        ],
      }
      if (req.salesOrderNo) {
        label.lifecycle.push({
          type: LABEL_LIFECYCLE.SALES_ORDER,
          docNo: req.salesOrderNo,
          docId: req.salesOrderId || '',
          at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        })
      }
      if (req.replenishDocNo) {
        label.lifecycle.push({
          type: LABEL_LIFECYCLE.REPLENISH,
          docNo: req.replenishDocNo,
          docId: req.replenishDocId || '',
          at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        })
      }
      industrialLabelState.labels.unshift(label)
      created.push(label)
      ok += 1
    }
    line.successCount = ok
    line.failCount = Math.max(0, qty - ok)
  })
  summarizeRequest(req)
  return created
}

export function listLabelRequests(filters = {}) {
  let rows = [...industrialLabelState.requests]
  if (filters.status) rows = rows.filter((r) => r.status === filters.status)
  if (filters.product?.trim()) {
    const kw = filters.product.trim()
    rows = rows.filter((r) => (r.productNames || '').includes(kw))
  }
  if (filters.batchNo?.trim()) {
    const kw = filters.batchNo.trim()
    rows = rows.filter((r) => (r.batchNos || '').includes(kw) || (r.batchNo || '').includes(kw))
  }
  return rows.sort((a, b) => String(b.createTime || '').localeCompare(String(a.createTime || '')))
}

export function listLabels(filters = {}) {
  let rows = [...industrialLabelState.labels]
  if (filters.status) rows = rows.filter((r) => r.status === filters.status)
  if (filters.salesOrderNo) {
    rows = rows.filter((r) => r.salesOrderNo === filters.salesOrderNo)
  }
  if (filters.salesLineId) {
    rows = rows.filter((r) => r.salesLineId === filters.salesLineId)
  }
  if (filters.productCode) {
    rows = rows.filter((r) => r.productCode === filters.productCode)
  }
  if (filters.activeOnly) {
    rows = rows.filter((r) => r.status === LABEL_STATUS.ACTIVE)
  }
  return rows
}

export function listLabelsBySalesOrder(salesOrderNo) {
  return listLabels({ salesOrderNo, activeOnly: false })
}

export function getLabelByCode(labelCode) {
  return industrialLabelState.labels.find((l) => l.labelCode === labelCode) || null
}

function pushLifecycle(label, entry) {
  if (!label) return
  label.lifecycle = label.lifecycle || []
  const exists = label.lifecycle.some(
    (x) => x.type === entry.type && x.docNo === entry.docNo && x.docId === entry.docId,
  )
  if (!exists)
    label.lifecycle.push({ ...entry, at: entry.at || dayjs().format('YYYY-MM-DD HH:mm:ss') })
  label.operationLogs = label.operationLogs || []
  label.operationLogs.unshift({
    type: '生命周期',
    detail: `${entry.type}: ${entry.docNo || entry.docId || ''}`,
    operator: entry.operator || 'system',
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
}

export function labelHasBlockingLifecycle(label) {
  if (!label || label.status !== LABEL_STATUS.ACTIVE) return false
  const types = new Set((label.lifecycle || []).map((x) => x.type))
  return (
    types.has(LABEL_LIFECYCLE.INBOUND) ||
    types.has(LABEL_LIFECYCLE.OUTBOUND) ||
    types.has(LABEL_LIFECYCLE.PRODUCTION_WO) ||
    types.has(LABEL_LIFECYCLE.ASSEMBLY_WO) ||
    label.boundAtInbound
  )
}

/** 销售订单是否存在已挂完工入库/出库等阻断反审的 SN */
export function salesOrderHasBoundLabels(salesOrderNo) {
  return listLabels({ salesOrderNo, activeOnly: true }).some((l) => labelHasBlockingLifecycle(l))
}

/**
 * 销售审核：按排产缺口自动申请
 * @returns {{ ok: boolean, message?: string, request?: object, labels?: object[], lineResults?: object[] }}
 */
export function createLabelRequestFromSalesOrder(order, options = {}) {
  if (!order?.orderNo) return { ok: false, message: '销售订单无效' }
  const lines = (order.lineItems || []).filter((line) => {
    if (!line.needIndustrialLabel) return false
    const qty = Math.floor(Number(line.planProduceQty) || 0)
    return qty > 0
  })
  if (!lines.length) {
    return { ok: true, message: '无需申请工业标识', request: null, labels: [], lineResults: [] }
  }

  const productDetails = lines.map((line) => ({
    salesLineId: line.id,
    productCode: line.productCode || '',
    productName: line.productName || '',
    batchNo: order.orderNo,
    quantity: Math.floor(Number(line.planProduceQty) || 0),
    successCount: 0,
    failCount: 0,
    templateName: '标准泵铭牌',
  }))

  const req = {
    id: `ilreq-${Date.now()}`,
    orderNo: nextRequestNo(),
    sourceType: LABEL_SOURCE.SALES_ORDER,
    salesOrderId: order.id,
    salesOrderNo: order.orderNo,
    batchNo: order.orderNo,
    status: REQUEST_STATUS.PROCESSING,
    remark: options.remark || '销售订单审核自动申请',
    createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    productDetails,
  }

  const forceFail = options.forceFail === true
  const labels = generateLabelsForRequest(req, { forceFail })
  industrialLabelState.requests.unshift(req)

  const lineResults = productDetails.map((d) => ({
    salesLineId: d.salesLineId,
    successCount: d.successCount,
    failCount: d.failCount,
    status: d.failCount > 0 && d.successCount <= 0 ? '失败' : d.failCount > 0 ? '部分成功' : '成功',
  }))

  return {
    ok: !forceFail && req.failCount <= 0,
    message: forceFail
      ? '工业标识申请失败，可在订单详情重试或补申请'
      : `已申请工业标识 ${req.successCount} 个`,
    request: req,
    labels,
    lineResults,
  }
}

/** 销售行补申请 / 重试 */
export function supplementLabelRequest(order, line, quantity, options = {}) {
  if (!order?.orderNo || !line) return { ok: false, message: '参数无效' }
  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) return { ok: false, message: '补申请数量须大于 0' }

  line.needIndustrialLabel = true

  const productDetails = [
    {
      salesLineId: line.id,
      productCode: line.productCode || '',
      productName: line.productName || '',
      batchNo: order.orderNo,
      quantity: qty,
      successCount: 0,
      failCount: 0,
      templateName: '标准泵铭牌',
    },
  ]

  const req = {
    id: `ilreq-${Date.now()}`,
    orderNo: nextRequestNo(),
    sourceType: LABEL_SOURCE.SALES_ORDER,
    salesOrderId: order.id,
    salesOrderNo: order.orderNo,
    batchNo: order.orderNo,
    status: REQUEST_STATUS.PROCESSING,
    remark: options.remark || '销售订单行补申请',
    createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    productDetails,
  }

  const labels = generateLabelsForRequest(req, { forceFail: options.forceFail === true })
  industrialLabelState.requests.unshift(req)
  return {
    ok: req.failCount <= 0,
    message: req.failCount > 0 ? '补申请失败' : `补申请成功 ${req.successCount} 个`,
    request: req,
    labels,
  }
}

export function retryLabelRequestForSalesLine(order, line) {
  const active = listLabels({
    salesOrderNo: order.orderNo,
    salesLineId: line.id,
    activeOnly: true,
  })
  const need = Math.floor(Number(line.planProduceQty) || 0)
  const gap = Math.max(0, need - active.length)
  if (gap <= 0) return { ok: true, message: '该行标识已齐，无需重试', labels: active }
  return supplementLabelRequest(order, line, gap, { remark: '销售订单标识重试' })
}

/** 反审：作废本单申请的有效且未挂物件的 SN */
export function voidLabelsBySalesOrder(salesOrderNo) {
  if (!salesOrderNo) return { ok: false, message: '销售单号无效' }
  if (salesOrderHasBoundLabels(salesOrderNo)) {
    return {
      ok: false,
      blocked: true,
      message: '存在已挂完工入库/出库或工单的工业标识，禁止反审',
    }
  }
  const labels = listLabels({ salesOrderNo, activeOnly: true })
  labels.forEach((l) => {
    l.status = LABEL_STATUS.VOID
    l.operationLogs = l.operationLogs || []
    l.operationLogs.unshift({
      type: '作废',
      detail: '销售订单反审作废',
      operator: 'system',
      time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    })
  })
  industrialLabelState.requests
    .filter((r) => r.salesOrderNo === salesOrderNo)
    .forEach((r) => {
      r.status = REQUEST_STATUS.VOIDED
    })
  return { ok: true, voidedCount: labels.length }
}

/**
 * 销售排产工单完工入库：匹配未挂物件的预申请 SN
 */
export function attachLabelsOnSalesProductionInbound({
  salesOrderNo,
  salesLineId,
  productCode,
  qty,
  workOrderCode,
  workOrderId,
  workOrderType = 'production',
  inboundDocNo,
  pieceIds = [],
} = {}) {
  const need = Math.max(0, Math.floor(Number(qty) || 0))
  if (!need) return { ok: true, labels: [] }

  let pool = listLabels({ salesOrderNo, activeOnly: true }).filter((l) => !l.boundAtInbound)
  if (salesLineId) pool = pool.filter((l) => !l.salesLineId || l.salesLineId === salesLineId)
  if (productCode) pool = pool.filter((l) => !l.productCode || l.productCode === productCode)
  pool = pool.sort((a, b) => String(a.regTime).localeCompare(String(b.regTime)))

  const picked = pool.slice(0, need)
  const woType =
    workOrderType === 'assembly' ? LABEL_LIFECYCLE.ASSEMBLY_WO : LABEL_LIFECYCLE.PRODUCTION_WO

  picked.forEach((label, idx) => {
    label.boundAtInbound = true
    label.qrStatus = '已绑定'
    if (pieceIds[idx]) {
      label.pieceId = pieceIds[idx]
      label.pieceSerialNo = pieceIds[idx]
    }
    if (workOrderCode) {
      pushLifecycle(label, {
        type: woType,
        docNo: workOrderCode,
        docId: workOrderId || '',
      })
    }
    if (inboundDocNo) {
      pushLifecycle(label, {
        type: LABEL_LIFECYCLE.INBOUND,
        docNo: inboundDocNo,
        docId: '',
      })
    }
  })

  return {
    ok: picked.length >= need,
    message:
      picked.length < need
        ? `预申请标识不足：需要 ${need}，仅匹配 ${picked.length}`
        : `已挂载 ${picked.length} 个工业标识`,
    labels: picked,
  }
}

/**
 * 补货入库：当场申请并挂载
 */
export function createAndAttachLabelsOnReplenishInbound({
  replenishDocNo,
  replenishDocId,
  productCode,
  productName,
  qty,
  needIndustrialLabel = true,
  workOrderCode,
  inboundDocNo,
  pieceIds = [],
} = {}) {
  if (!needIndustrialLabel) return { ok: true, labels: [], skipped: true }
  const quantity = Math.max(0, Math.floor(Number(qty) || 0))
  if (!quantity) return { ok: true, labels: [] }
  if (!replenishDocNo) return { ok: false, message: '补货单号无效' }

  const productDetails = [
    {
      productCode: productCode || '',
      productName: productName || '',
      batchNo: replenishDocNo,
      quantity,
      successCount: 0,
      failCount: 0,
      templateName: '标准泵铭牌',
    },
  ]

  const req = {
    id: `ilreq-${Date.now()}`,
    orderNo: nextRequestNo(),
    sourceType: LABEL_SOURCE.REPLENISH,
    replenishDocNo,
    replenishDocId: replenishDocId || '',
    batchNo: replenishDocNo,
    status: REQUEST_STATUS.PROCESSING,
    remark: '补货入库自动申请',
    createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    productDetails,
  }

  const labels = generateLabelsForRequest(req)
  industrialLabelState.requests.unshift(req)

  labels.forEach((label, idx) => {
    label.boundAtInbound = true
    label.qrStatus = '已绑定'
    if (pieceIds[idx]) {
      label.pieceId = pieceIds[idx]
      label.pieceSerialNo = pieceIds[idx]
    }
    if (inboundDocNo) {
      pushLifecycle(label, { type: LABEL_LIFECYCLE.INBOUND, docNo: inboundDocNo, docId: '' })
    }
    if (workOrderCode) {
      pushLifecycle(label, {
        type: LABEL_LIFECYCLE.PRODUCTION_WO,
        docNo: workOrderCode,
        docId: '',
      })
    }
  })

  return {
    ok: req.failCount <= 0,
    message: `补货入库已申请并挂载 ${labels.length} 个工业标识`,
    request: req,
    labels,
  }
}

/** 写回销售行标识摘要 */
export function applyLabelSummaryToSalesLines(order, lineResults = []) {
  if (!order?.lineItems) return
  const byLine = Object.fromEntries((lineResults || []).map((r) => [r.salesLineId, r]))
  order.lineItems.forEach((line) => {
    if (!line.needIndustrialLabel) return
    const active = listLabels({
      salesOrderNo: order.orderNo,
      salesLineId: line.id,
      activeOnly: true,
    })
    const result = byLine[line.id]
    const successCount = active.length
    const failCount = result
      ? Number(result.failCount) || 0
      : Number(line.industrialLabelFailCount) || 0
    line.industrialLabelSuccessCount = successCount
    line.industrialLabelFailCount = failCount
    if (successCount <= 0 && failCount > 0) line.industrialLabelStatus = '失败'
    else if (successCount > 0 && failCount > 0) line.industrialLabelStatus = '部分成功'
    else if (successCount > 0) line.industrialLabelStatus = '成功'
    else if (line.needIndustrialLabel && (Number(line.planProduceQty) || 0) > 0) {
      line.industrialLabelStatus = line.industrialLabelStatus || '待申请'
    } else {
      line.industrialLabelStatus = line.industrialLabelStatus || '—'
    }
  })
}

export function refreshSalesLineLabelSummary(order) {
  if (!order?.lineItems) return
  order.lineItems.forEach((line) => {
    if (!line.needIndustrialLabel) {
      line.industrialLabelStatus = line.industrialLabelStatus || '—'
      return
    }
    const active = listLabels({
      salesOrderNo: order.orderNo,
      salesLineId: line.id,
      activeOnly: true,
    })
    line.industrialLabelSuccessCount = active.length
    const need = Math.floor(Number(line.planProduceQty) || 0)
    if (need <= 0) {
      line.industrialLabelStatus = active.length ? '现货已有码' : '现货待绑定'
    } else if (active.length >= need) {
      line.industrialLabelStatus = '成功'
      line.industrialLabelFailCount = 0
    } else if (active.length > 0) {
      line.industrialLabelStatus = '部分成功'
    } else if (line.industrialLabelStatus === '失败') {
      /* keep */
    } else {
      line.industrialLabelStatus = '待申请'
    }
  })
}

/** 手工标识申请（标识申请页） */
export function createManualLabelRequest({ remark = '', products = [], submit = false } = {}) {
  const productDetails = (products || []).map((p) => ({
    productCode: p.productCode || '',
    productName: p.productName || '',
    batchNo: p.batchNo || '',
    quantity: Math.max(0, Math.floor(Number(p.quantity) || 0)),
    successCount: 0,
    failCount: 0,
    templateName: p.templateName || '标准泵铭牌',
  }))
  const batchNo = productDetails[0]?.batchNo || ''
  const req = {
    id: `ilreq-${Date.now()}`,
    orderNo: nextRequestNo(),
    sourceType: LABEL_SOURCE.MANUAL,
    batchNo,
    status: submit ? REQUEST_STATUS.PROCESSING : REQUEST_STATUS.PENDING,
    remark: remark || '',
    createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    productDetails,
  }
  summarizeRequest(req)
  if (submit) {
    generateLabelsForRequest(req)
  }
  industrialLabelState.requests.unshift(req)
  return { ok: true, request: req }
}

export function submitPendingLabelRequest(orderNo) {
  const req = industrialLabelState.requests.find((r) => r.orderNo === orderNo)
  if (!req) return { ok: false, message: '申请单不存在' }
  if (req.status !== REQUEST_STATUS.PENDING) {
    return { ok: false, message: '仅待提交状态可提交' }
  }
  req.status = REQUEST_STATUS.PROCESSING
  generateLabelsForRequest(req)
  return { ok: true, request: req }
}

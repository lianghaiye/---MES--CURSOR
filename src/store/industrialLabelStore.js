/**
 * 工业标识：申请单 + SN 件码 + 生命周期
 * 销售审核按「现货占用+排产缺口」预申请；
 * 方案 A：完工入库不自动挂 SN；装牌确认（小程序）时再挂到实物
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'

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

/** 销售单工业标识演示 SN（已审单 1-20260903-IL02） */
export function ensureSalesOrderIndustrialLabelDemo() {
  const salesOrderNo = '1-20260903-IL02'
  const existing = industrialLabelState.labels.filter(
    (l) => l.salesOrderNo === salesOrderNo && l.status !== LABEL_STATUS.VOID,
  )
  // 方案 A 演示：现货2+排产3 + 行B排产2 = 7
  if (existing.length >= 7) return
  if (existing.length > 0) {
    industrialLabelState.labels = industrialLabelState.labels.filter(
      (l) => l.salesOrderNo !== salesOrderNo,
    )
    industrialLabelState.requests = industrialLabelState.requests.filter(
      (r) => r.id !== 'ilreq-sales-demo-il02',
    )
  }

  const p0 = mockProducts[0] || { code: 'CP2610001', name: '清水离心泵 ISG50-160' }
  const p1 = mockProducts[1] || { code: 'CP2610002', name: '立式多级离心泵 CDL4-40' }

  const requestNo = 'GYHLBS260903001'
  const now = dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  const productDetails = [
    {
      salesLineId: 'line-seed-il2-a',
      productCode: p0.code,
      productName: p0.name,
      batchNo: salesOrderNo,
      quantity: 5,
      successCount: 5,
      failCount: 0,
      templateName: '标准泵铭牌',
    },
    {
      salesLineId: 'line-seed-il2-b',
      productCode: p1.code,
      productName: p1.name,
      batchNo: salesOrderNo,
      quantity: 2,
      successCount: 2,
      failCount: 0,
      templateName: '标准泵铭牌',
    },
  ]

  const req = {
    id: 'ilreq-sales-demo-il02',
    orderNo: requestNo,
    sourceType: LABEL_SOURCE.SALES_ORDER,
    salesOrderId: 'so-seed-industrial-label-done',
    salesOrderNo,
    batchNo: salesOrderNo,
    status: REQUEST_STATUS.ALL_SUCCESS,
    remark: '销售订单审核自动申请（演示）',
    createTime: now,
    productDetails,
  }
  summarizeRequest(req)

  const labels = []
  let idx = 0
  productDetails.forEach((line) => {
    for (let i = 0; i < line.quantity; i += 1) {
      idx += 1
      labels.push({
        id: `ilbl-sales-il02-${idx}`,
        labelCode: `IL02${dayjs().format('YYYYMMDD')}${String(idx).padStart(4, '0')}`,
        status: LABEL_STATUS.ACTIVE,
        qrStatus: idx <= 2 ? '已绑定' : '待绑定',
        engraveStatus: idx <= 2 ? '已刻录' : '待刻录',
        requestOrderNo: requestNo,
        sourceType: LABEL_SOURCE.SALES_ORDER,
        salesOrderId: 'so-seed-industrial-label-done',
        salesOrderNo,
        salesLineId: line.salesLineId,
        replenishDocNo: '',
        productCode: line.productCode,
        productName: line.productName,
        batchNo: salesOrderNo,
        templateName: line.templateName,
        pieceId: idx <= 2 ? `PC-IL02-${idx}` : '',
        pieceSerialNo: idx <= 2 ? `PC-IL02-${idx}` : '',
        boundAtInbound: idx <= 2,
        nameplateMountedAt: idx <= 2 ? now : '',
        nameplateMountedBy: idx <= 2 ? '演示装牌' : '',
        regTime: now,
        lifecycle: [
          {
            type: LABEL_LIFECYCLE.SALES_ORDER,
            docNo: salesOrderNo,
            docId: 'so-seed-industrial-label-done',
            at: now,
          },
        ],
        operationLogs: [
          {
            type: '注册',
            detail: '销售订单审核自动注册标识',
            operator: 'system',
            time: now,
          },
          ...(idx <= 2
            ? [
                {
                  type: '装牌确认',
                  detail: '演示装牌确认',
                  operator: '演示装牌',
                  time: now,
                },
              ]
            : []),
        ],
      })
    }
  })

  industrialLabelState.requests.unshift(req)
  industrialLabelState.labels.unshift(...labels)
  if (industrialLabelState.seq < 30) industrialLabelState.seq = 30
  persist()
}

ensureSalesOrderIndustrialLabelDemo()

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
        engraveStatus: '待刻录',
        requestOrderNo: req.orderNo,
        sourceType: req.sourceType || LABEL_SOURCE.MANUAL,
        salesOrderId: req.salesOrderId || '',
        salesOrderNo: req.salesOrderNo || '',
        salesLineId: line.salesLineId || '',
        replenishDocNo: req.replenishDocNo || '',
        productCode: line.productCode || '',
        productName: line.productName || '',
        specModel: line.specModel || '',
        material: line.material || '',
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
  const code = String(labelCode || '').trim()
  if (!code) return null
  return (
    industrialLabelState.labels.find(
      (l) => String(l.labelCode || '').toLowerCase() === code.toLowerCase(),
    ) || null
  )
}

/** 全局校验 SN 是否已被占用（含作废记录，排除自身） */
export function isLabelCodeInUse(labelCode, { excludeId = '' } = {}) {
  const code = String(labelCode || '').trim()
  if (!code) return false
  const exclude = String(excludeId || '')
  return industrialLabelState.labels.some(
    (l) =>
      String(l.id) !== exclude && String(l.labelCode || '').toLowerCase() === code.toLowerCase(),
  )
}

/**
 * 修改 SN 码（审核通过后可改；已装牌/已出库不可改）
 * @returns {{ ok: boolean, message: string, label?: object }}
 */
export function updateLabelCode(labelId, nextCode, { operator = '当前用户' } = {}) {
  const label = industrialLabelState.labels.find((l) => String(l.id) === String(labelId))
  if (!label) return { ok: false, message: '未找到该 SN' }
  if (label.status === LABEL_STATUS.VOID) return { ok: false, message: '已作废的 SN 不可修改' }
  if (labelHasBlockingLifecycle(label)) {
    return { ok: false, message: '该 SN 已装牌或已出库，不可修改' }
  }
  const code = String(nextCode || '').trim()
  if (!code) return { ok: false, message: '请输入新的 SN 码' }
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(code)) {
    return { ok: false, message: 'SN 码须为 4–64 位字母/数字/下划线/短横线' }
  }
  if (String(label.labelCode || '').toLowerCase() === code.toLowerCase()) {
    return { ok: true, message: 'SN 码未变化', label }
  }
  if (isLabelCodeInUse(code, { excludeId: label.id })) {
    return { ok: false, message: `SN「${code}」已被使用，请更换` }
  }
  const prev = label.labelCode
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  label.labelCode = code
  label.operationLogs = label.operationLogs || []
  label.operationLogs.unshift({
    type: '修改SN',
    detail: `SN 由 ${prev} 修改为 ${code}`,
    operator: operator || '当前用户',
    time: now,
  })
  persist()
  return { ok: true, message: 'SN 码已更新', label }
}

/**
 * 铭牌装牌确认（小程序/现场）：此时才将 SN 挂到实物（方案 A）
 */
export function confirmNameplateMount(labelCode, { operator = '小程序', pieceSerialNo = '' } = {}) {
  const code = String(labelCode || '').trim()
  if (!code) return { ok: false, message: '请输入 SN 码' }
  const label = getLabelByCode(code)
  if (!label) return { ok: false, message: '未找到该 SN' }
  if (label.status === LABEL_STATUS.VOID) return { ok: false, message: '该标识已作废，不可装牌' }
  if (label.nameplateMountedAt || label.boundAtInbound) {
    return { ok: true, label, message: '该 SN 已装牌确认', already: true }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  label.qrStatus = '已绑定'
  label.boundAtInbound = true
  label.engraveStatus = '已刻录'
  label.nameplateMountedAt = now
  label.nameplateMountedBy = operator || '小程序'
  if (pieceSerialNo) {
    label.pieceId = pieceSerialNo
    label.pieceSerialNo = pieceSerialNo
  }
  label.operationLogs = label.operationLogs || []
  label.operationLogs.unshift({
    type: '装牌确认',
    detail: pieceSerialNo ? `铭牌已刻装，件号 ${pieceSerialNo}` : '铭牌已刻装确认',
    operator: label.nameplateMountedBy,
    time: now,
  })
  persist()
  return { ok: true, label, message: '装牌确认成功' }
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
  // 方案 A：装牌确认后视为已挂实物，禁止反审；出库生命周期仍阻断
  if (label.nameplateMountedAt || label.boundAtInbound) return true
  const types = new Set((label.lifecycle || []).map((x) => x.type))
  return types.has(LABEL_LIFECYCLE.OUTBOUND)
}

/** 销售订单是否存在已挂完工入库/出库等阻断反审的 SN */
export function salesOrderHasBoundLabels(salesOrderNo) {
  return listLabels({ salesOrderNo, activeOnly: true }).some((l) => labelHasBlockingLifecycle(l))
}

/** 销售行工业标识应申请数量 = 现货占用 + 排产缺口（审核拆分后）；未拆分时回退销售数量 */
export function salesLineIndustrialLabelNeedQty(line) {
  if (!line) return 0
  const stock = line.stockTakeQty
  const plan = line.planProduceQty
  const hasSplit = stock != null || plan != null
  if (hasSplit) {
    return Math.max(0, Math.floor(Number(stock) || 0) + Math.floor(Number(plan) || 0))
  }
  return Math.max(0, Math.floor(Number(line.salesQty ?? line.qty) || 0))
}

/**
 * 销售审核：按「现货占用 + 排产缺口」预申请 SN（销售驱动铭牌，不绑死库存件）
 * @returns {{ ok: boolean, message?: string, request?: object, labels?: object[], lineResults?: object[] }}
 */
export function createLabelRequestFromSalesOrder(order, options = {}) {
  if (!order?.orderNo) return { ok: false, message: '销售订单无效' }
  const lines = (order.lineItems || []).filter((line) => {
    if (!line.needIndustrialLabel) return false
    return salesLineIndustrialLabelNeedQty(line) > 0
  })
  if (!lines.length) {
    return { ok: true, message: '无需申请工业标识', request: null, labels: [], lineResults: [] }
  }

  // 按缺口申请：反审作废后再审会全量重生成；若仍有有效 SN 则只补齐差额，避免重复
  const productDetails = lines
    .map((line) => {
      const need = salesLineIndustrialLabelNeedQty(line)
      const activeCount = listLabels({
        salesOrderNo: order.orderNo,
        salesLineId: line.id,
        activeOnly: true,
      }).length
      const quantity = Math.max(0, need - activeCount)
      return {
        salesLineId: line.id,
        productCode: line.productCode || '',
        productName: line.productName || '',
        specModel: line.specModel || '',
        material: line.material || '',
        batchNo: order.orderNo,
        quantity,
        successCount: 0,
        failCount: 0,
        templateName: '标准泵铭牌',
      }
    })
    .filter((d) => d.quantity > 0)

  if (!productDetails.length) {
    return {
      ok: true,
      message: '本单有效工业标识已齐，无需重新申请',
      request: null,
      labels: [],
      lineResults: [],
    }
  }

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
      specModel: line.specModel || '',
      material: line.material || '',
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
  const need = salesLineIndustrialLabelNeedQty(line)
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
      message: '存在已装牌或已出库的工业标识，禁止反审',
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

/** 订单变更改数量后：让「现货+排产」与销售数量对齐，便于 SN 需求量跟随 */
function realignIndustrialNeedSplit(line) {
  if (!line) return
  const salesQty = Math.max(0, Math.floor(Number(line.salesQty ?? line.qty) || 0))
  const hasSplit = line.stockTakeQty != null || line.planProduceQty != null
  if (!hasSplit) return
  const stockN = Math.max(0, Math.floor(Number(line.stockTakeQty) || 0))
  const nextStock = Math.min(stockN, salesQty)
  line.stockTakeQty = nextStock
  line.planProduceQty = Math.max(0, salesQty - nextStock)
}

/**
 * 作废行上多余的未装牌/未出库 SN（优先作废较新的）
 * @returns {{ ok: boolean, voidedCount: number, warning?: string }}
 */
export function voidExcessActiveLabelsForLine(order, line, keepCount, options = {}) {
  if (!order?.orderNo || !line?.id) return { ok: false, voidedCount: 0, warning: '参数无效' }
  const keep = Math.max(0, Math.floor(Number(keepCount) || 0))
  const active = listLabels({
    salesOrderNo: order.orderNo,
    salesLineId: line.id,
    activeOnly: true,
  })
  const excess = active.length - keep
  if (excess <= 0) return { ok: true, voidedCount: 0 }

  const free = active
    .filter((l) => !labelHasBlockingLifecycle(l))
    .sort((a, b) => String(b.regTime || '').localeCompare(String(a.regTime || '')))
  const blockingCount = active.length - free.length
  const canVoid = Math.min(excess, free.length)
  const toVoid = free.slice(0, canVoid)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const reason = options.reason || '订单变更作废多余 SN'
  const operator = options.operator || 'system'
  toVoid.forEach((l) => {
    l.status = LABEL_STATUS.VOID
    l.operationLogs = l.operationLogs || []
    l.operationLogs.unshift({
      type: '作废',
      detail: reason,
      operator,
      time: now,
    })
  })

  let warning
  if (canVoid < excess) {
    warning = `「${line.productName || line.productCode || '明细'}」需减少 ${excess} 个 SN，但有 ${blockingCount} 个已装牌/已出库不可作废，仅作废 ${canVoid} 个`
  }
  return { ok: !warning, voidedCount: toVoid.length, warning }
}

/**
 * 订单变更审核通过后：按新销售数量同步工业标识
 * - 数量增加：自动补申请缺口 SN
 * - 数量减少：作废多余且未装牌/未出库的 SN
 */
export function syncIndustrialLabelsAfterOrderQtyChange(order, options = {}) {
  if (!order?.orderNo) return { ok: false, message: '销售订单无效' }
  const operator = options.operator || 'system'
  const onlyLineIds = Array.isArray(options.lineIds) ? new Set(options.lineIds.map(String)) : null
  let supplemented = 0
  let voided = 0
  const warnings = []
  const lineHints = []

  for (const line of order.lineItems || []) {
    if (!line.needIndustrialLabel) continue
    if (onlyLineIds && !onlyLineIds.has(String(line.id))) continue

    realignIndustrialNeedSplit(line)

    const need = line.cancelled ? 0 : salesLineIndustrialLabelNeedQty(line)
    const active = listLabels({
      salesOrderNo: order.orderNo,
      salesLineId: line.id,
      activeOnly: true,
    })

    if (active.length < need) {
      const gap = need - active.length
      const res = supplementLabelRequest(order, line, gap, {
        remark: options.remark || '订单变更数量增加补申请 SN',
      })
      if (res.ok) {
        const n = res.labels?.length || res.request?.successCount || gap
        supplemented += n
        if (res.request?.orderNo) line.industrialLabelRequestNo = res.request.orderNo
        lineHints.push(`「${line.productName || line.productCode}」补 ${n} 个`)
      } else {
        warnings.push(`「${line.productName || line.productCode}」补申请失败：${res.message}`)
      }
      continue
    }

    if (active.length > need) {
      const r = voidExcessActiveLabelsForLine(order, line, need, {
        operator,
        reason: options.voidReason || '订单变更数量减少作废多余 SN',
      })
      voided += r.voidedCount || 0
      if (r.voidedCount) {
        lineHints.push(`「${line.productName || line.productCode}」作废 ${r.voidedCount} 个`)
      }
      if (r.warning) warnings.push(r.warning)
    }
  }

  refreshSalesLineLabelSummary(order)

  const parts = []
  if (supplemented) parts.push(`补申请 SN ${supplemented} 个`)
  if (voided) parts.push(`作废多余 SN ${voided} 个`)
  if (!parts.length && !warnings.length) {
    return { ok: true, supplemented: 0, voided: 0, warnings: [], message: '工业标识数量无需调整' }
  }
  const message = [...parts, ...warnings].filter(Boolean).join('；') || '工业标识已同步'
  return {
    ok: warnings.length === 0,
    supplemented,
    voided,
    warnings,
    lineHints,
    message,
  }
}

/**
 * @deprecated 方案 A：完工入库不再自动挂 SN；请使用 confirmNameplateMount
 * 保留函数以免外部引用报错，调用即空操作。
 */
export function attachLabelsOnSalesProductionInbound() {
  return {
    ok: true,
    labels: [],
    skipped: true,
    message: '方案 A：入库不自动挂 SN，请在装牌确认时挂载',
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
    else if (line.needIndustrialLabel && salesLineIndustrialLabelNeedQty(line) > 0) {
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
    const need = salesLineIndustrialLabelNeedQty(line)
    if (need <= 0) {
      line.industrialLabelStatus = '—'
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

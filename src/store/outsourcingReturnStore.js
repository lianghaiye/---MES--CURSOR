import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  cloneOutsourcingReturns,
  createOutsourcingReturn,
  createOutsourcingReturnOutboundLine,
  createOutsourcingReturnOutboundOrder,
  deriveHeaderOutboundStatus,
  flattenReturnOutboundLines,
  generateOutsourcingReturnNo,
} from '@/mock/outsourcingReturns'

const STORAGE_KEY = 'i_doms_outsourcing_returns'
const SEED_VERSION_KEY = 'i_doms_outsourcing_returns_seed_v'
const CURRENT_SEED_VERSION = '3'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.returns)) return parsed.returns.map(normalizeReturn)
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ returns: outsourcingReturnState.returns }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

/**
 * 关联出库单已出库 → 异常处理单已完成；已生成出库单 → 进行中
 */
export function deriveReturnDocStatus(row, preferredStatus) {
  if (preferredStatus === '作废' || row?.status === '作废') return '作废'
  if (preferredStatus === '已完成') return '已完成'

  const outboundStatus = row?.outboundStatus || '待出库'
  if (outboundStatus === '已出库') return '已完成'
  if (hasReturnOutboundOrder(row) || outboundStatus === '出库中' || outboundStatus === '部分出库') {
    return '进行中'
  }
  if (preferredStatus === '进行中' || preferredStatus === '新建') return preferredStatus
  return '新建'
}

export function hasReturnOutboundOrder(row) {
  if (!row) return false
  if (Array.isArray(row.outboundOrders) && row.outboundOrders.length) return true
  if (String(row.outboundOrderNo || '').trim()) return true
  if (String(row.outboundOrderId || '').trim()) return true
  return false
}

function migrateLegacyOutboundOrders(row) {
  if (Array.isArray(row.outboundOrders) && row.outboundOrders.length) {
    return row.outboundOrders.map((o) =>
      createOutsourcingReturnOutboundOrder({
        ...o,
        lineItems: (o.lineItems || []).map((l) => createOutsourcingReturnOutboundLine(l)),
      }),
    )
  }
  const no = String(row.outboundOrderNo || '').trim()
  // 无单号或逗号拼接的旧数据且无 outboundOrders 时无法还原，保持空
  if (!no || no.includes(',')) return []
  return [
    createOutsourcingReturnOutboundOrder({
      id: row.outboundOrderId || `out-legacy-${row.id}`,
      outboundOrderNo: no,
      shipWarehouse: row.shipWarehouse || '',
      outboundStatus: row.outboundStatus || '待出库',
      creator: row.updater || row.creator || 'admin1',
      createdAt: row.updatedAt || row.createdAt,
      lineItems: (row.lineItems || []).map((l) =>
        createOutsourcingReturnOutboundLine({
          returnLineId: l.id,
          productName: l.productName,
          productCode: l.productCode,
          specModel: l.specModel,
          material: l.material,
          applyQty: Number(l.returnQty) || 0,
          actualQty: row.outboundStatus === '已出库' ? Number(l.returnQty) || 0 : 0,
          unit: l.unit,
        }),
      ),
    }),
  ]
}

function syncOutboundHeaderFields(row) {
  const orders = row.outboundOrders || []
  row.outboundStatus = deriveHeaderOutboundStatus(orders)
  row.outboundOrderNo = orders
    .map((o) => o.outboundOrderNo)
    .filter(Boolean)
    .join(',')
  row.outboundOrderId = orders[0]?.id || ''
  const whs = [...new Set(orders.map((o) => o.shipWarehouse).filter(Boolean))]
  if (whs.length) row.shipWarehouse = whs[0]
}

function normalizeReturn(row) {
  const r = { ...row }
  if (!Array.isArray(r.lineItems)) r.lineItems = []
  r.outboundOrders = migrateLegacyOutboundOrders(r)
  if (r.outboundOrders.length) syncOutboundHeaderFields(r)
  else if (!r.outboundStatus) r.outboundStatus = '待出库'
  if (!r.creator) r.creator = r.purchaser || 'admin1'
  if (!r.updater) r.updater = r.creator
  if (!r.updatedAt) r.updatedAt = r.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
  if (r.createdAt && String(r.createdAt).length === 10) {
    r.createdAt = `${r.createdAt} 00:00:00`
  }
  if (r.status !== '作废') {
    r.status = deriveReturnDocStatus(r, r.status === '已完成' ? '已完成' : undefined)
  }
  if (!r.shipWarehouse) {
    const fromLines = [...new Set(r.lineItems.map((l) => l.shipWarehouse).filter(Boolean))]
    r.shipWarehouse = fromLines[0] || ''
  }
  return r
}

function initReturns() {
  const list = shouldReseed()
    ? cloneOutsourcingReturns()
    : loadFromStorage() || cloneOutsourcingReturns()
  return list.map(normalizeReturn)
}

export const outsourcingReturnState = reactive({
  returns: initReturns(),
})

watch(
  () => outsourcingReturnState.returns,
  () => persist(),
  { deep: true },
)

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export function getOutsourcingReturnById(id) {
  return outsourcingReturnState.returns.find((r) => r.id === id) || null
}

export function canEditOutsourcingReturn(row) {
  return row?.status === '新建'
}

export function canVoidOutsourcingReturn(row) {
  return row?.status === '新建'
}

/** 新建/进行中且无进行中的出库时可手动完成 */
export function canCompleteOutsourcingReturn(row) {
  if (!row) return false
  if (row.status === '作废' || row.status === '已完成') return false
  if (row.outboundStatus === '出库中' || row.outboundStatus === '部分出库') return false
  return row.status === '新建' || row.status === '进行中'
}

export function addOutsourcingReturn(partial = {}) {
  const returnNo =
    String(partial.returnNo || '').trim() ||
    generateOutsourcingReturnNo(outsourcingReturnState.returns)
  const row = createOutsourcingReturn({
    ...partial,
    returnNo,
    status: '新建',
    outboundStatus: '待出库',
    outboundOrders: [],
    createdAt: nowText(),
    updatedAt: nowText(),
  })
  outsourcingReturnState.returns.unshift(normalizeReturn(row))
  return row
}

export function updateOutsourcingReturn(id, patch = {}) {
  const idx = outsourcingReturnState.returns.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const current = outsourcingReturnState.returns[idx]
  if (current.status === '新建') {
    Object.assign(current, patch, {
      status: '新建',
      updater: patch.updater || 'admin1',
      updatedAt: nowText(),
    })
  } else {
    const allowed = [
      'status',
      'outboundStatus',
      'outboundOrderNo',
      'outboundOrderId',
      'outboundOrders',
      'updater',
      'updatedAt',
    ]
    const safePatch = {}
    allowed.forEach((k) => {
      if (k in patch) safePatch[k] = patch[k]
    })
    Object.assign(current, safePatch, { updater: patch.updater || 'admin1', updatedAt: nowText() })
  }
  outsourcingReturnState.returns[idx] = normalizeReturn(current)
  return outsourcingReturnState.returns[idx]
}

export function voidOutsourcingReturn(id) {
  const row = getOutsourcingReturnById(id)
  if (!row) return { ok: false, message: '异常处理单不存在' }
  if (!canVoidOutsourcingReturn(row)) {
    return { ok: false, message: '仅「新建」状态的异常处理单可作废' }
  }
  row.status = '作废'
  row.updater = 'admin1'
  row.updatedAt = nowText()
  return { ok: true, message: '已作废' }
}

export function completeOutsourcingReturn(id) {
  const row = getOutsourcingReturnById(id)
  if (!row) return { ok: false, message: '异常处理单不存在' }
  if (!canCompleteOutsourcingReturn(row)) {
    if (row.outboundStatus === '出库中' || row.outboundStatus === '部分出库') {
      return { ok: false, message: '存在未完成的出库单，不可完成' }
    }
    return { ok: false, message: `异常处理单「${row.returnNo}」不可完成` }
  }
  row.status = '已完成'
  row.updater = 'admin1'
  row.updatedAt = nowText()
  return { ok: true, message: `异常处理单「${row.returnNo}」已完成` }
}

function nextOutboundSeq(existingNos = []) {
  let max = 0
  existingNos.forEach((no) => {
    const m = String(no || '').match(/-(\d{3})$/)
    if (m) max = Math.max(max, Number(m[1]) || 0)
  })
  return max
}

/**
 * 按出货仓库拆分生成异常处理出库单：新建 → 进行中
 * @param {string} id
 * @param {Array|{lineId,issueQty,shipWarehouse,...}|null} lines 弹窗提交明细；空则按异常处理清单全量出库
 * @param {{ shipDate?: string, remark?: string }} extra
 */
export function generateOutboundFromReturn(id, lines = null, extra = {}) {
  const row = getOutsourcingReturnById(id)
  if (!row) return { ok: false, message: '异常处理单不存在' }
  if (row.status === '作废') return { ok: false, message: '已作废的异常处理单不可生成出库单' }
  if (row.status !== '新建') {
    return { ok: false, message: '仅「新建」状态的异常处理单可生成出库单' }
  }
  const shipDate = String(extra.shipDate || '').trim()
  if (!shipDate) return { ok: false, message: '请选择出货日期' }

  const sourceLines = row.lineItems || []
  if (!sourceLines.length) {
    return { ok: false, message: '异常处理清单为空，无法生成出库单' }
  }

  const submitItems =
    Array.isArray(lines) && lines.length
      ? lines.filter((item) => (Number(item.issueQty) || 0) > 0)
      : sourceLines.map((l) => ({
          lineId: l.id,
          issueQty: Number(l.returnQty) || 0,
          shipWarehouse: l.shipWarehouse,
          remark: l.remark,
          unit: l.unit,
        }))

  if (!submitItems.length) return { ok: false, message: '请至少填写一行出库数量' }

  for (const item of submitItems) {
    const line = sourceLines.find((l) => l.id === item.lineId)
    if (!line) return { ok: false, message: '存在无效的异常处理明细行' }
    if (!String(item.shipWarehouse || '').trim()) {
      return {
        ok: false,
        message: `请为「${line.productName || line.productCode || '明细'}」选择出库仓库`,
      }
    }
    const qty = Number(item.issueQty) || 0
    const maxQty = Number(line.returnQty) || 0
    if (qty > maxQty + 1e-9) {
      return {
        ok: false,
        message: `物料「${line.productName || line.productCode}」出库数量不能超过处理数量`,
      }
    }
  }

  const stamp = dayjs().format('YYMMDD')
  const groups = new Map()
  submitItems.forEach((item) => {
    const line = sourceLines.find((l) => l.id === item.lineId)
    if (!line) return
    if (item.shipWarehouse) line.shipWarehouse = item.shipWarehouse
    if (item.remark != null) line.remark = item.remark
    if (item.barcodeType != null) line.barcodeType = item.barcodeType
    if (item.blankSizeText != null) line.blankSizeText = item.blankSizeText
    const wh = String(item.shipWarehouse || '').trim()
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push({ line, issueQty: Number(item.issueQty) || 0 })
  })

  let seq = nextOutboundSeq(
    outsourcingReturnState.returns.flatMap((r) =>
      (r.outboundOrders || []).map((o) => o.outboundOrderNo),
    ),
  )
  const now = nowText()
  const orders = []
  groups.forEach((groupLines, warehouse) => {
    seq += 1
    const outboundOrderNo = `CKWXTH-${stamp}-${String(seq).padStart(3, '0')}`
    orders.push(
      createOutsourcingReturnOutboundOrder({
        id: `out-wx-return-${row.id}-${seq}`,
        outboundOrderNo,
        shipWarehouse: warehouse,
        shipDate,
        remark: extra.remark || '',
        outboundStatus: '出库中',
        creator: 'admin1',
        createdAt: now,
        confirmer: '',
        confirmedAt: '',
        lineItems: groupLines.map(({ line, issueQty }) =>
          createOutsourcingReturnOutboundLine({
            returnLineId: line.id,
            productName: line.productName,
            productCode: line.productCode,
            specModel: line.specModel,
            material: line.material,
            applyQty: issueQty,
            actualQty: 0,
            unit: line.unit,
          }),
        ),
      }),
    )
  })

  row.outboundOrders = orders
  syncOutboundHeaderFields(row)
  row.outboundStatus = '出库中'
  row.status = '进行中'
  if (extra.remark != null) row.remark = extra.remark
  row.updater = 'admin1'
  row.updatedAt = now

  const nos = orders.map((o) => o.outboundOrderNo).join('、')
  return {
    ok: true,
    message: `已按仓库生成 ${orders.length} 张出库单：${nos}`,
    count: orders.length,
    orders,
  }
}

/** 同步关联出库单状态（全部已出库 → 异常处理单已完成） */
export function syncReturnOutboundStatus(id, outboundOrderId, outboundStatus) {
  const row = getOutsourcingReturnById(id)
  if (!row || row.status === '作废') return null
  const order = (row.outboundOrders || []).find((o) => o.id === outboundOrderId)
  if (order) {
    order.outboundStatus = outboundStatus
    if (outboundStatus === '已出库') {
      order.confirmedAt = order.confirmedAt || nowText()
      order.confirmer = order.confirmer || 'admin1'
      ;(order.lineItems || []).forEach((l) => {
        if (!(Number(l.actualQty) > 0)) l.actualQty = Number(l.applyQty) || 0
      })
    }
  } else {
    row.outboundStatus = outboundStatus
  }
  syncOutboundHeaderFields(row)
  if (row.outboundStatus === '已出库') {
    row.status = '已完成'
  } else if (hasReturnOutboundOrder(row)) {
    row.status = '进行中'
  }
  row.updater = 'admin1'
  row.updatedAt = nowText()
  return normalizeReturn(row)
}

export function listReturnOutboundLines(row) {
  return flattenReturnOutboundLines(row)
}

export function listOutsourcingReturnOperators() {
  const set = new Set()
  outsourcingReturnState.returns.forEach((r) => {
    ;[r.creator, r.updater, r.purchaser].filter(Boolean).forEach((n) => set.add(n))
  })
  if (!set.size) {
    ;['admin1', '管理员', '张三', '李四'].forEach((n) => set.add(n))
  }
  return [...set].map((v) => ({ label: v, value: v }))
}

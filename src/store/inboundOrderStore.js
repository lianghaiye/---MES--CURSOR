import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { cloneInboundSeedOrders, createInboundLine, createInboundOrder } from '@/mock/inboundOrders'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { warehouseState } from '@/store/warehouseStore'
import { applyInboundToStock } from '@/store/stockStore'

const STORAGE_KEY = 'i_doms_inbound_orders'
const SEED_VERSION_KEY = 'i_doms_inbound_orders_seed_v'
const CURRENT_SEED_VERSION = '2'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) return parsed.orders
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: inboundOrderState.orders }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function normalizeLegacyOrder(order) {
  const row = { ...order }
  if (!row.inboundDate)
    row.inboundDate = row.createdAt?.slice(0, 10) || dayjs().format('YYYY-MM-DD')
  if (!row.itemType) row.itemType = '物料'
  if (!row.handler) row.handler = row.creator || 'admin1'
  if (!row.invoiceNo) row.invoiceNo = ''
  if (!row.sourceWorkshop) row.sourceWorkshop = ''
  if (!row.confirmer) row.confirmer = ''
  if (!row.confirmedAt) row.confirmedAt = ''
  if (!row.approver) row.approver = ''
  if (!row.approvedAt) row.approvedAt = ''
  if (!row.miniProgramTaskId) row.miniProgramTaskId = ''
  if (!row.purchaseOrderId) row.purchaseOrderId = ''
  if (row.inboundType === '生产退库') row.inboundType = '半成品入库'
  if (row.status === '待处理' && row.inboundType === '成品入库' && row.miniProgramTaskId) {
    row.status = '待审批'
  }
  if (!Array.isArray(row.lineItems)) row.lineItems = []
  return row
}

function initOrders() {
  const stored = loadFromStorage()
  if (shouldReseed() || !stored?.length) {
    return cloneInboundSeedOrders().map(normalizeLegacyOrder)
  }
  return stored.map(normalizeLegacyOrder)
}

export function generateInboundNo() {
  const ymd = dayjs().format('YYYYMMDD')
  const prefix = `1-${ymd}-`
  const max = inboundOrderState.orders.reduce((m, o) => {
    const str = String(o.docNo || '')
    if (!str.startsWith(prefix)) return m
    const seq = Number(str.slice(prefix.length)) || 0
    return Math.max(m, seq)
  }, 0)
  return `${prefix}${String(max + 1).padStart(5, '0')}`
}

export const inboundOrderState = reactive({
  orders: initOrders(),
})

watch(
  () => inboundOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getInboundOrderById(id) {
  return inboundOrderState.orders.find((o) => o.id === id) || null
}

export function getInboundOrdersBySource(sourceOrderNo) {
  return inboundOrderState.orders.filter((o) => o.sourceOrderNo === sourceOrderNo)
}

export function resolveWarehouseKeeper(warehouseName) {
  const wh = warehouseState.warehouses.find((w) => w.name === warehouseName)
  return wh?.managerName || ''
}

function canDeleteInbound(order) {
  return order && order.status !== '已完成'
}

function canEditInbound(order) {
  return order && ['待处理', '待审批', '已拒绝'].includes(order.status)
}

function canConfirmInbound(order) {
  return order?.status === '待处理'
}

function canApproveInbound(order) {
  return order?.status === '待审批' && order?.inboundType === '成品入库'
}

function buildInboundLineItems(payload, headerWarehouse = '') {
  return (payload.lineItems || []).map((line) =>
    createInboundLine({
      ...line,
      warehouse: line.warehouse || headerWarehouse || payload.warehouse || '',
    }),
  )
}

export function addInboundOrder(payload) {
  const docNo = String(payload.docNo || '').trim() || generateInboundNo()
  const lineItems = buildInboundLineItems(payload, payload.warehouse || '')
  const headerWarehouse =
    payload.warehouse || lineItems.find((line) => line.warehouse)?.warehouse || ''
  const whKeeper = resolveWarehouseKeeper(headerWarehouse)
  const row = normalizeLegacyOrder(
    createInboundOrder({
      ...payload,
      id: payload.id || `ib-${Date.now()}`,
      docNo,
      warehouse: headerWarehouse || undefined,
      lineItems,
      warehouseKeeper: payload.warehouseKeeper || whKeeper,
      status:
        payload.status ||
        (payload.inboundType === '成品入库' && payload.miniProgramTaskId ? '待审批' : '待处理'),
      createdAt: payload.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }),
  )
  inboundOrderState.orders.unshift(row)
  return row
}

export function updateInboundOrder(id, patch) {
  const idx = inboundOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return { ok: false, message: '入库单不存在' }
  const row = inboundOrderState.orders[idx]
  if (!canEditInbound(row)) return { ok: false, message: '当前状态不可编辑' }
  const headerWarehouse = patch.warehouse ?? row.warehouse
  if (patch.lineItems) {
    patch.lineItems = buildInboundLineItems({ ...patch, warehouse: headerWarehouse }, headerWarehouse)
  }
  if (patch.warehouse !== undefined) {
    patch.warehouse = headerWarehouse || undefined
    patch.warehouseKeeper = resolveWarehouseKeeper(headerWarehouse)
  }
  if (patch.docNo !== undefined) {
    patch.docNo = String(patch.docNo || '').trim() || row.docNo
  }
  Object.assign(row, patch)
  return { ok: true, order: row }
}

export function deleteInboundOrder(id) {
  const idx = inboundOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  if (!canDeleteInbound(inboundOrderState.orders[idx])) return false
  inboundOrderState.orders.splice(idx, 1)
  return true
}

export function confirmInboundOrders(ids, operator = 'admin1') {
  let count = 0
  const blocked = []
  ids.forEach((id) => {
    const order = inboundOrderState.orders.find((o) => o.id === id)
    if (!canConfirmInbound(order)) {
      blocked.push({ docNo: order?.docNo || id, message: '仅待处理状态可确认入库' })
      return
    }
    const stockRes = applyInboundToStock(order)
    if (!stockRes.ok) {
      blocked.push({ docNo: order.docNo, message: stockRes.message })
      return
    }
    order.status = '已完成'
    order.confirmer = operator
    order.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    count += 1
  })
  return { count, blocked }
}

export function approveInboundOrder(id, operator = 'admin1') {
  const order = inboundOrderState.orders.find((o) => o.id === id)
  if (!canApproveInbound(order)) {
    return { ok: false, message: '仅成品入库待审批单据可审批' }
  }
  order.status = '待处理'
  order.approver = operator
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, order }
}

export function rejectInboundOrder(id, operator = 'admin1') {
  const order = inboundOrderState.orders.find((o) => o.id === id)
  if (!canApproveInbound(order)) {
    return { ok: false, message: '仅成品入库待审批单据可拒绝' }
  }
  order.status = '已拒绝'
  order.approver = operator
  order.approvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  resetMiniProgramInboundTask(order.miniProgramTaskId)
  return { ok: true, order }
}

/** 拒绝后小程序入库任务恢复为待开始（占位，后续对接小程序） */
export function resetMiniProgramInboundTask(taskId) {
  if (!taskId) return
  try {
    const key = 'i_doms_mp_inbound_tasks'
    const raw = localStorage.getItem(key)
    const tasks = raw ? JSON.parse(raw) : []
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx >= 0) {
      tasks[idx].status = '待开始'
      localStorage.setItem(key, JSON.stringify(tasks))
    }
  } catch {
    /* ignore */
  }
}

/** 采购订单生成采购入库单（待处理） */
export function createInboundFromPurchaseOrder(purchaseOrderId, payload = {}) {
  const po = purchaseOrderState.orders.find((o) => o.id === purchaseOrderId)
  if (!po) return { ok: false, message: '采购单不存在' }

  const lines = payload.lineItems || []
  if (!lines.length) return { ok: false, message: '请至少添加一条入库明细' }

  const invalid = lines.find((line) => !line.warehouse || !line.qty || Number(line.qty) <= 0)
  if (invalid) {
    return { ok: false, message: '请完善入库仓库和入库数量' }
  }

  const itemTypes = [...new Set(lines.map((line) => line.itemType).filter(Boolean))]
  const itemType = itemTypes.length === 1 ? itemTypes[0] : '物料'
  const warehouses = [...new Set(lines.map((line) => line.warehouse).filter(Boolean))]
  const headerWarehouse = warehouses.length === 1 ? warehouses[0] : warehouses[0] || ''

  const lineItems = lines.map((line) =>
    createInboundLine({
      poLineId: line.poLineId || '',
      itemCode: line.itemCode,
      itemName: line.itemName,
      specModel: line.specModel || '',
      specAttr: line.specAttr || '',
      material: line.material || '',
      unit: line.unit || '个',
      unitPrice: line.unitPrice ?? null,
      warehouse: line.warehouse,
      qty: Number(line.qty),
    }),
  )

  const order = addInboundOrder({
    inboundType: '采购入库',
    status: '待处理',
    warehouse: headerWarehouse,
    warehouseKeeper: resolveWarehouseKeeper(headerWarehouse),
    inboundDate: payload.inboundDate || dayjs().format('YYYY-MM-DD'),
    deliveryDate: payload.deliveryDate || dayjs().format('YYYY-MM-DD'),
    itemType,
    supplier: po.supplier,
    sourceOrderNo: po.orderNo,
    sourceType: '采购订单',
    purchaseOrderId: po.id,
    invoiceNo: payload.invoiceNo || '',
    remark: payload.remark || `采购单 ${po.orderNo} 生成`,
    handler: payload.handler || 'admin1',
    creator: payload.creator || 'admin1',
    lineItems,
  })

  return { ok: true, order }
}

export function createInboundFromScrap(scrap, partial = {}) {
  const inboundType =
    partial.inboundType === '生产退库' ? '半成品入库' : partial.inboundType || '报废入库'
  const order = addInboundOrder({
    inboundType,
    status: '待处理',
    warehouse: partial.warehouse || scrap.warehouse || '半成品仓',
    sourceOrderNo: scrap.scrapNo,
    sourceType: '报废单',
    itemType: '物料',
    handler: partial.creator || '管理员',
    creator: partial.creator || '管理员',
    remark: partial.remark || `报废单 ${scrap.scrapNo}`,
    inboundDate: dayjs().format('YYYY-MM-DD'),
    lineItems: [
      {
        id: `ib-line-${Date.now()}`,
        itemName: scrap.itemName,
        itemCode: scrap.itemCode,
        specModel: scrap.specModel,
        material: scrap.material,
        qty: scrap.qty || 1,
        unit: scrap.unit || '件',
      },
    ],
    ...partial,
  })
  return order
}

export { canDeleteInbound, canEditInbound, canConfirmInbound, canApproveInbound }

import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { cloneOutboundOrders, createOutboundLine, createOutboundOrder } from '@/mock/outboundOrders'
import { needsOutboundApproval } from '@/mock/outboundOptions'
import {
  createFactoryQcFromOutbound,
  getFactoryQcById,
  qcResultBlocksOutbound,
  QC_RESULT_PASS,
} from '@/store/factoryQcStore'

const STORAGE_KEY = 'i_doms_outbound_orders'

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
  const legacy = localStorage.getItem('i_doms_sales_outbound')
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed.orders)) {
        return parsed.orders.map((o) => ({
          ...o,
          outboundType: o.docType || o.outboundType || '销售出库',
          warehouse: o.warehouse || '成品仓',
          handler: o.handler || 'admin1',
          sourceOrderNo: o.sourceOrderNo || o.salesOrderNo || '',
          creator: o.creator || 'admin1',
          createdAt: o.outboundDate || o.createdAt,
          workshop: o.workshop || '默认工厂',
          warehouseKeeper: o.warehouseKeeper || 'admin1',
        }))
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: outboundState.orders }))
}

export function generateOutboundNo() {
  const seq = outboundState.orders.length + 1
  return `OUT${dayjs().format('YYYYMMDD')}${String(seq).padStart(4, '0')}`
}

export const outboundState = reactive({
  orders: loadFromStorage() || cloneOutboundOrders(),
})

watch(
  () => outboundState.orders,
  () => persist(),
  { deep: true },
)

export function getOutboundOrderById(id) {
  if (!id) return null
  return outboundState.orders.find((o) => o.id === id) || null
}

export function getOutboundOrderByDocNo(docNo) {
  if (!docNo) return null
  return outboundState.orders.find((o) => o.docNo === docNo) || null
}

export function deleteOutboundOrder(id) {
  const idx = outboundState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  outboundState.orders.splice(idx, 1)
  return true
}

export function canEditOutbound(order) {
  return ['待处理', '待出库'].includes(order?.status)
}

export function canDeleteOutbound(order) {
  return ['待处理', '待出库'].includes(order?.status)
}

export function canApproveOutbound(order) {
  return order?.status === '待处理' && needsOutboundApproval(order.outboundType)
}

function resolveInitialOutboundStatus(outboundType) {
  if (needsOutboundApproval(outboundType)) return '待处理'
  return '待出库'
}

function buildLineItems(payload) {
  return payload.lineItems.map((line) =>
    createOutboundLine({
      ...line,
      itemType: line.itemType || payload.itemType || '物料',
      shipWarehouse: line.shipWarehouse || payload.warehouse || '',
    }),
  )
}

function applyOutboundHeaderFields(order, payload) {
  const lineItems = buildLineItems(payload)
  const headerWarehouse =
    payload.warehouse || lineItems.find((line) => line.shipWarehouse)?.shipWarehouse || ''
  Object.assign(order, {
    ...payload,
    warehouse: headerWarehouse,
    lineItems,
    warehouseKeeper:
      payload.warehouseKeeper || payload.handler || order.warehouseKeeper || 'admin1',
    workshop: payload.workshop || payload.requisitionDept || order.workshop || '默认工厂',
    outboundTime:
      payload.outboundTime || order.outboundTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    remark: payload.remark?.trim?.() ?? payload.remark ?? order.remark,
  })
  return order
}

export function addOutboundOrder(payload) {
  const docNo = String(payload.docNo || '').trim()
  if (!docNo) {
    return { ok: false, message: '请输入出库单号' }
  }
  if (getOutboundOrderByDocNo(docNo)) {
    return { ok: false, message: '出库单号已存在' }
  }
  if (!payload.outboundType) {
    return { ok: false, message: '请选择出库类型' }
  }
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条明细' }
  }

  const lineItems = buildLineItems(payload)

  const headerWarehouse =
    payload.warehouse || lineItems.find((line) => line.shipWarehouse)?.shipWarehouse || ''

  const row = createOutboundOrder({
    ...payload,
    id: payload.id || `ob-${Date.now()}`,
    docNo,
    warehouse: headerWarehouse,
    lineItems,
    status: payload.status || resolveInitialOutboundStatus(payload.outboundType),
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    outboundTime: payload.outboundTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    creator: payload.creator || 'admin1',
    warehouseKeeper: payload.warehouseKeeper || payload.handler || 'admin1',
    workshop: payload.workshop || payload.requisitionDept || '默认工厂',
  })
  outboundState.orders.unshift(row)
  return { ok: true, order: row }
}

export function updateOutboundOrder(id, payload) {
  const order = getOutboundOrderById(id)
  if (!order) {
    return { ok: false, message: '出库单不存在' }
  }
  if (!canEditOutbound(order)) {
    return { ok: false, message: '当前状态不可编辑' }
  }
  const docNo = String(payload.docNo || order.docNo || '').trim()
  if (!docNo) {
    return { ok: false, message: '请输入出库单号' }
  }
  const duplicate = getOutboundOrderByDocNo(docNo)
  if (duplicate && duplicate.id !== id) {
    return { ok: false, message: '出库单号已存在' }
  }
  if (!payload.outboundType) {
    return { ok: false, message: '请选择出库类型' }
  }
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条明细' }
  }
  applyOutboundHeaderFields(order, { ...payload, docNo })
  return { ok: true, order }
}

export function approveOutboundOrder(id, operator = 'admin1') {
  const order = getOutboundOrderById(id)
  if (!order) {
    return { ok: false, message: '出库单不存在' }
  }
  if (!canApproveOutbound(order)) {
    return { ok: false, message: '当前出库单不可审批' }
  }
  order.status = '待出库'
  order.auditor = operator
  order.auditDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, order }
}

export function confirmOutbound(ids) {
  const blocked = []
  let count = 0
  ids.forEach((id) => {
    const order = outboundState.orders.find((o) => o.id === id)
    const check = validateOutboundForConfirm(order)
    if (!check.ok) {
      if (check.code !== 'already_done') {
        blocked.push({
          docNo: order?.docNo || id,
          message: check.message,
          qcBlocked: check.qcBlocked,
        })
      }
      return
    }
    order.status = '已出库'
    order.completedAt = dayjs().format('YYYY-MM-DD')
    if (!order.auditDate) order.auditDate = order.completedAt
    if (order.outboundType === '销售出库') {
      import('@/utils/deliveryOutboundSync').then(({ syncDeliveryAfterOutboundConfirm }) => {
        syncDeliveryAfterOutboundConfirm(order)
      })
    }
    count += 1
  })
  return { count, blocked }
}

/** 校验是否可确认出库 */
export function validateOutboundForConfirm(order) {
  if (!order) return { ok: false, message: '出库单不存在' }
  if (order.status === '已出库') return { ok: false, code: 'already_done', message: '已出库' }
  if (order.status !== '待出库') {
    return { ok: false, message: '仅「待出库」状态可确认出库' }
  }

  if (order.outboundType !== '销售出库') {
    return { ok: true }
  }

  // 未发起出厂质检：无需校验，可直接确认出库
  if (!order.factoryQcId) {
    return { ok: true }
  }

  const qc = getFactoryQcById(order.factoryQcId)
  if (!qc) {
    return { ok: true }
  }

  if (qc.qcStatus === '待质检') {
    return { ok: false, message: '出厂质检尚未完成，请先完成质检' }
  }

  if (qcResultBlocksOutbound(qc.qcResult)) {
    return {
      ok: false,
      qcBlocked: true,
      message: '出厂质检结果不符合出库要求，请重新发起出厂质检',
    }
  }

  if (qc.qcResult !== QC_RESULT_PASS) {
    return { ok: false, message: '出厂质检未通过，无法确认出库' }
  }

  return { ok: true }
}

export function linkOutboundToQc(outboundId, qcId) {
  const order = outboundState.orders.find((o) => o.id === outboundId)
  if (order) order.factoryQcId = qcId
}

export function canInitiateFactoryQc(record) {
  if (record?.outboundType !== '销售出库' || record?.status !== '待出库') {
    return false
  }
  if (!record.factoryQcId) {
    return true
  }
  const qc = getFactoryQcById(record.factoryQcId)
  if (!qc) {
    return true
  }
  if (qc.qcStatus === '待质检') {
    return false
  }
  if (qc.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return true
  }
  return false
}

/** 发起出厂质检（仅销售出库 + 待出库） */
export function initiateFactoryQcFromOutbound(outboundId) {
  const outbound = outboundState.orders.find((o) => o.id === outboundId)
  if (!outbound) return { ok: false, message: '出库单不存在' }
  if (outbound.outboundType !== '销售出库') {
    return { ok: false, message: '仅「销售出库」类型可发起出厂质检' }
  }
  if (outbound.status !== '待出库') {
    return { ok: false, message: '仅「待出库」状态的销售出库单可发起出厂质检' }
  }
  if (!canInitiateFactoryQc(outbound)) {
    const qc = getFactoryQcById(outbound.factoryQcId)
    if (qc?.qcStatus === '待质检') {
      return { ok: false, message: '该出库单已有进行中的出厂质检任务' }
    }
    if (qc?.qcResult === QC_RESULT_PASS) {
      return { ok: false, message: '出厂质检已通过，请直接确认出库' }
    }
    return { ok: false, message: '当前状态不可发起出厂质检' }
  }
  if (!outbound.lineItems?.length) {
    return { ok: false, message: '出库单无明细，无法发起出厂质检' }
  }

  const previousQc = outbound.factoryQcId ? getFactoryQcById(outbound.factoryQcId) : null
  const isRetry = previousQc?.qcStatus === '已完成' && qcResultBlocksOutbound(previousQc.qcResult)

  const payload = {
    ...outbound,
    docType: outbound.outboundType,
    salesOrderNo: outbound.salesOrderNo || outbound.sourceOrderNo,
  }
  const result = createFactoryQcFromOutbound(payload, {
    retryFromQc: isRetry ? previousQc : null,
  })
  if (result.ok && result.record) {
    linkOutboundToQc(outboundId, result.record.id)
  }
  return result
}

// 兼容旧引用
export const salesOutboundState = outboundState

import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { cloneOutboundOrders } from '@/mock/outboundOrders'
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

  if (order.outboundType !== '销售出库') {
    return { ok: true }
  }

  if (order.status !== '待出库') {
    return { ok: false, message: '销售出库单需为「待出库」状态方可确认出库' }
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

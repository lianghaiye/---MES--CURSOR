/**
 * 采购订单按供应商合并（未执行状态）
 */
import dayjs from 'dayjs'
import { createPoLineItem } from '@/mock/purchaseOrders'
import { getPurchaseOrdersByIds, updatePurchaseOrder } from '@/store/purchaseOrderStore'
import { pickHighestUrgency } from '@/utils/purchaseMerge'
import { roundNumber } from '@/utils/numberFormat'

function orderSupplier(order) {
  return String(order?.supplier || order?.supplierName || '').trim() || '未指定供应商'
}

export const PO_MERGEABLE_STATUSES = new Set(['待提交', '待审核', '已拒绝'])

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function round4(n) {
  return roundNumber(n, 4)
}

export function isPurchaseOrderMergeable(order) {
  return Boolean(order && PO_MERGEABLE_STATUSES.has(order.status))
}

/** 明细一致则合数量 */
export function poLineMergeKey(line = {}) {
  const code = line.itemCode || line.productCode || ''
  const spec = line.specModel || ''
  const material = line.material || ''
  const unit = line.unit || line.purchaseUnit || ''
  const inTax = round4(num(line.unitPriceInTax))
  const rate = num(line.taxRate)
  const wh = line.receivingWarehouse || ''
  return [code, spec, material, unit, inTax, rate, wh].join('@@')
}

function earliestOrder(orders) {
  return [...orders].sort((a, b) => {
    const ta = String(a.createdAt || a.createTime || '')
    const tb = String(b.createdAt || b.createTime || '')
    if (ta !== tb) return ta.localeCompare(tb)
    return String(a.orderNo || '').localeCompare(String(b.orderNo || ''))
  })[0]
}

function mergeSourceReqNos(...lists) {
  const set = new Set()
  lists.forEach((arr) => {
    ;(arr || []).forEach((n) => {
      const s = String(n || '').trim()
      if (s) set.add(s)
    })
  })
  return [...set]
}

function buildMergedLineItems(orders) {
  const bucket = new Map()
  orders.forEach((order) => {
    ;(order.lineItems || []).forEach((raw) => {
      const key = poLineMergeKey(raw)
      const qty = num(raw.purchaseQty)
      const existing = bucket.get(key)
      const sourceReqNos = mergeSourceReqNos(
        raw.sourceReqNos,
        String(raw.sourceReqNo || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
      if (!existing) {
        bucket.set(key, {
          ...raw,
          purchaseQty: qty,
          sourceReqNos,
          sourceOrderNos: [order.orderNo].filter(Boolean),
          urgency: raw.urgency || order.urgency || '正常',
          deliveryDate: raw.deliveryDate || order.deliveryDate || '',
        })
        return
      }
      existing.purchaseQty = round4(existing.purchaseQty + qty)
      existing.urgency = pickHighestUrgency(existing.urgency, raw.urgency, order.urgency)
      existing.sourceReqNos = mergeSourceReqNos(existing.sourceReqNos, sourceReqNos)
      if (order.orderNo && !existing.sourceOrderNos.includes(order.orderNo)) {
        existing.sourceOrderNos.push(order.orderNo)
      }
      const d1 = existing.deliveryDate || ''
      const d2 = raw.deliveryDate || order.deliveryDate || ''
      if (d1 && d2) existing.deliveryDate = d1 < d2 ? d1 : d2
      else existing.deliveryDate = d1 || d2
    })
  })

  return [...bucket.values()].map((row) => {
    const { sourceOrderNos, ...rest } = row
    delete rest.id
    return createPoLineItem({
      ...rest,
      purchaseQty: row.purchaseQty,
      sourceReqNos: row.sourceReqNos,
      remark: [row.remark, sourceOrderNos?.length > 1 ? `合并自 ${sourceOrderNos.join('、')}` : '']
        .filter(Boolean)
        .join('；'),
    })
  })
}

/**
 * 预览合并结果（不写库）
 * @returns {{ ok: boolean, message?: string, primary?: object, voidOrders?: object[], lineItems?: object[], supplierName?: string }}
 */
export function previewMergePurchaseOrders(orderIds = []) {
  const orders = getPurchaseOrdersByIds(orderIds)
  if (orders.length < 2) {
    return { ok: false, message: '请至少勾选 2 张采购订单' }
  }
  const bad = orders.filter((o) => !isPurchaseOrderMergeable(o))
  if (bad.length) {
    return {
      ok: false,
      message: `仅「待提交 / 待审核 / 已拒绝」可合并，不可合：${bad.map((o) => o.orderNo).join('、')}`,
    }
  }
  const suppliers = [...new Set(orders.map(orderSupplier))]
  if (suppliers.length > 1) {
    return { ok: false, message: '只能合并同一供应商的采购订单' }
  }
  const primary = earliestOrder(orders)
  const voidOrders = orders.filter((o) => o.id !== primary.id)
  const lineItems = buildMergedLineItems(orders)
  return {
    ok: true,
    primary,
    voidOrders,
    lineItems,
    supplierName: suppliers[0],
  }
}

/**
 * 执行合并：保留最早单，迁入合并明细，其余作废
 */
export function confirmMergePurchaseOrders(orderIds = []) {
  const preview = previewMergePurchaseOrders(orderIds)
  if (!preview.ok) return preview

  const { primary, voidOrders, lineItems } = preview
  const mergedFromNos = voidOrders.map((o) => o.orderNo).filter(Boolean)
  const remarkParts = [
    primary.remark,
    mergedFromNos.length ? `已合并订单：${mergedFromNos.join('、')}` : '',
  ].filter(Boolean)

  const allReqNos = mergeSourceReqNos(
    String(primary.reqNo || '')
      .split(',')
      .map((s) => s.trim()),
    ...voidOrders.map((o) =>
      String(o.reqNo || '')
        .split(',')
        .map((s) => s.trim()),
    ),
    ...lineItems.map((l) => l.sourceReqNos || []),
  )

  updatePurchaseOrder(primary.id, {
    lineItems,
    reqNo: allReqNos.join(','),
    urgency: pickHighestUrgency(primary.urgency, ...voidOrders.map((o) => o.urgency)),
    remark: remarkParts.join('；'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    status: primary.status === '已拒绝' ? '待审核' : primary.status,
    approvalResult: primary.status === '已拒绝' ? '待审核' : primary.approvalResult,
  })

  voidOrders.forEach((o) => {
    updatePurchaseOrder(o.id, {
      status: '已作废',
      approvalResult: o.approvalResult || '—',
      overdueStatus: '未逾期',
      remark: [o.remark, `已合并至 ${primary.orderNo}`].filter(Boolean).join('；'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      mergedIntoOrderId: primary.id,
      mergedIntoOrderNo: primary.orderNo,
    })
  })

  return {
    ok: true,
    message: `已合并为「${primary.orderNo}」，作废 ${voidOrders.length} 张`,
    primary,
    voidCount: voidOrders.length,
  }
}

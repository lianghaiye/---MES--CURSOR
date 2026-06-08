import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createScrapOrderSeed } from '@/mock/scrapOrders'
import { calcScrapCost, resolveUnitPrice, resolveWarehouseKeeper } from '@/utils/scrapOrderUtils'
import { createInboundFromScrap } from '@/store/inboundOrderStore'
import { addDisassemblyWorkOrder } from '@/store/disassemblyWorkOrderStore'
import { addPurchaseRequisition, generateReqNo } from '@/store/purchaseRequisitionStore'
import { createLineItem, recalcRequisitionTotals } from '@/mock/purchaseRequisitions'
import { outboundState, generateOutboundNo } from '@/store/outboundStore'
import { createOutboundLine } from '@/mock/outboundOrders'

const STORAGE_KEY = 'i_doms_scrap_orders'
const SEED_VERSION_KEY = 'i_doms_scrap_orders_seed_v'
const CURRENT_SEED_VERSION = '3'

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: scrapOrderState.orders }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

export function generateScrapNo(existingNos = []) {
  const ym = dayjs().format('YYYYMM')
  const prefix = `BF${ym}`
  const sameMonth = existingNos.filter((n) => n && n.startsWith(prefix))
  const maxSeq = sameMonth.reduce((max, n) => {
    const seq = Number(n.slice(-4)) || 0
    return Math.max(max, seq)
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

export const scrapOrderState = reactive({
  orders: shouldReseed() ? createScrapOrderSeed() : loadFromStorage() || createScrapOrderSeed(),
})

watch(
  () => scrapOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getScrapOrderById(id) {
  return scrapOrderState.orders.find((o) => o.id === id) || null
}

export function getScrapOrderByNo(scrapNo) {
  return scrapOrderState.orders.find((o) => o.scrapNo === scrapNo) || null
}

export function getApprovedScrapOrders() {
  return scrapOrderState.orders.filter((o) => o.auditStatus === '审核通过')
}

function patchScrapOrder(id, patch) {
  const idx = scrapOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(scrapOrderState.orders[idx], patch)
  return scrapOrderState.orders[idx]
}

function validateAuditForm(order, form, pass) {
  if (pass && !form.processMethod) {
    return { ok: false, message: '请选择处理方式' }
  }
  if (pass && form.processMethod === '退库') {
    if (!form.warehouse) return { ok: false, message: '退库须选择仓库' }
    if (!form.warehouseKeeper) return { ok: false, message: '退库须选择仓库负责人' }
  }
  if (pass && form.processMethod === '报废') {
    if (!form.processResult) return { ok: false, message: '报废须选择处理结果' }
    if (form.processResult === '财物变现') {
      if (!form.warehouse) return { ok: false, message: '财物变现须选择仓库' }
      if (!form.warehouseKeeper) return { ok: false, message: '财物变现须选择仓库负责人' }
    }
  }
  if (!pass && !String(form.auditComment || '').trim()) {
    return { ok: false, message: '驳回须填写审批意见' }
  }
  if (order.auditStatus !== '待审核') {
    return { ok: false, message: '当前状态不可审批' }
  }
  return { ok: true }
}

/** 审批通过 */
export function approveScrapOrder(id, form) {
  const order = getScrapOrderById(id)
  if (!order) return { ok: false, message: '报废单不存在' }
  const check = validateAuditForm(order, form, true)
  if (!check.ok) return check

  const needReplenish = form.needReplenish !== false && form.replenishMethod !== '-'
  const patch = {
    scrapReason: form.scrapReason,
    replenishMethod: needReplenish ? form.replenishMethod : '-',
    needReplenish,
    processMethod: form.processMethod,
    processResult: form.processResult || '',
    warehouse: form.warehouse || '',
    warehouseKeeper: form.warehouseKeeper || '',
    auditComment: form.auditComment || '',
    auditStatus: '审核通过',
    replenishStatus: needReplenish ? '未补料' : '不需补料',
    processStatus: '已处理',
    auditedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    auditor: form.auditor || '管理员',
    disposalLinks: [],
  }

  if (form.processMethod === '退库') {
    const inbound = createInboundFromScrap(
      { ...order, warehouse: form.warehouse, warehouseKeeper: form.warehouseKeeper },
      { inboundType: '生产退库', remark: `报废单 ${order.scrapNo} 生产退库` },
    )
    patch.disposalLinks = [
      { type: 'inbound', id: inbound.id, docNo: inbound.docNo, inboundType: inbound.inboundType },
    ]
  } else if (form.processMethod === '报废' && form.processResult === '财物变现') {
    const inbound = createInboundFromScrap(
      { ...order, warehouse: form.warehouse, warehouseKeeper: form.warehouseKeeper },
      { inboundType: '报废入库', remark: `报废单 ${order.scrapNo} 财物变现入库` },
    )
    patch.disposalLinks = [
      { type: 'inbound', id: inbound.id, docNo: inbound.docNo, inboundType: inbound.inboundType },
    ]
  } else if (form.processMethod === '拆解') {
    const dwo = addDisassemblyWorkOrder({
      itemName: order.itemName,
      itemCode: order.itemCode,
      specModel: order.specModel,
      material: order.material,
      qty: order.qty,
      unit: order.unit,
      scrapOrderId: order.id,
      scrapOrderNo: order.scrapNo,
      remark: `由报废单 ${order.scrapNo} 自动创建`,
    })
    patch.disassemblyWorkOrderId = dwo.id
    patch.disassemblyWorkOrderCode = dwo.code
    patch.disposalLinks = [{ type: 'disassembly', id: dwo.id, docNo: dwo.code }]
  }

  const updated = patchScrapOrder(id, patch)
  return { ok: true, order: updated }
}

/** 审批驳回 */
export function rejectScrapOrder(id, form) {
  const order = getScrapOrderById(id)
  if (!order) return { ok: false, message: '报废单不存在' }
  const check = validateAuditForm(order, form, false)
  if (!check.ok) return check

  const updated = patchScrapOrder(id, {
    scrapReason: form.scrapReason,
    replenishMethod: form.replenishMethod,
    needReplenish: form.replenishMethod !== '-',
    processMethod: form.processMethod || '',
    auditComment: form.auditComment,
    auditStatus: '驳回',
    processStatus: '未处理',
    auditedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    auditor: form.auditor || '管理员',
  })
  return { ok: true, order: updated }
}

/** 生成补料单 */
export function replenishScrapOrder(id, form) {
  const order = getScrapOrderById(id)
  if (!order) return { ok: false, message: '报废单不存在' }
  if (order.auditStatus !== '审核通过') {
    return { ok: false, message: '仅审核通过的单据可补料' }
  }
  if (!order.needReplenish) {
    return { ok: false, message: '该单据不需补料' }
  }
  if (order.replenishStatus === '已补料') {
    return { ok: false, message: '已完成补料' }
  }
  const method = form.replenishMethod
  if (!method || method === '-') {
    return { ok: false, message: '请选择补料方式' }
  }

  const links = []
  if (method === '采购补料') {
    const unitPrice = order.unitPrice || resolveUnitPrice(order.itemCode)
    const line = createLineItem({
      inventoryName: order.itemName,
      inventoryCode: order.itemCode,
      specModel: order.specModel,
      material: order.material,
      unit: order.unit || '件',
      demandQty: order.qty,
      planPurchaseQty: order.qty,
      unitPriceExTax: unitPrice,
      taxRate: 13,
      unitPriceInTax: Math.round(unitPrice * 1.13 * 100) / 100,
      totalPriceExTax: unitPrice * order.qty,
      totalPriceInTax: Math.round(unitPrice * 1.13 * order.qty * 100) / 100,
      expectedArrivalDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
      receivingWarehouse: order.warehouse || '原料仓',
      remark: `报废补料 ${order.scrapNo}`,
    })
    const req = {
      id: `pr-scrap-${Date.now()}`,
      reqNo: generateReqNo(),
      docStatus: '待处理',
      overdueStatus: '未逾期',
      urgency: '正常',
      orderDate: dayjs().format('YYYY-MM-DD'),
      deliveryDate: line.deliveryDate,
      estimatedArrivalDate: line.expectedArrivalDate,
      source: '报废补料',
      operator: '管理员',
      creator: '管理员',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      remark: `关联报废单 ${order.scrapNo}`,
      sourceScrapNo: order.scrapNo,
      lineItems: [line],
    }
    recalcRequisitionTotals(req)
    addPurchaseRequisition(req)
    links.push({ type: 'purchase_req', id: req.id, docNo: req.reqNo })
  } else if (method === '库存补料') {
    const warehouse = order.warehouse || '原料仓'
    const outbound = {
      id: `ob-scrap-${Date.now()}`,
      docNo: generateOutboundNo(),
      outboundType: '领料出库',
      status: '待处理',
      warehouse,
      handler: '管理员',
      creator: '管理员',
      createdAt: dayjs().format('YYYY-MM-DD'),
      sourceOrderNo: order.scrapNo,
      requisitionDept: order.workshop || '机加车间',
      workshop: order.workshop || '默认工厂',
      warehouseKeeper: order.warehouseKeeper || resolveWarehouseKeeper(warehouse),
      remark: `报废补料 ${order.scrapNo}`,
      lineItems: [
        createOutboundLine({
          itemName: order.itemName,
          itemCode: order.itemCode,
          specModel: order.specModel,
          shipQty: order.qty,
          shipWarehouse: warehouse,
          unit: order.unit || '件',
        }),
      ],
    }
    outboundState.orders.unshift(outbound)
    links.push({ type: 'outbound', id: outbound.id, docNo: outbound.docNo })
  } else {
    return { ok: false, message: '不支持的补料方式' }
  }

  const updated = patchScrapOrder(id, {
    replenishMethod: method,
    replenishStatus: '已补料',
    replenishLinks: [...(order.replenishLinks || []), ...links],
  })
  return { ok: true, order: updated, links }
}

export function recalcOrderCost(order) {
  const unitPrice = order.unitPrice ?? resolveUnitPrice(order.itemCode)
  return {
    unitPrice,
    costAmount: calcScrapCost(order.qty, unitPrice),
  }
}

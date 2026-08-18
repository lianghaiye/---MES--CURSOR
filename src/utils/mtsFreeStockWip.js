/**
 * 销售库存提醒：仅统计「以库存生产(MTS) · 自由备货补货」相关在制数量
 * （不含按销售订单排产的工单）
 */
import { PLAN_STRATEGY } from '@/mock/productInfoOptions'
import { productInfoState } from '@/store/productInfoStore'
import { productionPlanState } from '@/store/productionPlanStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { PLAN_SOURCE } from '@/utils/planSource'

const PENDING_STATUSES = new Set(['待下发'])
const EXECUTING_STATUSES = new Set(['已下发', '执行中', '暂停'])
const OPEN_PLAN_STATUSES = new Set(['待下达', '部分下达', '执行中'])

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

function resolveProducedCode(wo) {
  if (!wo) return ''
  if (wo.materialCode || wo.productCode || wo.itemCode) {
    return String(wo.materialCode || wo.productCode || wo.itemCode).trim()
  }
  if (wo.productId) {
    const p = productInfoState.products.find((x) => x.id === wo.productId)
    return p?.code || ''
  }
  return ''
}

function woQty(wo) {
  return Number(wo.scheduleQty ?? wo.planQty) || 0
}

/** 是否库存补货（自由备货）来源工单，而非销售订单排产 */
export function isFreeStockReplenishWorkOrder(wo) {
  if (!wo) return false
  if (wo.salesOrderId || wo.salesLineId) return false
  if (wo.planSource === PLAN_SOURCE.STOCK_REPLENISH) return true
  const sourceNo = String(wo.sourceOrderNo || '')
  if (sourceNo.startsWith('BH')) return true
  return false
}

function isOpenProduceStatus(status) {
  return PENDING_STATUSES.has(status) || EXECUTING_STATUSES.has(status)
}

/**
 * @returns {{ mtsWipQty: number, mtsWipText: string, pendingQty: number, executingQty: number, isMts: boolean }}
 */
export function getMtsFreeStockWipByItemCode(itemCode) {
  const code = String(itemCode || '').trim()
  const empty = {
    mtsWipQty: 0,
    mtsWipText: '—',
    pendingQty: 0,
    executingQty: 0,
    isMts: false,
  }
  if (!code) return empty

  const product = productInfoState.products.find((p) => p.code === code)
  const isMts = (product?.production?.planStrategy || PLAN_STRATEGY.MTO) === PLAN_STRATEGY.MTS
  if (!isMts) return empty

  let pendingQty = 0
  let executingQty = 0

  const collectWo = (wo) => {
    if (!wo || !isOpenProduceStatus(wo.status || '')) return
    if (resolveProducedCode(wo) !== code) return
    if (!isFreeStockReplenishWorkOrder(wo)) return
    const qty = woQty(wo)
    if (qty <= 0) return
    if (PENDING_STATUSES.has(wo.status)) pendingQty += qty
    else executingQty += qty
  }

  ;(workOrderState.orders || []).forEach(collectWo)
  ;(assemblyWorkOrderState.orders || []).forEach(collectWo)

  // 尚未生成工单的库存补货计划行，计入「待下发」侧
  ;(productionPlanState.orders || []).forEach((plan) => {
    const source =
      plan.planSource || (plan.salesOrderNo ? PLAN_SOURCE.SALES_ORDER : PLAN_SOURCE.MANUAL)
    if (source !== PLAN_SOURCE.STOCK_REPLENISH) return
    if (!OPEN_PLAN_STATUSES.has(plan.orderStatus || '待下达')) return
    ;(plan.workItems || []).forEach((wi) => {
      if (String(wi.productCode || '').trim() !== code) return
      if (wi.status === '已完成' || wi.status === '已关闭') return
      const qty = Number(wi.planQty ?? wi.salesQty ?? wi.orderQty) || 0
      if (qty > 0) pendingQty += qty
    })
  })

  pendingQty = round3(pendingQty)
  executingQty = round3(executingQty)
  const mtsWipQty = round3(pendingQty + executingQty)
  const unit = product?.inventoryUnit || '件'

  return {
    isMts: true,
    pendingQty,
    executingQty,
    mtsWipQty,
    mtsWipText: mtsWipQty > 0 ? `${pendingQty}${unit}/${executingQty}${unit}` : `0${unit}/0${unit}`,
  }
}

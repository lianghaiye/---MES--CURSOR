/**
 * 销售订单随货配件：标准包带出、库存缺口、转采购
 */
import dayjs from 'dayjs'
import { getStockQty } from '@/store/stockStore'
import {
  collectShipAttachmentsFromSalesLines,
  mergeShipAttachmentLists,
  createShipAttachmentLine,
} from '@/utils/shipBomAttachments'
import {
  addPurchaseRequisition,
  generateReqNo,
  getPurchaseRequisitionById,
  updatePurchaseRequisition,
} from '@/store/purchaseRequisitionStore'
import { createLineItem } from '@/mock/purchaseRequisitions'
import { materialInfoState, updateMaterial } from '@/store/materialInfoStore'
import { productInfoState, updateProduct } from '@/store/productInfoStore'
import { appendOrCreateProductionPlanForShipAccessories } from '@/store/productionPlanStore'
import { addOutsourcingOrder } from '@/store/outsourcingOrderStore'
import { SUPPLY_FORM_OPTIONS } from '@/utils/masterDataMigrate'
import {
  STOCK_FULFILLMENT_MODE,
  normalizeStockFulfillmentMode,
} from '@/utils/salesStockFulfillment'

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function resolveStock(warehouse, code) {
  if (!code) return 0
  try {
    return Number(getStockQty(warehouse || '', code)) || 0
  } catch {
    return 0
  }
}

function resolveMasterByCode(code) {
  if (!code) return null
  const fromMat = (materialInfoState.materials || []).find((m) => m.code === code)
  if (fromMat) return { master: fromMat, kind: 'material' }
  const fromProd = (productInfoState.products || []).find((p) => p.code === code)
  if (fromProd) return { master: fromProd, kind: 'product' }
  return null
}

function resolveMasterRecord(code) {
  return resolveMasterByCode(code)?.master || null
}

/** 订单行随货配件摘要（详情销售明细展示） */
export function summarizeLineShipAccessories(accessories, salesLineId) {
  const lineId = String(salesLineId || '')
  const rows = (accessories || []).filter((r) => String(r.salesLineId || '') === lineId)
  const gapCount = rows.filter((r) => Number(r.gapQty) > 0).length
  const names = rows
    .map((r) => r.materialName || r.materialCode || '')
    .filter(Boolean)
    .slice(0, 6)
  return {
    count: rows.length,
    gapCount,
    names,
    text: rows.length
      ? gapCount
        ? `${rows.length} 项（缺口 ${gapCount}）`
        : `${rows.length} 项`
      : '—',
  }
}

/** 未归属销售明细的随货配件 */
export function summarizeUnassignedShipAccessories(accessories) {
  const rows = (accessories || []).filter((r) => !r.salesLineId)
  const gapCount = rows.filter((r) => Number(r.gapQty) > 0).length
  return {
    count: rows.length,
    gapCount,
    text: rows.length
      ? gapCount
        ? `${rows.length} 项未归属产品（缺口 ${gapCount}）`
        : `${rows.length} 项未归属产品`
      : '',
  }
}

/**
 * 修改随货配件供应型态，并返写产品/物料主数据
 * @returns {{ ok: boolean, message?: string }}
 */
export function writebackShipAccessorySupplyForm(row, supplyForm) {
  const next = String(supplyForm || '').trim()
  if (!row) return { ok: false, message: '配件行不存在' }
  if (next && !SUPPLY_FORM_OPTIONS.includes(next)) {
    return { ok: false, message: '供应型态不合法' }
  }
  row.supplyForm = next
  const code = row.materialCode || row.itemCode || ''
  const resolved = resolveMasterByCode(code)
  if (!resolved?.master?.id) {
    return { ok: true, message: '已更新订单行（主数据未匹配，未返写）' }
  }
  if (resolved.kind === 'material') {
    updateMaterial(resolved.master.id, { supplyForm: next })
  } else {
    updateProduct(resolved.master.id, { supplyForm: next })
  }
  return { ok: true, message: '已更新并返写主数据' }
}

export function enrichShipAccessoryStock(row, warehouse = '') {
  if (!row) return row
  const code = row.materialCode || row.itemCode || ''
  const master = resolveMasterRecord(code)
  const available = resolveStock(warehouse, code)
  const need = Number(row.shipQty ?? row.planQty) || 0
  row.warehouseStockQty = available
  row.availableStock = available
  row.gapQty = round4(Math.max(0, need - available))
  row.stockFulfillmentMode = normalizeStockFulfillmentMode(row.stockFulfillmentMode)
  row.fulfillQty = accessoryFulfillQty(row)
  row.supplyForm =
    row.supplyForm || master?.supplyForm || master?.supplyType || master?.supply || '外购件'
  row.materialType = row.materialType || master?.materialType || ''
  return row
}

export function enrichShipAccessoryList(list, warehouse = '') {
  return (list || []).map((r) => enrichShipAccessoryStock({ ...r }, warehouse))
}

/**
 * 按销售明细同步随货配件标准包到订单快照
 * @returns {object[]} 同步后的 shipAccessories
 */
export function syncSalesOrderShipAccessories(order, options = {}) {
  if (!order) return []
  const warehouse = options.warehouse || order.defaultWarehouse || ''
  const fromBom = collectShipAttachmentsFromSalesLines(order.lineItems || [], { warehouse })
  // 订单阶段默认纳入，便于早下采购
  const seeded = fromBom.map((r) => ({
    ...r,
    selected: options.defaultSelected === false ? false : true,
    kitSets:
      r.kitSets != null
        ? r.kitSets
        : Number(
            (order.lineItems || []).find((l) => l.id === r.salesLineId)?.salesQty ??
              (order.lineItems || []).find((l) => l.id === r.salesLineId)?.qty,
          ) || 1,
  }))
  const merged = mergeShipAttachmentLists(seeded, order.shipAccessories || [])
  const enriched = enrichShipAccessoryList(merged, warehouse)
  order.shipAccessories = enriched
  return enriched
}

export function summarizeShipAccessoryGaps(list) {
  const rows = list || []
  const gapRows = rows.filter((r) => Number(r.gapQty) > 0)
  const gapQty = gapRows.reduce((s, r) => s + (Number(r.gapQty) || 0), 0)
  return {
    total: rows.length,
    gapCount: gapRows.length,
    gapQty: round4(gapQty),
    gapRows,
  }
}

/**
 * 随货配件转单数量
 * - 优先现货：只转库存缺口
 * - 强制按单生产/采购：库存够也按需求全量转采购/生产/外协
 * - 仅现货：不转下游单据
 */
export function accessoryFulfillQty(row) {
  const need = Number(row?.shipQty ?? row?.planQty) || 0
  const gap = Math.max(0, Number(row?.gapQty) || 0)
  const mode = normalizeStockFulfillmentMode(row?.stockFulfillmentMode)
  if (mode === STOCK_FULFILLMENT_MODE.STOCK_ONLY) return 0
  if (mode === STOCK_FULFILLMENT_MODE.FORCE_MTO) return round4(need)
  return round4(gap)
}

export function accessoryNeedsFulfillment(row) {
  return accessoryFulfillQty(row) > 0 && !!(row?.materialCode || row?.itemCode)
}

export function classifySupplyForm(supplyForm) {
  const s = String(supplyForm || '')
  if (s.includes('外协')) return 'outsourcing'
  if (s.includes('自制') || s.includes('组装')) return 'produce'
  return 'purchase'
}

/** 将随货配件外购缺口转为采购申请行（不落库） */
export function buildShipAccessoryPurchaseLineItems(salesOrder, accessories, options = {}) {
  const warehouse = options.warehouse || salesOrder?.defaultWarehouse || ''
  const salesOrderNo = salesOrder?.orderNo || ''
  const deliveryDate =
    resolveEarliestLineDate(salesOrder?.lineItems) || dayjs().format('YYYY-MM-DD')

  return (accessories || [])
    .filter((r) => accessoryNeedsFulfillment(r))
    .map((row) => {
      const code = row.materialCode || row.itemCode || ''
      const master = resolveMasterRecord(code)
      const qty = accessoryFulfillQty(row)
      return createLineItem({
        inventoryName: row.materialName || master?.name || code,
        inventoryCode: code,
        productName: row.materialName || master?.name || code,
        productCode: code,
        specModel: row.specModel || master?.specModel || '',
        material: row.material || master?.material || '',
        drawingNo: row.drawingNo || master?.drawingNo || '',
        materialType: master?.materialType || row.materialType || '配件',
        supplyType: row.supplyForm || master?.supplyForm || '外购件',
        unit: row.unit || master?.inventoryUnit || '件',
        inventoryUnit: master?.inventoryUnit || row.unit || '件',
        purchaseUnit: master?.purchaseUnit || master?.inventoryUnit || row.unit || '件',
        demandQty: qty,
        planPurchaseQty: qty,
        stockQty: Number(row.availableStock ?? row.warehouseStockQty) || 0,
        deliveryDate,
        expectedArrivalDate: deliveryDate,
        salesOrderNo,
        receivingWarehouse: warehouse || '',
        remark:
          normalizeStockFulfillmentMode(row.stockFulfillmentMode) ===
          STOCK_FULFILLMENT_MODE.FORCE_MTO
            ? `随货配件强制按单采购（产品 ${row.productCode || row.productName || '未指定'}）`
            : `随货配件缺口（产品 ${row.productCode || row.productName || '未指定'}）`,
        fromShipAccessory: true,
      })
    })
}

/** 同编码合并需求量；不同编码追加 */
export function mergePurchaseLineItems(baseLines = [], extraLines = []) {
  const result = (baseLines || []).map((l) => ({ ...l }))
  ;(extraLines || []).forEach((extra) => {
    const code = String(extra.inventoryCode || extra.productCode || '').trim()
    const hit = code
      ? result.find((l) => String(l.inventoryCode || l.productCode || '').trim() === code)
      : null
    if (!hit) {
      result.push({ ...extra })
      return
    }
    const addDemand = Number(extra.demandQty) || 0
    const addPlan = Number(extra.planPurchaseQty) || addDemand
    hit.demandQty = round4((Number(hit.demandQty) || 0) + addDemand)
    hit.planPurchaseQty = round4((Number(hit.planPurchaseQty) || 0) + addPlan)
    const remarkParts = [hit.remark, extra.remark].filter(Boolean)
    hit.remark = [...new Set(remarkParts)].join('；')
    if (extra.fromShipAccessory) hit.fromShipAccessory = true
  })
  return result
}

/**
 * 缺口配件 → 采购申请（外购件）
 * options.existingRequisition：合并进已有申请（同编码累加数量）
 * options.skipPersist：只合并/构建不落库
 */
export function buildRequisitionFromShipAccessoryGaps(salesOrder, accessories, options = {}) {
  const warehouse = options.warehouse || salesOrder?.defaultWarehouse || ''
  const gapRows = (accessories || []).filter((r) => accessoryNeedsFulfillment(r))
  if (!gapRows.length) {
    return { ok: false, message: '当前没有库存缺口的随货配件' }
  }

  const lineItems = buildShipAccessoryPurchaseLineItems(salesOrder, gapRows, { warehouse })
  const existing = options.existingRequisition || null

  if (existing) {
    existing.lineItems = mergePurchaseLineItems(existing.lineItems || [], lineItems)
    const tip = `含随货配件外购缺口 ${lineItems.length} 项`
    if (!String(existing.remark || '').includes('随货配件')) {
      existing.remark = existing.remark ? `${existing.remark}；${tip}` : tip
    }
    if (!options.skipPersist && existing.id) {
      updatePurchaseRequisition(existing.id, {
        lineItems: existing.lineItems,
        remark: existing.remark,
      })
    }
    return {
      ok: true,
      requisition: existing,
      merged: true,
      appendedCount: lineItems.length,
      message: `已合并随货配件 ${lineItems.length} 项至采购申请 ${existing.reqNo}`,
    }
  }

  const salesOrderNo = salesOrder?.orderNo || ''
  const deliveryDate =
    resolveEarliestLineDate(salesOrder?.lineItems) || dayjs().format('YYYY-MM-DD')

  const requisition = {
    id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reqNo: generateReqNo(),
    salesOrderNo,
    sourceSalesOrderId: salesOrder?.id || '',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    urgency: salesOrder?.urgency === '紧急' ? '紧急' : '正常',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    estimatedArrivalDate: deliveryDate,
    source: '销售订单随货配件',
    sourceOrderNo: salesOrderNo,
    operator: options.operator || '管理员',
    creator: options.operator || '管理员',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    remark: `由销售订单 ${salesOrderNo} 随货配件缺口生成`,
    purchaseOrderNo: '',
    lineItems,
  }

  if (!options.skipPersist) {
    addPurchaseRequisition(requisition)
  }
  return {
    ok: true,
    requisition,
    message: `已生成采购申请 ${requisition.reqNo}，共 ${lineItems.length} 项`,
  }
}

/** 自制件/组装 → 写入生产计划（待下达），由计划页再下推工单 */
function createProducePlanItemsForAccessoryGaps(salesOrder, rows) {
  const payloadRows = (rows || []).map((row) => ({
    ...row,
    planQty: accessoryFulfillQty(row),
    qty: accessoryFulfillQty(row),
  }))
  return appendOrCreateProductionPlanForShipAccessories(salesOrder, payloadRows)
}

function createOutsourcingOrdersForAccessoryGaps(salesOrder, rows) {
  const created = []
  ;(rows || []).forEach((row) => {
    const qty = accessoryFulfillQty(row)
    const oo = addOutsourcingOrder({
      productName: row.materialName || row.materialCode,
      productCode: row.materialCode || row.itemCode || '',
      qty,
      planQty: qty,
      source: '销售订单随货配件',
      sourceOrderNo: salesOrder?.orderNo || '',
      salesOrderId: salesOrder?.id || '',
      salesOrderNo: salesOrder?.orderNo || '',
      remark: `随货配件缺口转外协（供应型态：${row.supplyForm || '外协件'}）`,
      customerName: salesOrder?.customerName || '',
    })
    created.push(oo)
  })
  return created
}

/**
 * 按供应型态分流：外购→采购申请；自制/组装→生产计划；外协→外协订单
 * options.existingRequisition：外购缺口合并进该申请
 * options.skipPurchase / skipProduce / skipOutsourcing
 * options.skipPersist：采购申请不单独落库（由调用方 add）
 */
export function fulfillShipAccessoryGapsBySupply(salesOrder, accessories, options = {}) {
  const warehouse = options.warehouse || salesOrder?.defaultWarehouse || ''
  const list = accessories || []
  // 就地 enrichment，保证 convert 标记写回订单快照
  list.forEach((r) => enrichShipAccessoryStock(r, warehouse))
  const gapRows = list.filter((r) => accessoryNeedsFulfillment(r))
  if (!gapRows.length) {
    return { ok: false, message: '当前没有需要转采购/生产/外协的随货配件' }
  }

  const buckets = { purchase: [], produce: [], outsourcing: [] }
  gapRows.forEach((row) => {
    const bucket = classifySupplyForm(row.supplyForm)
    if (isAccessoryBucketConverted(row, bucket)) return
    buckets[bucket].push(row)
  })

  const pendingCount =
    (options.skipPurchase ? 0 : buckets.purchase.length) +
    (options.skipProduce ? 0 : buckets.produce.length) +
    (options.skipOutsourcing ? 0 : buckets.outsourcing.length)
  if (!pendingCount) {
    return { ok: false, message: '随货配件缺口已全部转履约，无需重复生成' }
  }

  let existing = options.existingRequisition || null
  if (!existing && salesOrder?.purchaseRequisitionId) {
    existing = getPurchaseRequisitionById(salesOrder.purchaseRequisitionId)
  }

  const results = {
    purchase: null,
    produce: [],
    productionPlan: null,
    outsourcing: [],
    messages: [],
  }

  if (!options.skipPurchase && buckets.purchase.length) {
    const res = buildRequisitionFromShipAccessoryGaps(salesOrder, buckets.purchase, {
      ...options,
      warehouse,
      existingRequisition: existing,
    })
    if (res.ok) {
      results.purchase = res.requisition
      markAccessoryBucketConverted(buckets.purchase, 'purchase')
      results.messages.push(res.message)
    }
  }

  if (!options.skipProduce && buckets.produce.length) {
    const planRes = createProducePlanItemsForAccessoryGaps(salesOrder, buckets.produce)
    results.produce = planRes.workItems || []
    results.productionPlan = planRes.plan || null
    if (results.produce.length) {
      markAccessoryBucketConverted(buckets.produce, 'produce')
      const verb = planRes.created ? '已生成生产计划' : '已写入生产计划'
      results.messages.push(
        `${verb} ${planRes.plan?.orderNo || salesOrder?.orderNo || ''}（自制/组装 ${results.produce.length} 项，待下达）`,
      )
    } else if (planRes.plan) {
      markAccessoryBucketConverted(buckets.produce, 'produce')
      results.messages.push(`随货配件自制/组装已在生产计划 ${planRes.plan.orderNo} 中`)
    }
  }

  if (!options.skipOutsourcing && buckets.outsourcing.length) {
    results.outsourcing = createOutsourcingOrdersForAccessoryGaps(salesOrder, buckets.outsourcing)
    if (results.outsourcing.length) {
      markAccessoryBucketConverted(buckets.outsourcing, 'outsourcing')
      results.messages.push(`已生成外协订单 ${results.outsourcing.length} 张`)
    }
  }

  if (!results.messages.length) {
    return { ok: false, message: '未能生成履约单据' }
  }

  return {
    ok: true,
    ...results,
    message: results.messages.join('；'),
  }
}

function isAccessoryBucketConverted(row, bucket) {
  if (bucket === 'purchase') return !!row?.purchaseConverted
  if (bucket === 'produce') return !!row?.produceConverted
  if (bucket === 'outsourcing') return !!row?.outsourcingConverted
  return false
}

export function markAccessoryBucketConverted(rows, bucket) {
  ;(rows || []).forEach((r) => {
    if (bucket === 'purchase') r.purchaseConverted = true
    if (bucket === 'produce') r.produceConverted = true
    if (bucket === 'outsourcing') r.outsourcingConverted = true
  })
}

/** 审核时：收集仍有缺口且未转采购的外购随货配件行（返回订单内原对象引用） */
export function getShipAccessoryPurchaseGapRows(salesOrder, warehouse = '') {
  const list = salesOrder?.shipAccessories || []
  const wh = warehouse || salesOrder?.defaultWarehouse || ''
  list.forEach((r) => enrichShipAccessoryStock(r, wh))
  return list.filter(
    (r) =>
      accessoryNeedsFulfillment(r) &&
      classifySupplyForm(r.supplyForm) === 'purchase' &&
      !isAccessoryBucketConverted(r, 'purchase'),
  )
}

function resolveEarliestLineDate(lineItems) {
  const dates = (lineItems || [])
    .map((l) => l.deliveryDate)
    .filter(Boolean)
    .sort()
  return dates[0] || ''
}

/** 发货申请继承订单随货配件快照 */
export function cloneOrderShipAccessoriesForDelivery(order, options = {}) {
  const warehouse = options.warehouse || ''
  const list = order?.shipAccessories || []
  if (!list.length) return []
  return enrichShipAccessoryList(
    list.map((r) =>
      createShipAttachmentLine({
        ...r,
        id: undefined,
        warehouse,
        selected: r.selected !== false,
        fromOrderSnapshot: true,
      }),
    ),
    warehouse,
  )
}

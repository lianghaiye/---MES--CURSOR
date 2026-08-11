/**
 * 发运 BOM → 发货附件行
 * 申请发货时按产品带出；默认不勾选，由用户决定是否纳入本单
 */

import { getActiveShipBomForProduct } from '@/store/productBomStore'
import { getStockQty } from '@/store/stockStore'

function lineId(prefix = 'ship-att') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function resolveStock(warehouse, code) {
  if (!warehouse || !code) return null
  try {
    return getStockQty(warehouse, code)
  } catch {
    return null
  }
}

/** 产品是否配置了生效发运 BOM */
export function productHasShipBom(productId) {
  if (productId == null || productId === '') return false
  return Boolean(getActiveShipBomForProduct(productId))
}

/** 单条发货附件行 */
export function createShipAttachmentLine(partial = {}) {
  const qty = Number(partial.shipQty ?? partial.qty ?? partial.unitQty) || 0
  return {
    id: partial.id || lineId(),
    materialCode: partial.materialCode || partial.itemCode || partial.code || '',
    materialName: partial.materialName || partial.itemName || partial.name || '',
    specModel: partial.specModel || partial.spec || '',
    material: partial.material || '',
    drawingNo: partial.drawingNo || '',
    unit: partial.unit || '件',
    unitQty: Number(partial.unitQty) || 1,
    /** 本单发货套数（附件包套数，默认随产品本次发货套数） */
    kitSets: Number(partial.kitSets) >= 0 ? Number(partial.kitSets) : null,
    shipQty: qty,
    /** BOM 建议发运总量（多次发货时的计划口径 = 订单套数 × 单位用量） */
    planQty: Number(partial.planQty ?? qty) || 0,
    /** 历史已申请发运合计（含未出库） */
    appliedQty: Number(partial.appliedQty) || 0,
    /** 历史已发货合计 */
    shippedQty: Number(partial.shippedQty) || 0,
    /** 未发货 | 部分发货 | 已发完 */
    shipStatus: partial.shipStatus || '',
    source: partial.source || '手工', // BOM | 手工
    sourceBomId: partial.sourceBomId || '',
    sourceBomNo: partial.sourceBomNo || '',
    productId: partial.productId || '',
    productCode: partial.productCode || '',
    productName: partial.productName || '',
    salesLineId: partial.salesLineId || '',
    /**
     * 是否纳入本单。显式传入优先；
     * 未传时：BOM 行默认 false（需勾选），手工行默认 true；旧数据无字段视为纳入。
     */
    selected: Object.prototype.hasOwnProperty.call(partial, 'selected')
      ? Boolean(partial.selected)
      : partial.source !== 'BOM',
    warehouseStockQty:
      partial.warehouseStockQty != null
        ? partial.warehouseStockQty
        : resolveStock(partial.warehouse, partial.materialCode || partial.itemCode),
    remark: partial.remark || '',
  }
}

/**
 * 从发运 BOM 明细展开为附件行
 * @param {object} shipBom
 * @param {{ productQty?: number, productId?, productCode?, productName?, salesLineId?, warehouse?, selected? }} opts
 */
export function buildShipAttachmentsFromBom(shipBom, opts = {}) {
  if (!shipBom) return []
  const productQty = Number(opts.productQty) > 0 ? Number(opts.productQty) : 1
  const lines = shipBom.lineItems || []
  return lines
    .map((line) => {
      const unitQty = Number(line.unitQty) || 1
      const code = line.materialCode || line.itemCode || ''
      if (!code && !line.itemName) return null
      return createShipAttachmentLine({
        materialCode: code,
        materialName: line.itemName || line.materialName || '',
        specModel: line.specModel || '',
        material: line.material || '',
        drawingNo: line.drawingNo || '',
        unit: line.unit || '件',
        unitQty,
        shipQty: Math.round(unitQty * productQty * 10000) / 10000,
        planQty: Math.round(unitQty * productQty * 10000) / 10000,
        source: 'BOM',
        sourceBomId: shipBom.id || '',
        sourceBomNo: shipBom.bomNo || '',
        productId: opts.productId || shipBom.itemId || '',
        productCode: opts.productCode || shipBom.itemCode || '',
        productName: opts.productName || shipBom.itemName || '',
        salesLineId: opts.salesLineId || '',
        warehouse: opts.warehouse,
        selected: opts.selected === true,
        remark: line.remark || '',
      })
    })
    .filter(Boolean)
}

/**
 * 按销售订单行收集发运附件（有生效发运 BOM 的产品）
 * @param {object[]} salesLines
 * @param {{ warehouse?: string }} opts
 */
export function collectShipAttachmentsFromSalesLines(salesLines, opts = {}) {
  const rows = []
  const seen = new Set()
  ;(salesLines || []).forEach((line) => {
    const productId = line.productId || line.itemId
    if (!productId) return
    const shipBom = getActiveShipBomForProduct(productId)
    if (!shipBom) return
    const productQty = Number(line.salesQty ?? line.qty ?? line.orderQty) || 1
    const built = buildShipAttachmentsFromBom(shipBom, {
      productQty,
      productId,
      productCode: line.productCode || line.itemCode || '',
      productName: line.productName || line.itemName || '',
      salesLineId: line.id || '',
      warehouse: opts.warehouse,
      selected: false,
    })
    built.forEach((row) => {
      const key = `${row.materialCode}@@${row.salesLineId || ''}@@${row.sourceBomId}`
      if (seen.has(key)) {
        const exist = rows.find(
          (r) =>
            r.materialCode === row.materialCode &&
            r.salesLineId === row.salesLineId &&
            r.sourceBomId === row.sourceBomId,
        )
        if (exist) {
          exist.shipQty = Math.round((Number(exist.shipQty) + Number(row.shipQty)) * 10000) / 10000
        }
        return
      }
      seen.add(key)
      rows.push(row)
    })
  })
  return rows
}

/**
 * 合并 BOM 带出与已有行：保留原勾选状态与手工行
 */
export function mergeShipAttachmentLists(fromBom = [], existing = []) {
  const prevMap = new Map()
  ;(existing || []).forEach((r) => {
    const key = `${r.materialCode}@@${r.salesLineId || ''}@@${r.sourceBomId || ''}`
    prevMap.set(key, r)
  })

  const mergedBom = (fromBom || []).map((row) => {
    const key = `${row.materialCode}@@${row.salesLineId || ''}@@${row.sourceBomId || ''}`
    const prev = prevMap.get(key)
    if (prev) {
      return {
        ...row,
        selected: prev.selected === true,
        shipQty: prev.shipQty != null ? prev.shipQty : row.shipQty,
        kitSets: prev.kitSets != null ? prev.kitSets : row.kitSets,
        remark: prev.remark || row.remark,
      }
    }
    return row
  })

  const bomKeys = new Set(
    mergedBom.map((r) => `${r.materialCode}@@${r.salesLineId || ''}@@${r.sourceBomId || ''}`),
  )
  const keptManual = (existing || []).filter(
    (r) =>
      r.source === '手工' &&
      !bomKeys.has(`${r.materialCode}@@${r.salesLineId || ''}@@${r.sourceBomId || ''}`),
  )
  return [...mergedBom, ...keptManual]
}

/** 按套数重算附件本次发运数量：套数 × 单位用量 */
export function calcAttachmentShipQtyBySets(unitQty, kitSets) {
  const u = Number(unitQty) || 0
  const s = Number(kitSets) || 0
  return Math.round(u * s * 10000) / 10000
}

/**
 * 从发运 BOM 向已有附件列表追加套数（赠送等多发场景）
 * - 已有同产品 BOM 行：累加 kitSets / shipQty，并纳入本单
 * - 尚无该产品附件：新建行，planQty 按订单套数，本次按添加套数
 */
export function addShipBomAttachmentSets(existing = [], shipBom, opts = {}) {
  const addSets = Math.max(0, Number(opts.addSets) || 0)
  if (!shipBom || addSets <= 0) return existing || []

  const productId = String(opts.productId || shipBom.itemId || '')
  const productCode = opts.productCode || shipBom.itemCode || ''
  const productName = opts.productName || shipBom.itemName || ''
  const salesLineId = opts.salesLineId || ''
  const orderSets = Math.max(1, Number(opts.orderSets) || addSets)
  const list = [...(existing || [])]

  const matchRow = (row) => {
    if (row.source !== 'BOM') return false
    if (salesLineId && row.salesLineId && row.salesLineId === salesLineId) return true
    if (productId && String(row.productId) === productId) return true
    if (productCode && row.productCode === productCode) return true
    return false
  }

  const existingBom = list.filter(matchRow)
  if (existingBom.length) {
    return list.map((row) => {
      if (!matchRow(row)) return row
      const unitQty = Number(row.unitQty) || 1
      const kitSets = (Number(row.kitSets) || 0) + addSets
      return {
        ...row,
        kitSets,
        shipQty: calcAttachmentShipQtyBySets(unitQty, kitSets),
        selected: true,
        planQty: Number(row.planQty) || calcAttachmentShipQtyBySets(unitQty, orderSets),
      }
    })
  }

  const built = buildShipAttachmentsFromBom(shipBom, {
    productQty: orderSets,
    productId,
    productCode,
    productName,
    salesLineId,
    warehouse: opts.warehouse,
    selected: true,
  }).map((row) => ({
    ...row,
    kitSets: addSets,
    shipQty: calcAttachmentShipQtyBySets(row.unitQty, addSets),
    planQty: calcAttachmentShipQtyBySets(row.unitQty, orderSets),
  }))

  return [...list, ...built]
}

/** 对同一产品组附件统一写入发货套数并重算用量 */
export function applyKitSetsToAttachmentGroup(attachments = [], groupKey, kitSets) {
  const sets = Math.max(0, Number(kitSets) || 0)
  return (attachments || []).map((row) => {
    const hasProduct = Boolean(row.productId || row.productCode || row.productName)
    const pid = hasProduct
      ? String(row.productId || row.productCode || row.productName)
      : '__unlinked__'
    if (pid !== groupKey) return row
    const unitQty = Number(row.unitQty) || 1
    return {
      ...row,
      kitSets: sets,
      shipQty: calcAttachmentShipQtyBySets(unitQty, sets),
    }
  })
}

/** 按产品汇总发货附件（用于提醒与批量勾选） */
export function summarizeShipAttachmentsByProduct(attachments = []) {
  const map = new Map()
  ;(attachments || []).forEach((row) => {
    const hasProduct = Boolean(row.productId || row.productCode || row.productName)
    const pid = hasProduct
      ? String(row.productId || row.productCode || row.productName)
      : '__unlinked__'
    if (!map.has(pid)) {
      map.set(pid, {
        key: pid,
        productId: row.productId || '',
        productCode: row.productCode || '',
        productName: hasProduct ? row.productName || '未命名产品' : '不关联',
        salesLineId: row.salesLineId || '',
        total: 0,
        selectedCount: 0,
        kitSets: null,
        unitQtySample: Number(row.unitQty) || 1,
      })
    }
    const g = map.get(pid)
    g.total += 1
    if (row.selected) g.selectedCount += 1
    if (g.kitSets == null && row.kitSets != null) g.kitSets = Number(row.kitSets)
    else if (row.kitSets != null) g.kitSets = Number(row.kitSets)
  })
  return Array.from(map.values())
}

/** 附件匹配键：物料 + 销售行 + 发运BOM（手工无 BOM 时用空） */
export function shipAttachmentMatchKey(att = {}) {
  return `${att.materialCode || ''}@@${att.salesLineId || ''}@@${att.productId || ''}@@${att.sourceBomId || ''}`
}

function isShippedApplication(app) {
  return app?.status === '已发货' || Number(app?.actualShipQty) > 0
}

function sumAttachmentQtyFromApps(salesOrder, att, { onlyShipped = false } = {}) {
  if (!att?.materialCode || !salesOrder) return 0
  const targetKey = shipAttachmentMatchKey(att)
  let total = 0
  for (const app of salesOrder.deliveryApplications || []) {
    if (onlyShipped && !isShippedApplication(app)) continue
    for (const row of app.shipAttachments || []) {
      if (row.selected === false) continue
      if (shipAttachmentMatchKey(row) !== targetKey) continue
      total += Number(row.shipQty) || 0
    }
  }
  return Math.round(total * 10000) / 10000
}

export function calcAttachmentAppliedQty(salesOrder, att) {
  return sumAttachmentQtyFromApps(salesOrder, att, { onlyShipped: false })
}

export function calcAttachmentShippedQty(salesOrder, att) {
  return sumAttachmentQtyFromApps(salesOrder, att, { onlyShipped: true })
}

export function calcAttachmentShipStatus(shippedQty, planQty) {
  const shipped = Number(shippedQty) || 0
  const plan = Number(planQty) || 0
  if (shipped <= 0) return '未发货'
  if (plan > 0 && shipped >= plan - 1e-9) return '已发完'
  if (plan <= 0 && shipped > 0) return '已发货'
  return '部分发货'
}

export function attachmentShipStatusColor(status) {
  const map = {
    未发货: 'default',
    部分发货: 'processing',
    已发货: 'success',
    已发完: 'success',
  }
  return map[status] || 'default'
}

/** 格式：已发/已申请/计划 */
export function formatAttachmentShipProgress(shippedQty, appliedQty, planQty) {
  const shipped = Number(shippedQty) || 0
  const applied = Number(appliedQty) || 0
  const plan = Number(planQty) || 0
  if (!plan && !applied && !shipped) return '—'
  return `${shipped} / ${applied} / ${plan || '—'}`
}

/**
 * 用销售订单历史发货申请回填附件发货状态
 * @param {object[]} attachments
 * @param {object|null} salesOrder
 * @param {{ preserveShipQty?: boolean }} opts preserveShipQty=true 时不改本次发运数量（编辑回填）
 */
export function enrichShipAttachmentsWithShipStatus(
  attachments = [],
  salesOrder = null,
  opts = {},
) {
  return (attachments || []).map((row) => {
    const unitQty = Number(row.unitQty) || 1
    const planQty = Number(row.planQty) || 0
    const appliedQty = calcAttachmentAppliedQty(salesOrder, row)
    const shippedQty = calcAttachmentShippedQty(salesOrder, row)
    const remain = Math.max(0, planQty - appliedQty)
    const shipStatus = calcAttachmentShipStatus(shippedQty, planQty)
    let kitSets = row.kitSets != null ? Number(row.kitSets) : null
    let shipQty = Number(row.shipQty) || 0
    if (!opts.preserveShipQty && row.source === 'BOM') {
      // 默认建议：剩余可发量对应的套数（按单位用量折算）
      const remainSets = unitQty > 0 ? Math.floor((remain + 1e-9) / unitQty) : 0
      kitSets = kitSets == null ? remainSets : kitSets
      shipQty = calcAttachmentShipQtyBySets(unitQty, kitSets)
    }
    return {
      ...row,
      unitQty,
      kitSets,
      planQty,
      appliedQty,
      shippedQty,
      shipStatus,
      shipQty,
    }
  })
}

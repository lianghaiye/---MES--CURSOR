/** 采购申请合并与价格计算 */

import { resolveOrderSizeFromPlan } from '@/utils/orderSize'

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** 紧急度优先级：特急 > 紧急/加急 > 正常 */
export const URGENCY_RANK = { 正常: 1, 紧急: 2, 加急: 2, 特急: 3 }

export function pickHighestUrgency(...values) {
  let best = '正常'
  let bestRank = 0
  values.forEach((v) => {
    const u = String(v || '').trim() || '正常'
    const rank = URGENCY_RANK[u] || 0
    if (rank > bestRank) {
      best = u === '加急' ? '紧急' : u
      bestRank = rank
    }
  })
  return best
}

/**
 * @param {object} line
 * @param {boolean} [taxModeExcluding=true] true=按不含税算含税；false=按含税算不含税
 */
export function recalcMergedLine(line, taxModeExcluding = true) {
  const qty = Number(line.planPurchaseQty) || 0
  const rate = Number(line.taxRate) || 0
  if (taxModeExcluding) {
    const ex = Number(line.unitPriceExTax) || 0
    line.unitPriceInTax = round2(ex * (1 + rate / 100))
  } else {
    const inc = Number(line.unitPriceInTax) || 0
    line.unitPriceExTax = round2(inc / (1 + rate / 100))
  }
  line.totalPriceExTax = round2(qty * (Number(line.unitPriceExTax) || 0))
  line.totalPriceInTax = round2(qty * (Number(line.unitPriceInTax) || 0))
  return line
}

/** 解析申请明细行的销售单号（行级优先，回退单据头） */
export function resolvePrLineSalesOrderNo(line, req) {
  return String(line?.salesOrderNo || req?.salesOrderNo || '').trim()
}

/**
 * 物料编码 + 供应商 + 销售单号 作为合并键
 * 不同销售订单的同物料不同行，避免数量与来源被打散合并
 */
export function mergeKey(materialCode, supplierName, salesOrderNo = '') {
  return `${materialCode || ''}@@${supplierName || ''}@@${salesOrderNo || ''}`
}

function isLinePendingPo(line) {
  return (line?.poGenStatus || '未生成采购') !== '已生成采购'
}

/**
 * 从多条采购申请中抽取明细并按物料编码+供应商+销售单号合并
 * @param {object} [options]
 * @param {boolean} [options.onlyPending=true] 仅未生成采购的明细行
 * @returns {Array} 合并后的行，含 sourceReqNos / sourceLineIds / sourceSalesOrderNos
 */
export function mergeRequisitionLines(requisitions, options = {}) {
  const onlyPending = options.onlyPending !== false
  const bucket = new Map()

  requisitions.forEach((req) => {
    ;(req.lineItems || []).forEach((line) => {
      if (onlyPending && !isLinePendingPo(line)) return
      const supplier = line.supplierName || ''
      const salesOrderNo = resolvePrLineSalesOrderNo(line, req)
      const key = mergeKey(line.inventoryCode, supplier, salesOrderNo)
      const existing = bucket.get(key)
      const lineId = line.id || `${req.id}-${line.inventoryCode}`
      const urgency = pickHighestUrgency(req.urgency, line.urgency)

      if (!existing) {
        bucket.set(key, {
          key,
          materialName: line.inventoryName,
          materialType: line.materialType || '零部件',
          materialCode: line.inventoryCode,
          specModel: line.specModel,
          material: line.material,
          stockQty: Number(line.stockQty) || 0,
          demandQty: Number(line.demandQty) || 0,
          planPurchaseQty: Number(line.planPurchaseQty) || 0,
          designatedSupplier: Boolean(line.designatedSupplier),
          supplierName: supplier,
          settlementType: line.settlementType || '预付款+货到付',
          unitPriceExTax: Number(line.unitPriceExTax) || 0,
          taxRate: line.taxRate ?? 13,
          unitPriceInTax: Number(line.unitPriceInTax) || 0,
          totalPriceExTax: Number(line.totalPriceExTax) || 0,
          totalPriceInTax: Number(line.totalPriceInTax) || 0,
          receivingMode: line.receivingMode || '正常收货',
          leadTimeDays: line.leadTimeDays ?? 12,
          expectedArrivalDate: line.expectedArrivalDate || req.estimatedArrivalDate || '',
          deliveryDate: line.deliveryDate || req.deliveryDate || '',
          receivingWarehouse: line.receivingWarehouse || req.receivingWarehouse || '',
          urgency,
          unit: line.unit || line.purchaseUnit || '件',
          purchaseUnit: line.purchaseUnit || line.unit || '件',
          inventoryUnit: line.inventoryUnit || '',
          blankSizeText: line.blankSizeText || '',
          blankSize: line.blankSize || null,
          blankSizeMode: line.blankSizeMode || '',
          orderSizeText: line.orderSizeText || line.blankSizeText || '',
          orderSize: line.orderSize ?? line.blankSize ?? null,
          orderSizeMode: line.orderSizeMode || line.blankSizeMode || '',
          fromProductionPlan: String(req.source || '').trim() === '生产计划',
          orderSizeFromPlan: resolveOrderSizeFromPlan(req.source, line),
          orderSizeLocked: resolveOrderSizeFromPlan(req.source, line),
          variantSummary: line.variantSummary || '',
          sourceReqNos: [req.reqNo],
          sourceSalesOrderNos: salesOrderNo ? [salesOrderNo] : [],
          sourceReqIds: [req.id],
          sourceLineIds: [lineId],
          remark: line.remark || '',
        })
        return
      }

      existing.demandQty = round2(existing.demandQty + (Number(line.demandQty) || 0))
      existing.planPurchaseQty = round2(
        existing.planPurchaseQty + (Number(line.planPurchaseQty) || 0),
      )
      existing.stockQty = Math.min(existing.stockQty, Number(line.stockQty) || 0)
      existing.urgency = pickHighestUrgency(existing.urgency, urgency)
      if (String(req.source || '').trim() === '生产计划') {
        existing.fromProductionPlan = true
      }
      if (!existing.blankSizeText && line.blankSizeText) {
        existing.blankSizeText = line.blankSizeText
        existing.blankSize = line.blankSize || null
        existing.blankSizeMode = line.blankSizeMode || ''
      }
      if (!existing.orderSizeText && (line.orderSizeText || line.blankSizeText)) {
        existing.orderSizeText = line.orderSizeText || line.blankSizeText || ''
        existing.orderSize = line.orderSize ?? line.blankSize ?? null
        existing.orderSizeMode = line.orderSizeMode || line.blankSizeMode || ''
        // 仅当尺寸由生产计划行写入时锁定
        if (resolveOrderSizeFromPlan(req.source, line)) {
          existing.orderSizeFromPlan = true
          existing.orderSizeLocked = true
        }
      }
      if (!existing.variantSummary && line.variantSummary) {
        existing.variantSummary = line.variantSummary
      }
      if (!existing.sourceReqNos.includes(req.reqNo)) {
        existing.sourceReqNos.push(req.reqNo)
        existing.sourceReqIds.push(req.id)
      }
      if (!existing.sourceLineIds.includes(lineId)) {
        existing.sourceLineIds.push(lineId)
      }
      if (salesOrderNo && !existing.sourceSalesOrderNos.includes(salesOrderNo)) {
        existing.sourceSalesOrderNos.push(salesOrderNo)
      }
    })
  })

  return Array.from(bucket.values()).map((row, index) => {
    recalcMergedLine(row)
    return { ...row, index: index + 1 }
  })
}

/** 按供应商拆分采购单 */
export function groupBySupplier(mergedLines) {
  const groups = new Map()
  mergedLines.forEach((line) => {
    const supplier = line.supplierName || '未指定供应商'
    if (!groups.has(supplier)) groups.set(supplier, [])
    groups.get(supplier).push(line)
  })
  return groups
}

/** 采购申请合并与价格计算 */

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function recalcMergedLine(line) {
  const qty = Number(line.planPurchaseQty) || 0
  const rate = Number(line.taxRate) || 0
  const ex = Number(line.unitPriceExTax) || 0
  line.unitPriceInTax = round2(ex * (1 + rate / 100))
  line.totalPriceExTax = round2(qty * ex)
  line.totalPriceInTax = round2(qty * line.unitPriceInTax)
  return line
}

/** 物料编码 + 供应商名称 作为合并键 */
export function mergeKey(materialCode, supplierName) {
  return `${materialCode || ''}@@${supplierName || ''}`
}

/**
 * 从多条采购申请中抽取明细并按物料编码+供应商合并
 * @returns {Array} 合并后的行，含 sourceReqNos / sourceSalesOrderNos
 */
export function mergeRequisitionLines(requisitions) {
  const bucket = new Map()

  requisitions.forEach((req) => {
    ;(req.lineItems || []).forEach((line) => {
      const supplier = line.supplierName || ''
      const key = mergeKey(line.inventoryCode, supplier)
      const existing = bucket.get(key)

      if (!existing) {
        bucket.set(key, {
          key,
          materialName: line.inventoryName,
          materialType: line.materialType || '零部件',
          materialCode: line.inventoryCode,
          specModel: line.specModel,
          material: line.material,
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
          receivingWarehouse: line.receivingWarehouse || '',
          unit: line.unit || '件',
          sourceReqNos: [req.reqNo],
          sourceSalesOrderNos: req.salesOrderNo ? [req.salesOrderNo] : [],
          sourceReqIds: [req.id],
          remark: line.remark || '',
        })
        return
      }

      existing.demandQty = round2(existing.demandQty + (Number(line.demandQty) || 0))
      existing.planPurchaseQty = round2(
        existing.planPurchaseQty + (Number(line.planPurchaseQty) || 0),
      )
      if (!existing.sourceReqNos.includes(req.reqNo)) {
        existing.sourceReqNos.push(req.reqNo)
        existing.sourceReqIds.push(req.id)
      }
      if (req.salesOrderNo && !existing.sourceSalesOrderNos.includes(req.salesOrderNo)) {
        existing.sourceSalesOrderNos.push(req.salesOrderNo)
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

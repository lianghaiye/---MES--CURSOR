/**
 * 待采购清单：采购申请未转完的可采明细（工作台视角）
 */
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { resolvePrLineSalesOrderNo } from '@/utils/purchaseMerge'

function isLinePendingPo(line) {
  return (line?.poGenStatus || '未生成采购') !== '已生成采购'
}

function isOpenRequisition(req) {
  if (!req || req.isGeneratePoDraft) return false
  const st = req.docStatus || ''
  if (st === '已作废' || st === '处理完成') return false
  return true
}

/** 未转采购申请行扁平列表 */
export function listPendingPurchaseLines() {
  const rows = []
  ;(purchaseRequisitionState.requisitions || []).forEach((req) => {
    if (!isOpenRequisition(req)) return
    ;(req.lineItems || []).forEach((line, idx) => {
      if (!isLinePendingPo(line)) return
      const qty = Number(line.planPurchaseQty) || 0
      if (qty <= 0) return
      const lineId = line.id || `${req.id}-${line.inventoryCode || idx}`
      rows.push({
        id: `${req.id}::${lineId}`,
        reqId: req.id,
        reqNo: req.reqNo || '',
        lineId,
        supplierName: line.supplierName || '',
        materialCode: line.inventoryCode || line.productCode || '',
        materialName: line.inventoryName || line.productName || '',
        specModel: line.specModel || '',
        material: line.material || '',
        planPurchaseQty: qty,
        unit: line.unit || line.purchaseUnit || '件',
        salesOrderNo: resolvePrLineSalesOrderNo(line, req),
        deliveryDate: line.deliveryDate || req.deliveryDate || '',
        urgency: line.urgency || req.urgency || '正常',
        source: req.source || '',
        receivingWarehouse: line.receivingWarehouse || req.receivingWarehouse || '',
      })
    })
  })
  return rows.sort((a, b) => {
    const s = String(a.supplierName || '未指定').localeCompare(
      String(b.supplierName || '未指定'),
      'zh',
    )
    if (s !== 0) return s
    return String(b.reqNo || '').localeCompare(String(a.reqNo || ''))
  })
}

export function countPendingPurchaseLines() {
  return listPendingPurchaseLines().length
}

/** 从勾选的待采购行得到去重后的申请单 id */
export function uniqueReqIdsFromPendingLines(lines = []) {
  return [...new Set((lines || []).map((l) => l.reqId).filter(Boolean))]
}

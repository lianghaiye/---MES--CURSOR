/**
 * 采购入库明细 / 库存批次的订货尺寸解析（展示用，只读）
 */
import { displayOrderSizeText, pickOrderSizeFields } from '@/utils/orderSize'
import { getPurchaseOrderById, purchaseOrderState } from '@/store/purchaseOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { formatQty } from '@/utils/numberFormat'

export { pickOrderSizeFields }

function findInboundByDocNo(docNo) {
  const key = String(docNo || '').trim()
  if (!key) return null
  return (inboundOrderState.orders || []).find((o) => String(o.docNo || '').trim() === key) || null
}

function findPoLine(po, line) {
  if (!po || !line?.poLineId) return null
  return (po.lineItems || []).find((l) => l.id === line.poLineId) || null
}

function resolvePoForInbound(inbound) {
  if (!inbound) return null
  if (inbound.purchaseOrderId) {
    const po = getPurchaseOrderById(inbound.purchaseOrderId)
    if (po) return po
  }
  const no = String(inbound.sourceOrderNo || '').trim()
  if (!no) return null
  return (
    (purchaseOrderState.orders || []).find((o) => String(o.orderNo || '').trim() === no) || null
  )
}

function findInboundLineForBatch(inbound, batch) {
  if (!inbound || !batch) return null
  const batchNo = String(batch.batchNo || '').trim()
  const code = String(batch.itemCode || '').trim()
  const lines = inbound.lineItems || []
  if (batchNo) {
    const byBatch = lines.find(
      (l) =>
        String(l.itemCode || '').trim() === code &&
        (l.batchNos || []).some((n) => String(n).trim() === batchNo),
    )
    if (byBatch) return byBatch
  }
  const matched = lines.filter((l) => String(l.itemCode || '').trim() === code)
  if (matched.length === 1) return matched[0]
  return null
}

/** 入库明细行：行内字段优先，采购行兜底 */
export function resolveInboundLineOrderSizeText(line, inbound) {
  const fromLine = displayOrderSizeText(line)
  if (fromLine) return fromLine
  if (!inbound) return '—'
  const po = resolvePoForInbound(inbound)
  const poLine = findPoLine(po, line)
  const fromPo = displayOrderSizeText(poLine)
  return fromPo || '—'
}

/** 库存批次：批次快照 → 入库行 → 采购行 */
export function resolveBatchOrderSizeText(batch) {
  if (!batch) return '—'
  const fromAttrs = String(batch.attrs?.orderSizeText || '').trim()
  if (fromAttrs) return fromAttrs
  const inbound = findInboundByDocNo(batch.sourceDocNo)
  const line = findInboundLineForBatch(inbound, batch)
  if (line) {
    const fromLine = displayOrderSizeText(line)
    if (fromLine) return fromLine
  }
  if (inbound && line) {
    const po = resolvePoForInbound(inbound)
    const fromPo = displayOrderSizeText(findPoLine(po, line))
    if (fromPo) return fromPo
  }
  return '—'
}

/** 出库拣批下拉 / 预览：批号（当前量，尺寸 xxx） */
export function formatOutboundBatchPickLabel(batch, unit = '') {
  if (!batch) return '—'
  const qty = formatQty(batch.currentLength)
  const u = unit || batch.unit || ''
  const size = resolveBatchOrderSizeText(batch)
  const sizePart = size && size !== '—' ? `，尺寸 ${size}` : ''
  return `${batch.batchNo || ''}（当前 ${qty}${u}${sizePart}）`
}

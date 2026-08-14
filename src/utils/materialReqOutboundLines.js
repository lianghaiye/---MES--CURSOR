/**
 * 领料申请详情「出库信息」：一物料一行（字段对齐外协订单「发料信息」）
 */
import { getOutboundOrderById, getOutboundOrderByDocNo } from '@/store/outboundStore'
import { flattenOutboundOrdersToIssueLines } from '@/utils/outboundIssueLines'

function listOutboundRefs(record) {
  const fromList = Array.isArray(record?.outboundOrders)
    ? record.outboundOrders.filter((o) => o?.id || o?.docNo)
    : []
  if (fromList.length) return fromList
  if (record?.outboundId || record?.outboundDocNo) {
    return [
      {
        id: record.outboundId || '',
        docNo: record.outboundDocNo || '',
        status: record.outboundStatus || '',
      },
    ]
  }
  return []
}

function resolveOutboundOrder(ref) {
  if (ref?.id) {
    const byId = getOutboundOrderById(ref.id)
    if (byId) return byId
  }
  if (ref?.docNo) {
    const firstDoc = String(ref.docNo)
      .split(/[、,，]/)[0]
      ?.trim()
    if (firstDoc) return getOutboundOrderByDocNo(firstDoc)
  }
  return null
}

/**
 * @param {object|null} record 领料申请
 * @returns {Array<object>}
 */
export function flattenMaterialReqOutboundLines(record) {
  if (!record) return []
  const orders = listOutboundRefs(record)
    .map((ref) => {
      const live = resolveOutboundOrder(ref)
      if (live) return live
      return {
        id: ref.id || '',
        docNo: ref.docNo || '',
        status: ref.status || '',
        warehouse: ref.warehouse || '',
        lineItems: [],
      }
    })
    .filter((o) => o.id || o.docNo)
  return flattenOutboundOrdersToIssueLines(orders)
}

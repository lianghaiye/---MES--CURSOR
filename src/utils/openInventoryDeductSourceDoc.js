import { message } from 'ant-design-vue'
import {
  isQuickMaterialDeduct,
  resolveInventoryDeductDocNo,
} from '@/mock/materialRequisitionRecords'
import { findWorkOrderByCode } from '@/utils/workOrderBlanking'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { listMobileMaterialReqs } from '@/store/mobileMaterialReqStore'

/**
 * 打开库存扣减单关联的工单 / 领料申请
 * @returns {boolean} 是否成功打开
 */
export function openInventoryDeductSourceDoc(record, { router, openTab } = {}) {
  if (!record || !router || !openTab) return false

  if (isQuickMaterialDeduct(record)) {
    const reqNo = resolveInventoryDeductDocNo(record)
    const hit =
      listMobileMaterialReqs().find(
        (r) =>
          (reqNo && (r.reqNo === reqNo || r.requisitionNo === reqNo)) ||
          (record.reqId && r.id === record.reqId),
      ) || null
    if (!hit?.id) {
      message.info('未找到关联领料申请')
      return false
    }
    const path = `/production/material-requisition/${hit.id}`
    openTab(path, `领料申请 ${hit.reqNo || reqNo || ''}`.trim())
    router.push(path)
    return true
  }

  const code = String(record.workOrderNo || resolveInventoryDeductDocNo(record) || '').trim()
  let wo =
    (record.workOrderId &&
      (workOrderState.orders.find((o) => o.id === record.workOrderId) ||
        assemblyWorkOrderState.orders.find((o) => o.id === record.workOrderId))) ||
    null
  if (!wo && code) {
    wo =
      findWorkOrderByCode(code) ||
      assemblyWorkOrderState.orders.find((o) => o.code === code) ||
      null
  }
  if (!wo) {
    message.info('未找到关联生产工单')
    return false
  }
  const isAssembly = assemblyWorkOrderState.orders.some((o) => o.id === wo.id)
  const basePath = isAssembly ? '/production/assembly-work-orders' : '/production/work-orders'
  const woCode = wo.code || code
  const path = `${basePath}?code=${encodeURIComponent(woCode)}`
  openTab(path, `生产工单 ${woCode}`)
  router.push({ path: basePath, query: { code: woCode } })
  return true
}

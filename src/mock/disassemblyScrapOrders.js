import { scrapOrderState, getApprovedScrapOrders } from '@/store/scrapOrderStore'

/** 拆解工单关联报废单（仅审核通过） */
export function getMockScrapOrdersForDisassembly() {
  return getApprovedScrapOrders().map((o) => ({
    id: o.id,
    scrapNo: o.scrapNo,
    scrapSource: o.scrapSource,
    itemName: o.itemName,
    itemCode: o.itemCode,
    specModel: o.specModel,
    material: o.material,
    processMethod: o.processMethod,
    relatedWorkOrderNo: o.relatedWorkOrderNo || o.workOrderNo,
    createdAt: o.createdAt,
  }))
}

/** @deprecated 使用 getMockScrapOrdersForDisassembly */
export const mockScrapOrders = getMockScrapOrdersForDisassembly()

export function refreshMockScrapOrders() {
  return getMockScrapOrdersForDisassembly()
}

// 触发 store 初始化
void scrapOrderState.orders

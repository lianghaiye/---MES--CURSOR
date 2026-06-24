import { productBomState } from '@/store/productBomStore'
import { isBomActive, isBomPending } from '@/mock/productBomOptions'

/** 解析产品/物料对应的 BOM 维护入口 */
export function resolveItemBomNavigation(itemType, itemId) {
  void productBomState.boms
  const boms = productBomState.boms.filter(
    (b) => b.itemType === itemType && b.itemId === itemId,
  )
  const draft = boms.find((b) => isBomPending(b))
  if (draft) {
    return {
      path: `/product-process/bom/${draft.id}/edit`,
      title: `编辑BOM·${draft.bomName || ''}`,
    }
  }
  const active = boms.find((b) => isBomActive(b)) || boms[0]
  if (active) {
    return {
      path: `/product-process/bom/${active.id}`,
      title: active.bomName || 'BOM详情',
    }
  }
  return {
    path: '/product-process/bom/new',
    query: { itemType, itemId },
    title: '新增BOM',
  }
}

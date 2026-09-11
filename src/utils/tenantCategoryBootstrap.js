import { bootstrapProductCategoriesForTenant } from '@/store/productCategoryStore'
import { bootstrapMaterialCategoriesForTenant } from '@/store/materialCategoryStore'

/**
 * 新租户入驻时调用：写入系统默认「产成品」「物料」等类别。
 * 前端 mock 环境下 store 首次加载也会 ensure；接真实租户 API 时在开通成功回调里调此方法。
 */
export function bootstrapTenantDefaultCategories() {
  return {
    product: bootstrapProductCategoriesForTenant(),
    material: bootstrapMaterialCategoriesForTenant(),
  }
}

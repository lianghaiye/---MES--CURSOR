/**
 * 盘点设置已迁入功能参数（库存与出库 → 盘点审核通过后过账）。
 * 保留本文件导出，兼容既有 import 路径。
 */
export {
  isStocktakeAutoPostOnApprove,
  setStocktakeAutoPostOnApprove,
} from '@/store/functionParamStore'

import { PRODUCT_CATEGORY_UNCLASSIFIED } from '@/mock/productCategories'

/** BOM 根产品快捷创建时写入主数据的默认字段（类别待归类 + 成品 + 标准产品） */
export function buildBomQuickCreateProductFields(form = {}) {
  const cat = PRODUCT_CATEGORY_UNCLASSIFIED
  return {
    specModel: form.specModel || '',
    material: form.material || '',
    drawingNo: form.drawingNo || '',
    categoryKey: cat.key,
    categoryCode: cat.code,
    categoryName: cat.title,
    parentCategoryKey: cat.key,
    productAttribute: '标准产品',
    materialType: '成品',
    barcodeType: '一物一码',
    canProduce: true,
    canSell: true,
    isWholeMachine: true,
    isPart: false,
  }
}

export function buildBomQuickCreateSpuFields() {
  const cat = PRODUCT_CATEGORY_UNCLASSIFIED
  return {
    categoryKey: cat.key,
    parentCategoryKey: cat.key,
    categoryName: cat.title,
    categoryTreeMode: 'product',
    canProduce: true,
    canSell: true,
  }
}

/** 将 SelectBomMaterialModal / 行内选择器 payload 转为出入库明细所需结构 */
export function normalizeInventoryPickerItem(item = {}) {
  return {
    itemId: item.itemId ?? item.id,
    itemType: item.itemType,
    code: item.code,
    name: item.name,
    specModel: item.specModel || '',
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    inventoryUnit: item.inventoryUnit || '件',
    unitPrice: item.unitPrice ?? null,
    productAttribute: item.productAttribute || item.materialType || '',
    materialType: item.materialType || '',
    isSpuLine: item.isSpuLine === true,
    spuId: item.spuId || '',
    spuName: item.spuName || '',
    productId: item.productId || '',
    variantValues: item.variantValues ? { ...item.variantValues } : {},
    variantSummary: item.variantSummary || '',
  }
}

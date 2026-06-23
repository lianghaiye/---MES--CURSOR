import dayjs from 'dayjs'
import { productCategoryTree, flattenCategoryNodes } from '@/mock/productCategories'
import { materialCategoryTree } from '@/mock/materialCategories'
import { normalizeMaterialType, normalizeSupplyForm } from '@/utils/masterDataMigrate'

const flatProductCats = flattenCategoryNodes(productCategoryTree)
const flatMaterialCats = flattenCategoryNodes(materialCategoryTree)

function resolveProductCategory(categoryKey) {
  const cat = flatProductCats.find((c) => c.key === categoryKey)
  const parent = cat?.parentKey ? flatProductCats.find((c) => c.key === cat.parentKey) : null
  return {
    categoryKey: cat?.key || categoryKey,
    categoryCode: cat?.code || '',
    categoryName: parent ? parent.title : cat?.title || '',
    parentCategoryKey: cat?.parentKey || cat?.key || '',
  }
}

function resolveMaterialCategory(categoryKey) {
  const cat = flatMaterialCats.find((c) => c.key === categoryKey)
  const parent = cat?.parentKey ? flatMaterialCats.find((c) => c.key === cat.parentKey) : null
  return {
    categoryKey: cat?.key || categoryKey,
    categoryCode: cat?.code || '',
    categoryName: parent ? parent.title : cat?.title || '',
    parentCategoryKey: cat?.parentKey || cat?.key || '',
  }
}

export function buildMaterialFromProduct(product) {
  const matCatKey = product.materialCategoryKey || product.categoryKey
  const cat = resolveMaterialCategory(matCatKey)
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    barcodeType: product.barcodeType || '一物一码',
    materialType: normalizeMaterialType(product.materialType) || '零部件',
    supplyForm: normalizeSupplyForm(product.supplyForm) || '自制件',
    ...cat,
    specModel: product.specModel || '',
    drawingNo: product.drawingNo || '',
    material: product.material || '',
    techParams: product.techParams || '',
    weight: product.weight ?? '',
    inventoryUnit: product.inventoryUnit || '件',
    unitPrice: product.unitPrice ?? 0,
    isProductMaterial: true,
    productAttribute: product.productAttribute,
    productCategoryKey: product.categoryKey,
    materialCategoryKey: matCatKey,
    remark: product.remark || '',
    requisitionAttr: product.requisitionAttr ?? '',
    createdAt: product.createdAt || dayjs().format('YYYY-MM-DD'),
  }
}

export function buildProductFromMaterial(material) {
  const prodCatKey = material.productCategoryKey || material.categoryKey
  const cat = resolveProductCategory(prodCatKey)
  return {
    id: material.id,
    code: material.code,
    name: material.name,
    barcodeType: material.barcodeType || '一物一码',
    productAttribute: material.productAttribute || '标准产品',
    ...cat,
    specModel: material.specModel || '',
    drawingNo: material.drawingNo || '',
    material: material.material || '',
    techParams: material.techParams || '',
    weight: Number(material.weight) || 0,
    inventoryUnit: material.inventoryUnit || '件',
    standardSpec: material.standardSpec || '',
    unitPrice: material.unitPrice ?? 0,
    materialType: normalizeMaterialType(material.materialType),
    supplyForm: normalizeSupplyForm(material.supplyForm),
    materialCategoryKey: material.materialCategoryKey || material.categoryKey,
    productCategoryKey: prodCatKey,
    isProductMaterial: true,
    remark: material.remark || '',
    laborEnabled: material.laborEnabled ?? false,
    laborRows: material.laborRows ? JSON.parse(JSON.stringify(material.laborRows)) : [],
    production: material.production ? JSON.parse(JSON.stringify(material.production)) : undefined,
    alert: material.alert ? JSON.parse(JSON.stringify(material.alert)) : undefined,
    createdAt: material.createdAt || dayjs().format('YYYY-MM-DD'),
    updatedAt: dayjs().format('YYYY-MM-DD'),
  }
}

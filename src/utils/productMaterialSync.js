import dayjs from 'dayjs'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { linkProductMaterialRows } from '@/utils/masterDataMigrate'
import { buildMaterialFromProduct, buildProductFromMaterial } from '@/utils/productMaterialMap'

export { buildMaterialFromProduct, buildProductFromMaterial } from '@/utils/productMaterialMap'

export function generateSharedItemId() {
  return `item-${Date.now()}`
}

function upsertMaterial(row) {
  const idx = materialInfoState.materials.findIndex((m) => m.id === row.id)
  if (idx === -1) {
    materialInfoState.materials.unshift(row)
    return row
  }
  Object.assign(materialInfoState.materials[idx], row)
  return materialInfoState.materials[idx]
}

function upsertProduct(row) {
  const idx = productInfoState.products.findIndex((p) => p.id === row.id)
  if (idx === -1) {
    productInfoState.products.unshift(row)
    return row
  }
  Object.assign(productInfoState.products[idx], row, {
    updatedAt: dayjs().format('YYYY-MM-DD'),
  })
  return productInfoState.products[idx]
}

export function removeLinkedProduct(id) {
  const idx = productInfoState.products.findIndex((p) => p.id === id)
  if (idx !== -1) productInfoState.products.splice(idx, 1)
}

export function removeLinkedMaterial(id) {
  const idx = materialInfoState.materials.findIndex((m) => m.id === id)
  if (idx !== -1) materialInfoState.materials.splice(idx, 1)
}

export function syncAfterProductSave(product, { isEdit, previousId } = {}) {
  if (!product?.isProductMaterial) {
    if (isEdit && previousId) removeLinkedMaterial(previousId)
    return product
  }
  upsertMaterial(buildMaterialFromProduct(product))
  return product
}

export function syncAfterMaterialSave(material, { isEdit, previousId } = {}) {
  if (!material?.isProductMaterial) {
    if (isEdit && previousId) removeLinkedProduct(previousId)
    return material
  }
  upsertProduct(buildProductFromMaterial(material))
  return material
}

export function syncAllProductMaterialPairs(products, materials) {
  return linkProductMaterialRows(products, materials, buildMaterialFromProduct)
}

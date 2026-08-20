import { ITEM_KIND, inferItemKindFromRecord, resolveItemKind } from '@/utils/masterItemKind'
import {
  productInfoState,
  addProduct,
  updateProduct,
  deleteProduct,
  generateProductCode,
  cloneProduct,
} from '@/store/productInfoStore'
import {
  materialInfoState,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  cloneMaterial,
} from '@/store/materialInfoStore'
import { generateSharedItemId } from '@/utils/productMaterialSync'

function findProduct(id) {
  return productInfoState.products.find((p) => p.id === id)
}

function findMaterial(id) {
  return materialInfoState.materials.find((m) => m.id === id)
}

/** 编辑时合并双表记录供表单加载 */
export function resolveMasterItemEditRecord(record) {
  if (!record?.id) return record
  const productRow = findProduct(record.id)
  const materialRow = findMaterial(record.id)
  const itemKind =
    record.itemKind ||
    inferItemKindFromRecord(record, {
      productRow,
      materialRow,
      source: productRow ? 'product' : 'material',
    })

  const base = productRow || materialRow || record
  return {
    ...base,
    ...record,
    itemKind,
    canSell: Boolean(record.canSell ?? productRow?.canSell ?? materialRow?.canSell ?? false),
    canProduce: Boolean(
      record.canProduce ??
      productRow?.canProduce ??
      materialRow?.canProduce ??
      productRow?.isPart ??
      false,
    ),
    isWholeMachine: Boolean(productRow?.isWholeMachine ?? record.isWholeMachine),
    isPart: Boolean(productRow?.isPart ?? record.isPart),
    categoryKey: materialRow?.categoryKey ?? record.materialCategoryKey ?? record.categoryKey,
    productCategoryKey: productRow?.categoryKey ?? record.productCategoryKey,
    materialCategoryKey: materialRow?.categoryKey ?? record.materialCategoryKey,
    productAttribute: productRow?.productAttribute ?? record.productAttribute,
    standardSpec: productRow?.standardSpec ?? record.standardSpec,
    materialType: materialRow?.materialType ?? record.materialType,
    supplyForm: materialRow?.supplyForm ?? record.supplyForm,
    production: productRow?.production || materialRow?.production || record.production,
    alert: productRow?.alert || materialRow?.alert || record.alert,
    laborEnabled: productRow?.laborEnabled ?? materialRow?.laborEnabled ?? record.laborEnabled,
    laborRows: productRow?.laborRows || materialRow?.laborRows || record.laborRows,
    _productRow: productRow,
    _materialRow: materialRow,
  }
}

/**
 * 按推导类型写入 product / material store
 * @param {{ isEdit: boolean, id?: string, productPayload?: object, materialPayload?: object }} args
 * @returns {{ kind: string, id: string } | null}
 */
export function saveMasterItem({ isEdit, id, productPayload, materialPayload }) {
  const canSell = Boolean(productPayload?.canSell ?? materialPayload?.canSell)
  const canProduce = Boolean(productPayload?.canProduce ?? materialPayload?.canProduce)
  const kind = resolveItemKind({ canSell, canProduce })
  if (!kind) return null

  if (kind === ITEM_KIND.PRODUCT) {
    const data = { ...productPayload, canSell: true, canProduce: false, isProductMaterial: false }
    let row = null
    if (isEdit && id) {
      if (findMaterial(id) && !findProduct(id)) {
        deleteMaterial(id)
        row = addProduct({ ...data, id })
      } else if (findProduct(id)) {
        row = updateProduct(id, data)
        if (findMaterial(id)) deleteMaterial(id)
      } else {
        row = addProduct({ ...data, id })
      }
    } else {
      row = addProduct(data)
    }
    return { kind, id: row?.id || id }
  }

  if (kind === ITEM_KIND.MATERIAL) {
    const data = { ...materialPayload, canSell: false, canProduce: true, isProductMaterial: false }
    let row = null
    if (isEdit && id) {
      if (findProduct(id) && !findMaterial(id)) {
        deleteProduct(id)
        row = addMaterial({ ...data, id })
      } else if (findMaterial(id)) {
        row = updateMaterial(id, data)
        if (findProduct(id)) deleteProduct(id)
      } else {
        row = addMaterial({ ...data, id })
      }
    } else {
      row = addMaterial(data)
    }
    return { kind, id: row?.id || id }
  }

  const sharedId = id || generateSharedItemId()
  const code =
    productPayload?.code?.trim() || materialPayload?.code?.trim() || generateProductCode()
  const prod = {
    ...productPayload,
    id: sharedId,
    code,
    canSell: true,
    canProduce: true,
    isProductMaterial: true,
  }
  const mat = {
    ...materialPayload,
    id: sharedId,
    code,
    canSell: true,
    canProduce: true,
    isProductMaterial: true,
  }

  if (isEdit) {
    if (findProduct(sharedId)) updateProduct(sharedId, prod)
    else addProduct(prod)
    if (findMaterial(sharedId)) updateMaterial(sharedId, mat)
    else addMaterial(mat)
  } else {
    addProduct(prod)
  }
  return { kind, id: sharedId }
}

export function deleteMasterItem(record) {
  const id = record?.id
  if (!id) return false
  const kind =
    record.itemKind ||
    inferItemKindFromRecord(record, {
      productRow: findProduct(id),
      materialRow: findMaterial(id),
    })

  if (kind === ITEM_KIND.PRODUCT_MATERIAL) {
    deleteProduct(id)
    deleteMaterial(id)
    return true
  }
  if (kind === ITEM_KIND.MATERIAL) return deleteMaterial(id)
  return deleteProduct(id)
}

export function cloneMasterItem(record) {
  const id = record?.id
  if (!id) return null
  const kind =
    record.itemKind ||
    inferItemKindFromRecord(record, {
      productRow: findProduct(id),
      materialRow: findMaterial(id),
    })

  if (kind === ITEM_KIND.MATERIAL) return cloneMaterial(id)
  return cloneProduct(id)
}

/** 统一主数据编码前缀：CP */
export function generateMasterItemCode() {
  return generateProductCode()
}

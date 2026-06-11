import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { migrateProductList } from '@/utils/masterDataMigrate'
import {
  generateSharedItemId,
  syncAfterProductSave,
  removeLinkedMaterial,
} from '@/utils/productMaterialSync'
import { applyLaborConfigSeed } from '@/mock/laborConfigSeed'

const STORAGE_KEY = 'i_doms_product_info'
const DATA_VERSION = 6
let codeSeq = 20000

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.products)) {
        const force = parsed.version !== DATA_VERSION
        return applyLaborConfigSeed(migrateProductList(parsed.products), { force })
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, products: productInfoState.products }),
  )
}

export const productInfoState = reactive({
  products: loadFromStorage() || JSON.parse(JSON.stringify(mockProducts)),
})

watch(
  () => productInfoState.products,
  () => persist(),
  { deep: true },
)

export function generateProductCode() {
  codeSeq += 1
  return `CP${dayjs().format('YY')}${String(codeSeq).slice(-5)}`
}

export function addProduct(record) {
  const now = dayjs().format('YYYY-MM-DD')
  const id = record.id || (record.isProductMaterial ? generateSharedItemId() : `prod-${Date.now()}`)
  const row = {
    ...record,
    id,
    createdAt: now,
    updatedAt: now,
  }
  productInfoState.products.unshift(row)
  syncAfterProductSave(row, { isEdit: false })
  return row
}

export function updateProduct(id, patch) {
  const idx = productInfoState.products.findIndex((p) => p.id === id)
  if (idx === -1) return null
  const prev = productInfoState.products[idx]
  const wasLinked = Boolean(prev.isProductMaterial)
  Object.assign(productInfoState.products[idx], patch, {
    updatedAt: dayjs().format('YYYY-MM-DD'),
  })
  const row = productInfoState.products[idx]
  syncAfterProductSave(row, {
    isEdit: true,
    previousId: wasLinked && !row.isProductMaterial ? id : undefined,
  })
  return row
}

export function deleteProduct(id) {
  const idx = productInfoState.products.findIndex((p) => p.id === id)
  if (idx === -1) return false
  const row = productInfoState.products[idx]
  productInfoState.products.splice(idx, 1)
  if (row.isProductMaterial) removeLinkedMaterial(id)
  return true
}

export function cloneProduct(id) {
  const source = productInfoState.products.find((p) => p.id === id)
  if (!source) return null
  const cloned = JSON.parse(JSON.stringify(source))
  cloned.id = `prod-${Date.now()}`
  cloned.code = generateProductCode()
  cloned.name = `${source.name}-克隆`
  cloned.isProductMaterial = false
  const now = dayjs().format('YYYY-MM-DD')
  cloned.createdAt = now
  cloned.updatedAt = now
  productInfoState.products.unshift(cloned)
  return cloned
}

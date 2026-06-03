import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'

const STORAGE_KEY = 'i_doms_product_info'
const DATA_VERSION = 2
let codeSeq = 20000

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.products)) {
        return parsed.products
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
  return `P${codeSeq}`
}

export function addProduct(record) {
  const now = dayjs().format('YYYY-MM-DD')
  productInfoState.products.unshift({
    ...record,
    id: `prod-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  })
}

export function updateProduct(id, patch) {
  const idx = productInfoState.products.findIndex((p) => p.id === id)
  if (idx === -1) return null
  Object.assign(productInfoState.products[idx], patch, {
    updatedAt: dayjs().format('YYYY-MM-DD'),
  })
  return productInfoState.products[idx]
}

export function deleteProduct(id) {
  const idx = productInfoState.products.findIndex((p) => p.id === id)
  if (idx === -1) return false
  productInfoState.products.splice(idx, 1)
  return true
}

export function cloneProduct(id) {
  const source = productInfoState.products.find((p) => p.id === id)
  if (!source) return null
  const cloned = JSON.parse(JSON.stringify(source))
  cloned.id = `prod-${Date.now()}`
  cloned.code = generateProductCode()
  cloned.name = `${source.name}-克隆`
  const now = dayjs().format('YYYY-MM-DD')
  cloned.createdAt = now
  cloned.updatedAt = now
  productInfoState.products.unshift(cloned)
  return cloned
}

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
/** v12：工业标识演示产品 */
const DATA_VERSION = 12
let codeSeq = 20000

/** 内联注入，避免 import blankSizeBomDemoSeed 在启动早期拉起 BOM 循环依赖 */
const BLANK_SIZE_DEMO_PRODUCT = {
  id: 'prod-blank-size-demo',
  code: 'CP-BLANK-DEMO',
  name: '下料尺寸演示泵体组件',
  specModel: 'DEMO-BLANK',
  material: '组合',
  drawingNo: 'DWG-BLANK-DEMO',
  inventoryUnit: '台',
  productAttribute: '标准产品',
  canProduce: true,
  canSell: true,
}

function ensureBlankSizeDemoProducts(products) {
  const list = Array.isArray(products) ? [...products] : []
  const idx = list.findIndex(
    (p) => p.id === BLANK_SIZE_DEMO_PRODUCT.id || p.code === BLANK_SIZE_DEMO_PRODUCT.code,
  )
  if (idx === -1) list.unshift({ ...BLANK_SIZE_DEMO_PRODUCT })
  else list[idx] = { ...list[idx], ...BLANK_SIZE_DEMO_PRODUCT, id: BLANK_SIZE_DEMO_PRODUCT.id }
  return ensureMtsDemoProduct(list)
}

/** 演示：首个标准产品改为以库存生产且低于最低库存，便于补货建议验收 */
function ensureMtsDemoProduct(products) {
  const list = Array.isArray(products) ? [...products] : []
  const idx = list.findIndex((p) => p.id === 'prod-00001' || p.code === 'CP2610001')
  if (idx === -1) return ensureIndustrialLabelDemoProduct(list)
  const row = list[idx]
  list[idx] = {
    ...row,
    stockQty: 8,
    production: {
      ...(row.production || {}),
      planStrategy: 'mts',
      replenishQty: row.production?.replenishQty ?? 20,
      defaultWarehouse: row.production?.defaultWarehouse || '成品仓',
      needIndustrialLabel: true,
    },
    alert: {
      ...(row.alert || {}),
      stockAlertEnabled: true,
      minStockQty: 10,
      maxStockQty: 50,
    },
  }
  return ensureIndustrialLabelDemoProduct(list)
}

/** 演示：再勾选一个标准产品需要工业标识 */
function ensureIndustrialLabelDemoProduct(products) {
  const list = Array.isArray(products) ? [...products] : []
  const idx = list.findIndex((p) => p.id === 'prod-00002' || p.code === 'CP2610002')
  if (idx === -1) return list
  const row = list[idx]
  list[idx] = {
    ...row,
    production: {
      ...(row.production || {}),
      needIndustrialLabel: true,
    },
  }
  return list
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.products)) {
        const force = parsed.version !== DATA_VERSION
        return ensureBlankSizeDemoProducts(
          applyLaborConfigSeed(migrateProductList(parsed.products), { force }),
        )
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
  products:
    loadFromStorage() || ensureBlankSizeDemoProducts(JSON.parse(JSON.stringify(mockProducts))),
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

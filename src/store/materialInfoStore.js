import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockMaterials } from '@/mock/materialInfo'
import { migrateMaterialList } from '@/utils/masterDataMigrate'
import {
  generateSharedItemId,
  syncAfterMaterialSave,
  removeLinkedProduct,
} from '@/utils/productMaterialSync'
import { applyLaborConfigSeed } from '@/mock/laborConfigSeed'

const STORAGE_KEY = 'i_doms_material_info'
const DATA_VERSION = 9
let codeSeq = 100048

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.materials)) {
        const force = parsed.version !== DATA_VERSION
        return applyLaborConfigSeed(migrateMaterialList(parsed.materials), { force })
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
    JSON.stringify({ version: DATA_VERSION, materials: materialInfoState.materials }),
  )
}

export const materialInfoState = reactive({
  materials: loadFromStorage() || JSON.parse(JSON.stringify(mockMaterials)),
})

watch(
  () => materialInfoState.materials,
  () => persist(),
  { deep: true },
)

export function generateMaterialCode() {
  codeSeq += 1
  return `01004${String(codeSeq).slice(-4)}`
}

export function addMaterial(record) {
  const id = record.id || (record.isProductMaterial ? generateSharedItemId() : `mat-${Date.now()}`)
  const row = {
    ...record,
    id,
    createdAt: dayjs().format('YYYY-MM-DD'),
  }
  materialInfoState.materials.unshift(row)
  syncAfterMaterialSave(row, { isEdit: false })
  return row
}

export function updateMaterial(id, patch) {
  const idx = materialInfoState.materials.findIndex((m) => m.id === id)
  if (idx === -1) return null
  const prev = materialInfoState.materials[idx]
  const wasLinked = Boolean(prev.isProductMaterial)
  Object.assign(materialInfoState.materials[idx], patch)
  const row = materialInfoState.materials[idx]
  syncAfterMaterialSave(row, {
    isEdit: true,
    previousId: wasLinked && !row.isProductMaterial ? id : undefined,
  })
  return row
}

export function deleteMaterial(id) {
  const idx = materialInfoState.materials.findIndex((m) => m.id === id)
  if (idx === -1) return false
  const row = materialInfoState.materials[idx]
  materialInfoState.materials.splice(idx, 1)
  if (row.isProductMaterial) removeLinkedProduct(id)
  return true
}

export function cloneMaterial(id) {
  const source = materialInfoState.materials.find((m) => m.id === id)
  if (!source) return null
  const cloned = JSON.parse(JSON.stringify(source))
  cloned.id = `mat-${Date.now()}`
  cloned.code = generateMaterialCode()
  cloned.name = `${source.name}-克隆`
  cloned.isProductMaterial = false
  materialInfoState.materials.unshift(cloned)
  return cloned
}

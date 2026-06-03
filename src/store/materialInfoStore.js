import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockMaterials } from '@/mock/materialInfo'

const STORAGE_KEY = 'i_doms_material_info'
const DATA_VERSION = 2
let codeSeq = 100048

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.materials)) {
        return parsed.materials
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
  materialInfoState.materials.unshift({
    ...record,
    id: `mat-${Date.now()}`,
    createdAt: dayjs().format('YYYY-MM-DD'),
  })
}

export function updateMaterial(id, patch) {
  const idx = materialInfoState.materials.findIndex((m) => m.id === id)
  if (idx === -1) return null
  Object.assign(materialInfoState.materials[idx], patch)
  return materialInfoState.materials[idx]
}

export function deleteMaterial(id) {
  const idx = materialInfoState.materials.findIndex((m) => m.id === id)
  if (idx === -1) return false
  materialInfoState.materials.splice(idx, 1)
  return true
}

export function cloneMaterial(id) {
  const source = materialInfoState.materials.find((m) => m.id === id)
  if (!source) return null
  const cloned = JSON.parse(JSON.stringify(source))
  cloned.id = `mat-${Date.now()}`
  cloned.code = generateMaterialCode()
  cloned.name = `${source.name}-克隆`
  materialInfoState.materials.unshift(cloned)
  return cloned
}

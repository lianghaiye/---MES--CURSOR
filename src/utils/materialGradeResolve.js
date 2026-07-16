import { materialGradeState } from '@/store/materialGradeStore'

export function resolveMaterialGradeIdByName(name) {
  if (!name) return ''
  const hit = materialGradeState.items.find((item) => item.name === name)
  return hit?.id || ''
}

export function resolveMaterialGradeNameById(id) {
  if (!id) return ''
  const hit = materialGradeState.items.find((item) => item.id === id)
  return hit?.name || ''
}

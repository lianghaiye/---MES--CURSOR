import { isShipBomType } from '@/mock/bomMaterialColumns'
import {
  applyQcTemplateConflictReplace,
  applyQcTemplateConflictResolution,
  filterObjectsSkippingConflicts,
  findEnabledScopeConflicts,
} from '@/utils/qcTemplateConflictService'
import {
  deriveApplicableProductIds,
  isShipAttachmentEnabled,
  normalizeShipAttachmentScope,
  SHIP_ATTACHMENT_STATUS,
} from '@/utils/shipAttachmentScope'

export function hydrateShipAttachmentScope(row) {
  if (!row || !isShipBomType(row.bomType)) return row
  const { scopeType, objects } = normalizeShipAttachmentScope(row)
  row.scopeType = scopeType
  row.objects = objects
  row.applicableProductIds = deriveApplicableProductIds(scopeType, objects)
  return row
}

export function findShipAttachmentConflicts(boms = [], { id, scopeType, objects = [] } = {}) {
  const rows = (boms || [])
    .filter((b) => isShipBomType(b.bomType))
    .map((b) => {
      const scope = normalizeShipAttachmentScope(b)
      return {
        ...b,
        scopeType: scope.scopeType,
        objects: scope.objects,
        status: isShipAttachmentEnabled(b)
          ? SHIP_ATTACHMENT_STATUS.ENABLED
          : SHIP_ATTACHMENT_STATUS.DISABLED,
      }
    })
  return findEnabledScopeConflicts(
    rows,
    { id, scopeType, objects },
    {
      isEnabled: (row) => row.status === SHIP_ATTACHMENT_STATUS.ENABLED,
      nameOf: (row) => row.bomName || row.name,
      codeOf: (row) => row.bomNo || row.code,
    },
  )
}

export function applyShipAttachmentConflictReplace(boms = [], conflicts = [], operator = 'admin') {
  applyQcTemplateConflictReplace(boms, conflicts, operator)
  ;(conflicts || []).forEach((c) => {
    const row = (boms || []).find((t) => t.id === c.currentTemplateId)
    if (!row || !isShipBomType(row.bomType)) return
    hydrateShipAttachmentScope(row)
    if (row.status === '停用') row.status = SHIP_ATTACHMENT_STATUS.DISABLED
  })
  return { ok: true }
}

/** 随货附件：按整单或逐行决议处理冲突 */
export function applyShipAttachmentConflictResolution(
  boms = [],
  objects = [],
  conflicts = [],
  resolution = {},
  operator = 'admin',
) {
  const { objectsToSave, replaceConflicts, skipConflicts } = applyQcTemplateConflictResolution(
    boms,
    objects,
    conflicts,
    resolution,
    operator,
  )
  ;(replaceConflicts || []).forEach((c) => {
    const row = (boms || []).find((t) => t.id === c.currentTemplateId)
    if (!row || !isShipBomType(row.bomType)) return
    hydrateShipAttachmentScope(row)
    if (row.status === '停用') row.status = SHIP_ATTACHMENT_STATUS.DISABLED
  })
  return { objectsToSave, replaceConflicts, skipConflicts }
}

export { filterObjectsSkippingConflicts }

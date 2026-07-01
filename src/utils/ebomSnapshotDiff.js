import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { getActiveBomForItem } from '@/store/productBomStore'

const DIFF_FIELDS = [
  { key: 'name', label: '物料名称' },
  { key: 'spec', label: '规格型号' },
  { key: 'material', label: '材质' },
  { key: 'unitUsage', label: '单位用量' },
  { key: 'unit', label: '单位' },
  { key: 'supplyType', label: '供应形态' },
  { key: 'demandQty', label: '需求数量' },
  { key: 'processRoute', label: '工艺路线' },
]

export const EBOM_DIFF_CHANGE_TYPE = {
  ADD: '新增',
  REMOVE: '删除',
  MODIFY: '修改',
  REPLACE: '替换',
}

function normalizeValue(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function displayValue(value) {
  const text = normalizeValue(value)
  return text || '—'
}

function flattenSnapshotMaterials(snapshot) {
  const rows = []

  function walk(materials, parentPath = '', depth = 0) {
    for (const mat of materials || []) {
      const segment = mat.code || mat.name || `node-${rows.length + 1}`
      const path = parentPath ? `${parentPath}›${segment}` : segment
      rows.push({
        path,
        depth,
        code: normalizeValue(mat.code),
        name: normalizeValue(mat.name),
        spec: normalizeValue(mat.spec),
        material: normalizeValue(mat.material),
        unitUsage: mat.unitUsage ?? '',
        unit: normalizeValue(mat.unit),
        supplyType: normalizeValue(mat.supplyType),
        demandQty: mat.demandQty ?? '',
        processRoute: normalizeValue(mat.processRoute),
      })
      if (mat.children?.length) walk(mat.children, path, depth + 1)
    }
  }

  walk(snapshot?.materials || [])
  return rows
}

function buildFieldChanges(before = {}, after = {}) {
  return DIFF_FIELDS.map((field) => {
    const oldVal = normalizeValue(before[field.key])
    const newVal = normalizeValue(after[field.key])
    if (oldVal === newVal) return null
    return {
      key: field.key,
      label: field.label,
      before: displayValue(before[field.key]),
      after: displayValue(after[field.key]),
    }
  }).filter(Boolean)
}

function parentPathOf(path = '') {
  const parts = String(path).split('›')
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('›')
}

/** 将同父级下的「删除+新增」合并为「替换」 */
function mergeReplacePairs(rows = []) {
  const removes = rows.filter((row) => row.changeType === EBOM_DIFF_CHANGE_TYPE.REMOVE)
  const adds = rows.filter((row) => row.changeType === EBOM_DIFF_CHANGE_TYPE.ADD)
  const others = rows.filter(
    (row) =>
      row.changeType !== EBOM_DIFF_CHANGE_TYPE.REMOVE &&
      row.changeType !== EBOM_DIFF_CHANGE_TYPE.ADD,
  )
  const usedRemove = new Set()
  const usedAdd = new Set()
  const paired = []

  removes.forEach((rem) => {
    const remParent = parentPathOf(rem.path)
    const add = adds.find((candidate) => {
      if (usedAdd.has(candidate.id)) return false
      return parentPathOf(candidate.path) === remParent
    })
    if (!add) return

    usedRemove.add(rem.id)
    usedAdd.add(add.id)
    paired.push({
      id: `replace-${rem.id}-${add.id}`,
      path: rem.path,
      depth: rem.depth,
      changeType: EBOM_DIFF_CHANGE_TYPE.REPLACE,
      code: add.code || rem.code,
      name: add.name || rem.name,
      before: rem.before,
      after: add.after,
      fieldChanges: buildFieldChanges(rem.before, add.after),
    })
  })

  return [
    ...others,
    ...paired,
    ...removes.filter((row) => !usedRemove.has(row.id)),
    ...adds.filter((row) => !usedAdd.has(row.id)),
  ]
}

/**
 * 对比订单 EBOM 快照与最新 BOM 展开快照
 */
export function buildEbomSnapshotDiff(oldSnapshot, newSnapshot) {
  const oldRows = flattenSnapshotMaterials(oldSnapshot)
  const newRows = flattenSnapshotMaterials(newSnapshot)
  const oldMap = new Map(oldRows.map((row) => [row.path, row]))
  const newMap = new Map(newRows.map((row) => [row.path, row]))
  const paths = [...new Set([...oldMap.keys(), ...newMap.keys()])].sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )

  const rawRows = paths
    .map((path) => {
      const before = oldMap.get(path)
      const after = newMap.get(path)

      if (before && !after) {
        return {
          id: path,
          path,
          depth: before.depth,
          changeType: EBOM_DIFF_CHANGE_TYPE.REMOVE,
          code: before.code,
          name: before.name,
          before,
          after: null,
          fieldChanges: [],
        }
      }

      if (!before && after) {
        return {
          id: path,
          path,
          depth: after.depth,
          changeType: EBOM_DIFF_CHANGE_TYPE.ADD,
          code: after.code,
          name: after.name,
          before: null,
          after,
          fieldChanges: [],
        }
      }

      const fieldChanges = buildFieldChanges(before, after)
      if (!fieldChanges.length) return null

      return {
        id: path,
        path,
        depth: after.depth,
        changeType: EBOM_DIFF_CHANGE_TYPE.MODIFY,
        code: after.code || before.code,
        name: after.name || before.name,
        before,
        after,
        fieldChanges,
      }
    })
    .filter(Boolean)

  const rows = mergeReplacePairs(rawRows)

  return {
    boundVersion: oldSnapshot?.bomVersion || '—',
    latestVersion: newSnapshot?.bomVersion || '—',
    boundSnapshotAt: oldSnapshot?.snapshotAt || '',
    latestSnapshotAt: newSnapshot?.snapshotAt || '',
    summary: {
      added: rows.filter((row) => row.changeType === EBOM_DIFF_CHANGE_TYPE.ADD).length,
      removed: rows.filter((row) => row.changeType === EBOM_DIFF_CHANGE_TYPE.REMOVE).length,
      modified: rows.filter((row) => row.changeType === EBOM_DIFF_CHANGE_TYPE.MODIFY).length,
      replaced: rows.filter((row) => row.changeType === EBOM_DIFF_CHANGE_TYPE.REPLACE).length,
      total: rows.length,
    },
    rows,
  }
}

/** 销售明细行：构建订单 EBOM 与当前生效 BOM 的差异 */
export function buildSalesLineEbomDiff(line = {}) {
  if (!line.productId) {
    return { hasDiff: false, reason: 'missing-product' }
  }

  const activeBom = getActiveBomForItem('product', line.productId)
  if (!activeBom) {
    return { hasDiff: false, reason: 'missing-active-bom' }
  }

  const salesQty = Number(line.salesQty ?? line.qty) || 1
  const oldSnapshot = line.ebomSnapshot
  const newSnapshot = buildEbomSnapshotFromBom(activeBom, salesQty)

  if (!oldSnapshot?.materials?.length) {
    return {
      hasDiff: false,
      reason: 'missing-bound-snapshot',
      latestVersion: newSnapshot.bomVersion,
    }
  }

  const diff = buildEbomSnapshotDiff(oldSnapshot, newSnapshot)
  const versionChanged = Boolean(
    line.bomVersion && activeBom.version && line.bomVersion !== activeBom.version,
  )

  return {
    hasDiff: diff.summary.total > 0 || versionChanged,
    versionChanged,
    activeBom,
    latestVersion: activeBom.version,
    diff,
  }
}

export function ebomDiffChangeTypeColor(changeType) {
  if (changeType === EBOM_DIFF_CHANGE_TYPE.ADD) return 'success'
  if (changeType === EBOM_DIFF_CHANGE_TYPE.REMOVE) return 'error'
  if (changeType === EBOM_DIFF_CHANGE_TYPE.REPLACE) return 'purple'
  if (changeType === EBOM_DIFF_CHANGE_TYPE.MODIFY) return 'warning'
  return 'default'
}

function collectChangedKeys(before = {}, after = {}) {
  const keys = new Set()
  DIFF_FIELDS.forEach((field) => {
    if (normalizeValue(before[field.key]) !== normalizeValue(after[field.key])) {
      keys.add(field.key)
    }
  })
  return keys
}

function flattenStructuralMaterials(snapshot) {
  const rows = []

  function walk(materials, parentKey = '', depth = 0) {
    ;(materials || []).forEach((mat, index) => {
      const structuralKey = parentKey ? `${parentKey}.${index}` : String(index)
      rows.push({
        structuralKey,
        depth,
        code: normalizeValue(mat.code),
        name: normalizeValue(mat.name),
        spec: normalizeValue(mat.spec),
        material: normalizeValue(mat.material),
        unitUsage: mat.unitUsage ?? '',
        unit: normalizeValue(mat.unit),
        supplyType: normalizeValue(mat.supplyType),
        demandQty: mat.demandQty ?? '',
        processRoute: normalizeValue(mat.processRoute),
      })
      if (mat.children?.length) walk(mat.children, structuralKey, depth + 1)
    })
  }

  walk(snapshot?.materials || [])
  return rows
}

function compareStructuralKeys(a, b) {
  const partsA = String(a).split('.').map(Number)
  const partsB = String(b).split('.').map(Number)
  const len = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < len; i += 1) {
    const diff = (partsA[i] ?? -1) - (partsB[i] ?? -1)
    if (diff !== 0) return diff
  }
  return 0
}

function resolveStructuralChangeType(left, right) {
  if (!left && right) return EBOM_DIFF_CHANGE_TYPE.ADD
  if (left && !right) return EBOM_DIFF_CHANGE_TYPE.REMOVE
  if (!left || !right) return null

  const codeChanged = left.code !== right.code
  const nameChanged = left.name !== right.name
  if (codeChanged && nameChanged) return EBOM_DIFF_CHANGE_TYPE.REPLACE

  const fieldChanges = buildFieldChanges(left, right)
  if (fieldChanges.length) return EBOM_DIFF_CHANGE_TYPE.MODIFY
  return null
}

/** 按 BOM 树结构位置对齐，生成并排对比行（同位置换料识别为「替换」） */
export function buildEbomStructuralFullCompareRows(oldSnapshot, newSnapshot) {
  const oldRows = flattenStructuralMaterials(oldSnapshot)
  const newRows = flattenStructuralMaterials(newSnapshot)
  const oldMap = new Map(oldRows.map((row) => [row.structuralKey, row]))
  const newMap = new Map(newRows.map((row) => [row.structuralKey, row]))
  const keys = [...new Set([...oldMap.keys(), ...newMap.keys()])].sort(compareStructuralKeys)

  return keys
    .map((structuralKey) => {
      const left = oldMap.get(structuralKey) || null
      const right = newMap.get(structuralKey) || null
      const changeType = resolveStructuralChangeType(left, right)
      if (!changeType) return null

      const changedKeys = collectChangedKeys(left || {}, right || {})

      return {
        id: structuralKey,
        structuralKey,
        depth: left?.depth ?? right?.depth ?? 0,
        changeType,
        changedKeys,
        left,
        right,
      }
    })
    .filter(Boolean)
}

/** 两个 BOM 版本之间的 EBOM 差异（按指定数量展开） */
export function buildBomVersionComparePayload(oldBom, newBom, quantity = 1) {
  const qty = Number(quantity) || 1
  const oldSnapshot = buildEbomSnapshotFromBom(oldBom, qty)
  const newSnapshot = buildEbomSnapshotFromBom(newBom, qty)
  const diff = buildEbomSnapshotDiff(oldSnapshot, newSnapshot)

  return {
    leftVersion: oldSnapshot.bomVersion || oldBom.version || '—',
    rightVersion: newSnapshot.bomVersion || newBom.version || '—',
    quantity: qty,
    diff,
    fullRows: buildEbomStructuralFullCompareRows(oldSnapshot, newSnapshot),
  }
}

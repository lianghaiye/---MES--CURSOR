/**
 * 单位管理 TAB：主单位 + 辅助单位（业务角色）
 * 底层仍推导 inventoryUnit / purchaseUnit / settleUnit，兼容单据链路。
 */

import { deriveIsVariableLength, deriveSettleUnitForSave, normalizeUnit } from '@/utils/unitCaliber'

export const UNIT_ROLE = {
  PURCHASE: 'purchase',
  SETTLE: 'settle',
}

/** MVP 仅开放采购 / 结算；其余预留 */
export const UNIT_ROLE_OPTIONS = [
  { value: UNIT_ROLE.PURCHASE, label: '采购', enabled: true },
  { value: UNIT_ROLE.SETTLE, label: '结算', enabled: true },
  { value: 'sales', label: '销售', enabled: false },
  { value: 'production', label: '生产', enabled: false },
  { value: 'issue', label: '发料', enabled: false },
]

export const UNIT_CONVERT = {
  FIXED: 'fixed',
  BATCH: 'batch',
}

export const UNIT_CONVERT_OPTIONS = [
  { value: UNIT_CONVERT.BATCH, label: '按批次覆盖' },
  { value: UNIT_CONVERT.FIXED, label: '固定' },
]

export function createEmptyAuxUnit(partial = {}) {
  return {
    id: partial.id || `aux-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    unit: partial.unit || '',
    convertType: partial.convertType || UNIT_CONVERT.BATCH,
    rate: partial.rate ?? null,
    allowDecimal: partial.allowDecimal !== false,
    roles: Array.isArray(partial.roles) ? [...partial.roles] : [],
  }
}

export function roleLabels(roles = []) {
  const map = Object.fromEntries(UNIT_ROLE_OPTIONS.map((o) => [o.value, o.label]))
  return (roles || []).map((r) => map[r] || r).filter(Boolean)
}

/** 辅助单位与主单位换算说明文案 */
export function formatAuxConvertText(row, baseUnit) {
  const unit = normalizeUnit(row?.unit)
  const base = normalizeUnit(baseUnit) || '主单位'
  if (!unit) return '—'
  if (row.convertType === UNIT_CONVERT.FIXED) {
    const rate = Number(row.rate)
    if (Number.isFinite(rate) && rate > 0) return `1 ${unit} = ${rate} ${base}`
    return `1 ${unit} = ? ${base}（请填换算率）`
  }
  // batch
  if (row.roles?.includes(UNIT_ROLE.SETTLE)) {
    const rate = Number(row.rate)
    if (Number.isFinite(rate) && rate > 0) {
      return `1 ${base} ≈ ${rate} ${unit}（默认估；入库实填为准）`
    }
    return `按批次实填 ${unit}（默认换算率仅估）`
  }
  return `点货按 ${unit}，入库存按 ${base}（批次实填）`
}

/**
 * 从扁平字段 / 已存 auxUnits 反推 TAB 编辑态
 */
export function hydrateUnitManageFromSource(source = {}) {
  const baseUnit = normalizeUnit(source.inventoryUnit || source.stockUnit || source.baseUnit)
  if (Array.isArray(source.auxUnits) && source.auxUnits.length) {
    return {
      baseUnit: baseUnit || '',
      auxUnits: source.auxUnits.map((r) => createEmptyAuxUnit(r)),
    }
  }

  const auxUnits = []
  const purchase = normalizeUnit(source.purchaseUnit)
  const settle = deriveSettleUnitForSave(baseUnit, source.settleUnit)

  if (purchase && baseUnit && purchase !== baseUnit) {
    auxUnits.push(
      createEmptyAuxUnit({
        unit: purchase,
        convertType: UNIT_CONVERT.BATCH,
        allowDecimal: false,
        roles: [UNIT_ROLE.PURCHASE],
      }),
    )
  }

  if (settle) {
    const std = Number(source.standardUnitWeight)
    auxUnits.push(
      createEmptyAuxUnit({
        unit: settle,
        convertType: UNIT_CONVERT.BATCH,
        rate: Number.isFinite(std) && std > 0 ? std : null,
        allowDecimal: true,
        roles: [UNIT_ROLE.SETTLE],
      }),
    )
  }

  return { baseUnit: baseUnit || '', auxUnits }
}

/**
 * TAB → 扁平字段（单据兼容）
 */
export function applyUnitManageToFlat(baseUnit, auxUnits = [], options = {}) {
  const inv = normalizeUnit(baseUnit)
  const list = Array.isArray(auxUnits) ? auxUnits : []

  const purchaseRow = list.find((r) => (r.roles || []).includes(UNIT_ROLE.PURCHASE))
  const settleRow = list.find((r) => (r.roles || []).includes(UNIT_ROLE.SETTLE))

  const purchaseUnit = normalizeUnit(purchaseRow?.unit) || inv
  const settleUnit = deriveSettleUnitForSave(inv, settleRow?.unit)

  let standardUnitWeight = options.standardUnitWeight
  if (settleUnit && settleRow) {
    const rate = Number(settleRow.rate)
    if (Number.isFinite(rate) && rate > 0) standardUnitWeight = rate
    else if (settleRow.convertType === UNIT_CONVERT.BATCH && !(Number(standardUnitWeight) > 0)) {
      standardUnitWeight = undefined
    }
  } else {
    standardUnitWeight = undefined
  }

  return {
    inventoryUnit: inv || undefined,
    stockUnit: inv || undefined,
    purchaseUnit: purchaseUnit || inv || undefined,
    settleUnit: settleUnit || undefined,
    settleConvertType: settleUnit ? 'floating' : '',
    isVariableLength: deriveIsVariableLength(inv, purchaseUnit),
    standardUnitWeight,
    auxUnits: list.map((r) => ({
      id: r.id,
      unit: normalizeUnit(r.unit),
      convertType: r.convertType === UNIT_CONVERT.FIXED ? UNIT_CONVERT.FIXED : UNIT_CONVERT.BATCH,
      rate: r.rate == null || r.rate === '' ? null : Number(r.rate),
      allowDecimal: Boolean(r.allowDecimal),
      roles: [...(r.roles || [])],
    })),
  }
}

/**
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateUnitManage(baseUnit, auxUnits = []) {
  const inv = normalizeUnit(baseUnit)
  if (!inv) return { ok: false, message: '请先选择主单位（库存记账基准）' }

  const list = Array.isArray(auxUnits) ? auxUnits : []
  const purchaseRows = list.filter((r) => (r.roles || []).includes(UNIT_ROLE.PURCHASE))
  const settleRows = list.filter((r) => (r.roles || []).includes(UNIT_ROLE.SETTLE))

  if (purchaseRows.length > 1) return { ok: false, message: '「采购」角色只能挂一个辅助单位' }
  if (settleRows.length > 1) return { ok: false, message: '「结算」角色只能挂一个辅助单位' }

  const seenUnits = new Set()
  for (const row of list) {
    const u = normalizeUnit(row.unit)
    if (!u) return { ok: false, message: '辅助单位不能为空' }
    if (u === inv) return { ok: false, message: `辅助单位不能与主单位相同（${inv}）` }
    if (seenUnits.has(u)) return { ok: false, message: `辅助单位「${u}」重复` }
    seenUnits.add(u)

    const roles = (row.roles || []).filter((r) =>
      UNIT_ROLE_OPTIONS.some((o) => o.value === r && o.enabled),
    )
    if (!roles.length) return { ok: false, message: `请为「${u}」勾选业务角色（采购或结算）` }

    if (row.convertType === UNIT_CONVERT.FIXED) {
      const rate = Number(row.rate)
      if (!(rate > 0)) return { ok: false, message: `固定换算请填写「${u}」相对主单位的换算率` }
    }
  }

  return { ok: true }
}

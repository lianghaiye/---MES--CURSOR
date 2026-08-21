/**
 * 冒烟：单位 TAB 推导 / 反推 / 校验
 * 运行：node scripts/smoke-unit-manage-tab.mjs
 */
import {
  deriveIsVariableLength,
  deriveSettleUnitForSave,
  normalizeUnit,
} from '../src/utils/unitCaliber.js'

// 内联关键逻辑副本（避免 @ 别名），与 unitManageTab.js 保持同步意图
const UNIT_ROLE = { PURCHASE: 'purchase', SETTLE: 'settle' }
const UNIT_CONVERT = { FIXED: 'fixed', BATCH: 'batch' }

function createEmptyAuxUnit(partial = {}) {
  return {
    id: partial.id || `aux-1`,
    unit: partial.unit || '',
    convertType: partial.convertType || UNIT_CONVERT.BATCH,
    rate: partial.rate ?? null,
    allowDecimal: partial.allowDecimal !== false,
    roles: Array.isArray(partial.roles) ? [...partial.roles] : [],
  }
}

function hydrateUnitManageFromSource(source = {}) {
  const baseUnit = normalizeUnit(source.inventoryUnit || source.stockUnit || source.baseUnit)
  if (Array.isArray(source.auxUnits) && source.auxUnits.length) {
    return { baseUnit: baseUnit || '', auxUnits: source.auxUnits.map((r) => createEmptyAuxUnit(r)) }
  }
  const auxUnits = []
  const purchase = normalizeUnit(source.purchaseUnit)
  const settle = deriveSettleUnitForSave(baseUnit, source.settleUnit)
  if (purchase && baseUnit && purchase !== baseUnit) {
    auxUnits.push(
      createEmptyAuxUnit({ unit: purchase, convertType: UNIT_CONVERT.BATCH, roles: [UNIT_ROLE.PURCHASE] }),
    )
  }
  if (settle) {
    const std = Number(source.standardUnitWeight)
    auxUnits.push(
      createEmptyAuxUnit({
        unit: settle,
        convertType: UNIT_CONVERT.BATCH,
        rate: Number.isFinite(std) && std > 0 ? std : null,
        roles: [UNIT_ROLE.SETTLE],
      }),
    )
  }
  return { baseUnit: baseUnit || '', auxUnits }
}

function applyUnitManageToFlat(baseUnit, auxUnits = []) {
  const inv = normalizeUnit(baseUnit)
  const list = Array.isArray(auxUnits) ? auxUnits : []
  const purchaseRow = list.find((r) => (r.roles || []).includes(UNIT_ROLE.PURCHASE))
  const settleRow = list.find((r) => (r.roles || []).includes(UNIT_ROLE.SETTLE))
  const purchaseUnit = normalizeUnit(purchaseRow?.unit) || inv
  const settleUnit = deriveSettleUnitForSave(inv, settleRow?.unit)
  let standardUnitWeight
  if (settleUnit && settleRow) {
    const rate = Number(settleRow.rate)
    if (Number.isFinite(rate) && rate > 0) standardUnitWeight = rate
  }
  return {
    inventoryUnit: inv || undefined,
    purchaseUnit: purchaseUnit || inv || undefined,
    settleUnit: settleUnit || undefined,
    isVariableLength: deriveIsVariableLength(inv, purchaseUnit),
    standardUnitWeight,
  }
}

function validateUnitManage(baseUnit, auxUnits = []) {
  const inv = normalizeUnit(baseUnit)
  if (!inv) return { ok: false }
  const list = Array.isArray(auxUnits) ? auxUnits : []
  if (list.filter((r) => (r.roles || []).includes(UNIT_ROLE.PURCHASE)).length > 1) return { ok: false }
  if (list.filter((r) => (r.roles || []).includes(UNIT_ROLE.SETTLE)).length > 1) return { ok: false }
  for (const row of list) {
    const u = normalizeUnit(row.unit)
    if (!u || u === inv) return { ok: false }
    if (!(row.roles || []).length) return { ok: false }
    if (row.convertType === UNIT_CONVERT.FIXED && !(Number(row.rate) > 0)) return { ok: false }
  }
  return { ok: true }
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    process.exit(1)
  }
}

let h = hydrateUnitManageFromSource({ inventoryUnit: '件' })
assert(h.baseUnit === '件' && h.auxUnits.length === 0, 'only base')
let flat = applyUnitManageToFlat(h.baseUnit, h.auxUnits)
assert(flat.purchaseUnit === '件' && !flat.settleUnit && !flat.isVariableLength, 'flat only base')

h = hydrateUnitManageFromSource({ inventoryUnit: '米', purchaseUnit: '根' })
assert(h.auxUnits.length === 1 && h.auxUnits[0].roles.includes('purchase'), 'dual hydrate')
flat = applyUnitManageToFlat(h.baseUnit, h.auxUnits)
assert(flat.isVariableLength && flat.purchaseUnit === '根', 'flat dual')

h = hydrateUnitManageFromSource({ inventoryUnit: '件', settleUnit: 'kg', standardUnitWeight: 12.5 })
assert(h.auxUnits[0].rate === 12.5, 'settle hydrate')
flat = applyUnitManageToFlat(h.baseUnit, h.auxUnits)
assert(flat.settleUnit === 'kg' && flat.standardUnitWeight === 12.5, 'flat settle')

h = hydrateUnitManageFromSource({
  inventoryUnit: '㎡',
  purchaseUnit: '张',
  settleUnit: 'kg',
  standardUnitWeight: 8,
})
assert(h.auxUnits.length === 2, 'triple hydrate')
flat = applyUnitManageToFlat(h.baseUnit, h.auxUnits)
assert(flat.isVariableLength && flat.purchaseUnit === '张' && flat.settleUnit === 'kg', 'flat triple')

assert(
  !validateUnitManage('米', [
    createEmptyAuxUnit({ unit: '张', roles: ['purchase'] }),
    createEmptyAuxUnit({ unit: '根', roles: ['purchase'] }),
  ]).ok,
  'dup purchase',
)
assert(!validateUnitManage('件', [createEmptyAuxUnit({ unit: '件', roles: ['settle'] })]).ok, 'aux=base')
assert(
  !validateUnitManage('件', [
    createEmptyAuxUnit({ unit: '包', convertType: 'fixed', roles: ['purchase'] }),
  ]).ok,
  'fixed no rate',
)
assert(
  validateUnitManage('件', [
    createEmptyAuxUnit({ unit: 'kg', convertType: 'batch', roles: ['settle'], rate: 10 }),
  ]).ok,
  'ok settle',
)

console.log('smoke-units: all passed')

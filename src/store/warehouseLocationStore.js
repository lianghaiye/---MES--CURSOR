import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createWarehouseLocationSeed } from '@/mock/warehouseLocationSeed'
import { getWarehouseById } from '@/store/warehouseStore'

const STORAGE_KEY = 'i_doms_warehouse_locations'
const SEED_VERSION_KEY = 'i_doms_warehouse_locations_seed_v'
const CURRENT_SEED_VERSION = '1'

export const LOCATION_TYPE_OPTIONS = ['存储位', '拣货位', '收货暂存', '发货暂存', '不良品位']

export const LOCATION_OCCUPY_OPTIONS = ['空闲', '部分占用', '占用', '锁定']

export const LOCATION_ZONE_OPTIONS = ['A区', 'B区', 'C区', '发货区', '不良区']

function loadFromStorage() {
  try {
    if (localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION) return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.locations)) return parsed.locations
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ locations: warehouseLocationState.locations }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

export const warehouseLocationState = reactive({
  locations: loadFromStorage() || createWarehouseLocationSeed(),
})

watch(
  () => warehouseLocationState.locations,
  () => persist(),
  { deep: true },
)

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function buildLocationCode({ prefix, zone, aisle, rack, level, bin }) {
  const zoneKey = String(zone || 'A').replace(/区$/, '')
  return [prefix, zoneKey, pad2(aisle), pad2(rack), pad2(level), pad2(bin)].join('-')
}

export function generateLocationPrefix(warehouse) {
  const name = warehouse?.name || ''
  const map = {
    原料仓: 'YL',
    成品主仓: 'CP',
    成品仓: 'CP',
    库线边仓: 'XB',
    半成品仓: 'BCP',
    报废仓: 'BF',
  }
  if (map[name]) return map[name]
  const code = String(warehouse?.code || 'LOC').replace(/[^A-Za-z0-9]/g, '')
  return (code.slice(0, 3) || 'LOC').toUpperCase()
}

export function getWarehouseLocationById(id) {
  return warehouseLocationState.locations.find((l) => l.id === id) || null
}

export function getWarehouseLocationByCode(warehouseId, code) {
  return (
    warehouseLocationState.locations.find(
      (l) => l.warehouseId === warehouseId && l.code === code,
    ) || null
  )
}

export function countLocationsByWarehouseId(warehouseId) {
  return warehouseLocationState.locations.filter((l) => l.warehouseId === warehouseId).length
}

export function getLocationSelectOptions(warehouseName, { enabledOnly = true } = {}) {
  return warehouseLocationState.locations
    .filter((l) => {
      if (warehouseName && l.warehouseName !== warehouseName && l.warehouseId !== warehouseName) {
        return false
      }
      if (enabledOnly && l.enabled === false) return false
      return true
    })
    .map((l) => ({
      label: `${l.code}${l.name && l.name !== l.code ? ` ${l.name}` : ''}`,
      value: l.code,
    }))
}

export function filterWarehouseLocations(list, filters = {}) {
  return (list || []).filter((l) => {
    if (filters.warehouseId && l.warehouseId !== filters.warehouseId) return false
    if (filters.warehouseName && l.warehouseName !== filters.warehouseName) return false
    if (filters.code && !String(l.code || '').includes(filters.code)) return false
    if (filters.zone && l.zone !== filters.zone) return false
    if (filters.locationType && l.locationType !== filters.locationType) return false
    if (filters.enabled === true && l.enabled === false) return false
    if (filters.enabled === false && l.enabled !== false) return false
    if (filters.occupyStatus && l.occupyStatus !== filters.occupyStatus) return false
    return true
  })
}

function validatePayload(payload, editingId) {
  const warehouseId = payload.warehouseId
  const warehouse = getWarehouseById(warehouseId)
  if (!warehouse) return { ok: false, message: '请选择所属仓库' }
  const code = String(payload.code || '').trim()
  if (!code) return { ok: false, message: '请输入货位编码' }
  const dup = warehouseLocationState.locations.find(
    (l) => l.warehouseId === warehouseId && l.code === code && l.id !== editingId,
  )
  if (dup) return { ok: false, message: '同一仓库下货位编码不可重复' }
  if (!payload.locationType) return { ok: false, message: '请选择货位类型' }
  return { ok: true, warehouse }
}

function toRow(payload, warehouse, extra = {}) {
  return {
    id: extra.id || `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    code: String(payload.code).trim(),
    name: String(payload.name || payload.code).trim(),
    zone: payload.zone || 'A区',
    locationType: payload.locationType || '存储位',
    aisle: payload.aisle || '01',
    rack: payload.rack || '01',
    level: payload.level || '01',
    bin: payload.bin || '01',
    mixSku: payload.mixSku !== false,
    mixBatch: payload.mixBatch !== false,
    maxQty: payload.maxQty === '' || payload.maxQty == null ? null : Number(payload.maxQty),
    maxWeight:
      payload.maxWeight === '' || payload.maxWeight == null ? null : Number(payload.maxWeight),
    enabled: payload.enabled !== false,
    occupyStatus: payload.occupyStatus || '空闲',
    remark: payload.remark?.trim() || '',
    creator: extra.creator || 'admin1',
    createdAt: extra.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export function addWarehouseLocation(payload) {
  const check = validatePayload(payload)
  if (!check.ok) return check
  const row = toRow(payload, check.warehouse)
  warehouseLocationState.locations.unshift(row)
  return { ok: true, location: row }
}

export function updateWarehouseLocation(id, payload) {
  const idx = warehouseLocationState.locations.findIndex((l) => l.id === id)
  if (idx === -1) return { ok: false, message: '货位不存在' }
  const check = validatePayload(payload, id)
  if (!check.ok) return check
  const prev = warehouseLocationState.locations[idx]
  warehouseLocationState.locations[idx] = {
    ...toRow(payload, check.warehouse, {
      id: prev.id,
      creator: prev.creator,
      createdAt: prev.createdAt,
    }),
    occupyStatus: payload.occupyStatus || prev.occupyStatus || '空闲',
  }
  return { ok: true, location: warehouseLocationState.locations[idx] }
}

export function deleteWarehouseLocation(id) {
  const idx = warehouseLocationState.locations.findIndex((l) => l.id === id)
  if (idx === -1) return { ok: false, message: '货位不存在' }
  const row = warehouseLocationState.locations[idx]
  if (row.occupyStatus === '占用' || row.occupyStatus === '部分占用') {
    return { ok: false, message: '货位仍有库存占用，无法删除' }
  }
  if (row.occupyStatus === '锁定') {
    return { ok: false, message: '货位已锁定，无法删除' }
  }
  warehouseLocationState.locations.splice(idx, 1)
  return { ok: true }
}

export function setWarehouseLocationEnabled(id, enabled) {
  const row = getWarehouseLocationById(id)
  if (!row) return { ok: false, message: '货位不存在' }
  row.enabled = Boolean(enabled)
  return { ok: true, location: row }
}

export function setWarehouseLocationOccupy(id, occupyStatus) {
  const row = getWarehouseLocationById(id)
  if (!row) return { ok: false, message: '货位不存在' }
  if (!LOCATION_OCCUPY_OPTIONS.includes(occupyStatus)) {
    return { ok: false, message: '占用状态无效' }
  }
  row.occupyStatus = occupyStatus
  return { ok: true, location: row }
}

/**
 * 按库区/通道/货架/层/位批量生成货位（WMS 常见能力）
 */
export function batchCreateWarehouseLocations(payload) {
  const warehouse = getWarehouseById(payload.warehouseId)
  if (!warehouse) return { ok: false, message: '请选择所属仓库' }
  const aisleFrom = Number(payload.aisleFrom) || 1
  const aisleTo = Number(payload.aisleTo) || aisleFrom
  const rackFrom = Number(payload.rackFrom) || 1
  const rackTo = Number(payload.rackTo) || rackFrom
  const levelFrom = Number(payload.levelFrom) || 1
  const levelTo = Number(payload.levelTo) || levelFrom
  const binFrom = Number(payload.binFrom) || 1
  const binTo = Number(payload.binTo) || binFrom
  if (aisleTo < aisleFrom || rackTo < rackFrom || levelTo < levelFrom || binTo < binFrom) {
    return { ok: false, message: '起止范围不正确' }
  }
  const prefix = payload.prefix?.trim() || generateLocationPrefix(warehouse)
  const zone = payload.zone || 'A区'
  const created = []
  const skipped = []
  for (let aisle = aisleFrom; aisle <= aisleTo; aisle += 1) {
    for (let rack = rackFrom; rack <= rackTo; rack += 1) {
      for (let level = levelFrom; level <= levelTo; level += 1) {
        for (let bin = binFrom; bin <= binTo; bin += 1) {
          const code = buildLocationCode({ prefix, zone, aisle, rack, level, bin })
          if (getWarehouseLocationByCode(warehouse.id, code)) {
            skipped.push(code)
            continue
          }
          const row = toRow(
            {
              code,
              name: code,
              zone,
              locationType: payload.locationType || '存储位',
              aisle: pad2(aisle),
              rack: pad2(rack),
              level: pad2(level),
              bin: pad2(bin),
              mixSku: payload.mixSku !== false,
              mixBatch: payload.mixBatch !== false,
              enabled: true,
              occupyStatus: '空闲',
            },
            warehouse,
          )
          warehouseLocationState.locations.unshift(row)
          created.push(row)
        }
      }
    }
  }
  if (!created.length) {
    return { ok: false, message: skipped.length ? '范围内货位已存在' : '未生成任何货位' }
  }
  return { ok: true, created, skipped }
}

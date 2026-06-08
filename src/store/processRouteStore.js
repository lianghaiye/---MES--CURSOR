import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { createProcessRouteSeed } from '@/mock/processRouteSeed'
import { processConfigState } from '@/store/processConfigStore'
import { normalizeGrid, validateProcessRouteGrid } from '@/utils/processRouteGrid'

const STORAGE_KEY = 'i_doms_process_routes'
const SEED_VERSION_KEY = 'i_doms_process_routes_seed_v'
const CURRENT_SEED_VERSION = '1'

function getProcessIdByName(name) {
  const proc = processConfigState.processes.find((p) => p.name === name)
  return proc?.id || `proc-unknown-${name}`
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.routes)) return parsed.routes
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ routes: processRouteState.routes }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

export function generateProcessRouteCode(existingCodes = []) {
  const max = existingCodes.reduce((m, code) => {
    const n = Number(String(code).replace(/\D/g, '').slice(-4)) || 0
    return Math.max(m, n)
  }, 0)
  return `GYLX${String(max + 1).padStart(4, '0')}`
}

export const ROUTE_STATUS = ['新建', '使用中', '已归档']
export const APPLY_SCOPES = ['全部产品', '单个物品', '物品类别']

export const processRouteState = reactive({
  routes: shouldReseed()
    ? createProcessRouteSeed(getProcessIdByName)
    : loadFromStorage() || createProcessRouteSeed(getProcessIdByName),
})

watch(
  () => processRouteState.routes,
  () => persist(),
  { deep: true },
)

export function getProcessRouteById(id) {
  return processRouteState.routes.find((r) => r.id === id) || null
}

export function getProcessRouteByCode(code) {
  return processRouteState.routes.find((r) => r.code === code) || null
}

export function getProcessRouteByName(name) {
  return processRouteState.routes.find((r) => r.name === name) || null
}

export function resolveRouteProductDisplay(route) {
  if (!route) return ''
  if (route.applyScope === '全部产品') return ''
  return route.productDisplay || route.itemName || route.categoryName || ''
}

export function filterProcessRoutes(list, filters = {}) {
  return list.filter((r) => {
    if (filters.code && !r.code.includes(filters.code)) return false
    if (filters.name && !r.name.includes(filters.name)) return false
    if (filters.status && r.status !== filters.status) return false
    return true
  })
}

function validateRouteForm(payload) {
  if (!payload.name?.trim()) return { ok: false, message: '请输入工艺路线名称' }
  if (!payload.applyScope) return { ok: false, message: '请选择工艺应用范围' }
  if (payload.applyScope === '单个物品') {
    if (!payload.itemId) return { ok: false, message: '请选择物品' }
  }
  if (payload.applyScope === '物品类别') {
    if (!payload.categoryKey) return { ok: false, message: '请选择物品类别' }
  }
  const gridCheck = validateProcessRouteGrid(payload.grid)
  if (!gridCheck.ok) return gridCheck
  return { ok: true }
}

export function addProcessRoute(payload) {
  const check = validateRouteForm(payload)
  if (!check.ok) return check

  const codes = processRouteState.routes.map((r) => r.code)
  const row = {
    id: `route-${Date.now()}`,
    code: payload.code || generateProcessRouteCode(codes),
    name: payload.name.trim(),
    status: payload.status || '使用中',
    applyScope: payload.applyScope,
    itemType: payload.itemType || '',
    itemId: payload.itemId || '',
    itemName: payload.itemName || '',
    itemCode: payload.itemCode || '',
    categoryType: payload.categoryType || '',
    categoryKey: payload.categoryKey || '',
    categoryName: payload.categoryName || '',
    productDisplay: payload.productDisplay || '',
    remark: payload.remark || '',
    grid: normalizeGrid(payload.grid),
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  row.productDisplay = resolveRouteProductDisplay(row) || row.productDisplay
  processRouteState.routes.unshift(row)
  return { ok: true, route: row }
}

export function updateProcessRoute(id, payload) {
  const idx = processRouteState.routes.findIndex((r) => r.id === id)
  if (idx === -1) return { ok: false, message: '工艺路线不存在' }
  const check = validateRouteForm(payload)
  if (!check.ok) return check

  Object.assign(processRouteState.routes[idx], {
    name: payload.name.trim(),
    applyScope: payload.applyScope,
    itemType: payload.itemType || '',
    itemId: payload.itemId || '',
    itemName: payload.itemName || '',
    itemCode: payload.itemCode || '',
    categoryType: payload.categoryType || '',
    categoryKey: payload.categoryKey || '',
    categoryName: payload.categoryName || '',
    productDisplay: payload.productDisplay || '',
    remark: payload.remark || '',
    grid: normalizeGrid(payload.grid),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  const row = processRouteState.routes[idx]
  row.productDisplay = resolveRouteProductDisplay(row) || row.productDisplay
  return { ok: true, route: row }
}

export function deleteProcessRoute(id) {
  const idx = processRouteState.routes.findIndex((r) => r.id === id)
  if (idx === -1) return { ok: false, message: '工艺路线不存在' }
  processRouteState.routes.splice(idx, 1)
  return { ok: true }
}

export function archiveProcessRoute(id) {
  const row = getProcessRouteById(id)
  if (!row) return { ok: false, message: '工艺路线不存在' }
  if (row.status !== '使用中') return { ok: false, message: '仅使用中的路线可归档' }
  row.status = '已归档'
  row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true }
}

export function unarchiveProcessRoute(id) {
  const row = getProcessRouteById(id)
  if (!row) return { ok: false, message: '工艺路线不存在' }
  if (row.status !== '已归档') return { ok: false, message: '仅已归档的路线可取消归档' }
  row.status = '使用中'
  row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true }
}

export function cloneProcessRoute(id) {
  const source = getProcessRouteById(id)
  if (!source) return { ok: false, message: '工艺路线不存在' }
  const codes = processRouteState.routes.map((r) => r.code)
  const cloned = {
    ...JSON.parse(JSON.stringify(source)),
    id: `route-${Date.now()}`,
    code: generateProcessRouteCode(codes),
    name: `${source.name}-副本`,
    status: '新建',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
  processRouteState.routes.unshift(cloned)
  return { ok: true, route: cloned }
}

/** 工单可选路线：使用中 + 范围匹配 */
export function getAvailableRoutesForWorkOrder(ctx = {}) {
  const { productId, productName, materialId, categoryKey } = ctx
  return processRouteState.routes.filter((route) => {
    if (route.status !== '使用中') return false
    if (route.applyScope === '全部产品') return true
    if (route.applyScope === '单个物品') {
      if (route.itemType === '产品' && productId) return route.itemId === productId
      if (route.itemType === '物料' && materialId) return route.itemId === materialId
      if (productName && route.itemName) return route.itemName === productName
      return false
    }
    if (route.applyScope === '物品类别') {
      if (!categoryKey) return true
      return route.categoryKey === categoryKey
    }
    return false
  })
}

export function getActiveRouteOptions(ctx) {
  const routes = getAvailableRoutesForWorkOrder(ctx)
  if (routes.length) return routes.map((r) => r.name)
  return processRouteState.routes.filter((r) => r.status === '使用中').map((r) => r.name)
}

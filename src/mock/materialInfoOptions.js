import { processRouteMaster } from '@/mock/processRoutes'
import { workCenterOptions, processRouteOptions, warehouseOptions } from '@/mock/workOrderOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'
import { getInventoryUnitNames } from '@/store/unitStore'

export const barcodeTypeOptions = ['一物一码', '一类一码', '一批一码']

export {
  MATERIAL_TYPE_OPTIONS as materialTypeOptions,
  SUPPLY_FORM_OPTIONS as supplyFormOptions,
} from '@/utils/masterDataMigrate'

const FALLBACK_INVENTORY_UNITS = ['个', '件', '套', 'kg', 'm', '米', '台', '根']

/** 库存单位名称（读单位管理） */
export function getInventoryUnitOptionsList() {
  const list = getInventoryUnitNames()
  return list.length ? list : FALLBACK_INVENTORY_UNITS
}

/**
 * 兼容旧代码：优先返回单位管理中的启用库存单位。
 * 表单请优先用 @/store/unitStore 的 getInventoryUnitOptions() + computed。
 */
export const inventoryUnitOptions = new Proxy([], {
  get(_target, prop, receiver) {
    const list = getInventoryUnitOptionsList()
    if (prop === 'length') return list.length
    if (prop === Symbol.iterator) return list[Symbol.iterator].bind(list)
    if (typeof prop === 'string' && prop === 'map') return list.map.bind(list)
    if (typeof prop === 'string' && prop === 'filter') return list.filter.bind(list)
    if (typeof prop === 'string' && prop === 'includes') return list.includes.bind(list)
    if (typeof prop === 'string' && prop === 'forEach') return list.forEach.bind(list)
    if (typeof prop === 'string' && prop === 'find') return list.find.bind(list)
    if (typeof prop === 'string' && prop === 'some') return list.some.bind(list)
    if (typeof prop === 'string' && prop === 'every') return list.every.bind(list)
    if (typeof prop === 'string' && prop === 'slice') return list.slice.bind(list)
    if (typeof prop === 'string' && prop === 'concat') return list.concat.bind(list)
    if (typeof prop === 'string' && /^\d+$/.test(prop)) return list[Number(prop)]
    return Reflect.get(list, prop, receiver)
  },
})

export const reportTypeOptions = ['批量计件', '时长报工']

export const salaryMethodOptions = ['计件工资', '计时工资']

/** 兼容旧配置值 */
export const legacyReportTypeMap = {
  工序报工: '批量计件',
  批次报工: '批量计件',
  扫码报工: '批量计件',
  批量计件: '批量计件',
  时长报工: '时长报工',
}

export const legacySalaryMethodMap = {
  计时: '计时工资',
  计件: '计件工资',
  '计时+计件': '计时工资',
  计件工资: '计件工资',
  计时工资: '计时工资',
}

export const inboundQcOptions = ['免检', '抽检', '全检']

export const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))

export const processRouteOpts = processRouteOptions.map((v) => ({ label: v, value: v }))

export const warehouseOpts = warehouseOptions.map((v) => ({ label: v, value: v }))

export const supplierOpts = supplierOptions

const processNames = new Set()
Object.values(processRouteMaster).forEach((route) => {
  route.steps.forEach((s) => processNames.add(s.name))
})
export const processOpts = [...processNames].map((name) => ({ label: name, value: name }))

export function createDefaultLaborRow() {
  return {
    id: `labor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    processName: undefined,
    reportType: undefined,
    standardMinutesPerPiece: 0,
    setupMinutesPerBatch: 0,
    salaryMethod: undefined,
    standardHourlyRate: 0,
    pieceRate: 0,
  }
}

export function createDefaultProductionControl() {
  return {
    planStrategy: undefined,
    replenishQty: undefined,
    defaultWorkCenter: undefined,
    standardCycleDays: undefined,
    requisitionEnabled: false,
    defaultProcessRoute: undefined,
    defaultSupplier: undefined,
    defaultOutsourceSupplier: undefined,
    defaultWarehouse: undefined,
    isKeyPart: false,
    isAuxiliary: false,
    isHazardous: false,
    inboundQcRequirement: undefined,
  }
}

export function createDefaultAlertConfig() {
  return {
    stockAlertEnabled: false,
    maxStockQty: undefined,
    minStockQty: undefined,
    expiryAlertEnabled: false,
    defectRateThreshold: undefined,
  }
}

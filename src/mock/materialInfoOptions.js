import { processRouteMaster } from '@/mock/processRoutes'
import { workCenterOptions, processRouteOptions, warehouseOptions } from '@/mock/workOrderOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'

export const barcodeTypeOptions = ['一物一码', '一类一码', '一批一码']

export {
  MATERIAL_TYPE_OPTIONS as materialTypeOptions,
  SUPPLY_FORM_OPTIONS as supplyFormOptions,
} from '@/utils/masterDataMigrate'

export const inventoryUnitOptions = ['个', '件', '套', 'kg', 'm', '台']

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
    defaultWorkCenter: undefined,
    standardCycleDays: undefined,
    requisitionEnabled: false,
    defaultProcessRoute: undefined,
    defaultSupplier: undefined,
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
    expiryAlertEnabled: false,
    defectRateThreshold: undefined,
  }
}

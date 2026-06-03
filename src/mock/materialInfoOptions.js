import { processRouteMaster } from '@/mock/processRoutes'
import { workCenterOptions, processRouteOptions, warehouseOptions } from '@/mock/workOrderOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'

export const barcodeTypeOptions = ['一物一码', '一类一码', '一批一码']

export const materialTypeOptions = ['零部件', '标准件', '原材料', '半成品', '成品']

export const supplyFormOptions = ['外购件', '自制件', '外协件']

export const inventoryUnitOptions = ['个', '件', '套', 'kg', 'm', '台']

export const reportTypeOptions = ['工序报工', '批次报工', '扫码报工']

export const salaryMethodOptions = ['计时', '计件', '计时+计件']

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

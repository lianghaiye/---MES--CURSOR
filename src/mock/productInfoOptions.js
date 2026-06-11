export {
  barcodeTypeOptions,
  materialTypeOptions,
  supplyFormOptions,
  inventoryUnitOptions,
  reportTypeOptions,
  salaryMethodOptions,
  workCenterOpts,
  processRouteOpts,
  warehouseOpts,
  supplierOpts,
  processOpts,
  createDefaultLaborRow,
  createDefaultProductionControl,
  createDefaultAlertConfig,
} from '@/mock/materialInfoOptions'

export const productAttributeOptions = [
  '标准产品',
  '定制产品',
  '标准-成品零部件',
  '定制-成品零部件',
]

export const standardSpecOptions = ['国标', '行标', '企标', 'ISO标准']

export function createDefaultProductProduction() {
  return {
    defaultWorkCenter: undefined,
    standardCycleDays: undefined,
    defaultProcessRoute: undefined,
    defaultSupplier: undefined,
    defaultWarehouse: undefined,
  }
}

export function createDefaultProductAlert() {
  return {
    stockAlertEnabled: false,
    expiryAlertEnabled: false,
    defectRateThreshold: undefined,
    attachments: [],
  }
}

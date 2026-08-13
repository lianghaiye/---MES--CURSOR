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

export const productAttributeOptions = ['标准产品', '定制产品', '标准零部件', '定制零部件', '服务']

/** 整机产品属性可选项 */
export const wholeMachineProductAttributeOptions = ['标准产品', '定制产品']

export const STANDARD_PART_ATTRIBUTE = '标准零部件'
export const CUSTOM_PART_ATTRIBUTE = '定制零部件'

/** 标准/定制零部件 */
export const PART_PRODUCT_ATTRIBUTES = [STANDARD_PART_ATTRIBUTE, CUSTOM_PART_ATTRIBUTE]

export const partProductAttributeOptions = [...PART_PRODUCT_ATTRIBUTES]

const LEGACY_PART_ATTRIBUTE_MAP = {
  '标准-成品零部件': STANDARD_PART_ATTRIBUTE,
  '定制-成品零部件': CUSTOM_PART_ATTRIBUTE,
  '标准-成品': STANDARD_PART_ATTRIBUTE,
  试制产品: CUSTOM_PART_ATTRIBUTE,
}

export function normalizePartProductAttribute(value) {
  const text = String(value || '').trim()
  if (LEGACY_PART_ATTRIBUTE_MAP[text]) return LEGACY_PART_ATTRIBUTE_MAP[text]
  if (PART_PRODUCT_ATTRIBUTES.includes(text)) return text
  return STANDARD_PART_ATTRIBUTE
}

export function isPartProductAttribute(productAttribute) {
  return PART_PRODUCT_ATTRIBUTES.includes(normalizePartProductAttribute(productAttribute))
}

export const standardSpecOptions = ['国标', '行标', '企标', 'ISO标准']

/** 计划策略：按单生产(MTO) / 以库存生产(MTS)，与业务规则「生产模式（报工）」无关 */
export const PLAN_STRATEGY = {
  MTO: 'mto',
  MTS: 'mts',
}

export const PLAN_STRATEGY_OPTIONS = [
  { value: PLAN_STRATEGY.MTO, label: '按单生产' },
  { value: PLAN_STRATEGY.MTS, label: '以库存生产' },
]

export function createDefaultProductProduction() {
  return {
    planStrategy: PLAN_STRATEGY.MTO,
    replenishQty: undefined,
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
    maxStockQty: undefined,
    minStockQty: undefined,
    expiryAlertEnabled: false,
    defectRateThreshold: undefined,
    attachments: [],
  }
}

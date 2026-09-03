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

/** 计划策略：按订单MTO / 按库存MTS / 二者兼有，与业务规则「生产模式（报工）」无关 */
export const PLAN_STRATEGY = {
  MTO: 'mto',
  MTS: 'mts',
  /** 按订单排产 + 按库存补货 */
  MTO_MTS: 'mto_mts',
}

export const PLAN_STRATEGY_OPTIONS = [
  { value: PLAN_STRATEGY.MTO, label: '按订单MTO' },
  { value: PLAN_STRATEGY.MTS, label: '按库存MTS' },
  { value: PLAN_STRATEGY.MTO_MTS, label: '按订单MTO+按库存MTS' },
]

export function planStrategyLabel(value) {
  const hit = PLAN_STRATEGY_OPTIONS.find((o) => o.value === value)
  return hit?.label || PLAN_STRATEGY_OPTIONS[0].label
}

/** 是否含按库存 MTS（纯 MTS 或 MTO+MTS） */
export function isPlanStrategyMts(value) {
  return value === PLAN_STRATEGY.MTS || value === PLAN_STRATEGY.MTO_MTS
}

/** 是否含按订单 MTO（纯 MTO 或 MTO+MTS） */
export function isPlanStrategyMto(value) {
  return value === PLAN_STRATEGY.MTO || value === PLAN_STRATEGY.MTO_MTS || !value
}

export function createDefaultProductProduction() {
  return {
    planStrategy: undefined,
    replenishQty: undefined,
    defaultWorkCenter: undefined,
    standardCycleDays: undefined,
    defaultProcessRoute: undefined,
    defaultSupplier: undefined,
    defaultOutsourceSupplier: undefined,
    defaultWarehouse: undefined,
    needIndustrialLabel: false,
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

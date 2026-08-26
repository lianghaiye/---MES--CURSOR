/**
 * 采购包装换算演示：库存=个，采购=盒，1盒=100个
 * 缺口 105 个 → 计划采购 2 盒（向上取整）
 */
import dayjs from 'dayjs'
import { createLineItem } from '@/mock/purchaseRequisitions'
import { UNIT_CONVERT, UNIT_ROLE } from '@/utils/unitManageTab'

export const PKG_CONVERT_DEMO_CODE = 'WL-PKG-BOX-100'
export const PKG_CONVERT_DEMO_NAME = '包装换算演示螺栓（盒/个）'

export const PKG_CONVERT_DEMO_PR_ID = 'pr-pkg-convert-demo'
export const PKG_CONVERT_DEMO_REQ_NO = 'CGSQ-PKG-CONVERT-001'

/** 主数据：采购盒、库存个、默认换算率 100 */
export function createPackageConvertDemoMaterial() {
  return {
    id: 'mat-pkg-box-100-demo',
    code: PKG_CONVERT_DEMO_CODE,
    name: PKG_CONVERT_DEMO_NAME,
    barcodeType: '一类一码',
    materialType: '标准件',
    supplyForm: '外购件',
    categoryKey: 'cat-std',
    parentCategoryKey: 'cat-std',
    categoryCode: 'STD',
    categoryName: '标准件',
    specModel: 'M10×30',
    material: '钢',
    techParams: '演示：1 盒=100 个；缺口105个→计划2盒',
    inventoryUnit: '个',
    stockUnit: '个',
    purchaseUnit: '盒',
    packageContent: 100,
    packContentQty: 100,
    auxUnits: [
      {
        id: 'aux-pkg-box-purchase',
        unit: '盒',
        convertType: UNIT_CONVERT.FIXED,
        rate: 100,
        allowDecimal: false,
        roles: [UNIT_ROLE.PURCHASE],
        enabled: true,
      },
    ],
    unitPrice: 0.28,
    canSell: false,
    canProduce: false,
    canPurchase: true,
    canOutsource: false,
    isProductMaterial: false,
    matchingRequirements: '',
    outputTaxRate: 13,
    inputTaxRate: 13,
    remark: '包装换算演示料：打开采购申请/生产计划生成申请可看「105个→2盒」',
    createdAt: '2026-08-01',
  }
}

/** 生产计划物料行（外购缺口 105 个） */
export function createPackageConvertDemoPlanMaterial(partial = {}) {
  return {
    id: 'plan-mat-pkg-convert-demo',
    code: PKG_CONVERT_DEMO_CODE,
    name: PKG_CONVERT_DEMO_NAME,
    type: '标准件',
    supplyType: '外购件',
    supplyForm: '外购件',
    spec: 'M10×30',
    material: '钢',
    unit: '个',
    inventoryUnit: '个',
    stockUnit: '个',
    purchaseUnit: '盒',
    unitUsage: 105,
    demandQty: 105,
    stockQty: 0,
    availableStock: 0,
    woAllocatedQty: 0,
    gapQty: 105,
    planQty: 105,
    warehouse: '原材料仓',
    designateSupplier: false,
    supplier: '标准件供应商',
    remark: '包装换算演示：缺口105个，生成申请时应为计划2盒',
    ...partial,
  }
}

function withTax(ex, qty, taxRate = 13) {
  const unitEx = Number(ex) || 0
  const q = Number(qty) || 0
  const inTax = Math.round(unitEx * (1 + taxRate / 100) * 100) / 100
  return {
    unitPriceExTax: unitEx,
    taxRate,
    unitPriceInTax: inTax,
    totalPriceExTax: Math.round(q * unitEx * 100) / 100,
    totalPriceInTax: Math.round(q * inTax * 100) / 100,
  }
}

/** 采购申请：一眼能看到换算说明与计划盒数 */
export function createPackageConvertDemoPurchaseRequisitions() {
  const planPurchaseQty = 2
  const price = withTax(28, planPurchaseQty)
  const line = createLineItem({
    id: 'pr-pkg-convert-line-1',
    inventoryName: PKG_CONVERT_DEMO_NAME,
    inventoryCode: PKG_CONVERT_DEMO_CODE,
    productName: PKG_CONVERT_DEMO_NAME,
    productCode: PKG_CONVERT_DEMO_CODE,
    specModel: 'M10×30',
    material: '钢',
    materialType: '标准件',
    supplyType: '外购件',
    unit: '盒',
    purchaseUnit: '盒',
    inventoryUnit: '个',
    stockUnit: '个',
    stockQty: 0,
    demandQty: 105,
    planPurchaseQty,
    packageContent: 100,
    purchaseConvertRate: 100,
    convertHint: '1 盒=100 个',
    supplierName: '标准件供应商',
    receivingWarehouse: '原材料仓',
    poGenStatus: '未生成采购',
    remark: '缺口105个 ÷ 100 向上取整 = 计划2盒',
    ...price,
  })
  return [
    {
      id: PKG_CONVERT_DEMO_PR_ID,
      reqNo: PKG_CONVERT_DEMO_REQ_NO,
      docStatus: '待处理',
      overdueStatus: '未逾期',
      urgency: '正常',
      salesOrderNo: '',
      purchaseOrderNo: '',
      orderDate: dayjs().format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      estimatedArrivalDate: dayjs().add(10, 'day').format('YYYY-MM-DD'),
      source: '生产计划',
      receivingWarehouse: '原材料仓',
      operator: 'admin1',
      creator: 'admin1',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      remark:
        '【包装换算演示】库存需求105个，采购单位盒，1盒=100个 → 计划采购数2盒。打开明细看「换算说明」。',
      lineItems: [line],
      plannedQty: planPurchaseQty,
      amountWan: (price.totalPriceInTax || 0) / 10000,
    },
  ]
}

export function ensurePackageConvertDemoPurchaseRequisitions(list) {
  const rest = (list || []).filter((r) => r?.id !== PKG_CONVERT_DEMO_PR_ID)
  return [...createPackageConvertDemoPurchaseRequisitions(), ...rest]
}

/**
 * 往生产计划工作项物料中注入演示行（幂等），便于「生成采购申请」弹窗验收
 */
export function ensurePackageConvertDemoOnPlans(plans = []) {
  const demo = createPackageConvertDemoPlanMaterial()
  return (plans || []).map((plan, planIdx) => {
    if (!plan?.workItems?.length) return plan
    // 只挂第一条计划的首个工作项，避免到处重复
    if (planIdx !== 0) return plan
    const workItems = plan.workItems.map((wi, wiIdx) => {
      if (wiIdx !== 0) return wi
      const materials = Array.isArray(wi.materials) ? [...wi.materials] : []
      const exists = materials.some((m) => m.code === PKG_CONVERT_DEMO_CODE)
      if (exists) {
        return {
          ...wi,
          materials: materials.map((m) =>
            m.code === PKG_CONVERT_DEMO_CODE ? { ...m, ...demo, id: m.id || demo.id } : m,
          ),
        }
      }
      return { ...wi, materials: [demo, ...materials] }
    })
    return { ...plan, workItems }
  })
}

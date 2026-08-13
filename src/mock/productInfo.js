import dayjs from 'dayjs'
import { productCategoryTree, flattenCategoryNodes } from '@/mock/productCategories'
import { pumpProductNames, barcodeTypesCycle } from '@/mock/pumpIndustryNames'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'
import { migrateProductList } from '@/utils/masterDataMigrate'
import { applyLaborConfigSeed } from '@/mock/laborConfigSeed'
import { matchesBusinessTypeFilter, PRODUCT_BUSINESS_TYPE_OPTIONS } from '@/utils/businessTypeLabel'

const flatCats = flattenCategoryNodes(productCategoryTree)
const leafCats = flatCats.filter((c) => !c.children?.length)

const attrs = ['标准产品', '定制产品', '标准零部件', '定制零部件']
const specs = ['50*30', 'ISG50-160', '80-65-200', 'DN100', 'QJ200-40', '65-160A', '32-25']
const workCenters = ['默认工厂', '机械中心', '机加车间']

/** 与其它演示单据对齐的稳定主数据条数（prod-00001 ~ prod-00008 / CP2610001 ~） */
const STABLE_DEMO_COUNT = 8

function createProduct(index, overrides = {}) {
  const cat = leafCats[index % leafCats.length]
  const parent = cat.parentKey ? flatCats.find((c) => c.key === cat.parentKey) : null
  const created = dayjs('2025-11-14').add(index % 200, 'day')
  const updated = dayjs('2026-05-01').add(index % 30, 'day')
  const baseName = pumpProductNames[index % pumpProductNames.length]
  const supplyForm = ['自制件', '外购件', '外协件', '组装', '其他'][index % 5]

  return {
    id: `prod-${String(index + 1).padStart(5, '0')}`,
    code: `CP${dayjs('2026-01-01').format('YY')}${String(10001 + index).slice(-5)}`,
    name: index > pumpProductNames.length - 1 ? `${baseName}（${index + 1}）` : baseName,
    barcodeType: barcodeTypesCycle[index % barcodeTypesCycle.length],
    productAttribute: attrs[index % attrs.length],
    categoryKey: cat.key,
    parentCategoryKey: cat.parentKey || cat.key,
    categoryCode: cat.code,
    categoryName: parent ? parent.title : cat.title,
    specModel: specs[index % specs.length],
    material: index % 4 === 0 ? '钢' : '',
    drawingNo: index % 3 === 0 ? `TZ-${1000 + index}` : '',
    techParams: index % 5 === 0 ? 'Q=50m³/h H=32m' : '',
    weight: index % 5 === 0 ? 12.5 : 0,
    inventoryUnit: ['个', '件', '台'][index % 3],
    standardSpec: index % 3 === 0 ? '国标' : '',
    unitPrice: [0, 98.68, 666.66, 569.63][index % 4],
    canSell: true,
    isWholeMachine: index % 3 !== 0,
    isPart: index % 3 === 0,
    canPurchase: index % 3 === 0,
    canOutsource: index % 4 === 0,
    isProductMaterial: true,
    materialType: ['零部件', '半成品', '虚拟件'][index % 3],
    supplyForm,
    materialCategoryKey: cat.key,
    matchingRequirements: '',
    outputTaxRate: 13,
    inputTaxRate: 13,
    remark: '',
    expiryAlertEnabled: index % 7 === 0,
    production: {
      planStrategy: 'mto',
      replenishQty: undefined,
      defaultWorkCenter: workCenters[index % workCenters.length],
      standardCycleDays: index % 10,
      defaultProcessRoute: index % 2 === 0 ? '机加标准路线' : undefined,
      defaultSupplier:
        supplyForm === '外购件' || supplyForm === '外协件'
          ? supplierOptions[index % supplierOptions.length].value
          : undefined,
      defaultWarehouse: '半成品仓',
    },
    stockQty: undefined,
    alert: {
      stockAlertEnabled: index % 5 === 0,
      maxStockQty: index % 5 === 0 ? 200 : undefined,
      minStockQty: index % 5 === 0 ? 20 : undefined,
      expiryAlertEnabled: index % 7 === 0,
      defectRateThreshold: undefined,
      attachments: [],
    },
    createdAt: created.format('YYYY-MM-DD'),
    updatedAt: updated.format('YYYY-MM-DD'),
    ...overrides,
  }
}

/** 少量单规格成品 + 稳定演示编码；族下 SKU 由 spuBootstrap 生成 */
export const mockProducts = applyLaborConfigSeed(
  migrateProductList([
    ...Array.from({ length: STABLE_DEMO_COUNT }, (_, i) =>
      i === 0
        ? createProduct(0, {
            stockQty: 8,
            production: {
              planStrategy: 'mts',
              replenishQty: 20,
              defaultWorkCenter: workCenters[0],
              standardCycleDays: 0,
              defaultProcessRoute: '机加标准路线',
              defaultWarehouse: '成品仓',
            },
            alert: {
              stockAlertEnabled: true,
              maxStockQty: 50,
              minStockQty: 10,
              expiryAlertEnabled: false,
              defectRateThreshold: undefined,
              attachments: [],
            },
          })
        : createProduct(i),
    ),
    createProduct(8, {
      name: '隔膜计量泵 JMX-A',
      code: 'CP2610009',
      id: 'prod-00009',
      specModel: 'JMX-A/50',
      material: '不锈钢',
      productAttribute: '标准产品',
      isWholeMachine: true,
      isPart: false,
      unitPrice: 4280,
      categoryKey: 'pcat-008',
      categoryName: '清水泵',
      parentCategoryKey: 'pcat-008',
    }),
    createProduct(9, {
      name: '磁力驱动泵 CQ32-25',
      code: 'CP2610010',
      id: 'prod-00010',
      specModel: 'CQ32-25-145',
      material: '不锈钢',
      productAttribute: '标准产品',
      isWholeMachine: true,
      isPart: false,
      unitPrice: 3560,
      categoryKey: 'pcat-004',
      categoryName: '离心泵',
      parentCategoryKey: 'pcat-004',
    }),
  ]),
  { force: true },
)

export function getCategoryFilterKeys(selectedKey) {
  if (!selectedKey) return null
  const node = flatCats.find((c) => c.key === selectedKey)
  if (!node) return [selectedKey]
  if (node.children?.length) {
    return [node.key, ...node.children.map((c) => c.key)]
  }
  return [node.key, node.parentKey].filter(Boolean)
}

export function filterProducts(list, filters, selectedCategoryKey) {
  const categoryKeys = getCategoryFilterKeys(selectedCategoryKey)

  return list.filter((item) => {
    if (categoryKeys?.length) {
      const match =
        categoryKeys.includes(item.categoryKey) || categoryKeys.includes(item.parentCategoryKey)
      if (!match) return false
    }
    if (filters.code && !item.code.includes(filters.code)) return false
    if (filters.name && !item.name.includes(filters.name)) return false
    if (filters.barcodeType && item.barcodeType !== filters.barcodeType) return false
    if (filters.categoryKey && item.categoryKey !== filters.categoryKey) return false
    if (filters.specModel && !item.specModel.includes(filters.specModel)) return false
    if (filters.material && !(item.material || '').includes(filters.material)) return false
    if (filters.drawingNo && !(item.drawingNo || '').includes(filters.drawingNo)) return false
    if (
      filters.businessType &&
      !matchesBusinessTypeFilter(item, filters.businessType, PRODUCT_BUSINESS_TYPE_OPTIONS)
    ) {
      return false
    }
    if (filters.workCenter && item.production?.defaultWorkCenter !== filters.workCenter) {
      return false
    }
    return true
  })
}

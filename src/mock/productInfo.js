import dayjs from 'dayjs'
import { productCategoryTree, flattenCategoryNodes } from '@/mock/productCategories'
import { pumpProductNames, barcodeTypesCycle } from '@/mock/pumpIndustryNames'
import { migrateProductList } from '@/utils/masterDataMigrate'

const flatCats = flattenCategoryNodes(productCategoryTree)
const leafCats = flatCats.filter((c) => !c.children?.length)

const attrs = ['标准产品', '定制产品', '标准-成品零部件', '定制-成品零部件']
const specs = ['50*30', 'ISG50-160', '80-65-200', 'DN100', 'QJ200-40', '65-160A', '32-25']
const workCenters = ['默认工厂', '机械中心', '机加车间']

function createProduct(index) {
  const cat = leafCats[index % leafCats.length]
  const parent = cat.parentKey ? flatCats.find((c) => c.key === cat.parentKey) : null
  const created = dayjs('2025-11-14').add(index % 200, 'day')
  const updated = dayjs('2026-05-01').add(index % 30, 'day')
  const baseName = pumpProductNames[index % pumpProductNames.length]

  return {
    id: `prod-${String(index + 1).padStart(5, '0')}`,
    code: `CP${dayjs().format('YY')}${String(10001 + index).slice(-5)}`,
    name: index > pumpProductNames.length - 1 ? `${baseName}（${index + 1}）` : baseName,
    barcodeType: barcodeTypesCycle[index % barcodeTypesCycle.length],
    productAttribute: attrs[index % attrs.length],
    categoryKey: cat.key,
    parentCategoryKey: cat.parentKey || cat.key,
    categoryCode: cat.code,
    categoryName: parent ? parent.title : cat.title,
    specModel: specs[index % specs.length],
    material: index % 4 === 0 ? '钢' : '',
    weight: index % 5 === 0 ? 12.5 : 0,
    inventoryUnit: ['个', '件', '台'][index % 3],
    standardSpec: index % 3 === 0 ? '国标' : '',
    unitPrice: [0, 98.68, 666.66, 569.63][index % 4],
    isProductMaterial: true,
    materialType: ['零部件', '半成品', '虚拟件'][index % 3],
    supplyForm: ['自制件', '外购件', '组装', '其他'][index % 4],
    materialCategoryKey: cat.key,
    remark: '',
    expiryAlertEnabled: index % 7 === 0,
    production: {
      defaultWorkCenter: workCenters[index % workCenters.length],
      standardCycleDays: index % 10,
      defaultProcessRoute: index % 2 === 0 ? '机加标准路线' : undefined,
      defaultSupplier: undefined,
      defaultWarehouse: '半成品仓',
    },
    alert: {
      stockAlertEnabled: false,
      expiryAlertEnabled: index % 7 === 0,
      defectRateThreshold: undefined,
      attachments: [],
    },
    laborEnabled: false,
    laborRows: [],
    createdAt: created.format('YYYY-MM-DD'),
    updatedAt: updated.format('YYYY-MM-DD'),
  }
}

export const mockProducts = migrateProductList(
  Array.from({ length: 793 }, (_, i) => createProduct(i)),
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
        categoryKeys.includes(item.categoryKey) ||
        categoryKeys.includes(item.parentCategoryKey)
      if (!match) return false
    }
    if (filters.code && !item.code.includes(filters.code)) return false
    if (filters.name && !item.name.includes(filters.name)) return false
    if (filters.barcodeType && item.barcodeType !== filters.barcodeType) return false
    if (filters.categoryKey && item.categoryKey !== filters.categoryKey) return false
    if (filters.specModel && !item.specModel.includes(filters.specModel)) return false
    return true
  })
}

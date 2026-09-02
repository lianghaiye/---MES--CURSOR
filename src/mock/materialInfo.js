import { materialCategoryTree, flattenCategoryNodes } from '@/mock/materialCategories'
import { bomTemplateMaterials } from '@/mock/bomTemplateMaterials'
import { pumpMaterialNames, barcodeTypesCycle } from '@/mock/pumpIndustryNames'
import { linkProductMaterialRows, migrateMaterialList } from '@/utils/masterDataMigrate'
import { buildMaterialFromProduct } from '@/utils/productMaterialMap'
import { mockProducts } from '@/mock/productInfo'
import { applyLaborConfigSeed } from '@/mock/laborConfigSeed'
import { laborDemoBomMaterials } from '@/mock/laborHourDemoSeed'
import { createDemoDualUnitMaterials } from '@/mock/stockBatchSeed'
import { createOneItemOneCodeDemoMaterials } from '@/mock/oneItemOneCodeInventoryDemoSeed'
import {
  matchesBusinessTypeFilter,
  MATERIAL_BUSINESS_TYPE_OPTIONS,
} from '@/utils/businessTypeLabel'

const flatCats = flattenCategoryNodes(materialCategoryTree)
const leafCats = flatCats.filter((c) => !c.children?.length)

const specs = ['HT250', '304', 'GHMB-35', '38CrMoAl', '45#', '316L', 'DN80', 'M16']
const materialTypes = ['零部件', '标准件', '原材料', '毛胚', '半成品', '虚拟件']
const supplyForms = ['外协件', '外购件', '自制件', '组装', '其他']
const categoryLabels = ['部件', '离心泵', '电脑', '叶轮', '托架', '电机', '标准件', '零件']

function createMaterial(index) {
  const cat = leafCats[index % leafCats.length]
  const parentCat = cat.parentKey ? flatCats.find((c) => c.key === cat.parentKey) : null
  const categoryName = parentCat ? `${parentCat.title}` : cat.title

  return {
    id: `mat-${String(index + 1).padStart(4, '0')}`,
    code: `WL${String(100001 + index).slice(-6)}`,
    name:
      index > pumpMaterialNames.length - 1
        ? `${pumpMaterialNames[index % pumpMaterialNames.length]}-${index + 1}`
        : pumpMaterialNames[index % pumpMaterialNames.length],
    barcodeType: barcodeTypesCycle[index % barcodeTypesCycle.length],
    materialType: materialTypes[index % materialTypes.length],
    supplyForm: supplyForms[index % supplyForms.length],
    categoryKey: cat.key,
    parentCategoryKey: cat.parentKey || cat.key,
    categoryCode: cat.code,
    categoryName: categoryLabels[index % categoryLabels.length] || categoryName,
    specModel: specs[index % specs.length],
    material: index % 3 === 0 ? '钢' : '',
    techParams: index % 6 === 0 ? 'φ25×180mm' : '',
    inventoryUnit: ['个', '件', '套'][index % 3],
    unitPrice: [0, 98.68, 666.66, 569.63, 0][index % 5],
    requisitionAttr: index % 4 === 0 ? 0 : '',
    canSell: index % 5 === 0,
    canProduce: true,
    canPurchase: index % 2 === 0,
    canOutsource: index % 3 === 0,
    isProductMaterial: index % 5 === 0,
    matchingRequirements: '',
    outputTaxRate: 13,
    inputTaxRate: 13,
    remark: '',
    createdAt: '2026-05-20',
  }
}

/** 倒冲演示料：领料属性关闭，完工走库存扣减 */
function createDemoBackflushMaterials() {
  return [
    {
      id: 'mat-std-bolt-m12',
      code: 'MAT-STD-100',
      name: '标准螺栓组',
      barcodeType: '一类一码',
      materialType: '标准件',
      supplyForm: '外购件',
      categoryKey: 'cat-std',
      parentCategoryKey: 'cat-std',
      categoryCode: 'STD',
      categoryName: '标准件',
      specModel: 'M12×40',
      material: '钢',
      techParams: '8.8 级；1 盒=100 个',
      inventoryUnit: '个',
      stockUnit: '个',
      purchaseUnit: '盒',
      packageContent: 100,
      auxUnits: [
        {
          id: 'aux-bolt-purchase',
          unit: '盒',
          convertType: 'fixed',
          rate: 100,
          allowDecimal: false,
          roles: ['purchase'],
          enabled: true,
        },
      ],
      unitPrice: 0.35,
      requisitionAttr: 0,
      requisitionEnabled: false,
      canSell: false,
      canProduce: false,
      canPurchase: true,
      canOutsource: false,
      isProductMaterial: false,
      matchingRequirements: '',
      outputTaxRate: 13,
      inputTaxRate: 13,
      remark: '易耗倒冲件：领料属性关，完工按个倒冲',
      createdAt: '2026-07-01',
    },
    {
      id: 'mat-std-washer-m12',
      code: 'MAT-STD-WASHER',
      name: '平垫圈 M12',
      barcodeType: '一类一码',
      materialType: '标准件',
      supplyForm: '外购件',
      categoryKey: 'cat-std',
      parentCategoryKey: 'cat-std',
      categoryCode: 'STD',
      categoryName: '标准件',
      specModel: 'M12',
      material: '钢',
      techParams: '镀锌',
      inventoryUnit: '个',
      stockUnit: '个',
      purchaseUnit: '盒',
      packageContent: 200,
      auxUnits: [
        {
          id: 'aux-washer-purchase',
          unit: '盒',
          convertType: 'fixed',
          rate: 200,
          allowDecimal: false,
          roles: ['purchase'],
          enabled: true,
        },
      ],
      unitPrice: 0.08,
      requisitionAttr: 0,
      requisitionEnabled: false,
      canSell: false,
      canProduce: false,
      canPurchase: true,
      canOutsource: false,
      isProductMaterial: false,
      matchingRequirements: '',
      outputTaxRate: 13,
      inputTaxRate: 13,
      remark: '易耗倒冲件：领料属性关',
      createdAt: '2026-07-01',
    },
  ]
}

const rawMockMaterials = [
  ...createDemoDualUnitMaterials(),
  ...createOneItemOneCodeDemoMaterials(),
  ...createDemoBackflushMaterials(),
  ...laborDemoBomMaterials,
  ...bomTemplateMaterials,
  ...Array.from({ length: 24 }, (_, i) => createMaterial(i)),
]

export const mockMaterials = applyLaborConfigSeed(
  migrateMaterialList(
    linkProductMaterialRows(
      JSON.parse(JSON.stringify(mockProducts)),
      migrateMaterialList(rawMockMaterials),
      buildMaterialFromProduct,
    ),
  ),
  { force: true },
)

export function filterMaterials(list, filters, selectedCategoryKey) {
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
      !matchesBusinessTypeFilter(item, filters.businessType, MATERIAL_BUSINESS_TYPE_OPTIONS)
    ) {
      return false
    }
    if (filters.workCenter && item.production?.defaultWorkCenter !== filters.workCenter) {
      return false
    }
    return true
  })
}

export function getCategoryFilterKeys(selectedKey) {
  if (!selectedKey) return null
  const node = flatCats.find((c) => c.key === selectedKey)
  if (!node) return [selectedKey]
  if (node.children?.length) {
    return [node.key, ...node.children.map((c) => c.key)]
  }
  return [node.key, node.parentKey].filter(Boolean)
}

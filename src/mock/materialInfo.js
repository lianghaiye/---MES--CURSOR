import { materialCategoryTree, flattenCategoryNodes } from '@/mock/materialCategories'
import { pumpMaterialNames, barcodeTypesCycle } from '@/mock/pumpIndustryNames'

const flatCats = flattenCategoryNodes(materialCategoryTree)
const leafCats = flatCats.filter((c) => !c.children?.length)

const specs = ['HT250', '304', 'GHMB-35', '38CrMoAl', '45#', '316L', 'DN80', 'M16']
const materialTypes = ['零部件', '标准件', '原材料']
const supplyForms = ['外购件', '自制件', '外协件']
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
    inventoryUnit: ['个', '件', '套'][index % 3],
    unitPrice: [0, 98.68, 666.66, 569.63, 0][index % 5],
    requisitionAttr: index % 4 === 0 ? 0 : '',
    isProductMaterial: index % 5 === 0,
    remark: '',
    createdAt: '2026-05-20',
  }
}

export const mockMaterials = Array.from({ length: 194 }, (_, i) => createMaterial(i))

export function filterMaterials(list, filters, selectedCategoryKey) {
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

export function getCategoryFilterKeys(selectedKey) {
  if (!selectedKey) return null
  const node = flatCats.find((c) => c.key === selectedKey)
  if (!node) return [selectedKey]
  if (node.children?.length) {
    return [node.key, ...node.children.map((c) => c.key)]
  }
  return [node.key, node.parentKey].filter(Boolean)
}

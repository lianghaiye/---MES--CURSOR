import dayjs from 'dayjs'
import { SPU_BOM_STRATEGY, PRODUCT_SKU_CODE_PATTERN, DEFAULT_VARIANT_AXES } from '@/constants/spu'
import { materialCategoryTree } from '@/mock/materialCategories'

function buildSeedVariantAxes({ specs = [], grades = [] } = {}) {
  const axes = JSON.parse(JSON.stringify(DEFAULT_VARIANT_AXES))
  const specAxis = axes.find((a) => a.key === 'specModel')
  const materialAxis = axes.find((a) => a.key === 'material')
  if (specAxis) {
    specAxis.enumValues = specs.map((name) => ({
      name,
      code:
        String(name)
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 12) || name,
    }))
  }
  if (materialAxis) {
    materialAxis.enumValues = grades.map((g) => ({
      name: g.name,
      code: g.code || g.name,
      materialGradeId: g.id || '',
      description: g.description || '',
    }))
  }
  return axes
}

/**
 * 产品族种子（少量）：
 * - ISG 管道泵 / QJ 潜水电泵：可销售产品物料族 + SKU
 * - 叶轮：物料族（模板 BOM 演示）
 */
export function buildMockSpus() {
  const now = dayjs().format('YYYY-MM-DD')
  const isgAxes = buildSeedVariantAxes({
    specs: ['50-160', '65-160'],
    grades: [
      { id: 'mg-1', name: '铸铁', code: 'ZT', description: '灰铸铁件常用材质' },
      { id: 'mg-2', name: '不锈钢', code: 'BXG', description: '304/316 等不锈钢材质' },
    ],
  })
  const qjAxes = buildSeedVariantAxes({
    specs: ['QJ200-40', 'QJ200-80'],
    grades: [{ id: 'mg-1', name: '铸铁', code: 'ZT', description: '灰铸铁件常用材质' }],
  })
  const impellerAxes = buildSeedVariantAxes({
    specs: ['HT250', '304', '316L'],
    grades: [
      { id: 'mg-1', name: '铸铁', code: 'ZT', description: '灰铸铁件常用材质' },
      { id: 'mg-2', name: '不锈钢', code: 'BXG', description: '304/316 等不锈钢材质' },
    ],
  })

  return [
    {
      id: 'spu-isg-001',
      code: 'F0001',
      name: 'ISG管道离心泵',
      categoryKey: 'pcat-004',
      parentCategoryKey: 'pcat-004',
      categoryName: '离心泵',
      categoryTreeMode: 'product',
      itemKind: 'productMaterial',
      canSell: true,
      canProduce: true,
      canPurchase: false,
      canOutsource: false,
      variantAxes: isgAxes,
      skuCodePattern: PRODUCT_SKU_CODE_PATTERN,
      enabledCombinations: [],
      bomStrategy: SPU_BOM_STRATEGY.INDEPENDENT,
      baseBomId: '',
      mixedBomRules: null,
      sharedFields: {
        techParams: '立式管道离心泵，适用于暖通/给水',
        productAttribute: '标准产品',
        inventoryUnit: '台',
        categoryKey: 'pcat-004',
        parentCategoryKey: 'pcat-004',
        categoryName: '离心泵',
        materialType: '半成品',
        supplyForm: '自制件',
        isWholeMachine: true,
        isPart: false,
        production: {
          defaultWorkCenter: '默认工厂',
          defaultWarehouse: '成品仓',
        },
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'spu-qj-001',
      code: 'F0002',
      name: 'QJ潜水电泵',
      categoryKey: 'pcat-008',
      parentCategoryKey: 'pcat-008',
      categoryName: '清水泵',
      categoryTreeMode: 'product',
      itemKind: 'productMaterial',
      canSell: true,
      canProduce: true,
      canPurchase: false,
      canOutsource: false,
      variantAxes: qjAxes,
      skuCodePattern: PRODUCT_SKU_CODE_PATTERN,
      enabledCombinations: [],
      bomStrategy: SPU_BOM_STRATEGY.INDEPENDENT,
      baseBomId: '',
      mixedBomRules: null,
      sharedFields: {
        techParams: '井用潜水电泵',
        productAttribute: '标准产品',
        inventoryUnit: '台',
        categoryKey: 'pcat-008',
        parentCategoryKey: 'pcat-008',
        categoryName: '清水泵',
        materialType: '半成品',
        supplyForm: '自制件',
        isWholeMachine: true,
        isPart: false,
        production: {
          defaultWorkCenter: '默认工厂',
          defaultWarehouse: '成品仓',
        },
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'spu-impeller-001',
      code: 'F0003',
      name: '叶轮',
      categoryKey: 'cat-004-001',
      parentCategoryKey: 'cat-004',
      categoryName: '部件',
      categoryTreeMode: 'material',
      itemKind: 'material',
      canSell: false,
      canProduce: true,
      canPurchase: true,
      canOutsource: false,
      variantAxes: impellerAxes,
      skuCodePattern: PRODUCT_SKU_CODE_PATTERN,
      enabledCombinations: [],
      bomStrategy: SPU_BOM_STRATEGY.INHERIT,
      baseBomId: 'bom-spu-impeller-template',
      mixedBomRules: null,
      sharedFields: {
        techParams: '离心泵闭式叶轮',
        materialType: '零部件',
        supplyForm: '自制件',
        inventoryUnit: '件',
        categoryKey: 'cat-004-001',
        parentCategoryKey: 'cat-004',
        categoryName: '部件',
      },
      createdAt: now,
      updatedAt: now,
    },
  ]
}

/** ISG 族 SKU 变体（4 条） */
export const ISG_VARIANT_SEED = [
  { specModel: '50-160', material: '铸铁', materialGradeId: 'mg-1' },
  { specModel: '50-160', material: '不锈钢', materialGradeId: 'mg-2' },
  { specModel: '65-160', material: '铸铁', materialGradeId: 'mg-1' },
  { specModel: '65-160', material: '不锈钢', materialGradeId: 'mg-2' },
]

/** QJ 族 SKU 变体（2 条） */
export const QJ_VARIANT_SEED = [
  { specModel: 'QJ200-40', material: '铸铁', materialGradeId: 'mg-1' },
  { specModel: 'QJ200-80', material: '铸铁', materialGradeId: 'mg-1' },
]

/** 叶轮族 SKU 变体（3 条） */
export const IMPELLER_VARIANT_SEED = [
  { specModel: 'HT250', material: '铸铁', materialGradeId: 'mg-1' },
  { specModel: '304', material: '不锈钢', materialGradeId: 'mg-2' },
  { specModel: '316L', material: '不锈钢', materialGradeId: 'mg-2' },
]

export function findImpellerCategoryKey() {
  const flat = []
  const walk = (nodes) => {
    nodes.forEach((n) => {
      flat.push(n)
      if (n.children) walk(n.children)
    })
  }
  walk(materialCategoryTree)
  return flat.find((n) => n.title === '叶轮')?.key || 'cat-004-001'
}

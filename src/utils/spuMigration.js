import { addSpu, spuState, findSpuById } from '@/store/spuStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { updateProduct } from '@/store/productInfoStore'
import { updateMaterial } from '@/store/materialInfoStore'
import { getVariantAxesForCategory } from '@/utils/variantAxisTemplate'
import { SPU_BOM_STRATEGY } from '@/constants/spu'
import { normalizeVariantValues } from '@/utils/spuVariant'
import { resolveMaterialGradeIdByName } from '@/utils/materialGradeResolve'

const SPEC_TOKENS = [
  'HT250',
  'HT200',
  '304',
  '316L',
  'GHMB-35',
  '38CrMoAl',
  '45#',
  'DN80',
  'DN100',
  'M16',
  'ISG50-160',
]

const MATERIAL_PREFIXES = ['铸铁', '不锈钢', '碳钢', '黄铜', '青铜', '铝合金', '钢']

/** 从 SKU 名称启发式提取族名 */
export function extractFamilyNameFromSkuName(name = '') {
  let n = String(name).trim()
  if (!n) return ''
  MATERIAL_PREFIXES.forEach((prefix) => {
    if (n.startsWith(prefix)) n = n.slice(prefix.length).trim()
  })
  SPEC_TOKENS.forEach((token) => {
    n = n.replace(new RegExp(`\\s*${token}\\s*`, 'gi'), ' ').trim()
  })
  return n.replace(/\s+/g, ' ').trim()
}

function groupKey(record) {
  return `${record.categoryKey || ''}::${extractFamilyNameFromSkuName(record.name)}`
}

function buildSpuFromGroup(groupName, records, categoryTreeMode = 'material') {
  const sample = records[0]
  const categoryKey = sample.categoryKey || ''
  const axes = getVariantAxesForCategory(categoryKey, categoryTreeMode)
  return {
    name: groupName,
    categoryKey,
    parentCategoryKey: sample.parentCategoryKey || '',
    categoryName: sample.categoryName || '',
    categoryTreeMode,
    itemKind:
      sample.canSell && sample.canProduce
        ? 'productMaterial'
        : sample.canSell
          ? 'product'
          : 'material',
    canSell: records.some((r) => r.canSell),
    canProduce: records.some((r) => r.canProduce),
    canPurchase: records.some((r) => r.canPurchase),
    canOutsource: records.some((r) => r.canOutsource),
    variantAxes: axes,
    bomStrategy: SPU_BOM_STRATEGY.INDEPENDENT,
    sharedFields: {
      categoryKey,
      parentCategoryKey: sample.parentCategoryKey,
      categoryName: sample.categoryName,
      materialType: sample.materialType,
      supplyForm: sample.supplyForm,
      inventoryUnit: sample.inventoryUnit,
    },
  }
}

/**
 * 自动归族提案（不写入 store，供工作台确认）
 */
export function proposeSpuMigrationGroups() {
  const all = [
    ...productInfoState.products.map((p) => ({ ...p, _source: 'product' })),
    ...materialInfoState.materials
      .filter((m) => !productInfoState.products.some((p) => p.id === m.id))
      .map((m) => ({ ...m, _source: 'material' })),
  ].filter((r) => !r.spuId)

  const groups = new Map()
  all.forEach((record) => {
    const familyName = extractFamilyNameFromSkuName(record.name)
    if (!familyName || familyName.length < 2) return
    const key = groupKey({ ...record, name: familyName })
    if (!groups.has(key)) groups.set(key, { familyName, records: [] })
    groups.get(key).records.push(record)
  })

  return [...groups.values()]
    .filter((g) => g.records.length >= 2)
    .map((g) => ({
      ...g,
      proposedSpu: buildSpuFromGroup(g.familyName, g.records),
      skuPatches: g.records.map((r) => ({
        id: r.id,
        source: r._source,
        name: r.name,
        code: r.code,
        specModel: r.specModel || '',
        material: r.material || '',
        variantValues: normalizeVariantValues({
          specModel: r.specModel || '',
          material: r.material || '',
        }),
        materialGradeId: r.materialGradeId || resolveMaterialGradeIdByName(r.material),
      })),
    }))
}

/** 确认归族：创建 SPU 并回写 SKU */
export function applyMigrationGroup(group) {
  if (!group?.proposedSpu) return { error: '无效归族组' }
  const existing = spuState.spus.find(
    (s) => s.name === group.proposedSpu.name && s.categoryKey === group.proposedSpu.categoryKey,
  )
  const spu = existing || addSpu(group.proposedSpu)

  const linked = []
  const patches = group.skuPatches || []
  patches.forEach((patch) => {
    const id = patch.id
    const variantValues =
      patch.variantValues ||
      normalizeVariantValues({
        specModel: patch.specModel,
        material: patch.material,
      })
    const skuPatch = {
      spuId: spu.id,
      spuName: spu.name,
      isVariantSku: true,
      variantValues,
      materialGradeId: patch.materialGradeId || resolveMaterialGradeIdByName(patch.material),
    }
    if (productInfoState.products.some((p) => p.id === id)) {
      updateProduct(id, skuPatch)
      linked.push({ id, store: 'product' })
    } else if (materialInfoState.materials.some((m) => m.id === id)) {
      updateMaterial(id, skuPatch)
      linked.push({ id, store: 'material' })
    }
  })

  return { spu, linked }
}

/** 链接已知 SPU 到匹配名称的 SKU（种子初始化用） */
export function linkSkusToSpuByName(spuId, nameKeywords = []) {
  const spu = findSpuById(spuId)
  if (!spu) return []
  const linked = []
  const matchName = (name) =>
    nameKeywords.some((kw) => String(name).toLowerCase().includes(String(kw).toLowerCase()))

  const patchRecord = (record, store) => {
    const variantValues = normalizeVariantValues({
      specModel: record.specModel || '',
      material: record.material || '',
    })
    const skuPatch = {
      spuId: spu.id,
      spuName: spu.name,
      isVariantSku: true,
      variantValues,
      materialGradeId: record.materialGradeId || resolveMaterialGradeIdByName(record.material),
    }
    if (store === 'product') updateProduct(record.id, skuPatch)
    else updateMaterial(record.id, skuPatch)
    linked.push(record.id)
  }

  materialInfoState.materials.forEach((m) => {
    if (m.spuId) return
    if (matchName(m.name)) patchRecord(m, 'material')
  })
  productInfoState.products.forEach((p) => {
    if (p.spuId) return
    if (matchName(p.name)) patchRecord(p, 'product')
  })
  return linked
}

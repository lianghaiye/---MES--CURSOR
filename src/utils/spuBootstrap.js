import dayjs from 'dayjs'
import {
  buildMockSpus,
  IMPELLER_VARIANT_SEED,
  ISG_VARIANT_SEED,
  QJ_VARIANT_SEED,
} from '@/mock/spuSeed'
import { spuState } from '@/store/spuStore'
import { productBomState } from '@/store/productBomStore'
import { BOM_STATUS } from '@/mock/productBomOptions'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'
import { createBomLineItem } from '@/mock/bomTemplates'
import { createRootTreeNode } from '@/utils/bomTree'
import { batchGenerateSkus, listSkusForSpu } from '@/utils/spuSkuSave'
import { buildSkuCodeFromPattern } from '@/utils/spuMatrix'
import {
  PRODUCT_SKU_CODE_PATTERN,
  ensureLockedVariantAxes,
  normalizeBomStrategy,
} from '@/constants/spu'

const BOOTSTRAP_KEY = 'i_doms_spu_bootstrap_v'
/** 升版后会重写演示族并重新生成 SKU */
const CURRENT_BOOTSTRAP_VERSION = '2'

function normalizeSeedSpu(record = {}) {
  return {
    id: record.id,
    code: record.code || '',
    name: record.name || '',
    categoryKey: record.categoryKey || '',
    parentCategoryKey: record.parentCategoryKey || '',
    categoryName: record.categoryName || '',
    categoryTreeMode: record.categoryTreeMode || 'material',
    itemKind: record.itemKind || 'material',
    canSell: Boolean(record.canSell),
    canProduce: Boolean(record.canProduce),
    canPurchase: Boolean(record.canPurchase),
    canOutsource: Boolean(record.canOutsource),
    variantAxes: ensureLockedVariantAxes(record.variantAxes || []),
    skuCodePattern: record.skuCodePattern || PRODUCT_SKU_CODE_PATTERN,
    enabledCombinations: record.enabledCombinations || [],
    bomStrategy: normalizeBomStrategy(record.bomStrategy),
    baseBomId: record.baseBomId || '',
    mixedBomRules: null,
    sharedFields: record.sharedFields || {},
    createdAt: record.createdAt || dayjs().format('YYYY-MM-DD'),
    updatedAt: record.updatedAt || dayjs().format('YYYY-MM-DD'),
  }
}

function persistSpus() {
  localStorage.setItem('i_doms_spus_v1', JSON.stringify(spuState.spus))
}

function seedDemoSpus() {
  const seeds = buildMockSpus().map(normalizeSeedSpu)
  const byId = new Map(spuState.spus.map((s) => [String(s.id), s]))
  seeds.forEach((seed) => {
    byId.set(String(seed.id), seed)
  })
  // 清理已被替换的旧演示族（泵轴 / 服务）
  ;['spu-shaft-001', 'spu-service-001'].forEach((id) => byId.delete(id))
  spuState.spus = [...byId.values()]
  persistSpus()
}

function ensureImpellerTemplateBom() {
  const spu = spuState.spus.find((s) => s.id === 'spu-impeller-001')
  if (!spu) return
  const bomId = spu.baseBomId || 'bom-spu-impeller-template'
  if (productBomState.boms.some((b) => b.id === bomId)) return

  const root = createRootTreeNode({
    itemCode: spu.code,
    itemName: spu.name,
    quantity: 1,
  })
  const line = createBomLineItem({
    parentTreeId: root.id,
    treeNodeId: root.id,
    materialCode: spu.code,
    itemName: spu.name,
    specModel: '—',
    categoryName: spu.categoryName || '部件',
    materialType: '零部件',
    supplyForm: '自制件',
    unitQty: 1,
  })
  const ts = dayjs().format('YYYY-MM-DD HH:mm')
  const year = getBomVersionYear()
  productBomState.boms.unshift({
    id: bomId,
    versionGroupId: 'bom-grp-spu-impeller',
    bomNo: 'BOM-SPU-IMP-001',
    bomName: '叶轮族模板 BOM',
    itemType: 'spu',
    itemId: spu.id,
    itemName: spu.name,
    itemCode: spu.code,
    version: formatBomVersion(year, 1),
    versionYear: year,
    versionSeq: 1,
    status: BOM_STATUS.ACTIVE,
    isDefault: true,
    effectiveAt: ts,
    expiredAt: '',
    operator: 'admin',
    creator: 'admin',
    createdAt: ts,
    updatedAt: ts,
    bomType: '基准BOM',
    treeNodes: [root],
    lineItems: [line],
    seedSource: 'spu-template',
  })
}

function generateSkusWithCodes(spuId, combos = []) {
  const spu = spuState.spus.find((s) => String(s.id) === String(spuId))
  if (!spu) return []
  return batchGenerateSkus(
    spuId,
    combos.map((combo) => {
      const variantValues = {
        specModel: combo.specModel || '',
        material: combo.material || '',
      }
      return {
        ...combo,
        variantValues,
        code: buildSkuCodeFromPattern(spu, variantValues),
      }
    }),
  )
}

export function bootstrapSpuSkuData({ force = false } = {}) {
  const alreadyBootstrapped = localStorage.getItem(BOOTSTRAP_KEY) === CURRENT_BOOTSTRAP_VERSION
  const seedSkuReady =
    listSkusForSpu('spu-isg-001').length > 0 && listSkusForSpu('spu-qj-001').length > 0
  if (!force && alreadyBootstrapped && seedSkuReady) return

  seedDemoSpus()
  generateSkusWithCodes('spu-isg-001', ISG_VARIANT_SEED)
  generateSkusWithCodes('spu-qj-001', QJ_VARIANT_SEED)
  generateSkusWithCodes('spu-impeller-001', IMPELLER_VARIANT_SEED)
  ensureImpellerTemplateBom()

  localStorage.setItem(BOOTSTRAP_KEY, CURRENT_BOOTSTRAP_VERSION)
}

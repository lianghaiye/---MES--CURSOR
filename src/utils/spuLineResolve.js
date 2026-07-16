import { findSpuById } from '@/store/spuStore'
import { listSkusForSpu } from '@/utils/spuSkuSave'
import { getActiveBomForItem } from '@/store/productBomStore'
import { resolveAxisValueOptions } from '@/utils/spuMatrix'
import { variantValuesMatch } from '@/utils/spuVariant'
import { materialGradeState } from '@/store/materialGradeStore'

export function isSpuLine(record = {}) {
  return Boolean(record.spuId && !record.isManualLine)
}

export function listAxisOptions(spuId, axisKey) {
  const spu = findSpuById(spuId)
  if (!spu) return []
  const axis = (spu.variantAxes || []).find((a) => a.key === axisKey)
  return resolveAxisValueOptions(axis, materialGradeState.items).map((o) => ({
    label: o.name,
    value: o.name,
    code: o.code,
    materialGradeId: o.materialGradeId || '',
  }))
}

export function getSpuVariantAxes(spuId) {
  const spu = findSpuById(spuId)
  return spu?.variantAxes || []
}

/**
 * 根据 SPU + 变体值解析 SKU、BOM
 */
export function resolveSkuFromSpu(spuId, variantValues = {}) {
  const spu = findSpuById(spuId)
  if (!spu) return { error: '模板不存在' }

  const sku = listSkusForSpu(spuId).find((s) => variantValuesMatch(s.variantValues, variantValues))
  if (!sku) {
    return { error: '未找到匹配的 SKU，请检查属性组合或先在主数据中生成变体' }
  }

  const bomItemType =
    spu.itemKind === 'material' || (!sku.canSell && sku.canProduce) ? 'material' : 'product'
  const bom = getActiveBomForItem(bomItemType, sku.id)

  return {
    spu,
    sku,
    bom,
    productId: sku.id,
    productCode: sku.code,
    productName: spu.name,
    specModel: sku.specModel || variantValues.specModel || '',
    material: sku.material || variantValues.material || '',
    variantValues: { ...(sku.variantValues || variantValues) },
    materialGradeId: sku.materialGradeId || '',
    bomId: bom?.id || '',
    bomName: bom?.bomName || '',
    bomVersion: bom?.version || '',
  }
}

/** 将 SPU 选择 payload 转为销售行初始数据（未解析 SKU） */
export function createSpuLineDraft(spuPayload) {
  const spu = findSpuById(spuPayload.spuId || spuPayload.id)
  const axes = spu?.variantAxes || spuPayload.variantAxes || []
  const variantValues = {}
  axes.forEach((axis) => {
    variantValues[axis.key] = ''
  })
  return {
    spuId: spu?.id || spuPayload.spuId || '',
    spuName: spu?.name || spuPayload.spuName || spuPayload.name || '',
    productId: '',
    productCode: '',
    productName: spu?.name || spuPayload.name || '',
    variantValues,
    specModel: '',
    material: '',
    isManualLine: false,
    isSpuLine: true,
  }
}

/** 应用解析结果到销售行 */
export function applyResolvedSkuToLine(line, resolved) {
  if (!line || !resolved?.sku) return line
  line.productId = resolved.productId
  line.productCode = resolved.productCode
  line.productName = resolved.productName
  line.spuId = resolved.spu?.id || line.spuId
  line.spuName = resolved.spu?.name || line.spuName
  line.variantValues = { ...resolved.variantValues }
  line.specModel = resolved.specModel
  line.material = resolved.material
  line.materialGradeId = resolved.materialGradeId
  line.bomId = resolved.bomId
  line.bomName = resolved.bomName
  line.bomVersion = resolved.bomVersion
  return line
}

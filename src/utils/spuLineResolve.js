import { findSpuById } from '@/store/spuStore'
import { listSkusForSpu } from '@/utils/spuSkuSave'
import { getActiveBomForItem, getOwnActiveBomForItem } from '@/store/productBomStore'
import { resolveAxisValueOptions } from '@/utils/spuMatrix'
import { variantValuesMatch } from '@/utils/spuVariant'
import { materialGradeState } from '@/store/materialGradeStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { resolveSalesLinePrice } from '@/utils/customerPrice'
import { getCustomerByName } from '@/store/customerStore'
import { getFrameworkContractByNo } from '@/store/frameworkContractStore'
import { BOM_FULFILLMENT_PATH } from '@/constants/salesOrderFulfillment'

/** 显式产品族选品行（可编辑变体轴）；直接选 SKU 即使有 spuId 也不算 */
export function isSpuLine(record = {}) {
  return Boolean(record.isSpuLine && record.spuId && !record.isManualLine)
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

/** 自定义变体轴（不含规格型号/材质） */
export function getCustomVariantAxes(spuId) {
  return getSpuVariantAxes(spuId).filter((a) => a.key !== 'specModel' && a.key !== 'material')
}

export function lineVariantSummary(line = {}) {
  // 变体属性列：仅拼自定义轴取值（规格型号/材质有独立列）
  const axes = getCustomVariantAxes(line.spuId)
  const vv = line.variantValues || {}
  return axes
    .map((a) => vv[a.key])
    .filter((v) => v != null && String(v).trim() !== '')
    .join(' ')
}

export function areRequiredAxesFilled(spuId, variantValues = {}) {
  const axes = getSpuVariantAxes(spuId)
  if (!axes.length) return true
  return axes.every((axis) => {
    if (axis.required === false) return true
    const val = variantValues?.[axis.key]
    return val != null && String(val).trim() !== ''
  })
}

/**
 * 根据 SPU + 变体值解析 SKU、BOM
 */
export function resolveSkuFromSpu(spuId, variantValues = {}) {
  const spu = findSpuById(spuId)
  if (!spu) return { error: '模板不存在' }

  if (!areRequiredAxesFilled(spuId, variantValues)) {
    return { error: '请先选择完整的变体属性' }
  }

  const sku = listSkusForSpu(spuId).find((s) => variantValuesMatch(s.variantValues, variantValues))
  if (!sku) {
    return { error: '未找到匹配的 SKU，请检查属性组合或先在主数据中生成变体' }
  }

  const bomItemType =
    spu.itemKind === 'material' || (!sku.canSell && sku.canProduce) ? 'material' : 'product'
  const bom =
    getActiveBomForItem(bomItemType, sku.id) || getOwnActiveBomForItem(bomItemType, sku.id)

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

/** 将 SPU 选择 payload 转为销售行初始数据（未解析 SKU，仅基本信息） */
export function createSpuLineDraft(spuPayload) {
  const spu = findSpuById(spuPayload.spuId || spuPayload.id)
  const axes = spu?.variantAxes || spuPayload.variantAxes || []
  const variantValues = {}
  axes.forEach((axis) => {
    variantValues[axis.key] = ''
  })
  const shared = spu?.sharedFields || {}
  return {
    spuId: spu?.id || spuPayload.spuId || '',
    spuName: spu?.name || spuPayload.spuName || spuPayload.name || '',
    productId: '',
    productCode: '',
    productName: spu?.name || spuPayload.name || '',
    variantValues,
    variantSummary: '',
    specModel: '',
    material: '',
    category: spu?.categoryName || spuPayload.categoryName || '',
    unit: shared.inventoryUnit || shared.unit || '件',
    drawingNo: shared.drawingNo || '',
    techParams: shared.techParams || '',
    productAttr: shared.productAttribute || '',
    isManualLine: false,
    isSpuLine: true,
  }
}

/** 清除已绑定 SKU（变体未选齐或解析失败时） */
export function clearResolvedSkuFromLine(line) {
  if (!line) return line
  line.productId = ''
  line.productCode = ''
  line.bomId = ''
  line.bomName = ''
  line.bomVersion = ''
  line.listUnitPriceExTax = 0
  line.unitPriceExTax = 0
  line.unitPriceInTax = 0
  line.totalPriceExTax = 0
  line.totalPriceInTax = 0
  line.lineDiscountAmount = 0
  line.variantSummary = lineVariantSummary(line)
  return line
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
  line.isSpuLine = true
  line.variantSummary = lineVariantSummary(line)
  return line
}

function resolveMasterBySkuId(productId) {
  if (!productId) return null
  return (
    productInfoState.products.find((p) => p.id === productId) ||
    materialInfoState.materials.find((m) => m.id === productId) ||
    null
  )
}

/**
 * 变体轴变更后：同步扁平字段 → 解析 SKU → 刷新价格/BOM
 * @returns {{ ok: boolean, message?: string, unresolved?: boolean }}
 */
export function applySalesLineAxisChange(line, axisKey, value, priceContext = {}) {
  if (!line?.spuId) return { ok: false, message: '非产品族明细' }
  if (!line.variantValues || typeof line.variantValues !== 'object') {
    line.variantValues = {}
  }
  line.variantValues = { ...line.variantValues, [axisKey]: value || '' }
  if (axisKey === 'specModel') line.specModel = value || ''
  if (axisKey === 'material') line.material = value || ''
  line.variantSummary = lineVariantSummary(line)

  if (!areRequiredAxesFilled(line.spuId, line.variantValues)) {
    clearResolvedSkuFromLine(line)
    return { ok: true, unresolved: true }
  }

  const resolved = resolveSkuFromSpu(line.spuId, line.variantValues)
  if (resolved.error) {
    clearResolvedSkuFromLine(line)
    return { ok: false, message: resolved.error, unresolved: true }
  }

  applyResolvedSkuToLine(line, resolved)
  return refreshSalesLineFromResolvedSku(line, resolved, priceContext)
}

/**
 * 配置弹层确认后：写入解析结果并刷新价格/BOM
 */
export function applySalesLineResolvedConfig(line, resolved, priceContext = {}) {
  if (!line || !resolved?.sku) {
    return { ok: false, message: '未匹配到 SKU' }
  }
  applyResolvedSkuToLine(line, resolved)
  return refreshSalesLineFromResolvedSku(line, resolved, priceContext)
}

function refreshSalesLineFromResolvedSku(line, resolved, priceContext = {}) {
  const master = resolveMasterBySkuId(resolved.productId)
  if (master) {
    line.drawingNo = master.drawingNo || line.drawingNo || ''
    line.unit = master.inventoryUnit || line.unit || '件'
    line.productAttr = master.productAttribute || line.productAttr || ''
    line.techParams = master.techParams || line.techParams || ''
    line.category = master.categoryName || line.category || ''
  }

  const customer = getCustomerByName(priceContext.customerName)
  const contract = priceContext.contractNo
    ? getFrameworkContractByNo(priceContext.contractNo)
    : null
  const listPrice = master?.unitPrice ?? 0
  const pricing = resolveSalesLinePrice({
    customer,
    contract,
    productId: resolved.productId,
    productCode: resolved.productCode,
    listPriceFromProduct: listPrice,
  })
  line.listUnitPriceExTax = pricing.listUnitPriceExTax
  line.lineDiscountRate = pricing.lineDiscountRate
  line.priceSource = pricing.priceSource
  line.taxRate = master?.outputTaxRate ?? line.taxRate ?? 13
  line.bomFulfillmentPath = resolved.bom
    ? BOM_FULFILLMENT_PATH.USE_CATALOG_BOM
    : BOM_FULFILLMENT_PATH.DESIGN_REQUIRED

  return { ok: true }
}

export function lineDisplayName(line = {}) {
  return line.productName || line.itemName || line.spuName || line.inventoryName || '未命名'
}

/** 已解析到的 SKU id（销售/采购用 productId，出入库用 itemId） */
export function resolvedSkuId(line = {}) {
  return line.productId || line.itemId || ''
}

/** 保存前：产品族行必须已解析到 SKU */
export function validateLinesSkuResolved(lines = []) {
  for (const line of lines) {
    if (!isSpuLine(line)) continue
    const name = lineDisplayName(line)
    if (!areRequiredAxesFilled(line.spuId, line.variantValues || {})) {
      return {
        ok: false,
        message: `明细「${name}」请先选择完整的变体属性`,
      }
    }
    if (!resolvedSkuId(line)) {
      return {
        ok: false,
        message: `明细「${name}」未找到匹配 SKU，请检查变体组合或先在主数据中生成变体`,
      }
    }
  }
  return { ok: true }
}

/** @deprecated 使用 validateLinesSkuResolved */
export function validateSalesLinesSkuResolved(lines = []) {
  return validateLinesSkuResolved(lines)
}

/** 采购申请/采购订单：同步库存别名字段 */
export function applyResolvedSkuToProcurementLine(line, resolved) {
  applyResolvedSkuToLine(line, resolved)
  if (!line) return line
  line.inventoryName = resolved.productName
  line.inventoryCode = resolved.productCode
  return line
}

/** 出入库明细草稿（itemCode / itemName） */
export function createInventorySpuLineDraft(spuPayload) {
  const draft = createSpuLineDraft(spuPayload)
  return {
    ...draft,
    itemId: '',
    itemCode: '',
    itemName: draft.productName,
  }
}

/** 出入库：绑定解析后的 SKU */
export function applyResolvedSkuToInventoryLine(line, resolved) {
  applyResolvedSkuToLine(line, resolved)
  if (!line || !resolved?.sku) return line
  line.itemId = resolved.productId
  line.itemCode = resolved.productCode
  line.itemName = resolved.productName
  line.specAttr = line.specAttr || line.productAttr || ''
  return line
}

/** BOM 明细：绑定解析后的 SKU */
export function applyResolvedSkuToBomLine(line, resolved) {
  applyResolvedSkuToLine(line, resolved)
  if (!line || !resolved?.sku) return line
  line.materialCode = resolved.productCode
  line.itemName = resolved.productName
  if (resolved.bomName) line.childBom = resolved.bomName
  if (resolved.bomVersion) line.childBomVersion = resolved.bomVersion
  const master = resolveMasterBySkuId(resolved.productId)
  if (master) {
    line.categoryName = master.categoryName || line.categoryName || '零件'
    line.materialType = master.materialType || master.productAttribute || line.materialType || ''
    line.supplyForm = master.supplyForm || line.supplyForm || ''
    line.unit = master.inventoryUnit || line.unit || '件'
    line.unitPrice = master.unitPrice ?? line.unitPrice ?? 0
    line.drawingNo = master.drawingNo || line.drawingNo || ''
  }
  return line
}

/**
 * 从产品/物料主数据读取入库质检要求（只读展示用）
 */
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'

function pickInboundQc(record) {
  if (!record) return ''
  const fromProduction = record.production?.inboundQcRequirement
  const fromRoot = record.inboundQcRequirement
  return String(fromProduction || fromRoot || '').trim()
}

/** 按物料/产品编码解析入库质检要求 */
export function resolveInboundQcRequirementByCode(code) {
  const itemCode = String(code || '').trim()
  if (!itemCode) return ''

  const material = (materialInfoState.materials || []).find((m) => m.code === itemCode)
  const fromMaterial = pickInboundQc(material)
  if (fromMaterial) return fromMaterial

  const product = (productInfoState.products || []).find((p) => p.code === itemCode)
  return pickInboundQc(product)
}

/** 采购行展示用：优先行快照，其次主数据 */
export function resolveLineInboundQcRequirement(line = {}) {
  const snapshot = String(line.inboundQcRequirement || '').trim()
  if (snapshot) return snapshot
  const code = line.productCode || line.itemCode || line.materialCode || ''
  return resolveInboundQcRequirementByCode(code) || '—'
}

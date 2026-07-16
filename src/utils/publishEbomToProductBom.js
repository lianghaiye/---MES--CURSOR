import { productInfoState } from '@/store/productInfoStore'
import { enableProductBom, getOwnActiveBomForItem, saveProductBom } from '@/store/productBomStore'
import { resolveBomStructure } from '@/utils/bomImport'

/**
 * 将已定稿 EBOM 可选发布为产品 BOM（待发布 → 审核发布为生效）
 * @returns {{ ok: boolean, message: string, bom?: object }}
 */
export function publishEbomToProductBom(ebom, productId) {
  if (!ebom) return { ok: false, message: 'EBOM 不存在' }
  if (!productId) return { ok: false, message: '未关联产品，无法发布产品 BOM' }

  const product = productInfoState.products.find((p) => p.id === productId)
  if (!product) return { ok: false, message: '产品不存在' }

  const structure = resolveBomStructure(ebom) || ebom
  const active = getOwnActiveBomForItem('product', productId)

  const payload = {
    itemType: 'product',
    itemId: productId,
    itemName: product.name,
    itemCode: product.code,
    bomName: ebom.ebomName || `${product.name} BOM`,
    bomType: '产品BOM',
    specModel: product.specModel || ebom.specModel || '',
    material: product.material || '',
    drawingNo: product.drawingNo || '',
    techParams: product.techParams || '',
    treeNodes: structure.treeNodes || [],
    lineItems: structure.lineItems || [],
    templateRef: structure.templateRef || null,
    columnSettings: structure.columnSettings || ebom.columnSettings || [],
    remark: `来源设计 EBOM ${ebom.ebomNo || ebom.id}`,
  }

  const saveRes = saveProductBom(active?.id || null, payload)
  if (saveRes?.error) return { ok: false, message: saveRes.error }

  const published = enableProductBom(saveRes.record.id)
  if (published?.error) {
    return { ok: false, message: published.error }
  }

  return {
    ok: true,
    message: active
      ? `已发布产品 BOM 新版本 ${published.version}`
      : `已发布产品 BOM ${published.version} 并生效`,
    bom: published,
  }
}

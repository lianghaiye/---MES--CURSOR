import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildMockEcnRecords } from '@/mock/ecnSeed'
import { createLineItem } from '@/mock/salesOrders'
import { isBomArchived } from '@/mock/productBomOptions'
import { ECN_CHANGE_ITEM_TYPE } from '@/constants/ecn'
import { getActiveBomForItem, getBomsForItem, getProductBomById } from '@/store/productBomStore'
import { executeEcnBomVersionUpgrade } from '@/utils/ecnBomExecution'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { buildBomVersionComparePayload } from '@/utils/ebomSnapshotDiff'

/** ECN 升版演示：产品关键词 → 对应 ECN（执行后产生新版 BOM） */
export const ECN_DEMO_SCENARIOS = [
  { keyword: 'ISG50-160', ecnId: 'ecn-009', ecnNo: 'ECN-2024009' },
  { keyword: 'ISW80-65-200', ecnId: 'ecn-003', ecnNo: 'ECN-2024003' },
  { keyword: 'CQ32-25-145', ecnId: 'ecn-008', ecnNo: 'ECN-2024008' },
]

export function findEcnDemoProduct(keyword) {
  return mockProducts.find((product) => product.name.includes(keyword)) || null
}

function isEcnApplied(productId, ecnNo) {
  return getBomsForItem('product', productId).some((bom) => bom.sourceEcnNo === ecnNo)
}

function hasVisibleVersionDiff(productId) {
  const versions = getBomsForItem('product', productId)
  const archived = versions.find(isBomArchived)
  const active = getActiveBomForItem('product', productId)
  if (!archived || !active) return false
  const payload = buildBomVersionComparePayload(archived, active, 1)
  return payload.diff.summary.total > 0
}

/** 基于真实 BOM 行构建可生效的 ECN 变更项 */
function buildDynamicEcnChangeItems(bom, keyword) {
  const lines = bom?.lineItems || []
  const line0 = lines[0]
  const line1 = lines[1]
  if (!line0?.materialCode) return []

  if (keyword === 'ISW80-65-200') {
    return [
      {
        changeType: ECN_CHANGE_ITEM_TYPE.REPLACE,
        origMaterialCode: line0.materialCode,
        newMaterialCode: `${line0.materialCode}-SKF`,
        newMaterialName: line0.itemName || line0.materialName,
        newSpecModel: `${line0.specModel || ''} /SKF`.trim(),
        newMaterial: line0.material || 'GCr15',
        newUnitQty: line0.unitQty ?? 1,
        changeNote: '国产轴承替换为 SKF 进口件，提升运行稳定性',
      },
      line1
        ? {
            changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
            origMaterialCode: line1.materialCode,
            newMaterialCode: line1.materialCode,
            newMaterialName: line1.itemName || line1.materialName,
            newSpecModel: line1.specModel,
            newMaterial: line1.material,
            newUnitQty: (Number(line1.unitQty) || 1) + 1,
            changeNote: '配套进口轴承，单位用量调整',
          }
        : null,
    ].filter(Boolean)
  }

  if (keyword === 'ISG50-160') {
    return [
      {
        changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
        origMaterialCode: line0.materialCode,
        newMaterialCode: line0.materialCode,
        newMaterialName: line0.itemName || line0.materialName,
        newSpecModel: line0.specModel,
        newMaterial: '304 不锈钢',
        newUnitQty: line0.unitQty ?? 1,
        changeNote: '叶轮材质 HT200 升级为 304 不锈钢',
      },
      line1
        ? {
            changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
            origMaterialCode: line1.materialCode,
            newMaterialCode: line1.materialCode,
            newMaterialName: line1.itemName || line1.materialName,
            newSpecModel: line1.specModel,
            newMaterial: '碳化硅/石墨（耐腐型）',
            newUnitQty: line1.unitQty ?? 1,
            changeNote: '配套不锈钢叶轮，密封件升级为耐腐型',
          }
        : null,
    ].filter(Boolean)
  }

  if (keyword === 'CQ32-25-145') {
    return [
      {
        changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
        origMaterialCode: line0.materialCode,
        newMaterialCode: line0.materialCode,
        newMaterialName: line0.itemName || line0.materialName,
        newSpecModel: line0.specModel,
        newMaterial: '316L 不锈钢',
        newUnitQty: line0.unitQty ?? 1,
        changeNote: '耐腐蚀泵叶轮材质升级，满足化工介质要求',
      },
      line1
        ? {
            changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
            origMaterialCode: line1.materialCode,
            newMaterialCode: line1.materialCode,
            newMaterialName: line1.itemName || line1.materialName,
            newSpecModel: `${line1.specModel || ''}（加强型）`.trim(),
            newMaterial: line1.material || 'HT200',
            newUnitQty: line1.unitQty ?? 1,
            changeNote: '泵体结构加强',
          }
        : null,
    ].filter(Boolean)
  }

  return []
}

/** 对已升版但无可见差异的 BOM 直接补打演示变更（修复历史 mock 数据） */
function applyDirectDemoPatchToBom(bom, keyword) {
  const lines = bom?.lineItems
  if (!lines?.length) return

  if (keyword === 'ISW80-65-200') {
    const line0 = lines[0]
    if (line0 && !String(line0.materialCode).endsWith('-SKF')) {
      line0.materialCode = `${line0.materialCode}-SKF`
      line0.specModel = `${line0.specModel || ''} /SKF`.trim()
      line0.remark = [line0.remark, '国产轴承替换为 SKF 进口件'].filter(Boolean).join('；')
    }
    if (lines[1]) {
      lines[1].unitQty = (Number(lines[1].unitQty) || 1) + 1
      lines[1].remark = [lines[1].remark, '配套进口轴承，单位用量调整'].filter(Boolean).join('；')
    }
  } else if (keyword === 'ISG50-160') {
    if (lines[0]) lines[0].material = '304 不锈钢'
    if (lines[1]) lines[1].material = '碳化硅/石墨（耐腐型）'
  } else if (keyword === 'CQ32-25-145') {
    if (lines[0]) lines[0].material = '316L 不锈钢'
    if (lines[1])
      lines[1].specModel = `${lines[1].specModel || ''}（加强型）`.replace(
        /（加强型）（加强型）/,
        '（加强型）',
      )
  }

  bom.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  bom.changeSummary = bom.changeSummary || 'ECN 演示变更（已补全差异数据）'
}

function ensureScenarioDemoDiff({ keyword, ecnId, ecnNo }, ecnRecords) {
  const ecn = ecnRecords.find((row) => row.id === ecnId)
  if (!ecn?.productId) return

  const productId = ecn.productId

  if (!isEcnApplied(productId, ecnNo)) {
    const active = getActiveBomForItem('product', productId)
    if (!active) return

    const changeItems = buildDynamicEcnChangeItems(active, keyword)
    if (!changeItems.length) return

    executeEcnBomVersionUpgrade(
      {
        ...ecn,
        bomId: active.id,
        changeItems,
        status: '已通过',
      },
      ecn.executor || ecn.applicant || '张工',
    )
  }

  if (hasVisibleVersionDiff(productId)) return

  const active = getActiveBomForItem('product', productId)
  if (active) {
    applyDirectDemoPatchToBom(active, keyword)
    return
  }

  const latest = getBomsForItem('product', productId)[0]
  if (latest) applyDirectDemoPatchToBom(latest, keyword)
}

/**
 * 为演示数据执行 ECN BOM 升版（幂等）
 * 需在 salesOrder 种子加载前调用，确保存在「已归档旧版 + 生效新版」且 EBOM 有可见差异
 */
export function ensureEcnDemoBootstrap() {
  const ecnRecords = buildMockEcnRecords()
  ECN_DEMO_SCENARIOS.forEach((scenario) => ensureScenarioDemoDiff(scenario, ecnRecords))
}

/** 构建绑定旧版 BOM / EBOM 快照的销售明细行（用于 ECN 差异演示） */
export function buildEcnBoundLine(product, partial = {}) {
  if (!product) return createLineItem(partial)

  const qty = partial.salesQty ?? partial.qty ?? 1
  const versions = getBomsForItem('product', product.id)
  const archived = versions.find(isBomArchived)
  const boundBom = archived || versions[versions.length - 1]

  if (!boundBom) {
    return createLineItem({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      productAttr: product.productAttribute,
      specModel: product.specModel,
      material: product.material || '',
      ...partial,
      salesQty: qty,
    })
  }

  const resolvedBom = getProductBomById(boundBom.id) || boundBom
  const unitPrice = Number(product.unitPrice) || 100
  const taxRate = partial.taxRate ?? 13
  const totalEx = (partial.unitPriceExTax ?? unitPrice) * qty
  const snapshot = buildEbomSnapshotFromBom(resolvedBom, qty)

  return createLineItem({
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    productAttr: product.productAttribute,
    specAttr: product.standardSpec || '标准',
    specModel: product.specModel,
    material: product.material || '',
    category: product.categoryName || '',
    unit: product.inventoryUnit || '件',
    deliveryDate: partial.deliveryDate || dayjs().add(21, 'day').format('YYYY-MM-DD'),
    taxRate,
    unitPriceExTax: partial.unitPriceExTax ?? unitPrice,
    unitPriceInTax: Number(
      ((partial.unitPriceExTax ?? unitPrice) * (1 + taxRate / 100)).toFixed(2),
    ),
    totalPriceExTax: Number(totalEx.toFixed(2)),
    totalPriceInTax: Number((totalEx * (1 + taxRate / 100)).toFixed(2)),
    bomId: resolvedBom.id,
    bomName: resolvedBom.bomName,
    bomVersion: resolvedBom.version,
    ebomSnapshot: snapshot,
    salesQty: qty,
    ...partial,
  })
}

export function buildEcnDemoSalesOrder() {
  const lines = ECN_DEMO_SCENARIOS.map((scenario, index) => {
    const product = findEcnDemoProduct(scenario.keyword)
    if (!product) return null
    return buildEcnBoundLine(product, {
      id: `line-ecn-demo-${index + 1}`,
      salesQty: [5, 3, 2][index] ?? 1,
      deliveryMode: index === 1 ? '散件' : '整机',
      techParams: `ECN 演示行 · 关联 ${scenario.ecnNo}`,
      supplementDesc: `订单绑定 ${scenario.ecnNo} 执行前的 BOM 版本，可在详情「BOM版本」Tab 查看 EBOM 差异`,
    })
  }).filter(Boolean)

  if (!lines.length) return null

  return {
    id: 'so-seed-ecn-demo',
    orderNo: '1-20260615-021',
    contractNo: 'HT-20260615-021',
    customerName: '山东化工泵业集团',
    region: '华北',
    salesperson: '王芳',
    progressStatus: '已审',
    businessType: '自产销售',
    documentDate: '2026-06-10',
    createdAt: '2026-06-10 09:00',
    creator: '王芳',
    approver: 'admin1',
    approvedAt: '2026-06-10 10:30',
    urgency: '正常',
    contactPerson: '李经理',
    contactPhone: '13800138000',
    remark:
      '【ECN 演示订单】明细行绑定工程变更执行前的 BOM/EBOM 快照；对应产品已通过 ECN 升版，请在「BOM版本」Tab 查看差异对比。',
    lineItems: lines,
  }
}

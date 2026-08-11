/**
 * 发运 BOM 演示：共用附件包，多产品共用（不绑定单一产品）
 */

import dayjs from 'dayjs'
import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'
import { BOM_STATUS } from '@/mock/productBomOptions'
import { BOM_TYPE, SHIP_KIT_ITEM_TYPE } from '@/mock/bomMaterialColumns'
import { mockProducts } from '@/mock/productInfo'

const SHARED_SHIP_BOM_ID = 'bom-ship-shared-demo'
const SHARED_KIT_ID = 'ship-kit-std-demo'

const ATTACHMENT_DEFS = [
  {
    materialCode: 'DOC-MANUAL',
    itemName: '产品说明书',
    specModel: '中文版',
    unit: '册',
    unitQty: 1,
    supplyForm: '外购件',
    materialType: '辅料',
  },
  {
    materialCode: 'DOC-CERT',
    itemName: '合格证',
    specModel: 'A4',
    unit: '份',
    unitQty: 1,
    supplyForm: '外购件',
    materialType: '辅料',
  },
  {
    materialCode: 'TOOL-WRENCH',
    itemName: '专用扳手组',
    specModel: 'M8-M24',
    unit: '套',
    unitQty: 1,
    supplyForm: '外购件',
    materialType: '工具',
  },
  {
    materialCode: 'SPARE-ORING',
    itemName: 'O型密封圈',
    specModel: 'NBR-50',
    unit: '个',
    unitQty: 4,
    supplyForm: '外购件',
    materialType: '备件',
  },
]

function buildSharedShipBom(applicableProductIds) {
  const bomId = SHARED_SHIP_BOM_ID
  const rootId = 'bom-ship-root-shared'
  const root = createBomTreeNode({
    id: rootId,
    parentId: null,
    title: '标准随货附件包（发运）',
    quantity: 1,
    isRoot: true,
    nodeType: 'product',
    lineId: '',
  })
  const treeNodes = [root]
  const lineItems = []

  ATTACHMENT_DEFS.forEach((def, i) => {
    const line = createBomLineItem({
      id: `${bomId}-line-${i + 1}`,
      parentTreeId: rootId,
      treeNodeId: '',
      materialCode: def.materialCode,
      itemName: def.itemName,
      specModel: def.specModel,
      categoryName: '发运附件',
      materialType: def.materialType,
      supplyForm: def.supplyForm,
      unit: def.unit,
      unitQty: def.unitQty,
      unitPrice: 0,
      remark: '共用发运 BOM 演示',
    })
    const node = createBomTreeNode({
      id: `${bomId}-node-${i + 1}`,
      parentId: rootId,
      title: `${def.materialCode} ${def.itemName}`,
      quantity: def.unitQty,
      nodeType: 'material',
      lineId: line.id,
    })
    line.treeNodeId = node.id
    treeNodes.push(node)
    lineItems.push(line)
  })

  const year = getBomVersionYear()
  const ts = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: bomId,
    versionGroupId: `bom-grp-ship-${SHARED_KIT_ID}`,
    bomNo: 'BOM-SHIP-STD',
    bomName: '标准随货附件包',
    itemType: SHIP_KIT_ITEM_TYPE,
    itemId: SHARED_KIT_ID,
    itemName: '标准随货附件包',
    itemCode: 'SHIP-KIT-STD',
    version: formatBomVersion(year, 1),
    versionYear: year,
    versionSub: 1,
    status: BOM_STATUS.ACTIVE,
    isDefault: true,
    effectiveAt: ts,
    expiredAt: '',
    operator: 'admin',
    creator: 'admin',
    createdAt: ts,
    updatedAt: ts,
    remark: '演示：多产品共用发运 BOM，申请发货按适用产品自动带出',
    matchingRequirements: '',
    bomType: BOM_TYPE.SHIP,
    applicableProductIds,
    specModel: '',
    material: '',
    drawingNo: '',
    techParams: '',
    processRoute: '',
    treeNodes,
    lineItems,
    templateRef: null,
    columnSettings: [],
    seedSource: 'ship-bom-demo',
  }
}

export function createShipBomDemoRecords() {
  const products = (mockProducts || []).filter((p) => p?.id && p?.canSell !== false).slice(0, 8)
  const applicableProductIds = products.map((p) => p.id)
  return [buildSharedShipBom(applicableProductIds)]
}

/** 强制刷新演示发运 BOM；移除旧的「一产品一发运BOM」演示 */
export function ensureShipBomDemos(boms) {
  const demos = createShipBomDemoRecords()
  const removeIds = new Set([...demos.map((b) => b.id), 'bom-ship-demo-1', 'bom-ship-demo-2'])
  const rest = (boms || []).filter((b) => !removeIds.has(b.id))
  return [...demos, ...rest]
}

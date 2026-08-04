/**
 * 下料尺寸演示：产品 BOM + 生产工单
 * 打开工单 SCGD20260804088 →「EBOM」「当前BOM」树节点可见「下料 …」
 *
 * 注意：不要 import `@/utils/bomTree` / `ebomSnapshot` / `productBomStore`，
 * 否则会经 spuLineResolve → productBomStore 形成循环依赖，启动时报
 * 「Cannot access 'ROOT_ID' before initialization」白屏。
 */

import dayjs from 'dayjs'
import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'
import { BOM_STATUS } from '@/mock/productBomOptions'
import { applyBlankSizeToLine, BLANK_SIZE_MODE } from '@/utils/bomBlankSize'
import {
  createSteelPipeMaterial,
  createSteelPlateMaterial,
  createSteelWeightBarMaterial,
} from '@/mock/stockBatchSeed'

export const BLANK_SIZE_DEMO = {
  productId: 'prod-blank-size-demo',
  productCode: 'CP-BLANK-DEMO',
  productName: '下料尺寸演示泵体组件',
  bomId: 'bom-blank-size-demo',
  woId: 'wo-blank-size-demo',
  woCode: 'SCGD20260804088',
}

function demoProduct() {
  return {
    id: BLANK_SIZE_DEMO.productId,
    code: BLANK_SIZE_DEMO.productCode,
    name: BLANK_SIZE_DEMO.productName,
    specModel: 'DEMO-BLANK',
    material: '组合',
    drawingNo: 'DWG-BLANK-DEMO',
    inventoryUnit: '台',
    productAttribute: '标准产品',
    canProduce: true,
    canSell: true,
  }
}

/** 本地构造根节点，避免依赖 bomTree（会拉起 spuLineResolve 循环） */
function createDemoRootNode(product) {
  const title = [product.code, product.name, product.specModel].filter(Boolean).join(' ').trim()
  return createBomTreeNode({
    id: 'bom-root-blank-size-demo',
    parentId: null,
    title: `${title}（${product.name} BOM）`.trim(),
    quantity: 1,
    isRoot: true,
    nodeType: 'product',
    lineId: '',
  })
}

function appendDualUnitLine(flatNodes, lineItems, parentTreeId, material, blankPartial, mode) {
  const line = createBomLineItem({
    parentTreeId,
    treeNodeId: '',
    materialCode: material.code,
    itemName: material.name,
    specModel: material.specModel || '',
    categoryName: material.categoryName || '毛坯件',
    materialType: material.materialType || '原材料',
    supplyForm: material.supplyForm || '外购件',
    material: material.material || '',
    drawingNo: material.drawingNo || '',
    unit: material.inventoryUnit || material.stockUnit || '件',
    unitQty: 1,
    unitPrice: material.unitPrice || 0,
    isVariableLength: true,
    uomRelation: material.uomRelation || '',
  })
  applyBlankSizeToLine(line, blankPartial, { mode })

  const node = createBomTreeNode({
    parentId: parentTreeId,
    title: `${material.code} ${material.name}`,
    quantity: 1,
    nodeType: 'material',
    lineId: line.id,
    materialCode: material.code,
  })
  line.treeNodeId = node.id
  flatNodes.push(node)
  lineItems.push(line)
  return line
}

export function createBlankSizeDemoBom() {
  const product = demoProduct()
  const year = getBomVersionYear()
  const version = formatBomVersion(year, 1)
  const root = createDemoRootNode(product)
  const flatNodes = [root]
  const lineItems = []

  appendDualUnitLine(
    flatNodes,
    lineItems,
    root.id,
    createSteelPipeMaterial(),
    { length: 5000, units: { length: 'mm' } },
    BLANK_SIZE_MODE.LENGTH,
  )
  appendDualUnitLine(
    flatNodes,
    lineItems,
    root.id,
    createSteelPlateMaterial(),
    {
      length: 1200,
      width: 1000,
      thickness: 10,
      units: { length: 'mm', width: 'mm', thickness: 'mm' },
    },
    BLANK_SIZE_MODE.PLATE,
  )
  appendDualUnitLine(
    flatNodes,
    lineItems,
    root.id,
    createSteelWeightBarMaterial(),
    { length: 3000, outerDiameter: 40, units: { length: 'mm', outerDiameter: 'mm' } },
    BLANK_SIZE_MODE.LENGTH,
  )

  const ts = dayjs().format('YYYY-MM-DD HH:mm')
  return {
    id: BLANK_SIZE_DEMO.bomId,
    versionGroupId: 'bom-grp-blank-size-demo',
    bomNo: 'BOMBLANK001',
    bomName: `${product.name} BOM`,
    itemType: 'product',
    itemId: product.id,
    itemName: product.name,
    itemCode: product.code,
    version,
    versionYear: year,
    versionSub: 1,
    status: BOM_STATUS.ACTIVE,
    isDefault: true,
    effectiveAt: '2026-08-01 09:00',
    expiredAt: '',
    operator: 'admin',
    creator: 'admin',
    createdAt: '2026-08-01 09:00',
    updatedAt: ts,
    remark: '演示：钢管/钢板/按重圆钢均维护下料尺寸，供工单 EBOM/当前BOM 查看',
    matchingRequirements: '',
    techParams: '下料尺寸演示专用 BOM',
    processRoute: '机加标准路线',
    bomType: '产品BOM',
    specModel: product.specModel,
    material: product.material,
    drawingNo: product.drawingNo,
    seedSource: 'blank-size-demo',
    treeNodes: flatNodes,
    lineItems,
    templateRef: null,
    columnSettings: [],
  }
}

/** 轻量工序，避免 import processRoutes（会拉起 processRouteStore） */
function createDemoProcesses() {
  return [
    { id: 'blank-demo-step-1', index: 1, name: '裁板', processCode: 'OP-CB-01', executors: [] },
    { id: 'blank-demo-step-2', index: 2, name: '机加工', processCode: 'OP-JG-03', executors: [] },
    { id: 'blank-demo-step-3', index: 3, name: '入库', processCode: 'OP-RK-05', executors: [] },
  ]
}

export function createBlankSizeDemoWorkOrder() {
  const bom = createBlankSizeDemoBom()
  return {
    id: BLANK_SIZE_DEMO.woId,
    code: BLANK_SIZE_DEMO.woCode,
    name: `${BLANK_SIZE_DEMO.productName}加工（下料尺寸演示）`,
    productName: BLANK_SIZE_DEMO.productName,
    materialCode: BLANK_SIZE_DEMO.productCode,
    productId: BLANK_SIZE_DEMO.productId,
    orderCategory: '生产工单',
    status: '执行中',
    scheduleQty: 2,
    planQty: 2,
    workCenter: '机加车间',
    bom: bom.bomName,
    bomId: bom.id,
    bomLabel: `${bom.bomName} ${bom.version}`,
    warehouse: '半成品仓',
    urgency: '普通',
    planDateRange: [dayjs().format('YYYY-MM-DD'), dayjs().add(14, 'day').format('YYYY-MM-DD')],
    remark: '打开「EBOM」「当前BOM」可查看钢管/钢板/圆钢行的下料尺寸',
    processRouteName: '机加标准路线',
    source: 'blank-size-demo',
    sourceOrderNo: '1-20260804-BLANK',
    salesLineId: '',
    specModel: 'DEMO-BLANK',
    material: '组合',
    drawingNo: 'DWG-BLANK-DEMO',
    skipEbom: false,
    // 按 bomId 实时展开，避免种子阶段依赖 ebomSnapshot / productBomStore
    ebomSnapshot: null,
    processes: createDemoProcesses(),
    createdAt: dayjs().format('YYYY-MM-DD'),
  }
}

export function ensureBlankSizeDemoBoms(boms) {
  try {
    const list = Array.isArray(boms) ? [...boms] : []
    const demo = createBlankSizeDemoBom()
    const idx = list.findIndex((b) => b.id === demo.id)
    if (idx === -1) list.unshift(demo)
    else list[idx] = { ...list[idx], ...demo, id: demo.id }
    return list
  } catch (e) {
    console.warn('[blankSizeBomDemoSeed] ensureBlankSizeDemoBoms failed', e)
    return Array.isArray(boms) ? boms : []
  }
}

export function ensureBlankSizeDemoWorkOrders(orders) {
  try {
    const list = Array.isArray(orders) ? [...orders] : []
    const demo = createBlankSizeDemoWorkOrder()
    const idx = list.findIndex((o) => o.id === demo.id || o.code === demo.code)
    if (idx === -1) list.unshift(demo)
    else list[idx] = { ...list[idx], ...demo, id: demo.id }
    return list
  } catch (e) {
    console.warn('[blankSizeBomDemoSeed] ensureBlankSizeDemoWorkOrders failed', e)
    return Array.isArray(orders) ? orders : []
  }
}

export function ensureBlankSizeDemoProducts(products) {
  const list = Array.isArray(products) ? [...products] : []
  const demo = demoProduct()
  const idx = list.findIndex((p) => p.id === demo.id || p.code === demo.code)
  if (idx === -1) list.unshift(demo)
  else list[idx] = { ...list[idx], ...demo, id: demo.id }
  return list
}

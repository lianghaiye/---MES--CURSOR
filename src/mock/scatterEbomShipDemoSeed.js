/**
 * 散件发货 + 定稿 EBOM 演示
 *
 * 验证路径：
 * 1. 销售订单搜「1-20260902-SCAT」或备注「散件发货」
 * 2. 详情 → EBOM 信息：应有现行快照（泵体总成可展开）
 * 3. 申请发货 → 仅「散件发运」：点「选择发运物料」勾选 EBOM 行
 */

import dayjs from 'dayjs'
import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { EBOM_STATUS } from '@/constants/ebom'
import { createRootTreeNode } from '@/utils/bomTree'
import { buildEbomSnapshotFromEbomRecord } from '@/utils/ebomSnapshot'

export const SCATTER_EBOM_DEMO = {
  salesOrderId: 'so-scatter-ebom-demo',
  salesOrderNo: '1-20260902-SCAT',
  salesLineId: 'line-scatter-ebom-demo',
  ebomId: 'ebom-scatter-ship-demo',
  ebomNo: 'EBOM-2026-SCAT',
  productCode: 'CP-SCATTER-EBOM-01',
  productName: '立式管道泵（散件发货演示）',
  salesQty: 2,
}

function node(partial) {
  return createBomTreeNode(partial)
}

function line(partial) {
  return createBomLineItem(partial)
}

function addMaterial(flatNodes, lineItems, parentId, spec) {
  const lineRow = line({
    id: spec.lineId,
    parentTreeId: parentId,
    treeNodeId: '',
    materialCode: spec.code,
    itemName: spec.name,
    specModel: spec.spec || '',
    categoryName: spec.category || '零件',
    materialType: spec.materialType || '零部件',
    supplyForm: spec.supplyForm || '外购件',
    material: spec.material || '',
    drawingNo: spec.drawingNo || '',
    unit: spec.unit || '件',
    unitQty: spec.unitQty ?? 1,
    unitPrice: spec.unitPrice || 0,
    remark: spec.remark || '',
  })
  const treeNode = node({
    id: spec.nodeId,
    parentId,
    title: `${spec.code} ${spec.name}`,
    quantity: spec.unitQty ?? 1,
    nodeType: 'material',
    lineId: lineRow.id,
    materialCode: spec.code,
  })
  lineRow.treeNodeId = treeNode.id
  flatNodes.push(treeNode)
  lineItems.push(lineRow)
  return treeNode
}

/** 定稿 EBOM：根下「泵体部件总成」(组装可展开) + 电机/密封/螺栓 */
export function buildScatterEbomRecord() {
  const root = createRootTreeNode({
    itemCode: SCATTER_EBOM_DEMO.productCode,
    itemName: SCATTER_EBOM_DEMO.productName,
    specModel: 'ISG50-160',
    bomName: '散件 EBOM',
  })
  const assembly = node({
    id: 'ebom-scat-n-body',
    parentId: root.id,
    title: '010040001 泵体部件总成',
    quantity: 1,
    nodeType: 'assembly',
    materialCode: '010040001',
  })
  const treeNodes = [root, assembly]
  const lineItems = []

  addMaterial(treeNodes, lineItems, assembly.id, {
    nodeId: 'ebom-scat-n-shell',
    lineId: 'ebom-scat-l-shell',
    code: '010050001',
    name: '泵体（泵壳）',
    spec: 'ISG50-160',
    material: 'HT200',
    supplyForm: '自制件',
    unitQty: 1,
    unitPrice: 280,
    drawingNo: 'DWG-SHELL-50',
  })
  addMaterial(treeNodes, lineItems, assembly.id, {
    nodeId: 'ebom-scat-n-impeller',
    lineId: 'ebom-scat-l-impeller',
    code: '010050008',
    name: '叶轮',
    spec: 'ISG50-160',
    material: 'HT200',
    supplyForm: '自制件',
    unitQty: 1,
    unitPrice: 160,
    drawingNo: 'DWG-IMP-50',
  })
  addMaterial(treeNodes, lineItems, root.id, {
    nodeId: 'ebom-scat-n-motor',
    lineId: 'ebom-scat-l-motor',
    code: 'MAT-MOTOR-4P-3KW',
    name: '电动机 3kW 4P',
    spec: 'YE2-100L2-4',
    supplyForm: '外购件',
    unitQty: 1,
    unitPrice: 980,
  })
  addMaterial(treeNodes, lineItems, root.id, {
    nodeId: 'ebom-scat-n-seal',
    lineId: 'ebom-scat-l-seal',
    code: 'MAT-SEAL-MECH-50',
    name: '机械密封',
    spec: 'φ50',
    supplyForm: '外购件',
    unitQty: 1,
    unitPrice: 85,
  })
  addMaterial(treeNodes, lineItems, root.id, {
    nodeId: 'ebom-scat-n-bolt',
    lineId: 'ebom-scat-l-bolt',
    code: 'MAT-STD-100',
    name: '地脚螺栓组',
    spec: 'M12',
    materialType: '标准件',
    supplyForm: '外购件',
    unitQty: 8,
    unitPrice: 2.5,
    unit: '个',
  })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: SCATTER_EBOM_DEMO.ebomId,
    ebomNo: SCATTER_EBOM_DEMO.ebomNo,
    ebomName: `${SCATTER_EBOM_DEMO.productName} EBOM`,
    bomType: 'EBOM',
    status: EBOM_STATUS.FINALIZED,
    version: 'V1.0',
    designTaskId: '',
    designTaskNo: '',
    productId: '',
    productCode: SCATTER_EBOM_DEMO.productCode,
    productName: SCATTER_EBOM_DEMO.productName,
    productAttr: '成品',
    salesOrderNo: SCATTER_EBOM_DEMO.salesOrderNo,
    customerName: '散件发货验收客户',
    baselineBomId: '',
    baselineBomNo: '',
    baselineBomVersion: '',
    treeNodes,
    lineItems,
    templateRef: { source: 'scatter-ebom-demo' },
    columnSettings: [],
    designer: 'admin1',
    createdAt: '2026-09-01 09:00:00',
    updatedAt: now,
    finalizedAt: '2026-09-01 16:30:00',
  }
}

export function buildScatterEbomShipDemoSalesOrder() {
  const ebom = buildScatterEbomRecord()
  const snapshot = buildEbomSnapshotFromEbomRecord(ebom, SCATTER_EBOM_DEMO.salesQty)
  snapshot.snapshotId = 'ebom-snap-scatter-ship-demo'
  snapshot.bomNo = ebom.ebomNo
  snapshot.bomName = ebom.ebomName
  snapshot.bomVersion = ebom.version

  const qty = SCATTER_EBOM_DEMO.salesQty
  const unitEx = 12800
  const taxRate = 13
  const totalEx = unitEx * qty
  const totalIn = Number((totalEx * (1 + taxRate / 100)).toFixed(2))

  return createSalesOrder({
    id: SCATTER_EBOM_DEMO.salesOrderId,
    orderNo: SCATTER_EBOM_DEMO.salesOrderNo,
    contractNo: 'HT-SCATTER-EBOM',
    customerName: '散件发货验收客户',
    region: '华东',
    salesperson: 'admin1',
    progressStatus: '进行中',
    businessType: '自产销售',
    fulfillmentMethod: '软件零部件发货',
    documentDate: '2026-09-02',
    createdAt: '2026-09-02 09:10',
    creator: 'admin1',
    approver: 'admin1',
    approvedAt: '2026-09-02 09:40',
    approvalRecords: [
      {
        name: 'admin1',
        role: '销售审核',
        result: '已通过',
        time: '2026-09-02 09:40',
        opinion: '散件发货 + 定稿 EBOM 演示单通过',
      },
    ],
    urgency: '正常',
    remark: '【散件+EBOM】已审；明细交付方式=散件；申请发货可勾选 EBOM 物料（泵体总成可展开）',
    inventoryStatus: '充足',
    contactPerson: '验收',
    contactPhone: '13800001111',
    deliveryAddress: '华东验收仓',
    deliveryMethod: '物流',
    lineItems: [
      createLineItem({
        id: SCATTER_EBOM_DEMO.salesLineId,
        productName: SCATTER_EBOM_DEMO.productName,
        productCode: SCATTER_EBOM_DEMO.productCode,
        productAttr: '成品',
        specModel: 'ISG50-160',
        specAttr: '标准',
        material: 'HT200',
        drawingNo: 'DWG-SCAT-PUMP-01',
        category: '离心泵',
        unit: '套',
        salesQty: qty,
        qty,
        shippedQty: 0,
        taxRate,
        unitPriceExTax: unitEx,
        unitPriceInTax: Number((unitEx * (1 + taxRate / 100)).toFixed(2)),
        totalPriceExTax: totalEx,
        totalPriceInTax: totalIn,
        deliveryMode: '散件',
        deliveryDate: dayjs('2026-09-02').add(14, 'day').format('YYYY-MM-DD'),
        bomId: '',
        bomName: ebom.ebomName,
        bomVersion: ebom.version,
        ebomSnapshot: snapshot,
        techParams: 'Q=50m³/h H=32m；客户现场组装，按 EBOM 散件发运',
        matchingRequirements: '含泵体总成、电机、机械密封、地脚螺栓；说明书随密封件发出',
        supplementDesc: '申请发货时展开「泵体部件总成」可按半成品发或拆到泵壳/叶轮',
      }),
    ],
  })
}

/** 注入销售订单：缺失则插入；已有但快照为空则补齐（不覆盖已发货进度） */
export function ensureScatterEbomShipDemoSalesOrders(orders = []) {
  const list = Array.isArray(orders) ? [...orders] : []
  const demo = buildScatterEbomShipDemoSalesOrder()
  const idx = list.findIndex((o) => o.id === SCATTER_EBOM_DEMO.salesOrderId)
  if (idx === -1) {
    list.unshift(demo)
    return list
  }
  const existing = list[idx]
  const line = (existing.lineItems || []).find((l) => l.id === SCATTER_EBOM_DEMO.salesLineId)
  if (!line?.ebomSnapshot?.materials?.length) {
    list[idx] = {
      ...demo,
      shippedQty: existing.shippedQty,
      deliveryStatus: existing.deliveryStatus,
      deliveryApplications: existing.deliveryApplications || [],
      lineItems: demo.lineItems.map((demoLine) => {
        const prev = (existing.lineItems || []).find((l) => l.id === demoLine.id)
        if (!prev) return demoLine
        return {
          ...demoLine,
          shippedQty: prev.shippedQty,
        }
      }),
    }
  }
  return list
}

export function ensureScatterEbomRecord(items = []) {
  const list = Array.isArray(items) ? [...items] : []
  const demo = buildScatterEbomRecord()
  const idx = list.findIndex((e) => e.id === SCATTER_EBOM_DEMO.ebomId)
  if (idx === -1) list.unshift(demo)
  else if (!list[idx]?.lineItems?.length || !list[idx]?.treeNodes?.length) list[idx] = demo
  return list
}

import { buildDisplayMaterialTree } from '@/utils/productionPlanMaterial'

export const PLAN_ORDER_DOC_SEPARATOR = ' — '

function resolveDocStatus(doc) {
  return doc.status || doc.progressLabel || doc.docStatus || '—'
}

export function formatPlanOrderDocumentTitle(docType, docNo, productName, status) {
  return [docType, docNo, productName, status].join(PLAN_ORDER_DOC_SEPARATOR)
}

function createDocumentNode({ docType, docId, docNo, productName, status, raw }) {
  const resolvedStatus = status || '—'
  return {
    key: `doc-${docType}-${docId}`,
    nodeType: 'document',
    docType,
    docId,
    docNo,
    productName,
    status: resolvedStatus,
    title: formatPlanOrderDocumentTitle(docType, docNo, productName, resolvedStatus),
    raw,
    isLeaf: true,
  }
}

function matchesPlanOrderNo(value, planOrderNo) {
  if (!value || !planOrderNo) return false
  return String(value) === String(planOrderNo)
}

function filterProductionWorkOrders(workOrders, planOrderNo, materialCode) {
  return (workOrders || []).filter(
    (wo) =>
      wo.source === 'production-plan' &&
      matchesPlanOrderNo(wo.sourceOrderNo, planOrderNo) &&
      wo.materialCode === materialCode &&
      wo.orderCategory === '生产工单',
  )
}

function filterOutsourceWorkOrders(workOrders, planOrderNo, materialCode) {
  return (workOrders || []).filter(
    (wo) =>
      wo.source === 'production-plan' &&
      matchesPlanOrderNo(wo.sourceOrderNo, planOrderNo) &&
      wo.materialCode === materialCode &&
      wo.orderCategory === '外协工单',
  )
}

function filterPurchaseReqLines(requisitions, planOrderNo, materialCode) {
  const results = []
  ;(requisitions || []).forEach((req) => {
    if (!matchesPlanOrderNo(req.salesOrderNo, planOrderNo)) return
    ;(req.lineItems || []).forEach((line) => {
      if (line.inventoryCode === materialCode) {
        results.push({ req, line })
      }
    })
  })
  return results
}

function filterAssemblyForWorkItem(assemblyWorkOrders, planOrderNo, workItem) {
  return (assemblyWorkOrders || []).filter((asm) => {
    if (
      !matchesPlanOrderNo(asm.sourceOrderNo, planOrderNo) &&
      !matchesPlanOrderNo(asm.salesOrderNo, planOrderNo)
    ) {
      return false
    }
    if (workItem.productCode && asm.productCode === workItem.productCode) return true
    if (workItem.productName && asm.productName === workItem.productName) return true
    return false
  })
}

function appendDocumentNodes(children, context) {
  const { plan, material, workItem, isTopLevel, workOrders, assemblyWorkOrders, purchaseRequisitions } =
    context
  const planOrderNo = plan.orderNo

  filterProductionWorkOrders(workOrders, planOrderNo, material.code).forEach((wo) => {
    children.push(
      createDocumentNode({
        docType: '生产工单',
        docId: wo.id,
        docNo: wo.code,
        productName: wo.productName,
        status: resolveDocStatus(wo),
        raw: wo,
      }),
    )
  })

  filterOutsourceWorkOrders(workOrders, planOrderNo, material.code).forEach((wo) => {
    children.push(
      createDocumentNode({
        docType: '外协工单',
        docId: wo.id,
        docNo: wo.code,
        productName: wo.productName,
        status: resolveDocStatus(wo),
        raw: wo,
      }),
    )
  })

  filterPurchaseReqLines(purchaseRequisitions, planOrderNo, material.code).forEach(({ req, line }) => {
    children.push(
      createDocumentNode({
        docType: '采购申请',
        docId: req.id,
        docNo: req.reqNo,
        productName: line.inventoryName || line.name || material.name,
        status: resolveDocStatus(req),
        raw: { req, line },
      }),
    )
  })

  if (isTopLevel) {
    filterAssemblyForWorkItem(assemblyWorkOrders, planOrderNo, workItem).forEach((asm) => {
      children.push(
        createDocumentNode({
          docType: '总装工单',
          docId: asm.id,
          docNo: asm.code,
          productName: asm.productName,
          status: resolveDocStatus(asm),
          raw: asm,
        }),
      )
    })
  }
}

function buildMaterialNode(material, context) {
  const children = []

  if (material.children?.length) {
    material.children.forEach((child) => {
      children.push(buildMaterialNode(child, { ...context, isTopLevel: false }))
    })
  }

  appendDocumentNodes(children, { ...context, material })

  return {
    key: material.id || `mat-${material.code}`,
    nodeType: 'material',
    materialCode: material.code,
    materialName: material.name,
    supplyType: material.supplyType,
    status: material.status,
    isTopLevel: context.isTopLevel,
    title: material.name,
    children: children.length ? children : undefined,
  }
}

function buildWorkItemNode(workItem, plan, stores) {
  const materialTree = buildDisplayMaterialTree(workItem, plan)
  const topMaterial = materialTree[0]
  const children = topMaterial
    ? [
        buildMaterialNode(topMaterial, {
          plan,
          workItem,
          material: topMaterial,
          isTopLevel: true,
          ...stores,
        }),
      ]
    : []

  return {
    key: `wi-${workItem.id}`,
    nodeType: 'workItem',
    workItemId: workItem.id,
    productName: workItem.productName,
    productCode: workItem.productCode,
    status: workItem.status,
    title: workItem.productName,
    children,
  }
}

/** 构建生产计划「所有工单」Tab 树数据 */
export function buildProductionPlanOrderTree(
  plan,
  { workOrders = [], assemblyWorkOrders = [], purchaseRequisitions = [] } = {},
) {
  if (!plan?.workItems?.length) return []
  const stores = { workOrders, assemblyWorkOrders, purchaseRequisitions }
  return plan.workItems.map((wi) => buildWorkItemNode(wi, plan, stores))
}

/** 收集树全部节点 key，用于默认展开 */
export function collectProductionPlanOrderTreeKeys(treeData = []) {
  const keys = []
  const walk = (nodes) => {
    nodes?.forEach((node) => {
      if (node.key) keys.push(node.key)
      if (node.children?.length) walk(node.children)
    })
  }
  walk(treeData)
  return keys
}

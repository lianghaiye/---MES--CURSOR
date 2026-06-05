import dayjs from 'dayjs'

let nodeSeq = 0
let lineSeq = 0

function nid() {
  nodeSeq += 1
  return `tpl-node-${nodeSeq}`
}
function lid() {
  lineSeq += 1
  return `tpl-line-${lineSeq}`
}

/** 创建一行物料明细 */
export function createBomLineItem(partial = {}) {
  return {
    id: lid(),
    treeNodeId: '',
    parentTreeId: '',
    materialCode: '',
    itemName: '',
    specModel: '',
    categoryName: '零件',
    materialType: '零部件',
    supplyForm: '自制件',
    material: '',
    unitQty: 1,
    unit: '件',
    childBom: '',
    childBomVersion: '',
    processDocName: undefined,
    lossRate: undefined,
    processRoute: undefined,
    unitPrice: 0,
    effectiveStart: '',
    effectiveEnd: '',
    remark: '',
    isKeyPart: false,
    ...partial,
  }
}

/** 创建树节点 */
export function createBomTreeNode(partial = {}) {
  return {
    id: nid(),
    parentId: null,
    title: '',
    quantity: 1,
    isRoot: false,
    isKeyPart: false,
    nodeType: 'material',
    lineId: '',
    children: [],
    ...partial,
  }
}

/** ISG50 离心泵 BOM 模板（不含根节点，用于从模板导入） */
function buildIsg50TemplateChildren() {
  const assemblyPumpBody = createBomTreeNode({
    parentId: '__ROOT__',
    title: '010040001 泵体部件总成',
    quantity: 1,
    nodeType: 'assembly',
    materialCode: '010040001',
  })
  const assemblyPumpHead = createBomTreeNode({
    parentId: '__ROOT__',
    title: '010070014 泵头部件总成',
    quantity: 1,
    nodeType: 'assembly',
    materialCode: '010070014',
  })

  const linePumpBody = createBomLineItem({
    treeNodeId: assemblyPumpBody.id,
    parentTreeId: assemblyPumpBody.id,
    materialCode: '010050001',
    itemName: '泵体（泵壳）',
    specModel: 'ISG50-160',
    material: 'HT200',
    supplyForm: '自制件',
    unitPrice: 280,
    unit: '件',
  })
  const linePumpCover = createBomLineItem({
    treeNodeId: assemblyPumpBody.id,
    parentTreeId: assemblyPumpBody.id,
    materialCode: '010050002',
    itemName: '泵盖',
    specModel: 'ISG50-160',
    material: 'HT200',
    supplyForm: '自制件',
    unitPrice: 120,
    unit: '件',
  })
  const lineImpeller = createBomLineItem({
    treeNodeId: assemblyPumpHead.id,
    parentTreeId: assemblyPumpHead.id,
    materialCode: '010050003',
    itemName: '叶轮',
    specModel: 'ISG50-160',
    materialType: '零部件',
    material: '304',
    supplyForm: '自制件',
    unitPrice: 150,
    unit: '件',
  })
  const lineSeal = createBomLineItem({
    treeNodeId: assemblyPumpHead.id,
    parentTreeId: assemblyPumpHead.id,
    materialCode: '010050004',
    itemName: '机械密封组件',
    specModel: 'φ25×180mm',
    materialType: '标准件',
    material: '碳化硅+氟橡胶',
    supplyForm: '外购件',
    unitPrice: 85,
    unit: '套',
    remark: '防泄漏，适配清水介质',
  })
  const lineShaft = createBomLineItem({
    treeNodeId: assemblyPumpHead.id,
    parentTreeId: assemblyPumpHead.id,
    materialCode: '010050005',
    itemName: '泵轴',
    specModel: 'φ25×180mm',
    material: '45号钢',
    supplyForm: '外购件',
    unitPrice: 35,
    unit: '根',
  })
  const lineBolt = createBomLineItem({
    parentTreeId: '__ROOT__',
    materialCode: '010050006',
    itemName: '地脚螺栓组',
    specModel: 'M16',
    materialType: '标准件',
    supplyForm: '外购件',
    unitPrice: 110,
    unit: '套',
  })

  assemblyPumpBody.lineId = linePumpBody.id
  assemblyPumpHead.lineId = lineImpeller.id

  const treeNodes = [
    { ...assemblyPumpBody, parentId: '__ROOT__' },
    { ...assemblyPumpHead, parentId: '__ROOT__' },
  ]
  const lineItems = [linePumpBody, linePumpCover, lineImpeller, lineSeal, lineShaft, lineBolt]

  return { treeNodes, lineItems }
}

/** 模板元数据：关联已生效 BOM */
export const bomTemplateCatalog = [
  {
    templateKey: 'isg50-standard',
    bomId: 'bom-00001',
    bomNo: 'BOM202605280001',
    bomName: 'ISG50-160单级单吸立式管道离心泵 BOM',
    version: 'V.2026.2',
    effectiveAt: '2026-05-28 14:30',
    itemName: '单级单吸立式管道离心泵',
    buildChildren: buildIsg50TemplateChildren,
  },
]

export function getEffectiveBomTemplates() {
  return bomTemplateCatalog.map((t) => ({
    ...t,
    label: `${t.bomNo} ${t.bomName}（${t.version}）`,
    value: t.templateKey,
  }))
}

export function importTemplateChildren(templateKey) {
  const tpl = bomTemplateCatalog.find((t) => t.templateKey === templateKey)
  if (!tpl?.buildChildren) return null
  const raw = tpl.buildChildren()
  const idMap = new Map()
  const treeNodes = raw.treeNodes.map((n) => {
    const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    idMap.set(n.id, newId)
    return {
      ...n,
      id: newId,
      parentId: n.parentId === '__ROOT__' ? '__ROOT__' : idMap.get(n.parentId) || '__ROOT__',
    }
  })
  const lineItems = raw.lineItems.map((line) => {
    const newLineId = `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const parentTreeId =
      line.parentTreeId === '__ROOT__'
        ? '__ROOT__'
        : idMap.get(line.parentTreeId) || idMap.get(line.treeNodeId) || '__ROOT__'
    const treeNodeId = line.treeNodeId ? idMap.get(line.treeNodeId) || '' : ''
    return {
      ...line,
      id: newLineId,
      treeNodeId,
      parentTreeId,
    }
  })
  return {
    treeNodes,
    lineItems,
    templateRef: {
      bomId: tpl.bomId,
      bomNo: tpl.bomNo,
      version: tpl.version,
      effectiveAt: tpl.effectiveAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    },
  }
}

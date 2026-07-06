import dayjs from 'dayjs'
import { EBOM_STATUS } from '@/constants/ebom'
import { ECN_CHANGE_ITEM_TYPE } from '@/constants/ecn'
import { ebomState } from '@/store/ebomStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import { getProductBomById } from '@/store/productBomStore'
import { findProductMasterByName, resolveProductActiveBom } from '@/utils/workOrderFormHelpers'
import { loadBomDetailStructure, resolveBomStructure } from '@/utils/bomImport'
import { getRootTreeId, getOrderedChildNodeIds, getLinesForTreeNode } from '@/utils/bomTree'
import { assignOverviewIndexes, buildBomOverviewTree } from '@/utils/bomOverview'
import { buildProcessesFromRoute } from '@/mock/processRoutes'
import { resolveMaterialBomMeta } from '@/utils/ecnBomPreview'

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function formatEbomLabel(name, version) {
  const n = String(name || '').trim()
  const v = String(version || '').trim()
  if (!n) return '—'
  return v ? `${n} ${v}` : n
}

function pickEbomForProduct(productName, productId) {
  const pid = productId ? String(productId) : ''
  const pn = normalizeName(productName)
  const list = ebomState.items.filter((row) => {
    if (pid && String(row.productId) === pid) return true
    if (pn && normalizeName(row.productName) === pn) return true
    return false
  })
  const finalized = list.find((row) => row.status === EBOM_STATUS.FINALIZED)
  if (finalized) return { kind: 'ebom', record: finalized }
  if (list[0]) return { kind: 'ebom', record: list[0] }
  return null
}

function resolveBomRecord({ productId, productName, bomId, bomName }) {
  if (bomId) {
    const byId = getProductBomById(bomId)
    if (byId) return byId
  }
  const product = productId
    ? findProductMasterByName(productName) || { id: productId, name: productName }
    : findProductMasterByName(productName)
  if (product?.id) {
    const active = resolveProductActiveBom(product)
    if (active) return active
  }
  if (bomName) {
    const n = normalizeName(bomName)
    const hit = ebomState.items
      .map((e) => e.baselineBomId && getProductBomById(e.baselineBomId))
      .find((b) => b && normalizeName(b.bomName).includes(n))
    if (hit) return hit
  }
  return null
}

function emptyRef() {
  return {
    label: '',
    sourceKind: '',
    sourceId: '',
    flatNodes: [],
    lineItems: [],
    bomRecord: null,
    ebomRecord: null,
  }
}

const ROOT_PLACEHOLDER = '请选择产品/物料'

function normalizeRootLabel(title, fallback = '成品') {
  const t = String(title || '').trim()
  if (!t || t === ROOT_PLACEHOLDER) return fallback
  return t
}

function lookupDrawingNo(line) {
  const code = line.materialCode || line.itemCode || ''
  if (line.drawingNo) return line.drawingNo
  if (!code) return ''
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material?.drawingNo) return material.drawingNo
  const product = productInfoState.products.find((p) => p.code === code)
  return product?.drawingNo || ''
}

function lineToPickerRow(line, level, parentPath) {
  return {
    id: line.id,
    level,
    parentPath,
    levelPath: parentPath,
    materialCode: line.materialCode || line.itemCode || '',
    materialName: line.itemName || line.materialName || line.name || '',
    specModel: line.specModel || '',
    material: line.material || '',
    drawingNo: lookupDrawingNo(line) || '',
    unit: line.unit || '件',
    supplyForm: line.supplyForm || '',
    materialType: line.materialType || '',
    categoryName: line.categoryName || '',
    unitQty: line.unitQty ?? line.qty ?? '',
    processDocName: line.processDocName || '',
  }
}

/** 按 BOM 树层级展开物料行（多级 BOM 带层级与父项路径） */
export function flattenBomLinesForPicker(flatNodes = [], lineItems = [], options = {}) {
  const rootFallback = options.rootLabel || options.productName || '成品'

  if (!flatNodes?.length) {
    return (lineItems || [])
      .filter((line) => String(line.materialCode || line.itemCode || '').trim())
      .map((line) => lineToPickerRow(line, 0, ''))
  }

  const rootId = getRootTreeId(flatNodes)
  const root = flatNodes.find((n) => n.isRoot)
  const result = []

  function walk(nodeId, level, pathParts) {
    const parentPath = pathParts.filter(Boolean).join(' › ')
    const lines = getLinesForTreeNode(lineItems, nodeId, flatNodes)
    lines.forEach((line) => {
      const code = line.materialCode || line.itemCode || ''
      const name = line.itemName || line.materialName || line.name || ''
      if (!code && !name) return
      result.push(lineToPickerRow(line, level, parentPath))
    })

    const parentId = !nodeId || nodeId === rootId ? rootId : nodeId
    getOrderedChildNodeIds(parentId, flatNodes, lineItems).forEach((childId) => {
      const child = flatNodes.find((n) => n.id === childId)
      if (!child) return
      const label = child.title || child.itemName || child.itemCode || '子件'
      walk(child.id, level + 1, [...pathParts, label])
    })
  }

  walk(rootId, 0, [normalizeRootLabel(root?.title, rootFallback)])
  return result
}

/** 解析产品关联 EBOM/BOM，用于 ECN 表单展示与变更项选取 */
export function resolveProductEbomRef(options = {}) {
  const { productName, productId, bomId, bomName, bomVersion } = options
  if (!productName && !productId && !bomId) return emptyRef()

  const ebomHit = pickEbomForProduct(productName, productId)
  if (ebomHit?.record) {
    let structure = loadBomDetailStructure(ebomHit.record)
    if (!structure.lineItems?.length && ebomHit.record.baselineBomId) {
      const baseline = getProductBomById(ebomHit.record.baselineBomId)
      if (baseline) structure = loadBomDetailStructure(baseline)
    }
    return {
      label: formatEbomLabel(ebomHit.record.ebomName, ebomHit.record.version),
      sourceKind: 'ebom',
      sourceId: ebomHit.record.id,
      flatNodes: structure.flatNodes || [],
      lineItems: structure.lineItems || [],
      bomRecord: null,
      ebomRecord: ebomHit.record,
    }
  }

  const bom = resolveBomRecord({ productId, productName, bomId, bomName })
  if (bom) {
    const structure = loadBomDetailStructure(bom) || resolveBomStructure(bom)
    const name = bom.bomName || bomName || `${productName || ''} BOM`
    const version = bom.version || bomVersion || ''
    return {
      label: formatEbomLabel(name, version),
      sourceKind: 'bom',
      sourceId: bom.id,
      flatNodes: structure?.flatNodes || [],
      lineItems: structure?.lineItems || [],
      bomRecord: bom,
      ebomRecord: null,
    }
  }

  if (bomName) {
    return {
      label: formatEbomLabel(bomName, bomVersion),
      sourceKind: 'bom',
      sourceId: bomId || '',
      flatNodes: [],
      lineItems: [],
      bomRecord: null,
      ebomRecord: null,
    }
  }

  return { ...emptyRef(), label: '—' }
}

export function formatOrigNameSpec(name, spec) {
  return [name, spec].filter(Boolean).join(' · ') || '—'
}

export function formatMaterialCodeSpec(code, spec) {
  return [code, spec].filter(Boolean).join(' · ') || '—'
}

/** 物料编码/规格/材质/图号 拼接展示 */
export function formatMaterialDetailLabel(code, spec, material, drawingNo) {
  return [code, spec, material, drawingNo].filter((v) => v && v !== '—').join(' · ') || '—'
}

/** 当前 EBOM 父级挂载点选项（供父级物料搜索选择） */
export function buildBomParentPickerOptions(flatNodes = [], bomPickerLines = [], rootLabel = '') {
  const map = new Map()
  const root = flatNodes.find((n) => n.isRoot)
  const rootPath = normalizeRootLabel(root?.title, rootLabel || '成品')
  map.set(rootPath, { value: rootPath, label: rootPath })

  bomPickerLines.forEach((line) => {
    const path = line.parentPath || line.levelPath
    if (path) map.set(path, { value: path, label: path })
  })

  flatNodes
    .filter((n) => !n.isRoot)
    .forEach((node) => {
      const label = String(node.title || '').trim()
      if (label) map.set(label, { value: label, label })
    })

  return [...map.values()]
}

export function filterBomParentOptions(options, keyword) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  if (!kw) return options.slice(0, 20)
  return options.filter((opt) => opt.label.toLowerCase().includes(kw)).slice(0, 50)
}

export function filterBomLineOptions(lines, keyword) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  if (!kw) return lines.slice(0, 8)
  return lines.filter(
    (line) =>
      line.materialCode?.toLowerCase().includes(kw) ||
      line.materialName?.toLowerCase().includes(kw) ||
      line.specModel?.toLowerCase().includes(kw),
  )
}

export function isChangeItemParentEditable(item) {
  return (
    item?.changeType === ECN_CHANGE_ITEM_TYPE.ADD ||
    item?.changeType === ECN_CHANGE_ITEM_TYPE.MODIFY
  )
}

/** 解析物料默认工艺路线下的工序名称列表 */
export function resolveDefaultProcessesForMaterial(materialCode, bomLine = null) {
  const code = materialCode || bomLine?.materialCode || ''
  let routeName = bomLine?.processRoute || ''
  if (!routeName && code) {
    const material = materialInfoState.materials.find((m) => m.code === code)
    const product = productInfoState.products.find((p) => p.code === code)
    routeName =
      material?.production?.defaultProcessRoute ||
      product?.production?.defaultProcessRoute ||
      bomLine?.processRoute ||
      ''
  }
  if (!routeName) return []
  return buildProcessesFromRoute(routeName)
    .map((p) => p.name)
    .filter(Boolean)
}

export function applyDefaultRelatedProcesses(item, materialCode, bomLine = null) {
  if (!item) return item
  item.relatedProcesses = resolveDefaultProcessesForMaterial(materialCode, bomLine)
  return item
}

/** 展平 BOM 概览树为父项选取列表（字段与 BOM 概览一致） */
export function flattenBomOverviewPickerRows(flatNodes = [], lineItems = [], rootLabel = '') {
  const root = flatNodes.find((n) => n.isRoot)
  const rootName = normalizeRootLabel(root?.title, rootLabel || '成品')
  const result = [
    {
      key: root?.id || '__root__',
      index: '0',
      itemName: rootName,
      materialCode: '—',
      specModel: '—',
      material: '—',
      drawingNo: '—',
      parentPath: rootName,
      pickValue: rootName,
    },
  ]

  const tree = assignOverviewIndexes(buildBomOverviewTree(flatNodes, lineItems, 1))

  function walk(nodes, pathParts) {
    nodes.forEach((node) => {
      const { children, ...rest } = node
      const name = rest.itemName && rest.itemName !== '—' ? rest.itemName : rest.materialCode
      const path = [...pathParts, name].filter(Boolean).join(' › ')
      result.push({
        ...rest,
        parentPath: path,
        pickValue: path,
      })
      if (children?.length) {
        walk(children, [...pathParts, name])
      }
    })
  }

  walk(tree, [rootName])
  return result
}

/** BOM 概览树（与产品 BOM 概览层级序号一致，用于 ECN 选取弹窗） */
export function buildBomOverviewPickTree(flatNodes = [], lineItems = []) {
  if (!flatNodes?.length) return []
  return assignOverviewIndexes(buildBomOverviewTree(flatNodes, lineItems, 1))
}

function normalizeOverviewPickFilters(filters = {}) {
  return {
    itemName: String(filters.itemName || '')
      .trim()
      .toLowerCase(),
    materialCode: String(filters.materialCode || '')
      .trim()
      .toLowerCase(),
    specModel: String(filters.specModel || '')
      .trim()
      .toLowerCase(),
    categoryName: String(filters.categoryName || '')
      .trim()
      .toLowerCase(),
    material: String(filters.material || '')
      .trim()
      .toLowerCase(),
    drawingNo: String(filters.drawingNo || '')
      .trim()
      .toLowerCase(),
  }
}

function rowMatchesOverviewPickFilters(row, f) {
  if (
    f.itemName &&
    !String(row.itemName || '')
      .toLowerCase()
      .includes(f.itemName)
  )
    return false
  if (
    f.materialCode &&
    !String(row.materialCode || '')
      .toLowerCase()
      .includes(f.materialCode)
  ) {
    return false
  }
  if (
    f.specModel &&
    !String(row.specModel || '')
      .toLowerCase()
      .includes(f.specModel)
  )
    return false
  if (
    f.categoryName &&
    !String(row.categoryName || '')
      .toLowerCase()
      .includes(f.categoryName)
  ) {
    return false
  }
  if (
    f.material &&
    !String(row.material || '')
      .toLowerCase()
      .includes(f.material)
  )
    return false
  if (
    f.drawingNo &&
    !String(row.drawingNo || '')
      .toLowerCase()
      .includes(f.drawingNo)
  )
    return false
  return true
}

/** 筛选 BOM 概览树，保留匹配节点及其祖先 */
export function filterBomOverviewPickTree(rows, filters = {}) {
  const f = normalizeOverviewPickFilters(filters)
  const hasFilter = Object.values(f).some(Boolean)
  if (!hasFilter) return rows

  function filterNodes(nodes) {
    const result = []
    nodes.forEach((node) => {
      const filteredChildren = node.children?.length ? filterNodes(node.children) : []
      const selfMatch = rowMatchesOverviewPickFilters(node, f)
      if (selfMatch || filteredChildren.length) {
        const next = { ...node }
        if (filteredChildren.length) next.children = filteredChildren
        else delete next.children
        result.push(next)
      }
    })
    return result
  }

  return filterNodes(rows)
}

export function countBomOverviewPickTreeRows(rows = []) {
  let count = 0
  function walk(nodes) {
    nodes.forEach((node) => {
      count += 1
      if (node.children?.length) walk(node.children)
    })
  }
  walk(rows)
  return count
}

export function resolveBomLineFromPickRow(
  row,
  bomPickerLines = [],
  lineItems = [],
  flatNodes = [],
) {
  if (!row?.key) return null
  const key = String(row.key)

  const fromPicker = bomPickerLines.find((l) => l.id === key)
  if (fromPicker) return fromPicker

  const fromLine = lineItems.find((l) => l.id === key)
  if (fromLine) {
    return (
      bomPickerLines.find((l) => l.id === fromLine.id) ||
      pickerLineFromLineItem(fromLine, flatNodes, lineItems)
    )
  }

  if (key.startsWith('node-')) {
    const nodeId = key.slice(5)
    const node = flatNodes.find((n) => n.id === nodeId)
    const linkedLine =
      lineItems.find((l) => l.id === node?.lineId) ||
      lineItems.find((l) => l.parentTreeId === nodeId)
    if (linkedLine) {
      return (
        bomPickerLines.find((l) => l.id === linkedLine.id) ||
        pickerLineFromLineItem(linkedLine, flatNodes, lineItems)
      )
    }
  }

  return null
}

function pickerLineFromLineItem(line, flatNodes = [], lineItems = []) {
  const lines = flattenBomLinesForPicker(flatNodes, lineItems)
  return lines.find((l) => l.id === line.id) || null
}

export function filterBomOverviewPickerRows(rows, filters = {}) {
  const f = normalizeOverviewPickFilters(filters)
  const hasFilter = Object.values(f).some(Boolean)
  if (!hasFilter) return rows
  return rows.filter((row) => rowMatchesOverviewPickFilters(row, f))
}

/** @deprecated 使用 buildBomOverviewPickTree */
export function buildBomMaterialPickRows(
  flatNodes = [],
  lineItems = [],
  rootLabel = '',
  bomPickerLines = [],
) {
  void rootLabel
  const tree = buildBomOverviewPickTree(flatNodes, lineItems)
  if (tree.length) return flattenOverviewPickTreeRows(tree)
  return assignBomPickerLineIndexes(bomPickerLines)
}

function flattenOverviewPickTreeRows(rows = []) {
  const result = []
  function walk(nodes) {
    nodes.forEach((node) => {
      const { children, ...rest } = node
      result.push(rest)
      if (children?.length) walk(children)
    })
  }
  walk(rows)
  return result
}

function nextHierarchicalIndex(counters, level) {
  while (counters.length <= level) counters.push(0)
  counters.length = level + 1
  counters[level] += 1
  return counters.slice(0, level + 1).join('.')
}

function mapPickerLineToOverviewRow(line, index) {
  return {
    key: line.id,
    index,
    itemName: line.materialName || '—',
    materialCode: line.materialCode || '—',
    specModel: line.specModel || '—',
    material: line.material || '—',
    drawingNo: line.drawingNo || '—',
    unitQty: line.unitQty ?? '—',
    unit: line.unit || '件',
    materialType: line.materialType || '—',
    categoryName: line.categoryName || '—',
    supplyForm: line.supplyForm || '—',
    supplyUnit: '—',
    substitutePart: '—',
    processDocName: line.processDocName || '—',
    processRoute: line.processRoute || '—',
    remark: '—',
    parentPath: line.parentPath || '',
  }
}

function assignBomPickerLineIndexes(bomPickerLines = []) {
  const counters = []
  return bomPickerLines.map((line) =>
    mapPickerLineToOverviewRow(line, nextHierarchicalIndex(counters, line.level ?? 0)),
  )
}

function lookupMaterialStock(code) {
  if (!code) return null
  const material = materialInfoState.materials.find((m) => m.code === code)
  if (material?.stockQty != null && material.stockQty !== '') return material.stockQty
  return null
}

/** 同步旧字段，便于 store / 下游兼容 */
export function syncChangeItemLegacyFields(item) {
  if (!item) return item
  item.materialCode = item.origMaterialCode || item.newMaterialCode || ''
  item.materialName = item.origMaterialName || item.newMaterialName || ''
  item.specModel = item.origSpecModel || item.newSpecModel || ''
  item.levelPath = item.parentPath || item.levelPath || ''
  item.beforeUnitQty = item.origUnitQty
  item.afterUnitQty = item.newUnitQty
  item.beforeMaterial = item.origMaterial || ''
  item.afterMaterial = item.newMaterial || ''
  item.replaceMaterialCode = item.newMaterialCode || ''
  item.replaceMaterialName = item.newMaterialName || ''
  return item
}

function baseChangeItem(partial = {}) {
  const item = {
    id: `ecn-change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    changeType: ECN_CHANGE_ITEM_TYPE.MODIFY,
    bomLineId: '',
    origMaterialCode: '',
    origMaterialName: '',
    origSpecModel: '',
    origUnitQty: null,
    origProcessDoc: '',
    origMaterial: '',
    origDrawingNo: '',
    newMaterialCode: '',
    newMaterialName: '',
    newSpecModel: '',
    newUnitQty: null,
    newMaterial: '',
    newDrawingNo: '',
    parentPath: '',
    parentMaterial: '',
    relatedProcesses: [],
    currentStock: null,
    needReplenish: false,
    supplyForm: '',
    generateDocument: false,
    planQty: null,
    planDate: dayjs().format('YYYY-MM-DD'),
    planDateValue: dayjs().format('YYYY-MM-DD'),
    changeNote: '',
    levelPath: '',
    materialCode: '',
    materialName: '',
    specModel: '',
    material: '',
    beforeUnitQty: null,
    afterUnitQty: null,
    beforeMaterial: '',
    afterMaterial: '',
    replaceMaterialCode: '',
    replaceMaterialName: '',
    replaceBomLabel: '',
    newMaterialItemType: '',
    newMaterialItemId: '',
    replaceBomId: '',
    ...partial,
  }
  return syncChangeItemLegacyFields(item)
}

function patchFromBomLine(line, changeType) {
  const parentPath = line.parentPath || line.levelPath || ''
  const base = {
    changeType,
    bomLineId: line.id,
    origMaterialCode: line.materialCode || '',
    origMaterialName: line.materialName || '',
    origSpecModel: line.specModel || '',
    origUnitQty: line.unitQty ?? null,
    origProcessDoc: line.processDocName || '',
    origMaterial: line.material || '',
    origDrawingNo: line.drawingNo || '',
    newMaterialCode: line.materialCode || '',
    newMaterialName: line.materialName || '',
    newSpecModel: line.specModel || '',
    newUnitQty: line.unitQty ?? null,
    newMaterial: line.material || '',
    newDrawingNo: line.drawingNo || '',
    parentPath,
    parentMaterial: parentPath,
    supplyForm: line.supplyForm || '',
    currentStock: lookupMaterialStock(line.materialCode),
    levelPath: parentPath,
  }
  base.relatedProcesses = resolveDefaultProcessesForMaterial(line.materialCode, line)
  return base
}

export function createChangeItemFromBomLine(line, changeType = ECN_CHANGE_ITEM_TYPE.MODIFY) {
  const item = baseChangeItem(patchFromBomLine(line, changeType))
  applyChangeTypeDefaults(item)
  return syncChangeItemLegacyFields(item)
}

export function createEmptyChangeItem(changeType = ECN_CHANGE_ITEM_TYPE.ADD) {
  const item = baseChangeItem({ changeType })
  applyChangeTypeDefaults(item)
  return item
}

/** @deprecated 使用 createEmptyChangeItem */
export function createChangeItemNew(payload = {}) {
  const item = createEmptyChangeItem(ECN_CHANGE_ITEM_TYPE.ADD)
  item.newMaterialCode = payload.materialCode || ''
  item.newMaterialName = payload.materialName || ''
  item.newSpecModel = payload.specModel || ''
  item.newUnitQty = payload.afterUnitQty ?? payload.unitQty ?? 1
  item.newMaterial = payload.afterMaterial || payload.material || ''
  item.parentPath = payload.levelPath || ''
  item.parentMaterial = payload.levelPath || ''
  item.changeNote = payload.changeNote || ''
  return syncChangeItemLegacyFields(item)
}

export function applyMaterialToChangeItem(item, material) {
  if (!item || !material) return item
  item.newMaterialCode = material.code || ''
  item.newMaterialName = material.name || ''
  item.newSpecModel = material.specModel || ''
  item.newMaterial = material.material || ''
  item.newDrawingNo = material.drawingNo || ''
  item.supplyForm = ['自制件', '外购件'].includes(material.supplyForm)
    ? material.supplyForm
    : item.supplyForm || '外购件'
  item.currentStock = lookupMaterialStock(material.code)
  applyDefaultRelatedProcesses(item, material.code)
  const bomMeta = resolveMaterialBomMeta(material)
  item.replaceBomLabel = bomMeta.replaceBomLabel
  item.newMaterialItemType = bomMeta.newMaterialItemType
  item.newMaterialItemId = bomMeta.newMaterialItemId
  item.replaceBomId = bomMeta.replaceBomId
  return syncChangeItemLegacyFields(item)
}

/** 切换变更类型时同步变更后默认值 */
export function applyChangeTypeDefaults(item) {
  if (!item) return item
  if (item.changeType === ECN_CHANGE_ITEM_TYPE.REMOVE) {
    item.newMaterialCode = ''
    item.newMaterialName = ''
    item.newSpecModel = ''
    item.newUnitQty = 0
    item.newMaterial = ''
    item.needReplenish = false
    item.generateDocument = false
    item.planQty = null
  } else if (item.changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
    item.origMaterialCode = ''
    item.origMaterialName = ''
    item.origSpecModel = ''
    item.origUnitQty = null
    item.origProcessDoc = ''
    item.origMaterial = ''
    item.bomLineId = ''
    if (item.newUnitQty == null) item.newUnitQty = 1
  } else if (item.changeType === ECN_CHANGE_ITEM_TYPE.MODIFY) {
    if (item.bomLineId || item.origMaterialCode) {
      item.newMaterialCode = item.origMaterialCode
      item.newMaterialName = item.origMaterialName
      item.newSpecModel = item.origSpecModel
      item.newUnitQty = item.origUnitQty
      item.newMaterial = item.origMaterial
    }
  } else if (item.changeType === ECN_CHANGE_ITEM_TYPE.REPLACE) {
    item.newMaterialCode = ''
    item.newMaterialName = ''
    item.newSpecModel = ''
    item.newMaterial = ''
    item.replaceBomLabel = ''
    item.newMaterialItemType = ''
    item.newMaterialItemId = ''
    item.replaceBomId = ''
    if (item.newUnitQty == null) item.newUnitQty = item.origUnitQty
  }
  return syncChangeItemLegacyFields(item)
}

export function isChangeItemNewFieldsActive(item) {
  return item?.changeType !== ECN_CHANGE_ITEM_TYPE.REMOVE
}

export function isChangeItemOrigFieldsActive(item) {
  return item?.changeType !== ECN_CHANGE_ITEM_TYPE.ADD
}

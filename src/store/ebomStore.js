import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { EBOM_STATUS } from '@/constants/ebom'
import { loadBomDetailStructure, resolveBomStructure } from '@/utils/bomImport'
import { resolveDesignBaselineBom } from '@/utils/designBomBaseline'
import { createRootTreeNode } from '@/utils/bomTree'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'
import { buildMockEbomRecords } from '@/mock/ebomSeed'
import { ensureScatterEbomRecord } from '@/mock/scatterEbomShipDemoSeed'

const STORAGE_KEY = 'i_doms_ebom'
const DATA_VERSION = 2
let ebomSeq = 200

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.items)) {
        ebomSeq = parsed.ebomSeq ?? ebomSeq
        return parsed.items
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, ebomSeq, items: ebomState.items }),
  )
}

export const ebomState = reactive({
  items: ensureScatterEbomRecord(loadFromStorage() || buildMockEbomRecords()),
})

watch(
  () => ebomState.items,
  () => persist(),
  { deep: true },
)

export function generateEbomNo() {
  ebomSeq += 1
  return `EBOM-${dayjs().format('YYYY')}-${String(ebomSeq).padStart(4, '0')}`
}

export function findEbomById(id) {
  return ebomState.items.find((e) => e.id === id) || null
}

export function findEbomByDesignTaskId(designTaskId) {
  return ebomState.items.find((e) => e.designTaskId === designTaskId) || null
}

function emptyStructureForProduct(product) {
  const root = createRootTreeNode({
    itemCode: product?.code || '',
    itemName: product?.name || '产品',
    specModel: product?.specModel || '',
  })
  return {
    treeNodes: [root],
    lineItems: [],
    templateRef: null,
    columnSettings: JSON.parse(JSON.stringify(defaultBomColumnSettings)),
  }
}

function structureFromBaseline(baseline, source = 'baseline') {
  if (!baseline) return null
  const resolved = resolveBomStructure(baseline) || loadBomDetailStructure(baseline)
  if (!resolved?.treeNodes?.length) return null
  return {
    treeNodes: JSON.parse(JSON.stringify(resolved.treeNodes)),
    lineItems: JSON.parse(JSON.stringify(resolved.lineItems || [])),
    templateRef: resolved.templateRef
      ? {
          ...resolved.templateRef,
          source,
          baselineBomId: baseline.id,
        }
      : { source, baselineBomId: baseline.id, bomNo: baseline.bomNo },
    columnSettings: JSON.parse(JSON.stringify(defaultBomColumnSettings)),
  }
}

/** 打开设计页时：已有草稿 → SKU 自有基准/生效 → 族模板 → 空白 */
export function ensureEbomDraftForDesignTask(task, product) {
  const existing = findEbomByDesignTaskId(task.id)
  if (existing) return existing

  const { bom: baseline, source } = resolveDesignBaselineBom(task.productId)
  const skeletonSource = source === 'spu_template' ? 'spu_template' : 'baseline'
  const fromBaseline = structureFromBaseline(baseline, skeletonSource)
  const base = fromBaseline || emptyStructureForProduct(product)

  const ebom = {
    id: `ebom-${Date.now()}`,
    ebomNo: generateEbomNo(),
    ebomName: `${task.productName || product?.name || '定制产品'} EBOM`,
    bomType: 'EBOM',
    status: EBOM_STATUS.DRAFT,
    version: 'V1.0',
    designTaskId: task.id,
    designTaskNo: task.taskNo,
    productId: task.productId,
    productCode: task.productCode || product?.code || '',
    productName: task.productName || product?.name || '',
    productAttr: task.productAttr || product?.productAttribute || '',
    salesOrderNo: task.salesOrderNo || '',
    customerName: task.customerName || '',
    baselineBomId: baseline?.id || '',
    baselineBomNo: baseline?.bomNo || '',
    baselineBomVersion: baseline?.version || '',
    baselineSource: source,
    treeNodes: base.treeNodes,
    lineItems: base.lineItems,
    templateRef: base.templateRef,
    columnSettings: base.columnSettings,
    designer: '',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    finalizedAt: '',
  }
  ebomState.items.unshift(ebom)
  return ebom
}

export function saveEbomDraft(ebomId, payload) {
  const row = findEbomById(ebomId)
  if (!row) return { ok: false, message: 'EBOM 不存在' }
  if (row.status === EBOM_STATUS.FINALIZED) {
    return { ok: false, message: 'EBOM 已定稿，不可再保存为草稿' }
  }
  Object.assign(row, payload, {
    status: EBOM_STATUS.DRAFT,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  return { ok: true, record: row }
}

export function finalizeEbom(ebomId, payload) {
  const row = findEbomById(ebomId)
  if (!row) return { ok: false, message: 'EBOM 不存在' }
  Object.assign(row, payload, {
    status: EBOM_STATUS.FINALIZED,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    finalizedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
  return { ok: true, record: row }
}

export function revertEbomToDraft(ebomId) {
  const row = findEbomById(ebomId)
  if (!row) return null
  row.status = EBOM_STATUS.DRAFT
  row.finalizedAt = ''
  row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return row
}

export function filterEbomRecords(list, filters) {
  return list.filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.ebomNo && !row.ebomNo.includes(filters.ebomNo)) return false
    if (filters.productName && !row.productName.includes(filters.productName)) return false
    if (filters.designTaskNo && !row.designTaskNo.includes(filters.designTaskNo)) return false
    if (filters.customerName && !row.customerName.includes(filters.customerName)) return false
    return true
  })
}

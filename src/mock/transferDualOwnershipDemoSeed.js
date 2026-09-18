/**
 * 调拨选库存演示：各仓库同物料同时具备「自由备货」与「按单在库」批次，便于 rowspan 合并验收。
 */
import dayjs from 'dayjs'

/** 参与演示的仓库（与 warehouseSeed 一致） */
export const TRANSFER_DUAL_OWNERSHIP_WAREHOUSES = [
  '原料仓',
  '半成品仓',
  '库线边仓',
  '成品主仓',
  '报废仓',
]

export const TRANSFER_DUAL_OWNERSHIP_ITEMS = [
  {
    code: 'TF-DUAL-BEARING',
    name: '调拨双归属轴承 6205',
    unit: '套',
    specModel: '6205-2RS',
    material: '轴承钢',
    freeQty: 36,
    dedicatedQty: 12,
    salesOrderId: 'so-tf-dual-01',
    salesOrderNo: 'SO20260918-TF01',
    salesLineId: 'line-tf-dual-01-bearing',
  },
  {
    code: 'TF-DUAL-BOLT',
    name: '调拨双归属螺栓组',
    unit: '个',
    specModel: 'M12×80',
    material: '钢',
    freeQty: 200,
    dedicatedQty: 80,
    salesOrderId: 'so-tf-dual-02',
    salesOrderNo: 'SO20260918-TF02',
    salesLineId: 'line-tf-dual-02-bolt',
  },
  {
    code: 'TF-DUAL-AL-PROFILE',
    name: '调拨双归属铝型材 4040',
    unit: '米',
    specModel: '40×40×4',
    material: '6063',
    freeQty: 48,
    dedicatedQty: 16,
    salesOrderId: 'so-tf-dual-03',
    salesOrderNo: 'SO20260918-TF03',
    salesLineId: 'line-tf-dual-03-al',
  },
]

const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')

function warehouseSlug(wh) {
  return String(wh || '')
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '')
}

function batchId(kind, warehouse, itemCode) {
  return `bat-tf-dual-${kind}-${warehouseSlug(warehouse)}-${itemCode}`
}

function buildBatch({
  id,
  batchNo,
  warehouse,
  item,
  qty,
  salesOrderId = '',
  salesOrderNo = '',
  salesLineId = '',
  dedicated = false,
}) {
  return {
    id,
    batchNo,
    warehouse,
    itemCode: item.code,
    itemName: item.name,
    currentLength: qty,
    unit: item.unit,
    status: '在库',
    sourceType: dedicated ? '成品入库' : '采购入库',
    sourceDocNo: dedicated
      ? `IN-TF-DED-${warehouseSlug(warehouse)}`
      : `IN-TF-FREE-${warehouseSlug(warehouse)}`,
    salesOrderId,
    salesOrderNo,
    salesLineId,
    workOrderNo: dedicated ? `WO-TF-${warehouseSlug(warehouse)}` : '',
    parentBatchId: '',
    createdAt: now,
    updatedAt: now,
    attrs: {
      transferDualOwnershipDemo: true,
      dedicated,
      specModel: item.specModel,
      material: item.material,
      locationNo: dedicated ? 'D-01-02' : 'D-01-01',
    },
  }
}

/** 各仓 × 各演示物料：自由备货批 + 按单在库批 */
export function buildTransferDualOwnershipBatches() {
  const list = []
  let seq = 1
  TRANSFER_DUAL_OWNERSHIP_WAREHOUSES.forEach((warehouse) => {
    TRANSFER_DUAL_OWNERSHIP_ITEMS.forEach((item) => {
      const freeNo = `B-260918-F${String(seq).padStart(3, '0')}`
      const dedNo = `B-260918-D${String(seq).padStart(3, '0')}`
      seq += 1
      list.push(
        buildBatch({
          id: batchId('free', warehouse, item.code),
          batchNo: freeNo,
          warehouse,
          item,
          qty: item.freeQty,
          dedicated: false,
        }),
        buildBatch({
          id: batchId('ded', warehouse, item.code),
          batchNo: dedNo,
          warehouse,
          item,
          qty: item.dedicatedQty,
          salesOrderId: item.salesOrderId,
          salesOrderNo: item.salesOrderNo,
          salesLineId: item.salesLineId,
          dedicated: true,
        }),
      )
    })
  })
  return list
}

export const TRANSFER_DUAL_OWNERSHIP_STOCK_SYNC_ROWS = TRANSFER_DUAL_OWNERSHIP_WAREHOUSES.flatMap(
  (warehouse) =>
    TRANSFER_DUAL_OWNERSHIP_ITEMS.map((item) => ({
      warehouse,
      itemCode: item.code,
      itemName: item.name,
      unit: item.unit,
    })),
)

/** 幂等注入；调用方负责对齐汇总库存 */
export function ensureTransferDualOwnershipBatches(batches = []) {
  const list = Array.isArray(batches) ? [...batches] : []
  const demo = buildTransferDualOwnershipBatches()
  const idSet = new Set(list.map((b) => b.id))
  demo.forEach((b) => {
    if (!idSet.has(b.id)) list.push(b)
  })
  return list
}

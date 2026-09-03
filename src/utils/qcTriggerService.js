import {
  addQcTask,
  buildQcTaskFromTemplateMatch,
  createQcTaskLineItem,
  findQcTaskByKey,
  listQcTasks,
} from '@/store/qcTaskStore'
import { attachReceiptQcSheet as attachPurchaseReceiptQcSheet } from '@/store/purchaseReceiptStore'
import { attachReceiptQcSheet as attachOutsourcingReceiptQcSheet } from '@/store/outsourcingReceiptStore'
import { processConfigState } from '@/store/processConfigStore'
import {
  resolveInboundQcRequirementForLine,
  shouldCreateInboundQcTask,
} from '@/utils/inboundQcRequirement'
import { isMinimalProductionQcEnabled } from '@/utils/qcProductionMode'
import { defaultQcConfigsFromOperations, normalizeProcessQcConfigs } from '@/utils/qcProcessConfig'

function receiptLineItemCode(line = {}) {
  return line.itemCode || line.productCode || line.materialCode || ''
}

function receiptLineItemName(line = {}) {
  return line.itemName || line.productName || line.materialName || ''
}

function getProcessConfigByNameOrCode(process = {}) {
  const name = String(process.name || process.processName || '').trim()
  const code = String(process.processCode || '').trim()
  return (
    processConfigState.processes.find((p) => p.code === code) ||
    processConfigState.processes.find((p) => p.name === name) ||
    null
  )
}

export function resolveProcessQcConfigs(process = {}) {
  const procConfig = getProcessConfigByNameOrCode(process)
  if (procConfig && Array.isArray(procConfig.qcConfigs)) {
    return normalizeProcessQcConfigs(procConfig.qcConfigs).filter((c) => c.enabled)
  }
  return defaultQcConfigsFromOperations(procConfig?.operations || process.operations).filter(
    (c) => c.enabled,
  )
}

/** 来料/外协收货：按明细行创建质检任务 */
export function ensureInboundQcTasksForReceipt(
  receipt,
  { bizScope = '来料质检', sourceType } = {},
) {
  if (!receipt?.id) return { ok: false, message: '收货单无效', created: [] }

  const lines = receipt.lines || receipt.lineItems || receipt.details || []
  const created = []
  let primaryQcNo = String(receipt.qcNo || '').trim()

  for (const line of lines) {
    const itemCode = receiptLineItemCode(line)
    const requirement = resolveInboundQcRequirementForLine({ ...line, itemCode })
    if (!shouldCreateInboundQcTask(requirement)) continue

    const existing = findQcTaskByKey({
      bizScope,
      sourceType,
      sourceDocId: receipt.id,
      sourceLineId: line.id,
    })
    if (existing) {
      if (!primaryQcNo) primaryQcNo = existing.qcNo
      continue
    }

    const built = buildQcTaskFromTemplateMatch({
      bizScope,
      itemCode,
      sourceType,
      sourceDocId: receipt.id,
      sourceDocNo: receipt.receiptNo || '',
      itemName: receiptLineItemName(line),
      specModel: line.specModel || line.spec || '',
      unit: line.unit || '件',
      inspectMethod: requirement === '全检' ? '全检' : '抽检',
      lineItems: [
        createQcTaskLineItem({
          sourceLineId: line.id,
          itemCode,
          itemName: receiptLineItemName(line),
          specModel: line.specModel || '',
          unit: line.unit || '件',
          inspectQty: line.receivedQty ?? line.qty ?? line.receiptQty ?? 0,
        }),
      ],
    })
    if (!built.ok) continue

    const task = addQcTask(built.task)
    created.push(task)
    if (!primaryQcNo) primaryQcNo = task.qcNo
  }

  if (created.length && sourceType === 'purchase_receipt') {
    attachPurchaseReceiptQcSheet(receipt.id, {
      qcNo: primaryQcNo,
      qcStatus: '质检中',
    })
  } else if (created.length && sourceType === 'outsourcing_receipt') {
    attachOutsourcingReceiptQcSheet(receipt.id, {
      qcNo: primaryQcNo,
      qcStatus: '质检中',
    })
  }

  return { ok: true, created, qcNo: primaryQcNo }
}

/** 极简模式：工单下发时为配置了质检的工序预生成任务 */
export function ensureProcessQcTasksOnDispatch(workOrder, batch) {
  if (!isMinimalProductionQcEnabled()) {
    return { ok: true, created: [], skipped: '非极简生产模式' }
  }
  if (!workOrder?.id || !batch?.id) return { ok: false, message: '工单或批次无效', created: [] }

  const processes = workOrder.processes || []
  const created = []

  processes.forEach((proc, index) => {
    const qcConfigs = resolveProcessQcConfigs(proc)
    if (!qcConfigs.length) return

    qcConfigs.forEach((cfg) => {
      const existing = findQcTaskByKey({
        bizScope: cfg.bizScope,
        sourceType: 'work_order_dispatch',
        workOrderId: workOrder.id,
        processCode: proc.processCode || proc.code || proc.name,
        scheduleBatchId: batch.id,
      })
      if (existing) return

      const built = buildQcTaskFromTemplateMatch({
        bizScope: cfg.bizScope,
        templateCode: cfg.templateCode,
        itemCode: workOrder.productCode || workOrder.itemCode || '',
        sourceType: 'work_order_dispatch',
        sourceDocId: workOrder.id,
        sourceDocNo: workOrder.orderNo || workOrder.workOrderNo || '',
        workOrderNo: workOrder.orderNo || workOrder.workOrderNo || '',
        workOrderId: workOrder.id,
        processCode: proc.processCode || proc.code || '',
        processName: proc.name || proc.processName || '',
        processIndex: proc.index ?? index + 1,
        scheduleBatchId: batch.id,
        scheduleBatchNo: batch.batchNo,
        itemName: workOrder.productName || workOrder.itemName || '',
        specModel: workOrder.specModel || '',
        unit: workOrder.unit || '件',
        remark: cfg.remark || '',
        lineItems: [
          createQcTaskLineItem({
            itemCode: workOrder.productCode || workOrder.itemCode || '',
            itemName: workOrder.productName || workOrder.itemName || '',
            specModel: workOrder.specModel || '',
            unit: workOrder.unit || '件',
            inspectQty: batch.qty ?? workOrder.scheduleQty ?? workOrder.planQty ?? 0,
          }),
        ],
      })
      if (!built.ok) return
      created.push(addQcTask(built.task))
    })
  })

  return { ok: true, created }
}

export function listWorkOrderQcTasks(workOrder) {
  if (!workOrder?.id && !workOrder?.orderNo) return []
  const byId = workOrder.id ? listQcTasks({ workOrderId: workOrder.id }) : []
  if (!workOrder.orderNo) return byId
  const seen = new Set(byId.map((t) => t.id))
  const extra = listQcTasks({}).filter(
    (t) => t.workOrderNo === workOrder.orderNo && !seen.has(t.id),
  )
  return [...byId, ...extra]
}

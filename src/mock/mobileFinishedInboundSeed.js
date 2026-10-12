/** 成品入库申请（对齐领料申请：小程序 / WEB 共用结构） */

export const FINISHED_INBOUND_MODES = {
  WORK_ORDER: 'work-order',
  BATCH: 'batch-work-order',
  QUICK: 'quick',
}

export function finishedInboundModeLabel(mode) {
  if (mode === FINISHED_INBOUND_MODES.QUICK) return '快速入库'
  if (mode === FINISHED_INBOUND_MODES.BATCH) return '工单入库（多工单）'
  return '工单入库'
}

export function isFinishedInboundMultiSourceMode(mode) {
  return mode === FINISHED_INBOUND_MODES.BATCH
}

export const FINISHED_INBOUND_AUDIT = {
  PENDING: '待审核',
  APPROVED: '审核通过',
  REJECTED: '审核驳回',
}

export const FINISHED_INBOUND_AUDIT_OPTIONS = [
  { label: '待审核', value: FINISHED_INBOUND_AUDIT.PENDING },
  { label: '审核通过', value: FINISHED_INBOUND_AUDIT.APPROVED },
  { label: '审核驳回', value: FINISHED_INBOUND_AUDIT.REJECTED },
]

function line(partial) {
  return {
    id: partial.id,
    itemCode: partial.itemCode || '',
    itemName: partial.itemName || '',
    itemType: partial.itemType || '产品',
    specModel: partial.specModel || '',
    material: partial.material || '',
    drawingNo: partial.drawingNo || '',
    qty: Number(partial.qty) || 0,
    unit: partial.unit || '台',
    warehouse: partial.warehouse || '成品主仓',
    sourceWorkOrderCode: partial.sourceWorkOrderCode || '',
    sourceWorkOrderId: partial.sourceWorkOrderId || '',
    salesOrderNo: partial.salesOrderNo || '',
  }
}

export function createMobileFinishedInboundSeed() {
  return [
    {
      id: 'fi-seed-001',
      reqNo: 'FI202607200001',
      mode: FINISHED_INBOUND_MODES.WORK_ORDER,
      workOrderId: 'wo-0720-031',
      workOrderCode: 'WO-2026-0720-031',
      workOrderName: '离心泵生产',
      workOrderIds: ['wo-0720-031'],
      workOrders: [
        {
          id: 'wo-0720-031',
          code: 'WO-2026-0720-031',
          productName: '离心泵 KQ100-200',
          productCode: 'CP2610001',
          planQty: 10,
          scheduleQty: 10,
        },
      ],
      salesOrderNo: 'SO-2026-0718-012',
      productName: '离心泵 KQ100-200',
      workshop: '装配车间',
      warehouse: '成品主仓',
      remark: '演示：小程序工单入库待审',
      lineCount: 1,
      totalQty: 8,
      lines: [
        line({
          id: 'fi-seed-001-1',
          itemCode: 'CP2610001',
          itemName: '离心泵 KQ100-200',
          specModel: 'KQ100-200',
          qty: 8,
          unit: '台',
          warehouse: '成品主仓',
          sourceWorkOrderCode: 'WO-2026-0720-031',
          sourceWorkOrderId: 'wo-0720-031',
          salesOrderNo: 'SO-2026-0718-012',
        }),
      ],
      inboundId: '',
      inboundDocNo: '',
      inboundStatus: '—',
      auditStatus: FINISHED_INBOUND_AUDIT.PENDING,
      rejectReason: '',
      applicant: '王班长',
      createdAt: '2026-07-20 09:20:00',
      sourceChannel: 'mini-program',
    },
    {
      id: 'fi-seed-002',
      reqNo: 'FI202607210002',
      mode: FINISHED_INBOUND_MODES.QUICK,
      workOrderId: '',
      workOrderCode: '',
      workOrders: [],
      salesOrderNo: '',
      productName: '清水离心泵 ISG50-160',
      workshop: '总装车间',
      warehouse: '成品主仓',
      remark: '演示：快速入库已通过并生成入库单',
      lineCount: 1,
      totalQty: 5,
      lines: [
        line({
          id: 'fi-seed-002-1',
          itemCode: 'CP2610002',
          itemName: '清水离心泵 ISG50-160',
          specModel: 'ISG50-160',
          qty: 5,
          unit: '台',
          warehouse: '成品主仓',
        }),
      ],
      inboundId: 'ib-demo-005',
      inboundDocNo: '1-20260715-00005',
      inboundStatus: '待入库',
      auditStatus: FINISHED_INBOUND_AUDIT.APPROVED,
      rejectReason: '',
      applicant: '李仓管',
      auditor: '管理员',
      auditedAt: '2026-07-21 10:05:00',
      createdAt: '2026-07-21 09:50:00',
      sourceChannel: 'web',
    },
  ]
}

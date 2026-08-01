/** 小程序领料申请演示种子（与小程序字段结构一致） */

export const MATERIAL_REQ_MODES = {
  WORK_ORDER: 'work-order',
  BATCH: 'batch-work-order',
  SALES_ORDER: 'sales-order',
  QUICK: 'quick',
}

export function materialReqModeLabel(mode) {
  if (mode === MATERIAL_REQ_MODES.QUICK) return '快速领料'
  if (mode === MATERIAL_REQ_MODES.SALES_ORDER) return '订单领料'
  if (mode === MATERIAL_REQ_MODES.BATCH) return '工单领料'
  return '工单领料'
}

export function isMaterialReqMultiSourceMode(mode) {
  return mode === MATERIAL_REQ_MODES.BATCH || mode === MATERIAL_REQ_MODES.SALES_ORDER
}

export const MATERIAL_REQ_AUDIT = {
  PENDING: '待审核',
  APPROVED: '审核通过',
  REJECTED: '审核驳回',
}

export const MATERIAL_REQ_AUDIT_OPTIONS = [
  { label: '待审核', value: MATERIAL_REQ_AUDIT.PENDING },
  { label: '审核通过', value: MATERIAL_REQ_AUDIT.APPROVED },
  { label: '审核驳回', value: MATERIAL_REQ_AUDIT.REJECTED },
]

function line(partial) {
  return {
    id: partial.id,
    itemCode: partial.itemCode,
    itemName: partial.itemName,
    itemType: partial.itemType || '物料',
    specModel: partial.specModel || '',
    material: partial.material || '',
    drawingNo: partial.drawingNo || '',
    shipQty: partial.shipQty,
    unit: partial.unit || '件',
    shipWarehouse: partial.shipWarehouse || '原料仓',
    warehouseStockQty: partial.warehouseStockQty ?? 100,
    lineSource: partial.lineSource || '手工添加',
    sourceWorkOrders: partial.sourceWorkOrders || [],
  }
}

export function createMobileMaterialReqSeed() {
  return [
    {
      id: 'mr-seed-001',
      reqNo: 'ML202607200001',
      mode: MATERIAL_REQ_MODES.WORK_ORDER,
      workOrderId: 'wo-0720-031',
      workOrderCode: 'WO-2026-0720-031',
      workOrderName: '离心泵生产',
      workOrderIds: ['wo-0720-031'],
      workOrders: [],
      salesOrderNo: 'SO-2026-0718-012',
      productName: '离心泵 KQ100-200',
      orderCategory: '生产工单',
      workshop: '装配车间',
      receiveWarehouse: '线边仓-装配',
      remark: '',
      lineCount: 3,
      totalQty: 30,
      lines: [
        line({
          id: 'mr-seed-001-1',
          itemCode: 'M-001',
          itemName: '泵体铸件',
          specModel: 'KQ100',
          shipQty: 10,
          lineSource: 'EBOM',
          shipWarehouse: '原料仓',
        }),
        line({
          id: 'mr-seed-001-2',
          itemCode: 'M-002',
          itemName: '叶轮',
          specModel: 'KQ100-叶轮',
          shipQty: 10,
          lineSource: 'EBOM',
          shipWarehouse: '原料仓',
        }),
        line({
          id: 'mr-seed-001-3',
          itemCode: 'M-003',
          itemName: '机械密封',
          shipQty: 10,
          lineSource: 'EBOM',
          shipWarehouse: '原料仓',
        }),
      ],
      outboundId: '',
      outboundDocNo: '',
      outboundStatus: '—',
      auditStatus: '待审核',
      applicant: '张伟',
      createdAt: '2026-07-20 09:20:15',
    },
    {
      id: 'mr-seed-002',
      reqNo: 'ML202607200002',
      mode: MATERIAL_REQ_MODES.BATCH,
      workOrderId: '',
      workOrderCode: '',
      workOrderName: '',
      workOrderIds: ['wo-0720-028', 'wo-0720-022'],
      workOrders: [
        {
          id: 'wo-0720-028',
          code: 'WO-2026-0720-028',
          productName: '排污泵 WQ80-15',
          scheduleQty: 5,
        },
        {
          id: 'wo-0720-022',
          code: 'WO-2026-0720-022',
          productName: '消防泵 XBD5.0/20',
          scheduleQty: 3,
        },
      ],
      salesOrderNo: 'SO-2026-0719-008',
      productName: '',
      orderCategory: '',
      workshop: '机加车间',
      receiveWarehouse: '线边仓-机加',
      remark: '同销售订单合并领料',
      lineCount: 2,
      totalQty: 16,
      lines: [
        line({
          id: 'mr-seed-002-1',
          itemCode: 'M-011',
          itemName: '泵壳',
          shipQty: 8,
          lineSource: 'EBOM',
          sourceWorkOrders: [
            { workOrderId: 'wo-0720-028', workOrderCode: 'WO-2026-0720-028', qty: 5 },
            { workOrderId: 'wo-0720-022', workOrderCode: 'WO-2026-0720-022', qty: 3 },
          ],
        }),
        line({
          id: 'mr-seed-002-2',
          itemCode: 'M-052',
          itemName: '控制柜',
          shipQty: 8,
          lineSource: 'EBOM',
          sourceWorkOrders: [
            { workOrderId: 'wo-0720-028', workOrderCode: 'WO-2026-0720-028', qty: 5 },
            { workOrderId: 'wo-0720-022', workOrderCode: 'WO-2026-0720-022', qty: 3 },
          ],
        }),
      ],
      outboundId: 'ob-mr-seed-002',
      outboundDocNo: 'OUT202607200102',
      outboundStatus: '待出库',
      auditStatus: '审核通过',
      applicant: '李强',
      createdAt: '2026-07-20 10:05:42',
    },
    {
      id: 'mr-seed-003',
      reqNo: 'ML202607200003',
      mode: MATERIAL_REQ_MODES.QUICK,
      workOrderId: '',
      workOrderCode: '',
      workOrderName: '',
      workOrderIds: [],
      workOrders: [],
      salesOrderNo: '',
      productName: '',
      orderCategory: '',
      workshop: '装配车间',
      receiveWarehouse: '线边仓-装配',
      remark: '试制补料',
      lineCount: 2,
      totalQty: 6,
      lines: [
        line({
          id: 'mr-seed-003-1',
          itemCode: 'M-090',
          itemName: '密封垫片',
          shipQty: 4,
          shipWarehouse: '原料仓',
        }),
        line({
          id: 'mr-seed-003-2',
          itemCode: 'M-091',
          itemName: '紧固件套装',
          shipQty: 2,
          shipWarehouse: '原料仓',
        }),
      ],
      outboundId: 'ob-mr-seed-003',
      outboundDocNo: 'OUT202607200103',
      outboundStatus: '已出库',
      auditStatus: '审核通过',
      applicant: '王芳',
      createdAt: '2026-07-20 11:18:03',
    },
    {
      id: 'mr-seed-004',
      reqNo: 'ML202607190001',
      mode: MATERIAL_REQ_MODES.WORK_ORDER,
      workOrderId: 'wo-0719-055',
      workOrderCode: 'WO-2026-0719-055',
      workOrderName: '多级泵生产',
      workOrderIds: ['wo-0719-055'],
      workOrders: [],
      salesOrderNo: 'SO-2026-0715-003',
      productName: '多级泵 DL100-20',
      orderCategory: '生产工单',
      workshop: '装配车间',
      receiveWarehouse: '线边仓-装配',
      remark: '',
      lineCount: 2,
      totalQty: 16,
      lines: [
        line({
          id: 'mr-seed-004-1',
          itemCode: 'M-021',
          itemName: '中段',
          shipQty: 8,
          lineSource: 'EBOM',
          shipWarehouse: '半成品仓',
        }),
        line({
          id: 'mr-seed-004-2',
          itemCode: 'M-022',
          itemName: '导叶',
          shipQty: 8,
          lineSource: 'EBOM',
          shipWarehouse: '半成品仓',
        }),
      ],
      outboundId: '',
      outboundDocNo: '',
      outboundStatus: '—',
      auditStatus: '审核驳回',
      rejectReason: '领料数量与计划不符，请核实后重提',
      applicant: '张伟',
      createdAt: '2026-07-19 15:40:20',
    },
  ]
}

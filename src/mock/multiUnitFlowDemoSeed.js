/**
 * 多单位出入库 / 领料 / 下料结算 联动演示种子
 *
 * 建议验证路径：
 * 1. 入库管理：待处理「MU-IB-*」——双单位 / 结算 / 三口径 / 单单位
 * 2. 出库管理：待出库「MU-OB-PEND-*」——钢管(需下料结算) + 轴承(普通 FIFO)
 * 3. 出库管理：已出库「MU-OB-ISSUE-*」——整批出 / 部分出
 * 4. 领料申请：ML-MU-FLOW-* —— 审核通过，已生成领料出库
 * 5. 下料结算：CS-MU-* —— 待确认（整出回余料）
 * 6. 工单：WO-MU-FLOW-001 —— 执行中 + 下料工序
 */

import dayjs from 'dayjs'
import {
  STEEL_PIPE_CODE,
  STEEL_PIPE_NAME,
  STEEL_PLATE_CODE,
  STEEL_PLATE_NAME,
  STEEL_WEIGHT_BAR_CODE,
  STEEL_WEIGHT_BAR_NAME,
  CASTING_BLANK_SETTLE_CODE,
  CASTING_BLANK_SETTLE_NAME,
  PIPE_TRIPLE_UNIT_CODE,
  PIPE_TRIPLE_UNIT_NAME,
  SIMPLE_UNIT_DEMO_CODE,
  SIMPLE_UNIT_DEMO_NAME,
} from '@/mock/stockBatchSeed'
import { createInboundOrder, createInboundLine } from '@/mock/inboundOrders'
import { createOutboundOrder, createOutboundLine } from '@/mock/outboundOrders'
import { MATERIAL_REQ_MODES, MATERIAL_REQ_AUDIT } from '@/mock/mobileMaterialReqSeed'
import { createEmptyWorkOrderProcessExtras } from '@/utils/workOrderProcessDisplay'
import { syncWorkOrderBlankingMaterials } from '@/utils/blankingSettleMaterial'

export const MULTI_UNIT_FLOW_IDS = {
  workOrder: 'wo-mu-flow-001',
  materialReq: 'mr-mu-flow-001',
  inboundDual: 'ib-mu-flow-dual',
  inboundSettle: 'ib-mu-flow-settle',
  inboundTriple: 'ib-mu-flow-triple',
  inboundSingle: 'ib-mu-flow-single',
  outboundPending: 'ob-mu-flow-pend-1',
  outboundWhole: 'ob-mu-flow-issue-whole',
  outboundPartial: 'ob-mu-flow-issue-partial',
  cutSettlePending: 'cs-mu-flow-001',
  cutSettleDone: 'cs-mu-flow-002',
  batchRemnant: 'bat-mu-flow-pipe-rem-25',
  batchLong: 'bat-mu-flow-pipe-10',
  batchLineWhole: 'bat-mu-flow-line-pipe-9',
  batchPlate: 'bat-mu-flow-plate-24',
  batchWeight: 'bat-mu-flow-weight-48',
}

const ALL_DEMO_IDS = Object.values(MULTI_UNIT_FLOW_IDS)

function today() {
  return dayjs().format('YYYY-MM-DD')
}

function nowTime(h = '09:30:00') {
  return `${today()} ${h}`
}

function dualInboundLine(partial = {}) {
  return createInboundLine({
    isVariableLength: true,
    lineSource: '采购',
    ...partial,
  })
}

function blankingProcess(index = 1) {
  return {
    id: `mu-flow-step-xl-${index}`,
    index,
    name: '下料',
    processCode: 'OP-XL-01',
    isBlanking: true,
    hasFeeding: false,
    resourceType: '工人',
    executors: ['张三'],
    blankingMaterials: [],
    ...createEmptyWorkOrderProcessExtras(),
    feedingMaterials: [],
  }
}

function followProcesses(startIndex = 2) {
  return [
    {
      id: `mu-flow-step-jj-${startIndex}`,
      index: startIndex,
      name: '机加',
      processCode: 'OP-JJ-01',
      isBlanking: false,
      hasFeeding: true,
      resourceType: '工人',
      executors: [],
      blankingMaterials: [],
      ...createEmptyWorkOrderProcessExtras(),
      feedingMaterials: [],
    },
    {
      id: `mu-flow-step-zz-${startIndex + 1}`,
      index: startIndex + 1,
      name: '装配',
      processCode: 'OP-ZZ-01',
      isBlanking: false,
      hasFeeding: false,
      resourceType: '工人小组',
      executors: [],
      blankingMaterials: [],
      ...createEmptyWorkOrderProcessExtras(),
      feedingMaterials: [],
    },
  ]
}

function componentLine(id, code, name, unit, unitQty, extra = {}) {
  return {
    id,
    itemCode: code,
    itemName: name,
    itemType: '物料',
    unit,
    unitQty,
    requiredQty: unitQty,
    needsBlankingSettle: extra.needsBlankingSettle !== false,
    ...extra,
  }
}

function upsertById(list, demos, idKey = 'id') {
  const out = Array.isArray(list) ? [...list] : []
  demos.forEach((demo) => {
    const idx = out.findIndex((row) => row?.[idKey] === demo[idKey])
    if (idx === -1) out.unshift(demo)
    else out[idx] = { ...out[idx], ...demo, [idKey]: demo[idKey] }
  })
  return out
}

/** ——— 在库批次（FIFO / 余料优先 / 整出线边） ——— */
export function createMultiUnitFlowBatches() {
  const attrsPipe = { material: 'Q235', specModel: 'φ50×3' }
  return [
    {
      id: MULTI_UNIT_FLOW_IDS.batchRemnant,
      batchNo: 'B-260824-901',
      parentBatchId: '',
      warehouse: '原料仓',
      itemCode: STEEL_PIPE_CODE,
      itemName: STEEL_PIPE_NAME,
      currentLength: 2.5,
      unit: '米',
      status: '在库',
      sourceType: '余料回库',
      sourceDocNo: 'IN-MU-FLOW-REM',
      createdAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-08-20T08:00:00.000Z',
      attrs: attrsPipe,
      remark: '多单位流程：短余料，整批出时优先拣',
    },
    {
      id: MULTI_UNIT_FLOW_IDS.batchLong,
      batchNo: 'B-260824-902',
      parentBatchId: '',
      warehouse: '原料仓',
      itemCode: STEEL_PIPE_CODE,
      itemName: STEEL_PIPE_NAME,
      currentLength: 10,
      unit: '米',
      status: '在库',
      sourceType: '采购入库',
      sourceDocNo: 'IN-MU-FLOW-PIPE',
      createdAt: '2026-08-24T10:00:00.000Z',
      updatedAt: '2026-08-24T10:00:00.000Z',
      attrs: attrsPipe,
      remark: '多单位流程：较长整根，对照余料优先',
    },
    {
      id: MULTI_UNIT_FLOW_IDS.batchPlate,
      batchNo: 'B-260824-903',
      parentBatchId: '',
      warehouse: '原料仓',
      itemCode: STEEL_PLATE_CODE,
      itemName: STEEL_PLATE_NAME,
      currentLength: 2.4,
      unit: '㎡',
      status: '在库',
      sourceType: '采购入库',
      sourceDocNo: 'IN-MU-FLOW-PLATE',
      createdAt: '2026-08-24T11:00:00.000Z',
      updatedAt: '2026-08-24T11:00:00.000Z',
      attrs: { material: 'Q235', specModel: 'δ10' },
      remark: '多单位流程：板材双单位在库',
    },
    {
      id: MULTI_UNIT_FLOW_IDS.batchWeight,
      batchNo: 'B-260824-904',
      parentBatchId: '',
      warehouse: '原料仓',
      itemCode: STEEL_WEIGHT_BAR_CODE,
      itemName: STEEL_WEIGHT_BAR_NAME,
      currentLength: 48,
      unit: 'kg',
      status: '在库',
      sourceType: '采购入库',
      sourceDocNo: 'IN-MU-FLOW-WT',
      createdAt: '2026-08-24T11:30:00.000Z',
      updatedAt: '2026-08-24T11:30:00.000Z',
      attrs: { material: '40Cr', specModel: 'φ40' },
      remark: '多单位流程：按重双单位在库',
    },
    {
      id: MULTI_UNIT_FLOW_IDS.batchLineWhole,
      batchNo: 'B-260824-910',
      parentBatchId: MULTI_UNIT_FLOW_IDS.batchLong,
      warehouse: '库线边仓',
      itemCode: STEEL_PIPE_CODE,
      itemName: STEEL_PIPE_NAME,
      currentLength: 9,
      unit: '米',
      status: '在库',
      sourceType: '领料出库转入',
      sourceDocNo: 'OUT-MU-FLOW-WHOLE',
      createdAt: '2026-08-25T09:10:00.000Z',
      updatedAt: '2026-08-25T09:10:00.000Z',
      attrs: attrsPipe,
      remark: '整批领入线边，待下料结算回余料',
    },
  ]
}

/** ——— 入库（待处理，覆盖多口径） ——— */
export function createMultiUnitFlowInboundOrders() {
  const d = today()
  return [
    createInboundOrder({
      id: MULTI_UNIT_FLOW_IDS.inboundDual,
      docNo: 'MU-IB-DUAL-001',
      inboundType: '采购入库',
      status: '待处理',
      warehouse: '原料仓',
      warehouseKeeper: 'admin1',
      inboundDate: d,
      deliveryDate: d,
      itemType: '物料',
      supplier: '钢材供应商甲',
      sourceOrderNo: 'PO-MU-FLOW-DUAL',
      sourceType: '采购订单',
      handler: 'admin1',
      creator: '管理员',
      createdAt: nowTime('08:15:00'),
      remark: '【多单位流程】双单位：采购=根 → 库存=米（一批一码合计）',
      lineItems: [
        dualInboundLine({
          id: 'ib-mu-flow-dual-l1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          barcodeType: '一批一码',
          purchaseUnit: '根',
          purchaseQty: 3,
          unit: '米',
          stockUnit: '米',
          inboundMeasureMode: 'length',
          inboundEntryMode: 'total',
          totalValue: 36,
          qty: 36,
          settleUnit: '',
          unitPrice: 85,
          totalPrice: 3060,
          warehouse: '原料仓',
          locationNo: 'MU-A-01',
        }),
      ],
    }),
    createInboundOrder({
      id: MULTI_UNIT_FLOW_IDS.inboundSettle,
      docNo: 'MU-IB-SETTLE-001',
      inboundType: '采购入库',
      status: '待处理',
      warehouse: '原料仓',
      warehouseKeeper: 'admin1',
      inboundDate: d,
      deliveryDate: d,
      itemType: '物料',
      supplier: '铸造厂',
      sourceOrderNo: 'PO-MU-FLOW-SETTLE',
      sourceType: '采购订单',
      handler: 'admin1',
      creator: '管理员',
      createdAt: nowTime('08:25:00'),
      remark: '【多单位流程】库存=件，结算=kg（浮动重量计价）',
      lineItems: [
        createInboundLine({
          id: 'ib-mu-flow-settle-l1',
          itemCode: CASTING_BLANK_SETTLE_CODE,
          itemName: CASTING_BLANK_SETTLE_NAME,
          specModel: '泵体',
          material: 'HT250',
          qty: 8,
          unit: '件',
          purchaseUnit: '件',
          purchaseQty: 8,
          isVariableLength: false,
          settleUnit: 'kg',
          settleConvertType: 'floating',
          settleQty: 98.4,
          standardUnitWeight: 12.3,
          unitPrice: 8.5,
          totalPrice: 836.4,
          warehouse: '原料仓',
          locationNo: 'MU-B-01',
          lineSource: '采购',
        }),
      ],
    }),
    createInboundOrder({
      id: MULTI_UNIT_FLOW_IDS.inboundTriple,
      docNo: 'MU-IB-TRIPLE-001',
      inboundType: '采购入库',
      status: '待处理',
      warehouse: '原料仓',
      warehouseKeeper: 'admin1',
      inboundDate: d,
      deliveryDate: d,
      itemType: '物料',
      supplier: '钢材供应商乙',
      sourceOrderNo: 'PO-MU-FLOW-TRIPLE',
      sourceType: '采购订单',
      handler: 'admin1',
      creator: '管理员',
      createdAt: nowTime('08:35:00'),
      remark: '【多单位流程】三口径：采购=根 / 库存=米 / 结算=kg',
      lineItems: [
        dualInboundLine({
          id: 'ib-mu-flow-triple-l1',
          itemCode: PIPE_TRIPLE_UNIT_CODE,
          itemName: PIPE_TRIPLE_UNIT_NAME,
          specModel: 'φ50',
          material: 'Q235',
          barcodeType: '一批一码',
          purchaseUnit: '根',
          purchaseQty: 2,
          unit: '米',
          stockUnit: '米',
          inboundMeasureMode: 'length',
          inboundEntryMode: 'total',
          totalValue: 24,
          qty: 24,
          settleUnit: 'kg',
          settleConvertType: 'floating',
          settleQty: 37.2,
          unitPrice: 6.8,
          totalPrice: 252.96,
          warehouse: '原料仓',
          locationNo: 'MU-C-01',
        }),
      ],
    }),
    createInboundOrder({
      id: MULTI_UNIT_FLOW_IDS.inboundSingle,
      docNo: 'MU-IB-SINGLE-001',
      inboundType: '采购入库',
      status: '待处理',
      warehouse: '原料仓',
      warehouseKeeper: 'admin1',
      inboundDate: d,
      deliveryDate: d,
      itemType: '物料',
      supplier: '轴承专营店',
      sourceOrderNo: 'PO-MU-FLOW-SINGLE',
      sourceType: '采购订单',
      handler: 'admin1',
      creator: '管理员',
      createdAt: nowTime('08:45:00'),
      remark: '【多单位流程】对照：单单位轴承（采购=库存=件，普通料不走下料结算）',
      lineItems: [
        createInboundLine({
          id: 'ib-mu-flow-single-l1',
          itemCode: SIMPLE_UNIT_DEMO_CODE,
          itemName: SIMPLE_UNIT_DEMO_NAME,
          specModel: '6205-2RS',
          material: 'GCr15',
          qty: 40,
          unit: '件',
          purchaseUnit: '件',
          purchaseQty: 40,
          isVariableLength: false,
          settleUnit: '',
          unitPrice: 28,
          totalPrice: 1120,
          warehouse: '原料仓',
          locationNo: 'MU-D-01',
          lineSource: '采购',
        }),
      ],
    }),
  ]
}

/** ——— 工单（执行中 + 下料工序） ——— */
export function createMultiUnitFlowWorkOrders() {
  const d = today()
  const end = dayjs().add(10, 'day').format('YYYY-MM-DD')
  const wo = {
    id: MULTI_UNIT_FLOW_IDS.workOrder,
    code: 'WO-MU-FLOW-001',
    name: '泵支架多单位领料演示工单',
    productName: '泵支架总成',
    materialCode: 'CP-MU-FRAME-01',
    orderCategory: '生产工单',
    status: '执行中',
    scheduleQty: 5,
    planQty: 5,
    workCenter: '机加车间',
    bom: '泵支架总成',
    bomId: '',
    bomLabel: '泵支架总成',
    warehouse: '半成品仓',
    urgency: '普通',
    planDateRange: [d, end],
    remark: '【多单位流程】执行中；含下料工序；BOM 含需下料结算钢管 + 普通轴承',
    processRouteName: '机加标准路线',
    source: 'multi-unit-flow-demo',
    sourceOrderNo: 'SO-MU-FLOW-001',
    owner: 'admin1',
    componentLines: [
      componentLine('mu-comp-pipe', STEEL_PIPE_CODE, STEEL_PIPE_NAME, '米', 1.2, {
        specModel: 'φ50×3',
        material: 'Q235',
        blankLength: 1.2,
        blankSizeText: '长 1200 mm',
      }),
      componentLine('mu-comp-plate', STEEL_PLATE_CODE, STEEL_PLATE_NAME, '㎡', 0.4, {
        specModel: 'δ10',
        material: 'Q235',
        blankSizeMode: 'plate',
        blankSizeText: '长 800 mm × 宽 500 mm',
      }),
      componentLine('mu-comp-bearing', SIMPLE_UNIT_DEMO_CODE, SIMPLE_UNIT_DEMO_NAME, '件', 2, {
        needsBlankingSettle: false,
        specModel: '6205-2RS',
        material: 'GCr15',
      }),
    ],
    processes: [blankingProcess(1), ...followProcesses(2)],
    scheduleBatches: [],
    activeScheduleBatchId: '',
    createdAt: d,
  }
  syncWorkOrderBlankingMaterials(wo)
  return [wo]
}

/** ——— 领料申请 ——— */
export function createMultiUnitFlowMaterialReqs() {
  return [
    {
      id: MULTI_UNIT_FLOW_IDS.materialReq,
      reqNo: 'ML-MU-FLOW-001',
      mode: MATERIAL_REQ_MODES.WORK_ORDER,
      workOrderId: MULTI_UNIT_FLOW_IDS.workOrder,
      workOrderCode: 'WO-MU-FLOW-001',
      workOrderName: '泵支架多单位领料演示工单',
      workOrderIds: [MULTI_UNIT_FLOW_IDS.workOrder],
      workOrders: [
        {
          id: MULTI_UNIT_FLOW_IDS.workOrder,
          code: 'WO-MU-FLOW-001',
          productName: '泵支架总成',
          productCode: 'CP-MU-FRAME-01',
          planQty: 5,
          scheduleQty: 5,
        },
      ],
      salesOrderNo: 'SO-MU-FLOW-001',
      productName: '泵支架总成',
      orderCategory: '生产工单',
      workshop: '机加车间',
      receiveWarehouse: '库线边仓',
      remark: '【多单位流程】钢管需下料结算 + 轴承普通 FIFO；审核通过已生成出库',
      lineCount: 3,
      totalQty: 11.4,
      auditStatus: MATERIAL_REQ_AUDIT.APPROVED,
      rejectReason: '',
      outboundId: MULTI_UNIT_FLOW_IDS.outboundPending,
      outboundDocNo: 'MU-OB-PEND-001',
      createdAt: nowTime('09:00:00'),
      applicant: '张三',
      lines: [
        {
          id: 'mr-mu-flow-l1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          itemType: '物料',
          specModel: 'φ50×3',
          material: 'Q235',
          drawingNo: '',
          shipQty: 6,
          unit: '米',
          shipWarehouse: '原料仓',
          warehouseStockQty: 40,
          lineSource: '工单BOM',
          isVariableLength: true,
          needsBlankingSettle: true,
          blankSizeText: '长 1200 mm',
          blankLength: 1.2,
          sourceWorkOrders: [
            {
              workOrderId: MULTI_UNIT_FLOW_IDS.workOrder,
              workOrderCode: 'WO-MU-FLOW-001',
              qty: 6,
            },
          ],
        },
        {
          id: 'mr-mu-flow-l2',
          itemCode: STEEL_PLATE_CODE,
          itemName: STEEL_PLATE_NAME,
          itemType: '物料',
          specModel: 'δ10',
          material: 'Q235',
          drawingNo: '',
          shipQty: 2,
          unit: '㎡',
          shipWarehouse: '原料仓',
          warehouseStockQty: 10,
          lineSource: '工单BOM',
          isVariableLength: true,
          needsBlankingSettle: true,
          blankSizeText: '长 800 mm × 宽 500 mm',
          sourceWorkOrders: [
            {
              workOrderId: MULTI_UNIT_FLOW_IDS.workOrder,
              workOrderCode: 'WO-MU-FLOW-001',
              qty: 2,
            },
          ],
        },
        {
          id: 'mr-mu-flow-l3',
          itemCode: SIMPLE_UNIT_DEMO_CODE,
          itemName: SIMPLE_UNIT_DEMO_NAME,
          itemType: '物料',
          specModel: '6205-2RS',
          material: 'GCr15',
          drawingNo: '',
          shipQty: 10,
          unit: '件',
          shipWarehouse: '原料仓',
          warehouseStockQty: 80,
          lineSource: '工单BOM',
          needsBlankingSettle: false,
          sourceWorkOrders: [
            {
              workOrderId: MULTI_UNIT_FLOW_IDS.workOrder,
              workOrderCode: 'WO-MU-FLOW-001',
              qty: 10,
            },
          ],
        },
      ],
    },
  ]
}

/** ——— 出库 ——— */
export function createMultiUnitFlowOutboundOrders() {
  const d = today()
  return [
    createOutboundOrder({
      id: MULTI_UNIT_FLOW_IDS.outboundPending,
      docNo: 'MU-OB-PEND-001',
      outboundType: '领料出库',
      warehouse: '原料仓',
      receiveWarehouse: '库线边仓',
      requisitionDept: '机加车间',
      workshop: '机加车间',
      sourceOrderNo: 'ML-MU-FLOW-001',
      materialReqId: MULTI_UNIT_FLOW_IDS.materialReq,
      materialReqNo: 'ML-MU-FLOW-001',
      salesOrderNo: 'SO-MU-FLOW-001',
      status: '待出库',
      createdAt: d,
      remark:
        '【多单位流程】待出库：钢管/板材走增强拣批；轴承按简单 FIFO。可改 shipQty 后确认出库。',
      workOrders: [
        {
          id: MULTI_UNIT_FLOW_IDS.workOrder,
          code: 'WO-MU-FLOW-001',
          productName: '泵支架总成',
        },
      ],
      lineItems: [
        createOutboundLine({
          id: 'ob-mu-flow-pend-l1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          shipQty: 6,
          unit: '米',
          shipWarehouse: '原料仓',
          receiveWarehouse: '库线边仓',
          lineSource: '领料申请',
          sourceDocNo: 'ML-MU-FLOW-001',
          isVariableLength: true,
          needsBlankingSettle: true,
          demandMeters: 6,
          blankSizeText: '长 1200 mm ×5 套',
          blankSizeMode: 'length',
          blankLength: 1.2,
          lineStatus: '待出库',
        }),
        createOutboundLine({
          id: 'ob-mu-flow-pend-l2',
          itemCode: STEEL_PLATE_CODE,
          itemName: STEEL_PLATE_NAME,
          specModel: 'δ10',
          material: 'Q235',
          shipQty: 2,
          unit: '㎡',
          shipWarehouse: '原料仓',
          receiveWarehouse: '库线边仓',
          lineSource: '领料申请',
          sourceDocNo: 'ML-MU-FLOW-001',
          isVariableLength: true,
          needsBlankingSettle: true,
          demandMeters: 2,
          blankSizeText: '长 800 mm × 宽 500 mm',
          blankSizeMode: 'plate',
          lineStatus: '待出库',
        }),
        createOutboundLine({
          id: 'ob-mu-flow-pend-l3',
          itemCode: SIMPLE_UNIT_DEMO_CODE,
          itemName: SIMPLE_UNIT_DEMO_NAME,
          specModel: '6205-2RS',
          material: 'GCr15',
          shipQty: 10,
          unit: '件',
          shipWarehouse: '原料仓',
          receiveWarehouse: '库线边仓',
          lineSource: '领料申请',
          sourceDocNo: 'ML-MU-FLOW-001',
          needsBlankingSettle: false,
          lineStatus: '待出库',
        }),
      ],
    }),
    createOutboundOrder({
      id: MULTI_UNIT_FLOW_IDS.outboundWhole,
      docNo: 'MU-OB-ISSUE-WHOLE',
      outboundType: '领料出库',
      warehouse: '原料仓',
      receiveWarehouse: '库线边仓',
      stockTransferredToReceive: true,
      requisitionDept: '机加车间',
      workshop: '机加车间',
      sourceOrderNo: 'ML-MU-FLOW-WHOLE',
      status: '已出库',
      createdAt: d,
      completedAt: d,
      auditDate: d,
      outboundTime: nowTime('09:10:00'),
      remark: '【多单位流程】已整批出：实发 9m > 需求 5m，待下料结算回余料',
      workOrders: [
        {
          id: MULTI_UNIT_FLOW_IDS.workOrder,
          code: 'WO-MU-FLOW-001',
          productName: '泵支架总成',
        },
      ],
      lineItems: [
        createOutboundLine({
          id: 'ob-mu-flow-whole-l1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          shipQty: 9,
          unit: '米',
          shipWarehouse: '原料仓',
          receiveWarehouse: '库线边仓',
          lineSource: '领料申请',
          sourceDocNo: 'ML-MU-FLOW-WHOLE',
          isVariableLength: true,
          needsBlankingSettle: true,
          demandMeters: 5,
          blankSizeText: '长 5000 mm',
          blankSizeMode: 'length',
          dualUnitIssueStrategy: 'whole_with_remnant',
          pickedBatchId: MULTI_UNIT_FLOW_IDS.batchLineWhole,
          pickedBatchNo: 'B-260824-910',
          pickedLength: 9,
          issuedBatchNo: 'B-260824-910',
          receiveBatchIds: [MULTI_UNIT_FLOW_IDS.batchLineWhole],
          batchAllocations: [
            {
              batchId: MULTI_UNIT_FLOW_IDS.batchLineWhole,
              batchNo: 'B-260824-910',
              qty: 9,
              unit: '米',
            },
          ],
          lineStatus: '已出库',
        }),
      ],
    }),
    createOutboundOrder({
      id: MULTI_UNIT_FLOW_IDS.outboundPartial,
      docNo: 'MU-OB-ISSUE-PARTIAL',
      outboundType: '领料出库',
      warehouse: '原料仓',
      receiveWarehouse: '库线边仓',
      stockTransferredToReceive: true,
      requisitionDept: '机加车间',
      workshop: '机加车间',
      sourceOrderNo: 'ML-MU-FLOW-PARTIAL',
      status: '已出库',
      createdAt: d,
      completedAt: d,
      auditDate: d,
      outboundTime: nowTime('09:20:00'),
      remark: '【多单位流程】已部分出：实发合计 = shipQty(4m)，不因整根多扣',
      workOrders: [
        {
          id: MULTI_UNIT_FLOW_IDS.workOrder,
          code: 'WO-MU-FLOW-001',
          productName: '泵支架总成',
        },
      ],
      lineItems: [
        createOutboundLine({
          id: 'ob-mu-flow-partial-l1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          shipQty: 4,
          unit: '米',
          shipWarehouse: '原料仓',
          receiveWarehouse: '库线边仓',
          lineSource: '领料申请',
          sourceDocNo: 'ML-MU-FLOW-PARTIAL',
          isVariableLength: true,
          needsBlankingSettle: true,
          demandMeters: 4,
          blankSizeText: '长 4000 mm',
          blankSizeMode: 'length',
          dualUnitIssueStrategy: 'partial',
          pickedBatchId: 'bat-seed-pipe-6',
          pickedBatchNo: 'B-260701-002',
          pickedLength: 4,
          batchAllocations: [
            { batchId: 'bat-seed-pipe-6', batchNo: 'B-260701-002', qty: 4, unit: '米' },
          ],
          lineStatus: '已出库',
        }),
      ],
    }),
  ]
}

/** ——— 下料结算 ——— */
export function createMultiUnitFlowCutSettleRecords() {
  return [
    {
      id: MULTI_UNIT_FLOW_IDS.cutSettlePending,
      docNo: 'CS-MU-FLOW-001',
      status: '待确认',
      outboundId: MULTI_UNIT_FLOW_IDS.outboundWhole,
      outboundDocNo: 'MU-OB-ISSUE-WHOLE',
      sourceOrderNo: 'ML-MU-FLOW-WHOLE',
      shipWarehouse: '原料仓',
      receiveWarehouse: '库线边仓',
      outboundTime: nowTime('09:10:00'),
      remark: '【多单位流程】整出待结算：实耗 5m，余料 4m 回原料仓',
      creator: 'admin1',
      createdAt: nowTime('09:25:00'),
      confirmedAt: '',
      confirmer: '',
      remnantInboundDocNo: '',
      lines: [
        {
          id: 'csl-mu-flow-001-1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          drawingNo: '',
          shipWarehouse: '原料仓',
          warehouse: '库线边仓',
          remnantReturnWarehouse: '原料仓',
          pickedBatchId: MULTI_UNIT_FLOW_IDS.batchLineWhole,
          pickedBatchNo: 'B-260824-910',
          pickedLength: 9,
          demandMeters: 5,
          actualConsumeMeters: 5,
          remnantLength: 4,
          workOrderNo: 'WO-MU-FLOW-001',
          dualUnitIssueStrategy: 'whole_with_remnant',
          blankSizeText: '长 5000 mm',
        },
      ],
    },
    {
      id: MULTI_UNIT_FLOW_IDS.cutSettleDone,
      docNo: 'CS-MU-FLOW-002',
      status: '已确认',
      outboundId: MULTI_UNIT_FLOW_IDS.outboundPartial,
      outboundDocNo: 'MU-OB-ISSUE-PARTIAL',
      sourceOrderNo: 'ML-MU-FLOW-PARTIAL',
      shipWarehouse: '原料仓',
      receiveWarehouse: '库线边仓',
      outboundTime: nowTime('09:20:00'),
      remark: '【多单位流程】部分出对照：实发=需求，无余料回库（已确认样例）',
      creator: 'admin1',
      createdAt: nowTime('09:40:00'),
      confirmedAt: nowTime('10:05:00'),
      confirmer: 'admin1',
      remnantInboundDocNo: '',
      lines: [
        {
          id: 'csl-mu-flow-002-1',
          itemCode: STEEL_PIPE_CODE,
          itemName: STEEL_PIPE_NAME,
          specModel: 'φ50×3',
          material: 'Q235',
          drawingNo: '',
          shipWarehouse: '原料仓',
          warehouse: '库线边仓',
          remnantReturnWarehouse: '原料仓',
          pickedBatchId: 'bat-seed-pipe-6',
          pickedBatchNo: 'B-260701-002',
          pickedLength: 4,
          demandMeters: 4,
          actualConsumeMeters: 4,
          remnantLength: 0,
          workOrderNo: 'WO-MU-FLOW-001',
          dualUnitIssueStrategy: 'partial',
          blankSizeText: '长 4000 mm',
        },
      ],
    },
  ]
}

export function ensureMultiUnitFlowBatches(batches = []) {
  return upsertById(batches, createMultiUnitFlowBatches())
}

export function ensureMultiUnitFlowInboundOrders(orders = []) {
  return upsertById(orders, createMultiUnitFlowInboundOrders())
}

export function ensureMultiUnitFlowOutboundOrders(orders = []) {
  return upsertById(orders, createMultiUnitFlowOutboundOrders())
}

export function ensureMultiUnitFlowCutSettleRecords(records = []) {
  return upsertById(records, createMultiUnitFlowCutSettleRecords())
}

export function ensureMultiUnitFlowMaterialReqs(items = []) {
  return upsertById(items, createMultiUnitFlowMaterialReqs())
}

export function ensureMultiUnitFlowWorkOrders(orders = []) {
  try {
    return upsertById(orders, createMultiUnitFlowWorkOrders())
  } catch (e) {
    console.warn('[multiUnitFlowDemoSeed] ensure work orders failed', e)
    return Array.isArray(orders) ? orders : []
  }
}

export function isMultiUnitFlowDemoId(id) {
  return ALL_DEMO_IDS.includes(id)
}

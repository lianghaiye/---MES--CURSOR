/**
 * 生产工单：待下发 + 含「下料工序」演示
 * 打开下发 TAB 可看到「下料物料」列（BOM 中勾选「需要下料结算」的子件）
 */

import dayjs from 'dayjs'
import {
  STEEL_PIPE_CODE,
  STEEL_PIPE_NAME,
  STEEL_PLATE_CODE,
  STEEL_PLATE_NAME,
  STEEL_WEIGHT_BAR_CODE,
  STEEL_WEIGHT_BAR_NAME,
} from '@/mock/stockBatchSeed'
import { createEmptyWorkOrderProcessExtras } from '@/utils/workOrderProcessDisplay'
import { syncWorkOrderBlankingMaterials } from '@/utils/blankingSettleMaterial'

export const BLANKING_DISPATCH_DEMO_IDS = [
  'wo-blanking-dispatch-001',
  'wo-blanking-dispatch-002',
  'wo-blanking-dispatch-003',
]

function blankingProcess(index = 1) {
  return {
    id: `blanking-dispatch-step-xl-${index}`,
    index,
    name: '下料',
    processCode: 'OP-XL-01',
    isBlanking: true,
    hasFeeding: false,
    resourceType: '工人',
    executors: [],
    blankingMaterials: [],
    ...createEmptyWorkOrderProcessExtras(),
    feedingMaterials: [],
  }
}

function followProcesses(startIndex = 2) {
  return [
    {
      id: `blanking-dispatch-step-jg-${startIndex}`,
      index: startIndex,
      name: '机加工',
      processCode: 'OP-JG-03',
      isBlanking: false,
      hasFeeding: false,
      resourceType: '工人',
      executors: [],
      ...createEmptyWorkOrderProcessExtras(),
      feedingMaterials: [],
    },
    {
      id: `blanking-dispatch-step-rk-${startIndex + 1}`,
      index: startIndex + 1,
      name: '入库',
      processCode: 'OP-RK-05',
      isBlanking: false,
      hasFeeding: false,
      resourceType: '工人',
      executors: [],
      ...createEmptyWorkOrderProcessExtras(),
      feedingMaterials: [],
    },
  ]
}

function componentLine(id, code, name, unit, unitQty, extra = {}) {
  return {
    id,
    itemCode: code,
    materialCode: code,
    itemName: name,
    specModel: extra.specModel || '',
    material: extra.material || '',
    drawingNo: extra.drawingNo || '',
    unit,
    unitQty,
    requiredQty: unitQty,
    needsBlankingSettle: extra.needsBlankingSettle !== false,
    ...extra,
  }
}

function createBlankingDispatchDemoOrders() {
  const today = dayjs().format('YYYY-MM-DD')
  const end = dayjs().add(14, 'day').format('YYYY-MM-DD')

  const orders = [
    {
      id: BLANKING_DISPATCH_DEMO_IDS[0],
      code: 'SCGD20260824001',
      name: '支架管件下料生产工单',
      productName: '支架管件总成',
      materialCode: 'CP-BLANK-PIPE-01',
      orderCategory: '生产工单',
      status: '待下发',
      scheduleQty: 10,
      planQty: 10,
      workCenter: '机加车间',
      bom: '支架管件总成',
      bomId: '',
      bomLabel: '支架管件总成',
      warehouse: '半成品仓',
      urgency: '普通',
      planDateRange: [today, end],
      remark: '演示：待下发 + 下料工序；下发页展示钢管（需下料结算）',
      processRouteName: '机加标准路线',
      source: 'blanking-dispatch-demo',
      sourceOrderNo: 'SO20260824001',
      owner: 'admin1',
      componentLines: [
        componentLine('bd-001-pipe', STEEL_PIPE_CODE, STEEL_PIPE_NAME, '米', 2, {
          specModel: 'φ50×3',
          material: 'Q235',
        }),
        componentLine('bd-001-bolt', 'M-STD-M12', '六角螺栓 M12', '件', 8, {
          needsBlankingSettle: false,
          specModel: 'M12×40',
          material: '8.8级',
        }),
      ],
      processes: [blankingProcess(1), ...followProcesses(2)],
      scheduleBatches: [],
      activeScheduleBatchId: '',
      createdAt: today,
    },
    {
      id: BLANKING_DISPATCH_DEMO_IDS[1],
      code: 'SCGD20260824002',
      name: '底板组件下料生产工单',
      productName: '底板组件',
      materialCode: 'CP-BLANK-PLATE-01',
      orderCategory: '生产工单',
      status: '待下发',
      scheduleQty: 6,
      planQty: 6,
      workCenter: '下料班组',
      bom: '底板组件',
      bomLabel: '底板组件',
      warehouse: '半成品仓',
      urgency: '紧急',
      planDateRange: [today, end],
      remark: '演示：待下发 + 下料工序；下发页展示钢板（需下料结算）',
      processRouteName: '机加标准路线',
      source: 'blanking-dispatch-demo',
      sourceOrderNo: 'SO20260824002',
      owner: 'admin1',
      componentLines: [
        componentLine('bd-002-plate', STEEL_PLATE_CODE, STEEL_PLATE_NAME, '㎡', 1.2, {
          specModel: 'δ10',
          material: 'Q235',
        }),
        componentLine('bd-002-gasket', 'M-STD-PAD', '橡胶垫片', '件', 4, {
          needsBlankingSettle: false,
          specModel: 'φ80',
        }),
      ],
      processes: [blankingProcess(1), ...followProcesses(2)],
      scheduleBatches: [],
      activeScheduleBatchId: '',
      createdAt: today,
    },
    {
      id: BLANKING_DISPATCH_DEMO_IDS[2],
      code: 'SCGD20260824003',
      name: '轴套下料生产工单',
      productName: '轴套半成品',
      materialCode: 'CP-BLANK-BAR-01',
      orderCategory: '生产工单',
      status: '待下发',
      scheduleQty: 20,
      planQty: 20,
      workCenter: '机加车间',
      bom: '轴套半成品',
      bomLabel: '轴套半成品',
      warehouse: '半成品仓',
      urgency: '加急',
      planDateRange: [today, end],
      remark: '演示：待下发 + 下料工序；下发页同时展示钢管与圆钢（均需下料结算）',
      processRouteName: '机加标准路线',
      source: 'blanking-dispatch-demo',
      sourceOrderNo: 'SO20260824003',
      owner: 'admin1',
      componentLines: [
        componentLine('bd-003-bar', STEEL_WEIGHT_BAR_CODE, STEEL_WEIGHT_BAR_NAME, 'kg', 3.5, {
          specModel: 'φ40',
          material: '40Cr',
        }),
        componentLine('bd-003-pipe', STEEL_PIPE_CODE, STEEL_PIPE_NAME, '米', 0.8, {
          specModel: 'φ50×3',
          material: 'Q235',
        }),
        componentLine('bd-003-nut', 'M-STD-NUT-M16', '螺母 M16', '件', 4, {
          needsBlankingSettle: false,
        }),
      ],
      processes: [blankingProcess(1), ...followProcesses(2)],
      scheduleBatches: [],
      activeScheduleBatchId: '',
      createdAt: today,
    },
  ]

  orders.forEach((wo) => syncWorkOrderBlankingMaterials(wo))
  return orders
}

/** 写入/覆盖待下发下料演示工单 */
export function ensureBlankingDispatchDemoWorkOrders(orders) {
  try {
    const list = Array.isArray(orders) ? [...orders] : []
    const demos = createBlankingDispatchDemoOrders()
    demos.forEach((demo) => {
      const idx = list.findIndex((o) => o.id === demo.id || o.code === demo.code)
      if (idx === -1) list.unshift(demo)
      else list[idx] = { ...list[idx], ...demo, id: demo.id }
    })
    return list
  } catch (e) {
    console.warn('[blankingDispatchDemoSeed] ensure failed', e)
    return Array.isArray(orders) ? orders : []
  }
}

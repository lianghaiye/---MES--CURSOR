/** 领料申请演示：带 EBOM 下级物料的工单（componentLines） */

function materialLine(id, code, name, unitQty, extra = {}) {
  return {
    id,
    itemCode: code,
    materialCode: code,
    itemName: name,
    specModel: extra.specModel || '',
    material: extra.material || '',
    drawingNo: extra.drawingNo || '',
    unit: extra.unit || '件',
    unitQty,
  }
}

/** 离心泵类通用下级物料（两单有交集，便于演示批量合并与来源区分） */
function centrifugalPumpLines(prefix) {
  return [
    materialLine(`${prefix}-1`, 'M-MR-001', '泵体铸件', 1, {
      specModel: 'HT250',
      material: 'HT250',
      drawingNo: 'DWG-PB-001',
    }),
    materialLine(`${prefix}-2`, 'M-MR-002', '叶轮', 1, {
      specModel: 'φ280',
      material: 'ZG230-450',
      drawingNo: 'DWG-YL-002',
    }),
    materialLine(`${prefix}-3`, 'M-MR-003', '机械密封', 1, {
      specModel: '104-55',
      material: '碳化硅',
      drawingNo: 'DWG-MF-003',
    }),
    materialLine(`${prefix}-4`, 'M-MR-004', '轴承 6308', 2, {
      specModel: '6308',
      material: 'GCr15',
      drawingNo: 'DWG-ZC-004',
    }),
    materialLine(`${prefix}-5`, 'M-MR-005', '轴', 1, {
      specModel: 'φ45×480',
      material: '45#钢',
      drawingNo: 'DWG-ZHOU-005',
    }),
    materialLine(`${prefix}-6`, 'M-MR-006', '联轴器', 1, {
      specModel: 'ML3',
      material: '45#钢',
      drawingNo: 'DWG-LZQ-006',
    }),
  ]
}

function firePumpExtraLines(prefix) {
  return [
    materialLine(`${prefix}-7`, 'M-MR-051', '泵组主机', 1, {
      specModel: 'XBD5.0/20',
      material: 'QT500',
      drawingNo: 'DWG-XBD-051',
    }),
    materialLine(`${prefix}-8`, 'M-MR-052', '控制柜', 1, {
      specModel: 'XL-21',
      material: '冷轧板',
      drawingNo: 'DWG-KZ-052',
    }),
    materialLine(`${prefix}-9`, 'M-MR-053', '压力传感器', 2, {
      specModel: '0-1.6MPa',
      material: '不锈钢316',
      drawingNo: 'DWG-CGQ-053',
    }),
  ]
}

export const MATERIAL_REQ_DEMO_WORK_ORDER_IDS = [
  'wo-mr-demo-001',
  'wo-mr-demo-002',
  'wo-mr-demo-003',
]

export function createMaterialReqDemoWorkOrders() {
  return [
    {
      id: 'wo-mr-demo-001',
      code: 'WO-MR-20260720-001',
      name: '离心泵 KQ100 领料演示工单',
      productName: '离心泵',
      productSpec: 'KQ100-200',
      material: 'HT250',
      drawingNo: 'DWG-KQ100-200',
      materialCode: 'CP-KQ100-200',
      orderCategory: '生产工单',
      status: '执行中',
      progressLabel: '进行中',
      scheduleQty: 10,
      planQty: 10,
      actualQty: 2,
      workCenter: '装配车间',
      bom: '离心泵 EBOM',
      bomId: '',
      warehouse: '原料仓',
      urgency: '正常',
      planDateRange: ['2026-07-10', '2026-07-25'],
      remark: '领料申请演示：含 EBOM 下级物料',
      processRouteName: '装配标准路线',
      source: 'material-req-demo',
      sourceOrderNo: 'SO-MR-001',
      owner: 'admin1',
      componentLines: centrifugalPumpLines('wo-mr-demo-001'),
      ebomSnapshot: null,
      skipEbom: false,
      createdAt: '2026-07-10',
    },
    {
      id: 'wo-mr-demo-002',
      code: 'WO-MR-20260720-002',
      name: '离心泵 KQ80 领料演示工单',
      productName: '离心泵',
      productSpec: 'KQ80-160',
      material: 'HT250',
      drawingNo: 'DWG-KQ80-160',
      materialCode: 'CP-KQ80-160',
      orderCategory: '生产工单',
      status: '执行中',
      progressLabel: '进行中',
      scheduleQty: 5,
      planQty: 5,
      actualQty: 0,
      workCenter: '装配车间',
      bom: '离心泵 EBOM',
      bomId: '',
      warehouse: '原料仓',
      urgency: '加急',
      planDateRange: ['2026-07-12', '2026-07-28'],
      remark: '领料申请演示：与 001 有共用物料，批量合并时可看来源标签',
      processRouteName: '装配标准路线',
      source: 'material-req-demo',
      sourceOrderNo: 'SO-MR-002',
      owner: 'admin1',
      componentLines: centrifugalPumpLines('wo-mr-demo-002'),
      ebomSnapshot: null,
      skipEbom: false,
      createdAt: '2026-07-12',
    },
    {
      id: 'wo-mr-demo-003',
      code: 'WO-MR-20260720-003',
      name: '消防泵 领料演示工单',
      productName: '消防泵',
      productSpec: 'XBD5.0/20',
      material: 'QT500',
      drawingNo: 'DWG-XBD5.0-20',
      materialCode: 'CP-XBD-20',
      orderCategory: '生产工单',
      status: '执行中',
      progressLabel: '进行中',
      scheduleQty: 3,
      planQty: 3,
      actualQty: 0,
      workCenter: '机加车间',
      bom: '消防泵 EBOM',
      bomId: '',
      warehouse: '原料仓',
      urgency: '正常',
      planDateRange: ['2026-07-15', '2026-07-30'],
      remark: '领料申请演示：含部分独有物料',
      processRouteName: '机加标准路线',
      source: 'material-req-demo',
      sourceOrderNo: 'SO-MR-003',
      owner: 'admin1',
      componentLines: [
        ...centrifugalPumpLines('wo-mr-demo-003').slice(0, 3),
        ...firePumpExtraLines('wo-mr-demo-003'),
      ],
      ebomSnapshot: null,
      skipEbom: false,
      createdAt: '2026-07-15',
    },
  ]
}

/** 注入/刷新领料演示工单（保证始终带 componentLines） */
export function ensureMaterialReqDemoWorkOrders(orders = []) {
  const demos = createMaterialReqDemoWorkOrders()
  const demoIds = new Set(demos.map((d) => d.id))
  const rest = (orders || []).filter((o) => !demoIds.has(o.id))
  return [...demos, ...rest]
}

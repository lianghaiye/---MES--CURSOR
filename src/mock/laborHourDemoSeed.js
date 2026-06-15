/**
 * 工时管理演示数据：物料工时配置 + 真实工单，一一对应。
 * 覆盖四种组合：批量计件/时长报工 × 计件工资/计时工资
 */
let laborRowSeq = 0

function createDemoLaborRow(partial) {
  laborRowSeq += 1
  return {
    id: `labor-demo-${laborRowSeq}`,
    processName: partial.processName,
    reportType: partial.reportType,
    salaryMethod: partial.salaryMethod,
    standardMinutesPerPiece: partial.standardMinutesPerPiece ?? 0,
    setupMinutesPerBatch: partial.setupMinutesPerBatch ?? 0,
    standardHourlyRate: partial.standardHourlyRate ?? 0,
    pieceRate: partial.pieceRate ?? 0,
  }
}

/** 参与工时核算的工单 ID（其余工单不同步到工时管理） */
export const LABOR_DEMO_WORK_ORDER_IDS = [
  'wo-lh-demo-1',
  'wo-lh-demo-2',
  'wo-lh-demo-3',
  'wo-lh-demo-4',
]

export const DEMO_MATERIAL_DEFS = [
  {
    code: 'LH-MAT-01',
    name: '工时演示-批量计件计件',
    specModel: 'DEMO-BC-P',
    reportType: '批量计件',
    salaryMethod: '计件工资',
    processName: '机加工',
    standardMinutesPerPiece: 30,
    setupMinutesPerBatch: 40,
    standardHourlyRate: 40,
    pieceRate: 15,
  },
  {
    code: 'LH-MAT-02',
    name: '工时演示-批量计件计时',
    specModel: 'DEMO-BC-T',
    reportType: '批量计件',
    salaryMethod: '计时工资',
    processName: '领料',
    standardMinutesPerPiece: 12,
    setupMinutesPerBatch: 50,
    standardHourlyRate: 38,
    pieceRate: 0,
  },
  {
    code: 'LH-MAT-03',
    name: '工时演示-时长计件',
    specModel: 'DEMO-DU-P',
    reportType: '时长报工',
    salaryMethod: '计件工资',
    processName: '调试',
    standardMinutesPerPiece: 10,
    setupMinutesPerBatch: 15,
    standardHourlyRate: 42,
    pieceRate: 8,
  },
  {
    code: 'LH-MAT-04',
    name: '工时演示-时长计时',
    specModel: 'DEMO-DU-T',
    reportType: '时长报工',
    salaryMethod: '计时工资',
    processName: '检验',
    standardMinutesPerPiece: 8,
    setupMinutesPerBatch: 10,
    standardHourlyRate: 45,
    pieceRate: 0,
  },
]

function toBomMaterial(def) {
  return {
    id: `mat-${def.code}`,
    code: def.code,
    name: def.name,
    barcodeType: '一物一码',
    materialType: '半成品',
    supplyForm: '自制件',
    categoryKey: 'cat-006',
    parentCategoryKey: 'cat-006',
    categoryCode: '006',
    categoryName: '半成品',
    specModel: def.specModel,
    material: '',
    inventoryUnit: '件',
    unitPrice: 0,
    requisitionAttr: '',
    isProductMaterial: false,
    remark: `工时演示物料（${def.reportType}+${def.salaryMethod}）`,
    createdAt: '2026-05-28',
    laborEnabled: true,
    laborRows: [
      createDemoLaborRow({
        processName: def.processName,
        reportType: def.reportType,
        salaryMethod: def.salaryMethod,
        standardMinutesPerPiece: def.standardMinutesPerPiece,
        setupMinutesPerBatch: def.setupMinutesPerBatch,
        standardHourlyRate: def.standardHourlyRate,
        pieceRate: def.pieceRate,
      }),
    ],
  }
}

export const laborDemoBomMaterials = DEMO_MATERIAL_DEFS.map(toBomMaterial)

/** 供 laborConfigSeed 按编码覆盖工时配置 */
export const LABOR_CONFIG_BY_CODE = Object.fromEntries(
  laborDemoBomMaterials.map((m) => [
    m.code,
    {
      laborEnabled: true,
      laborRows: m.laborRows.map((row) => ({ ...row })),
    },
  ]),
)

function demoProcess(name, executor, reportDuration = 0) {
  return {
    id: `lh-proc-${name}`,
    index: 1,
    name,
    processCode: '',
    executors: [executor],
    reportDuration,
  }
}

function baseWorkOrderFields(def, partial) {
  return {
    materialCode: def.code,
    productName: def.name,
    specModel: def.specModel,
    scheduleQty: partial.scheduleQty ?? 10,
    planQty: partial.scheduleQty ?? 10,
    workCenter: partial.workCenter ?? '默认工厂',
    warehouse: '半成品仓',
    urgency: '正常',
    source: 'manual',
    createdAt: partial.createdAt ?? '2026-05-27',
    ...partial,
  }
}

/** 生产工单：演示 批量计件+计件、时长报工+计件、时长报工+计时 */
export function createLaborDemoProductionOrders() {
  const d1 = DEMO_MATERIAL_DEFS[0]
  const d3 = DEMO_MATERIAL_DEFS[2]
  const d4 = DEMO_MATERIAL_DEFS[3]
  return [
    baseWorkOrderFields(d1, {
      id: 'wo-lh-demo-1',
      code: 'WO202605270-LH01',
      name: `${d1.name}生产工单`,
      orderCategory: '生产工单',
      status: '执行中',
      processRouteName: '机加标准路线',
      sourceOrderNo: 'SO-LH-001',
      processes: [demoProcess(d1.processName, '张三')],
    }),
    baseWorkOrderFields(d3, {
      id: 'wo-lh-demo-3',
      code: 'WO202605270-LH03',
      name: `${d3.name}生产工单`,
      orderCategory: '生产工单',
      status: '完成',
      workCenter: '装配车间',
      processRouteName: '装配标准路线',
      sourceOrderNo: 'SO-LH-003',
      scheduleQty: 6,
      processes: [demoProcess(d3.processName, '李四', 3.5)],
    }),
    baseWorkOrderFields(d4, {
      id: 'wo-lh-demo-4',
      code: 'WO202605270-LH04',
      name: `${d4.name}生产工单`,
      orderCategory: '生产工单',
      status: '执行中',
      workCenter: '质检中心',
      processRouteName: '机加标准路线',
      sourceOrderNo: 'SO-LH-004',
      scheduleQty: 5,
      processes: [demoProcess(d4.processName, '王检验', 2.5)],
    }),
  ]
}

/** 总装工单：演示 批量计件+计时 */
export function createLaborDemoAssemblyOrders() {
  const d2 = DEMO_MATERIAL_DEFS[1]
  return [
    baseWorkOrderFields(d2, {
      id: 'wo-lh-demo-2',
      code: 'ZZGD202605270-LH02',
      name: `${d2.name}总装工单`,
      orderCategory: '总装工单',
      status: '执行中',
      workCenter: '总装车间',
      processRouteName: '装配标准路线',
      sourceOrderNo: 'SO-LH-002',
      scheduleQty: 8,
      processes: [demoProcess(d2.processName, '王装配')],
    }),
  ]
}

/** 质检工单演示数据（时长报工+计时已放在生产工单 wo-lh-demo-4） */
export function createLaborDemoQcOrders() {
  return []
}

export function isLaborDemoWorkOrder(id) {
  return LABOR_DEMO_WORK_ORDER_IDS.includes(id)
}

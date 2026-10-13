/**
 * 设备管理一期：台账 / 点检 / 保养 / 维修 演示种子
 */
import dayjs from 'dayjs'

export const EQUIPMENT_STATUS = {
  IN_USE: '在用',
  IDLE: '闲置',
  REPAIRING: '维修中',
  SCRAPPED: '报废',
}

export const EQUIPMENT_STATUS_OPTIONS = Object.values(EQUIPMENT_STATUS).map((v) => ({
  label: v,
  value: v,
}))

export const EQUIPMENT_CATEGORY_OPTIONS = [
  { label: '机加工设备', value: '机加工设备' },
  { label: '焊接设备', value: '焊接设备' },
  { label: '起重设备', value: '起重设备' },
  { label: '泵类测试台', value: '泵类测试台' },
  { label: '公用设备', value: '公用设备' },
]

export const INSPECTION_CYCLE_OPTIONS = [
  { label: '每班', value: '每班' },
  { label: '每日', value: '每日' },
  { label: '每周', value: '每周' },
]

export const INSPECTION_TASK_STATUS = {
  PENDING: '待执行',
  DONE: '已完成',
  ABNORMAL: '异常',
}

export const MAINTAIN_TYPE_OPTIONS = [
  { label: '日常保养', value: '日常保养' },
  { label: '一级保养', value: '一级保养' },
  { label: '二级保养', value: '二级保养' },
]

export const MAINTAIN_ORDER_STATUS = {
  PENDING: '待执行',
  DONE: '已完成',
  OVERDUE: '已逾期',
}

export const REPAIR_STATUS = {
  PENDING: '待派工',
  DOING: '维修中',
  ACCEPT: '待验收',
  CLOSED: '已关闭',
}

export const REPAIR_SOURCE_OPTIONS = [
  { label: '人工报修', value: '人工报修' },
  { label: '点检异常', value: '点检异常' },
  { label: '保养异常', value: '保养异常' },
]

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export function createEquipmentDeviceSeed() {
  const t = nowText()
  return [
    {
      id: 'eq-d-1',
      code: 'EQ-CNC-001',
      name: '数控车床 #1',
      category: '机加工设备',
      model: 'CK6140',
      workshop: '机加车间',
      location: 'A区-01',
      status: EQUIPMENT_STATUS.IN_USE,
      responsible: '张工',
      manufacturer: '沈阳机床',
      installDate: '2023-03-15',
      remark: '主轴轴承已于 2025 年更换',
      creator: '系统管理员',
      createdAt: t,
      updater: '系统管理员',
      updatedAt: t,
    },
    {
      id: 'eq-d-2',
      code: 'EQ-WELD-002',
      name: '氩弧焊机 #2',
      category: '焊接设备',
      model: 'WSME-315',
      workshop: '焊接车间',
      location: 'B区-03',
      status: EQUIPMENT_STATUS.IN_USE,
      responsible: '李师傅',
      manufacturer: '奥太',
      installDate: '2022-11-08',
      remark: '',
      creator: '系统管理员',
      createdAt: t,
      updater: '系统管理员',
      updatedAt: t,
    },
    {
      id: 'eq-d-3',
      code: 'EQ-CRANE-003',
      name: '5T 行车',
      category: '起重设备',
      model: 'LDA-5t',
      workshop: '装配车间',
      location: '跨度1',
      status: EQUIPMENT_STATUS.IN_USE,
      responsible: '王班长',
      manufacturer: '卫华',
      installDate: '2021-06-20',
      remark: '特种设备，需年检',
      creator: '系统管理员',
      createdAt: t,
      updater: '系统管理员',
      updatedAt: t,
    },
    {
      id: 'eq-d-4',
      code: 'EQ-TEST-004',
      name: '水泵性能测试台',
      category: '泵类测试台',
      model: 'PTS-200',
      workshop: '试验车间',
      location: '试车房-2',
      status: EQUIPMENT_STATUS.IDLE,
      responsible: '赵工',
      manufacturer: '自制',
      installDate: '2024-01-10',
      remark: '待校准压力传感器',
      creator: '系统管理员',
      createdAt: t,
      updater: '系统管理员',
      updatedAt: t,
    },
  ]
}

export function createInspectionStandardSeed() {
  const t = nowText()
  return [
    {
      id: 'eq-is-1',
      code: 'IS-CNC-DAY',
      name: '数控车床日点检',
      category: '机加工设备',
      cycle: '每日',
      enabled: true,
      items: [
        {
          id: 'i1',
          name: '急停按钮有效',
          checkType: '勾选',
          standard: '按下立即停机',
          required: true,
        },
        {
          id: 'i2',
          name: '润滑油位',
          checkType: '勾选',
          standard: '介于上下限之间',
          required: true,
        },
        { id: 'i3', name: '主轴温升 ℃', checkType: '数值', standard: '≤60', required: true },
        { id: 'i4', name: '防护罩完好', checkType: '勾选', standard: '无松动破损', required: true },
      ],
      remark: '',
      creator: '系统管理员',
      createdAt: t,
      updater: '系统管理员',
      updatedAt: t,
    },
    {
      id: 'eq-is-2',
      code: 'IS-CRANE-SHIFT',
      name: '行车班前点检',
      category: '起重设备',
      cycle: '每班',
      enabled: true,
      items: [
        {
          id: 'i1',
          name: '制动器灵敏',
          checkType: '勾选',
          standard: '空载试吊正常',
          required: true,
        },
        { id: 'i2', name: '钢丝绳无断丝', checkType: '勾选', standard: '目视合格', required: true },
        { id: 'i3', name: '限位开关', checkType: '勾选', standard: '上下限位有效', required: true },
      ],
      remark: '',
      creator: '系统管理员',
      createdAt: t,
      updater: '系统管理员',
      updatedAt: t,
    },
  ]
}

export function createInspectionTaskSeed(devices = [], standards = []) {
  const today = dayjs().format('YYYY-MM-DD')
  const t = nowText()
  const cnc = devices.find((d) => d.code === 'EQ-CNC-001') || devices[0]
  const crane = devices.find((d) => d.code === 'EQ-CRANE-003') || devices[2]
  const stdCnc = standards.find((s) => s.code === 'IS-CNC-DAY') || standards[0]
  const stdCrane = standards.find((s) => s.code === 'IS-CRANE-SHIFT') || standards[1]
  return [
    {
      id: 'eq-it-1',
      taskNo: `DJ${dayjs().format('YYYYMMDD')}001`,
      standardId: stdCnc?.id,
      standardName: stdCnc?.name || '数控车床日点检',
      deviceId: cnc?.id,
      deviceCode: cnc?.code,
      deviceName: cnc?.name,
      planDate: today,
      status: INSPECTION_TASK_STATUS.PENDING,
      executor: '',
      executedAt: '',
      results: [],
      remark: '',
      createdAt: t,
    },
    {
      id: 'eq-it-2',
      taskNo: `DJ${dayjs().format('YYYYMMDD')}002`,
      standardId: stdCrane?.id,
      standardName: stdCrane?.name || '行车班前点检',
      deviceId: crane?.id,
      deviceCode: crane?.code,
      deviceName: crane?.name,
      planDate: today,
      status: INSPECTION_TASK_STATUS.PENDING,
      executor: '',
      executedAt: '',
      results: [],
      remark: '',
      createdAt: t,
    },
  ]
}

export function createMaintainOrderSeed(devices = []) {
  const today = dayjs().format('YYYY-MM-DD')
  const nextWeek = dayjs().add(7, 'day').format('YYYY-MM-DD')
  const t = nowText()
  const cnc = devices.find((d) => d.code === 'EQ-CNC-001') || devices[0]
  const weld = devices.find((d) => d.code === 'EQ-WELD-002') || devices[1]
  return [
    {
      id: 'eq-mo-1',
      orderNo: `BY${dayjs().format('YYYYMMDD')}001`,
      deviceId: cnc?.id,
      deviceCode: cnc?.code,
      deviceName: cnc?.name,
      maintainType: '一级保养',
      planDate: today,
      status: MAINTAIN_ORDER_STATUS.PENDING,
      items: [
        { id: 'm1', name: '清理导轨及防护罩', done: false },
        { id: 'm2', name: '检查液压油/切削液', done: false },
        { id: 'm3', name: '紧固松动螺栓', done: false },
      ],
      executor: '',
      executedAt: '',
      remark: '',
      createdAt: t,
    },
    {
      id: 'eq-mo-2',
      orderNo: `BY${dayjs().format('YYYYMMDD')}002`,
      deviceId: weld?.id,
      deviceCode: weld?.code,
      deviceName: weld?.name,
      maintainType: '日常保养',
      planDate: nextWeek,
      status: MAINTAIN_ORDER_STATUS.PENDING,
      items: [
        { id: 'm1', name: '清理焊枪嘴', done: false },
        { id: 'm2', name: '检查接地线', done: false },
      ],
      executor: '',
      executedAt: '',
      remark: '',
      createdAt: t,
    },
  ]
}

export function createRepairOrderSeed(devices = []) {
  const t = nowText()
  const test = devices.find((d) => d.code === 'EQ-TEST-004') || devices[3]
  return [
    {
      id: 'eq-ro-1',
      orderNo: `WX${dayjs().format('YYYYMMDD')}001`,
      deviceId: test?.id,
      deviceCode: test?.code,
      deviceName: test?.name,
      source: '人工报修',
      faultDesc: '压力传感器读数漂移，无法完成水泵性能试验',
      status: REPAIR_STATUS.PENDING,
      reporter: '赵工',
      handler: '',
      result: '',
      spareParts: '',
      reportedAt: t,
      closedAt: '',
      remark: '',
      createdAt: t,
      updatedAt: t,
    },
  ]
}

export function normalizeDevice(row = {}) {
  return {
    id: row.id || `eq-d-${Date.now()}`,
    code: String(row.code || '').trim(),
    name: String(row.name || '').trim(),
    category: row.category || '公用设备',
    model: row.model || '',
    workshop: row.workshop || '',
    location: row.location || '',
    status: row.status || EQUIPMENT_STATUS.IN_USE,
    responsible: row.responsible || '',
    manufacturer: row.manufacturer || '',
    installDate: row.installDate || '',
    remark: row.remark || '',
    creator: row.creator || 'admin1',
    createdAt: row.createdAt || nowText(),
    updater: row.updater || row.creator || 'admin1',
    updatedAt: row.updatedAt || row.createdAt || nowText(),
  }
}

export function normalizeInspectionStandard(row = {}) {
  const items = Array.isArray(row.items)
    ? row.items.map((it, i) => ({
        id: it.id || `item-${i + 1}`,
        name: String(it.name || '').trim(),
        checkType: it.checkType === '数值' ? '数值' : '勾选',
        standard: it.standard || '',
        required: it.required !== false,
      }))
    : []
  return {
    id: row.id || `eq-is-${Date.now()}`,
    code: String(row.code || '').trim(),
    name: String(row.name || '').trim(),
    category: row.category || '',
    cycle: row.cycle || '每日',
    enabled: row.enabled !== false,
    items,
    remark: row.remark || '',
    creator: row.creator || 'admin1',
    createdAt: row.createdAt || nowText(),
    updater: row.updater || row.creator || 'admin1',
    updatedAt: row.updatedAt || row.createdAt || nowText(),
  }
}

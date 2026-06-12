/** 工序操作开关定义（控制工单任务可操作内容） */
export const PROCESS_OPERATION_DEFS = [
  { key: 'opStart', label: '开工' },
  { key: 'opAutoStart', label: '自动开工' },
  { key: 'opFinish', label: '完工' },
  { key: 'opAutoFinish', label: '自动完工' },
  { key: 'opFeeding', label: '投料' },
  { key: 'opScrap', label: '报废' },
  { key: 'opInbound', label: '入库' },
  { key: 'opProductInbound', label: '制品入库' },
  { key: 'opProductOutbound', label: '制品出库' },
  { key: 'opQc', label: '质检' },
  { key: 'opAttachment', label: '附件上传' },
  { key: 'opAttrModify', label: '属性修改' },
  { key: 'opOutsource', label: '外协' },
  { key: 'opAutoDistribute', label: '自动分发' },
  { key: 'opDisassembly', label: '拆解' },
  { key: 'opDisassemblyQc', label: '拆解质检' },
]

export const RESOURCE_TYPES = ['工人', '工人小组']

export const MOCK_POSITIONS = ['机加工岗', '装配工岗', '质检岗', '仓储岗', '热处理岗', '动平衡岗']

const MOCK_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect fill="#e6f4ff" width="48" height="48" rx="4"/><text x="24" y="28" text-anchor="middle" fill="#1677ff" font-size="10">工序</text></svg>',
  )

function defaultOperations(overrides = {}) {
  const base = Object.fromEntries(PROCESS_OPERATION_DEFS.map((d) => [d.key, false]))
  return { ...base, ...overrides }
}

function padCode(n) {
  return `GX${String(n).padStart(8, '0')}`
}

function resolveResourceType(category, name) {
  if (category === '组装') return '工人小组'
  if (category === '拆解' && name === '拆解') return '工人小组'
  return '工人'
}

import { PROCESS_DEFECT_ITEM_MAP, PROCESS_REPORT_MODE_MAP } from '@/mock/defectItemSeed'

export const REPORT_MODES = ['批量计件', '时长报工']

/** 机泵行业常用工序 */
export function createProcessConfigSeed() {
  const defs = [
    ['机械', '下料', { opStart: true, opFinish: true, opFeeding: true }, ['张三', '李四']],
    ['机械', '粗车', { opStart: true, opFinish: true }, ['张三']],
    ['机械', '精车', { opStart: true, opFinish: true }],
    ['机械', '钻孔', { opStart: true, opFinish: true }],
    ['机械', '铣削', { opStart: true, opFinish: true }],
    ['机械', '磨削', { opStart: true, opFinish: true }],
    ['机械', '热处理', { opStart: true, opFinish: true, opAutoFinish: true }],
    ['机械', '动平衡粗调', { opStart: true, opFinish: true, opQc: true }],
    ['组装', '领料', { opStart: true, opFeeding: true, opInbound: true }, ['总装小组']],
    ['组装', '叶轮装配', { opStart: true, opFinish: true }],
    ['组装', '密封装配', { opStart: true, opFinish: true }],
    ['组装', '轴承装配', { opStart: true, opFinish: true }],
    ['组装', '联轴器装配', { opStart: true, opFinish: true }],
    ['组装', '总装', { opStart: true, opFinish: true, opAutoStart: true }, ['总装小组']],
    ['组装', '灌胶', { opStart: true, opFinish: true, opFeeding: true }],
    ['组装', '整机调试', { opStart: true, opFinish: true, opAttachment: true }],
    ['拆解', '拆解', { opStart: true, opFinish: true, opDisassembly: true }, ['加工小组']],
    [
      '拆解',
      '拆解质检',
      { opStart: true, opFinish: true, opQc: true, opDisassemblyQc: true },
      ['孙琴丽'],
    ],
    ['拆解', '零件清洗', { opStart: true, opFinish: true }],
    ['系统工序', '质检', { opStart: true, opFinish: true, opQc: true }, ['孙琴丽']],
    [
      '系统工序',
      '入库',
      { opStart: true, opFinish: true, opInbound: true, opProductInbound: true },
      ['王五'],
    ],
    ['系统工序', '出库', { opStart: true, opProductOutbound: true }],
    ['系统工序', '打孔', { opStart: true, opFinish: true }],
    ['系统工序', '动平衡', { opStart: true, opFinish: true, opQc: true }],
    ['系统工序', '试压', { opStart: true, opFinish: true, opQc: true, opAttachment: true }],
    ['系统工序', '喷漆', { opStart: true, opFinish: true }],
    ['系统工序', '包装', { opStart: true, opFinish: true, opInbound: true }],
    ['系统工序', '外协发货', { opStart: true, opFinish: true, opOutsource: true }],
    ['系统工序', '外协收货', { opStart: true, opFinish: true, opOutsource: true, opInbound: true }],
    ['系统工序', '报废', { opStart: true, opScrap: true }],
    ['系统工序', '配比', { opStart: true, opFinish: true, opFeeding: true, opAttrModify: true }],
    ['机械', '点焊', { opStart: true, opFinish: true }],
    ['机械', '打磨', { opStart: true, opFinish: true }],
    ['机械', '车削', { opStart: true, opFinish: true }],
    ['机械', '铣削', { opStart: true, opFinish: true }],
    ['组装', '装配', { opStart: true, opFinish: true }],
  ]

  return defs.map(([category, name, ops, defaultExecutors = []], index) => ({
    id: `proc-${String(index + 1).padStart(3, '0')}`,
    code: padCode(index + 1),
    name,
    category,
    resourceType: resolveResourceType(category, name),
    position: category === '组装' ? '装配工岗' : category === '系统工序' ? '质检岗' : '机加工岗',
    image: MOCK_IMAGE,
    remark: '',
    status: '使用中',
    operations: defaultOperations(ops),
    defaultExecutors: [...defaultExecutors],
    reportMode: PROCESS_REPORT_MODE_MAP[name] || '',
    defectItemIds: [...(PROCESS_DEFECT_ITEM_MAP[name] || [])],
    createdAt: '2026-05-01',
    updatedAt: '2026-06-01',
  }))
}

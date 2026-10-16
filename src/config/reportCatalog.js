/**
 * 报表中心目录（P0）
 * 口径：销售时间=审核通过日；库存时间=确认入库日；金额进一期
 */

/** @typedef {'sales'|'production'|'procurement'|'inventory'|'quality'} ReportGroup */

/**
 * @typedef {object} ReportDef
 * @property {string} key
 * @property {string} title
 * @property {ReportGroup} group
 * @property {string} groupLabel
 * @property {string} path
 * @property {string} question 经营问题
 * @property {string} timeFieldLabel 时间口径说明
 * @property {string} desc
 */

/** @type {ReportDef[]} */
export const REPORT_CATALOG = [
  {
    key: 'sales-order-exec',
    title: '销售订单执行表',
    group: 'sales',
    groupLabel: '销售报表',
    path: '/report/sales-order-exec',
    question: '订单审核后执行到哪一步？',
    timeFieldLabel: '审核通过日',
    desc: '按审核通过日统计订单数量、金额、发货与完工进度（含金额）。',
  },
  {
    key: 'sales-line-summary',
    title: '销售明细汇总表',
    group: 'sales',
    groupLabel: '销售报表',
    path: '/report/sales-line-summary',
    question: '卖了哪些产品、多少金额？',
    timeFieldLabel: '审核通过日',
    desc: '按产品/客户汇总已审核订单明细数量与含税金额。',
  },
  {
    key: 'sales-delivery-achieve',
    title: '发货达成表',
    group: 'sales',
    groupLabel: '销售报表',
    path: '/report/sales-delivery-achieve',
    question: '交期与实发是否达成？',
    timeFieldLabel: '发货单创建/发货日（对照订单审核通过日）',
    desc: '销售订单与发货单对照：应发、实发、金额与延期情况。',
  },
  {
    key: 'sales-order-cost',
    title: '销售订单成本表',
    group: 'sales',
    groupLabel: '销售报表',
    path: '/report/sales-order-cost',
    question: '一笔订单花了多少料、多少人工？毛利如何？',
    timeFieldLabel: '审核通过日',
    desc: '按审核通过日，汇总关联生产/总装工单的物料消耗与人工成本，对照销售含税金额看毛利。',
  },
  {
    key: 'work-order-progress',
    title: '工单进度表',
    group: 'production',
    groupLabel: '生产报表',
    path: '/report/work-order-progress',
    question: '工单做到哪、是否超期？',
    timeFieldLabel: '计划开工/完工日',
    desc: '生产/总装等工单计划数、完工进度与状态（关联销售金额参考）。',
  },
  {
    key: 'work-order-cost',
    title: '生产工单成本表',
    group: 'production',
    groupLabel: '生产报表',
    path: '/report/work-order-cost',
    question: '一单消耗多少料、多少人、总成本多少？',
    timeFieldLabel: '计划开工日',
    desc: '按工单汇总物料消耗（库存扣减）与物料成本、参与工人数与人工成本（工时工资），并给出成本合计。',
  },
  {
    key: 'purchase-order-exec',
    title: '采购订单执行表',
    group: 'procurement',
    groupLabel: '采购/外协报表',
    path: '/report/purchase-order-exec',
    question: '采购执行与到货入库如何？',
    timeFieldLabel: '采购单据日期',
    desc: '采购订单数量、含税金额、入库进度与供应商维度。',
  },
  {
    key: 'outsourcing-order-exec',
    title: '外协订单执行表',
    group: 'procurement',
    groupLabel: '采购/外协报表',
    path: '/report/outsourcing-order-exec',
    question: '外协发出/回货/入库进度？',
    timeFieldLabel: '外协单据日期',
    desc: '外协订单数量、金额、回货与入库执行情况。',
  },
  {
    key: 'inventory-io-balance',
    title: '库存收发存表',
    group: 'inventory',
    groupLabel: '库存报表',
    path: '/report/inventory-io-balance',
    question: '期间内进出存与金额？',
    timeFieldLabel: '确认入库日 / 确认出库日',
    desc: '按仓库+物料汇总期间入库、出库、结存数量与金额（入库按确认入库日）。',
  },
  {
    key: 'qc-task-stats',
    title: '质检任务统计表',
    group: 'quality',
    groupLabel: '质检报表',
    path: '/report/qc-task-stats',
    question: '各类型质检合格情况？',
    timeFieldLabel: '质检完成/创建日',
    desc: '按质检业务范围汇总任务数、合格/不合格与涉及数量。',
  },
]

export const REPORT_GROUP_ORDER = [
  { key: 'sales', label: '销售报表' },
  { key: 'production', label: '生产报表' },
  { key: 'procurement', label: '采购/外协报表' },
  { key: 'inventory', label: '库存报表' },
  { key: 'quality', label: '质检报表' },
]

export function getReportDef(key) {
  return REPORT_CATALOG.find((r) => r.key === key) || null
}

export function getReportDefByPath(path) {
  return REPORT_CATALOG.find((r) => r.path === path) || null
}

export function groupReportCatalog() {
  return REPORT_GROUP_ORDER.map((g) => ({
    ...g,
    items: REPORT_CATALOG.filter((r) => r.group === g.key),
  })).filter((g) => g.items.length)
}

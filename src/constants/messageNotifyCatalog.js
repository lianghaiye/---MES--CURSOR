/**
 * 站内消息类型目录（P0 + P1）
 * 收件策略：角色 + 单据相关人为主，部门/人员为辅
 */

export const MESSAGE_NOTIFY_DOMAINS = [
  { value: 'sales', label: '销售/合同/结算' },
  { value: 'procurement', label: '采购/外协' },
  { value: 'production', label: '生产/计划' },
  { value: 'inventory', label: '仓储' },
  { value: 'quality', label: '质量/工程变更' },
]

/** 可选角色（演示用，后续可接权限角色主数据） */
export const MESSAGE_NOTIFY_ROLE_OPTIONS = [
  { value: 'sales_approver', label: '销售审核' },
  { value: 'sales_owner', label: '销售业务员' },
  { value: 'contract_approver', label: '合同审核' },
  { value: 'finance', label: '财务' },
  { value: 'purchase_approver', label: '采购审核' },
  { value: 'purchase_owner', label: '采购员' },
  { value: 'outsourcing_approver', label: '外协审核' },
  { value: 'planner', label: '计划员' },
  { value: 'workshop_director', label: '车间主任' },
  { value: 'warehouse', label: '仓管' },
  { value: 'qc_inspector', label: '质检员' },
  { value: 'qc_manager', label: '质量主管' },
  { value: 'designer', label: '设计' },
  { value: 'ecn_handler', label: 'ECN 处理人' },
]

/** 单据相关人勾选项 */
export const MESSAGE_DOC_RELATION_OPTIONS = [
  { value: 'creator', label: '创建人' },
  { value: 'salesperson', label: '业务员' },
  { value: 'assignee', label: '负责人' },
  { value: 'currentApprover', label: '当前审批人' },
]

/** 演示部门 */
export const MESSAGE_NOTIFY_DEPT_OPTIONS = [
  { value: 'dept-sales', label: '销售部' },
  { value: 'dept-purchase', label: '采购部' },
  { value: 'dept-plan', label: '计划部' },
  { value: 'dept-prod', label: '生产部' },
  { value: 'dept-wh', label: '仓储部' },
  { value: 'dept-qc', label: '质量部' },
  { value: 'dept-finance', label: '财务部' },
]

/** 演示人员（可与员工组并存） */
export const MESSAGE_NOTIFY_USER_OPTIONS = [
  { value: 'admin', label: 'admin' },
  { value: 'emp-1', label: '孙琴丽' },
  { value: 'emp-2', label: '张三' },
  { value: 'emp-3', label: '李四' },
  { value: 'emp-4', label: '王五' },
  { value: 'emp-9', label: '赵六' },
]

function def(partial) {
  return {
    enabled: true,
    roles: [],
    docRelations: [],
    deptIds: [],
    userIds: [],
    advanceDays: null,
    ...partial,
  }
}

/**
 * @type {Array<{
 *  code: string
 *  name: string
 *  domain: string
 *  phase: 'P0'|'P1'
 *  trigger: string
 *  titleTemplate: string
 *  bodyTemplate: string
 *  linkPath: string
 *  defaults: object
 * }>}
 */
export const MESSAGE_NOTIFY_CATALOG = [
  // —— 销售 / 合同 / 结算 P0 ——
  {
    code: 'SO_PENDING_APPROVE',
    name: '销售订单待审核',
    domain: 'sales',
    phase: 'P0',
    trigger: '销售订单提交审核',
    titleTemplate: '销售订单待审核 · {bizNo}',
    bodyTemplate: '订单 {bizNo} 已提交，请尽快审核。',
    linkPath: '/sales/orders',
    defaults: def({ roles: ['sales_approver'], docRelations: ['currentApprover'] }),
  },
  {
    code: 'SO_APPROVED',
    name: '销售订单已通过',
    domain: 'sales',
    phase: 'P0',
    trigger: '销售订单审核通过',
    titleTemplate: '销售订单已通过 · {bizNo}',
    bodyTemplate: '订单 {bizNo} 已审核通过。',
    linkPath: '/sales/orders',
    defaults: def({ roles: ['sales_owner'], docRelations: ['creator', 'salesperson'] }),
  },
  {
    code: 'SO_REJECTED',
    name: '销售订单已驳回',
    domain: 'sales',
    phase: 'P0',
    trigger: '销售订单审核驳回',
    titleTemplate: '销售订单已驳回 · {bizNo}',
    bodyTemplate: '订单 {bizNo} 已被驳回，请查看意见后重新提交。',
    linkPath: '/sales/orders',
    defaults: def({ roles: ['sales_owner'], docRelations: ['creator', 'salesperson'] }),
  },
  {
    code: 'SO_CHANGE_PENDING',
    name: '订单变更待审核',
    domain: 'sales',
    phase: 'P0',
    trigger: '订单变更提交',
    titleTemplate: '订单变更待审核 · {bizNo}',
    bodyTemplate: '变更单 {bizNo} 待审核。',
    linkPath: '/sales/order-changes',
    defaults: def({ roles: ['sales_approver'], docRelations: ['currentApprover'] }),
  },
  {
    code: 'CT_PENDING_APPROVE',
    name: '合同待审核',
    domain: 'sales',
    phase: 'P0',
    trigger: '合同提交审核',
    titleTemplate: '合同待审核 · {bizNo}',
    bodyTemplate: '合同 {bizNo} 已提交，请审核。',
    linkPath: '/contracts',
    defaults: def({ roles: ['contract_approver'], docRelations: ['currentApprover'] }),
  },
  {
    code: 'PAY_DUE_SOON',
    name: '回款即将到期',
    domain: 'sales',
    phase: 'P0',
    trigger: '回款节点到期前 N 天',
    titleTemplate: '回款即将到期 · {bizNo}',
    bodyTemplate: '{bizNo} 节点将于 {extra} 到期，待收 ¥{amount}。',
    linkPath: '/settlement/payments',
    defaults: def({
      roles: ['sales_owner', 'finance'],
      docRelations: ['salesperson'],
      advanceDays: 3,
    }),
  },
  {
    code: 'PAY_OVERDUE',
    name: '回款已逾期',
    domain: 'sales',
    phase: 'P0',
    trigger: '回款节点已逾期仍有待收',
    titleTemplate: '回款已逾期 · {bizNo}',
    bodyTemplate: '{bizNo} 已逾期，待收 ¥{amount}。',
    linkPath: '/settlement/payments',
    defaults: def({ roles: ['sales_owner', 'finance'], docRelations: ['salesperson'] }),
  },

  // —— 采购 / 外协 P0 ——
  {
    code: 'PO_PENDING_APPROVE',
    name: '采购订单待审核',
    domain: 'procurement',
    phase: 'P0',
    trigger: '采购订单提交审核',
    titleTemplate: '采购订单待审核 · {bizNo}',
    bodyTemplate: '采购订单 {bizNo} 待审核。',
    linkPath: '/procurement/purchase-orders',
    defaults: def({ roles: ['purchase_approver'], docRelations: ['currentApprover'] }),
  },
  {
    code: 'PO_REJECTED',
    name: '采购订单已驳回',
    domain: 'procurement',
    phase: 'P0',
    trigger: '采购订单审核驳回',
    titleTemplate: '采购订单已驳回 · {bizNo}',
    bodyTemplate: '采购订单 {bizNo} 已驳回。',
    linkPath: '/procurement/purchase-orders',
    defaults: def({ roles: ['purchase_owner'], docRelations: ['creator'] }),
  },
  {
    code: 'OS_PENDING_APPROVE',
    name: '外协订单待审核',
    domain: 'procurement',
    phase: 'P0',
    trigger: '外协订单提交审核',
    titleTemplate: '外协订单待审核 · {bizNo}',
    bodyTemplate: '外协订单 {bizNo} 待审核。',
    linkPath: '/procurement/outsourcing-orders',
    defaults: def({ roles: ['outsourcing_approver', 'purchase_approver'] }),
  },
  {
    code: 'KEY_PART_ARRIVED',
    name: '关键件到货',
    domain: 'procurement',
    phase: 'P0',
    trigger: '入库确认且命中关键件标识',
    titleTemplate: '关键件到货 · {bizNo}',
    bodyTemplate: '{itemName} 已入库 {qty}{unit}，单号 {bizNo}。',
    linkPath: '/production/arrival-tracking',
    defaults: def({ roles: ['planner', 'workshop_director'], deptIds: ['dept-plan', 'dept-prod'] }),
  },

  // —— 生产 / 计划 P0 ——
  {
    code: 'WO_PENDING_DISPATCH',
    name: '工单待下发',
    domain: 'production',
    phase: 'P0',
    trigger: '生产工单进入待下发',
    titleTemplate: '工单待下发 · {bizNo}',
    bodyTemplate: '工单 {bizNo} 待下发。',
    linkPath: '/production/work-orders',
    defaults: def({ roles: ['planner', 'workshop_director'] }),
  },
  {
    code: 'DESIGN_TASK_ASSIGNED',
    name: '设计任务待处理',
    domain: 'production',
    phase: 'P0',
    trigger: '设计任务生成或分派',
    titleTemplate: '设计任务待处理 · {bizNo}',
    bodyTemplate: '设计任务 {bizNo} 已分派给你。',
    linkPath: '/planning/design-task',
    defaults: def({ roles: ['designer'], docRelations: ['assignee'] }),
  },
  {
    code: 'STOCK_REPLENISH_WARN',
    name: '库存预警',
    domain: 'production',
    phase: 'P0',
    trigger: '低于安全库存/预警规则',
    titleTemplate: '库存预警 · {bizNo}',
    bodyTemplate: '物料/产品 {bizNo} 库存低于预警值。',
    linkPath: '/planning/replenish-center',
    defaults: def({ roles: ['planner', 'purchase_owner'] }),
  },

  // —— 仓储 P0 ——
  {
    code: 'INBOUND_PENDING',
    name: '有待入库单',
    domain: 'inventory',
    phase: 'P0',
    trigger: '生成待入库或待确认入库',
    titleTemplate: '待入库 · {bizNo}',
    bodyTemplate: '待入库单据 {bizNo} 请处理。',
    linkPath: '/inventory/pending-inbound',
    defaults: def({ roles: ['warehouse'], deptIds: ['dept-wh'] }),
  },
  {
    code: 'OUTBOUND_PENDING',
    name: '有待出库单',
    domain: 'inventory',
    phase: 'P0',
    trigger: '生成待出库或待确认出库',
    titleTemplate: '待出库 · {bizNo}',
    bodyTemplate: '待出库单据 {bizNo} 请处理。',
    linkPath: '/inventory/pending-outbound',
    defaults: def({ roles: ['warehouse'], deptIds: ['dept-wh'] }),
  },

  // —— 质量 / ECN P0 ——
  {
    code: 'QC_PENDING',
    name: '质检任务待检',
    domain: 'quality',
    phase: 'P0',
    trigger: '生成质检任务',
    titleTemplate: '质检待检 · {bizNo}',
    bodyTemplate: '质检任务 {bizNo} 待检验。',
    linkPath: '/quality/incoming-qc',
    defaults: def({ roles: ['qc_inspector'], docRelations: ['assignee'] }),
  },
  {
    code: 'QC_NG',
    name: '质检不合格',
    domain: 'quality',
    phase: 'P0',
    trigger: '质检判定不合格',
    titleTemplate: '质检不合格 · {bizNo}',
    bodyTemplate: '质检任务 {bizNo} 判定不合格，请跟进处置。',
    linkPath: '/quality/incoming-qc',
    defaults: def({
      roles: ['qc_manager', 'qc_inspector'],
      docRelations: ['creator', 'assignee'],
    }),
  },
  {
    code: 'ECN_TODO',
    name: 'ECN 待处理',
    domain: 'quality',
    phase: 'P0',
    trigger: 'ECN 进入待审/审批中/执行中',
    titleTemplate: 'ECN 待处理 · {bizNo}',
    bodyTemplate: '变更单 {bizNo} 需要你处理。',
    linkPath: '/engineering-change/ecn-list',
    defaults: def({ roles: ['ecn_handler'], docRelations: ['assignee', 'currentApprover'] }),
  },

  // —— P1 ——
  {
    code: 'DELIVERY_PENDING_APPROVE',
    name: '发货申请待审',
    domain: 'sales',
    phase: 'P1',
    trigger: '发货申请提交',
    titleTemplate: '发货申请待审 · {bizNo}',
    bodyTemplate: '发货申请 {bizNo} 待审核。',
    linkPath: '/sales/delivery',
    defaults: def({ roles: ['sales_approver', 'warehouse'], docRelations: ['currentApprover'] }),
  },
  {
    code: 'DELIVERY_SHIPPED',
    name: '已发货通知',
    domain: 'sales',
    phase: 'P1',
    trigger: '发货单已发货',
    titleTemplate: '已发货 · {bizNo}',
    bodyTemplate: '发货单 {bizNo} 已发货。',
    linkPath: '/sales/delivery',
    defaults: def({ roles: ['sales_owner'], docRelations: ['salesperson', 'creator'] }),
  },
  {
    code: 'MATERIAL_REQ_PENDING',
    name: '领料单待发料',
    domain: 'production',
    phase: 'P1',
    trigger: '领料单待仓管发料',
    titleTemplate: '领料待发料 · {bizNo}',
    bodyTemplate: '领料单 {bizNo} 待发料。',
    linkPath: '/production/material-requisition',
    defaults: def({ roles: ['warehouse'] }),
  },
  {
    code: 'REPORT_PENDING_CONFIRM',
    name: '报工待确认',
    domain: 'production',
    phase: 'P1',
    trigger: '工序报工待确认',
    titleTemplate: '报工待确认 · {bizNo}',
    bodyTemplate: '报工记录 {bizNo} 待确认。',
    linkPath: '/report-management/report-work',
    defaults: def({ roles: ['workshop_director'], docRelations: ['assignee'] }),
  },
  {
    code: 'REWORK_PENDING_PLAN',
    name: '返工单待排',
    domain: 'production',
    phase: 'P1',
    trigger: '返工单待排产/分派',
    titleTemplate: '返工待排 · {bizNo}',
    bodyTemplate: '返工单 {bizNo} 待排产。',
    linkPath: '/production/rework-orders',
    defaults: def({ roles: ['planner', 'workshop_director'] }),
  },
  {
    code: 'SETTLE_PENDING_CONFIRM',
    name: '对账单待确认',
    domain: 'sales',
    phase: 'P1',
    trigger: '采购对账单待确认',
    titleTemplate: '对账单待确认 · {bizNo}',
    bodyTemplate: '对账单 {bizNo} 待确认。',
    linkPath: '/settlement/purchase-settles',
    defaults: def({ roles: ['finance', 'purchase_owner'], docRelations: ['assignee'] }),
  },
  {
    code: 'SETTLE_INVOICE_OR_PAY',
    name: '收票/付款登记通知',
    domain: 'sales',
    phase: 'P1',
    trigger: '对账完成收票或付款登记',
    titleTemplate: '收票/付款已登记 · {bizNo}',
    bodyTemplate: '对账单 {bizNo} 已登记收票或付款。',
    linkPath: '/settlement/purchase-settles',
    defaults: def({ roles: ['finance'], docRelations: ['creator'] }),
  },
  {
    code: 'BOM_ROUTE_APPROVED',
    name: 'BOM/工艺审核通过',
    domain: 'quality',
    phase: 'P1',
    trigger: 'BOM 或工艺路线审核通过',
    titleTemplate: 'BOM/工艺已通过 · {bizNo}',
    bodyTemplate: '{bizNo} 已审核通过。',
    linkPath: '/product-process/bom',
    defaults: def({ roles: ['designer', 'planner'], docRelations: ['creator'] }),
  },
  {
    code: 'BOM_ROUTE_REJECTED',
    name: 'BOM/工艺审核驳回',
    domain: 'quality',
    phase: 'P1',
    trigger: 'BOM 或工艺路线审核驳回',
    titleTemplate: 'BOM/工艺已驳回 · {bizNo}',
    bodyTemplate: '{bizNo} 已被驳回，请修改后重提。',
    linkPath: '/product-process/bom',
    defaults: def({ roles: ['designer'], docRelations: ['creator'] }),
  },
  {
    code: 'STOCKTAKE_DIFF_PENDING',
    name: '盘点差异待处理',
    domain: 'inventory',
    phase: 'P1',
    trigger: '盘点存在差异待处理',
    titleTemplate: '盘点差异待处理 · {bizNo}',
    bodyTemplate: '盘点单 {bizNo} 存在差异，请处理。',
    linkPath: '/inventory/stocktake',
    defaults: def({ roles: ['warehouse', 'finance'] }),
  },
]

export function getMessageTypeByCode(code) {
  return MESSAGE_NOTIFY_CATALOG.find((t) => t.code === code) || null
}

export function domainLabel(domain) {
  return MESSAGE_NOTIFY_DOMAINS.find((d) => d.value === domain)?.label || domain || '—'
}

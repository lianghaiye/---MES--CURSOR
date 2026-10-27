/** 销售合同类型（订单上的「临时合同」仅作订单标识，不进合同台账） */
export const CONTRACT_TYPE = {
  STANDARD: '标准合同',
  FRAMEWORK: '框架合同',
}

export const contractTypeOptions = [
  { label: CONTRACT_TYPE.STANDARD, value: CONTRACT_TYPE.STANDARD },
  { label: CONTRACT_TYPE.FRAMEWORK, value: CONTRACT_TYPE.FRAMEWORK },
]

/** 合同收支方向（台账一级分类） */
export const CONTRACT_CASH_DIRECTION = {
  INCOME: '收入',
  EXPENSE: '支出',
}

export const contractCashDirectionOptions = [
  { label: CONTRACT_CASH_DIRECTION.INCOME, value: CONTRACT_CASH_DIRECTION.INCOME },
  { label: CONTRACT_CASH_DIRECTION.EXPENSE, value: CONTRACT_CASH_DIRECTION.EXPENSE },
]

/** 合同业务类别（方向之下的细分） */
export const CONTRACT_CATEGORY = {
  SALES: '销售',
  PURCHASE: '采购',
  OUTSOURCE: '外协',
}

export const incomeContractCategoryOptions = [
  { label: CONTRACT_CATEGORY.SALES, value: CONTRACT_CATEGORY.SALES },
]

export const expenseContractCategoryOptions = [
  { label: CONTRACT_CATEGORY.PURCHASE, value: CONTRACT_CATEGORY.PURCHASE },
  { label: CONTRACT_CATEGORY.OUTSOURCE, value: CONTRACT_CATEGORY.OUTSOURCE },
]

export function contractCategoryOptions(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? expenseContractCategoryOptions
    : incomeContractCategoryOptions
}

export function resolveContractCashDirection(row = {}) {
  return row.cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? CONTRACT_CASH_DIRECTION.EXPENSE
    : CONTRACT_CASH_DIRECTION.INCOME
}

export function isExpenseContract(row = {}) {
  return resolveContractCashDirection(row) === CONTRACT_CASH_DIRECTION.EXPENSE
}

export function resolveContractCategory(row = {}) {
  const raw = String(row.contractCategory || '').trim()
  if (raw) return raw
  return isExpenseContract(row) ? CONTRACT_CATEGORY.PURCHASE : CONTRACT_CATEGORY.SALES
}

export function defaultContractCategory(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? CONTRACT_CATEGORY.PURCHASE
    : CONTRACT_CATEGORY.SALES
}

export function getContractPartyName(row = {}) {
  return isExpenseContract(row) ? row.supplierName || '' : row.customerName || ''
}

export function contractPartyFieldLabel(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE ? '供应商' : '客户'
}

export function contractPaymentNoun(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE ? '付款' : '回款'
}

export const CONTRACT_STATUS = {
  DRAFT: '草稿',
  PENDING: '待审',
  REJECTED: '已驳回',
  ACTIVE: '生效中',
  COMPLETED: '已完成',
  TERMINATED: '已终止',
}

export const contractStatusOptions = [
  { label: CONTRACT_STATUS.DRAFT, value: CONTRACT_STATUS.DRAFT },
  { label: CONTRACT_STATUS.PENDING, value: CONTRACT_STATUS.PENDING },
  { label: CONTRACT_STATUS.REJECTED, value: CONTRACT_STATUS.REJECTED },
  { label: CONTRACT_STATUS.ACTIVE, value: CONTRACT_STATUS.ACTIVE },
  { label: CONTRACT_STATUS.COMPLETED, value: CONTRACT_STATUS.COMPLETED },
  { label: CONTRACT_STATUS.TERMINATED, value: CONTRACT_STATUS.TERMINATED },
]

export function contractStatusColor(status) {
  const map = {
    草稿: 'default',
    待审: 'processing',
    已驳回: 'warning',
    生效中: 'success',
    已完成: 'blue',
    已终止: 'error',
  }
  return map[status] || 'default'
}

/** 合同签署状态（与审批流状态独立：是否已对外/双方签署） */
export const CONTRACT_SIGN_STATUS = {
  UNSIGNED: '未签署',
  SIGNED: '已签署',
}

export const contractSignStatusOptions = [
  { label: CONTRACT_SIGN_STATUS.UNSIGNED, value: CONTRACT_SIGN_STATUS.UNSIGNED },
  { label: CONTRACT_SIGN_STATUS.SIGNED, value: CONTRACT_SIGN_STATUS.SIGNED },
]

export function contractSignStatusColor(status) {
  const map = {
    未签署: 'default',
    已签署: 'blue',
  }
  return map[status] || 'default'
}

/** 合同来源 */
export const CONTRACT_SOURCE = {
  MANUAL: '新增',
  FROM_ORDER: '订单生成',
}

export const contractSourceOptions = [
  { label: CONTRACT_SOURCE.MANUAL, value: CONTRACT_SOURCE.MANUAL },
  { label: CONTRACT_SOURCE.FROM_ORDER, value: CONTRACT_SOURCE.FROM_ORDER },
]

export function resolveContractSource(row = {}) {
  if (row.sourceType === CONTRACT_SOURCE.FROM_ORDER || row.sourceType === CONTRACT_SOURCE.MANUAL) {
    return row.sourceType
  }
  return row.sourceSalesOrderId ? CONTRACT_SOURCE.FROM_ORDER : CONTRACT_SOURCE.MANUAL
}

/**
 * 默认回款节点（收入合同；比例可改；各节点可有独立账期起算类型）
 * 例：预付款按合同签订日，发货款按发货日
 */
export const DEFAULT_PAYMENT_NODES = [
  { name: '预付款', ratio: 0.3, termStartType: '合同签订日' },
  { name: '发货款', ratio: 0.5, termStartType: '发货日' },
  { name: '验收款', ratio: 0.15, termStartType: '验收日' },
  { name: '质保金', ratio: 0.05, termStartType: '验收日' },
]

/** 默认付款节点（支出合同） */
export const DEFAULT_EXPENSE_PAYMENT_NODES = [
  { name: '预付款', ratio: 0.3, termStartType: '合同签订日' },
  { name: '到货款', ratio: 0.6, termStartType: '到货日' },
  { name: '质保金', ratio: 0.1, termStartType: '验收日' },
]

export function defaultPaymentNodesFor(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? DEFAULT_EXPENSE_PAYMENT_NODES
    : DEFAULT_PAYMENT_NODES
}

export const incomePaymentTermStartOptions = [
  { label: '合同签订日', value: '合同签订日' },
  { label: '发货日', value: '发货日' },
  { label: '验收日', value: '验收日' },
  { label: '开票日', value: '开票日' },
  { label: '对账日', value: '对账日' },
  { label: '自定义', value: '自定义' },
]

export const expensePaymentTermStartOptions = [
  { label: '合同签订日', value: '合同签订日' },
  { label: '到货日', value: '到货日' },
  { label: '验收日', value: '验收日' },
  { label: '开票日', value: '开票日' },
  { label: '对账日', value: '对账日' },
  { label: '自定义', value: '自定义' },
]

export function paymentTermStartOptionsFor(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? expensePaymentTermStartOptions
    : incomePaymentTermStartOptions
}

/** 回款节点区：各账期起算类型说明（蓝色提示） */
export const PAYMENT_TERM_START_HINTS = [
  '合同签订日：默认带入签署日期（无则取有效期开始日），可修改。',
  '发货日：取合同关联销售订单中最早一张发货单所关联出库单的确认出库时间；取不到则留空后补。',
  '验收日 / 开票日 / 对账日：不自动带入，可在合同或回款维护中后补起算日。',
  '自定义：不自动带入，由业务手工填写起算日。',
]

export const EXPENSE_PAYMENT_TERM_START_HINTS = [
  '合同签订日：默认带入签署日期（无则取有效期开始日），可修改。',
  '到货日：取合同关联采购/外协订单对应入库单的确认入库时间；取不到则留空后补。',
  '验收日 / 开票日 / 对账日：不自动带入，可在合同详情中后补起算日。',
  '自定义：不自动带入，由业务手工填写起算日。',
]

export function paymentTermStartHintsFor(cashDirection) {
  return cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? EXPENSE_PAYMENT_TERM_START_HINTS
    : PAYMENT_TERM_START_HINTS
}

/**
 * 框架合同回款计划金额基数
 * - 额度金额：按合同额度拆节点（签合同时即可出计划）
 * - 销售订单金额：按关联有效订单含税合计拆节点（订单增减后可刷新）
 */
export const PAYMENT_PLAN_BASE = {
  LIMIT: '额度金额',
  ORDERS: '销售订单金额',
  PURCHASE_ORDERS: '采购订单金额',
}

export const paymentPlanBaseOptions = [
  { label: '按额度金额', value: PAYMENT_PLAN_BASE.LIMIT },
  { label: '按销售订单金额', value: PAYMENT_PLAN_BASE.ORDERS },
]

export function paymentPlanBaseOptionsFor(cashDirection) {
  if (cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE) {
    return [
      { label: '按额度金额', value: PAYMENT_PLAN_BASE.LIMIT },
      { label: '按采购/外协订单金额', value: PAYMENT_PLAN_BASE.PURCHASE_ORDERS },
    ]
  }
  return paymentPlanBaseOptions
}

export const PAYMENT_LINK_TYPE = {
  CONTRACT: '合同',
  SALES_ORDER: '销售订单',
}

export const paymentLinkTypeOptions = [
  { label: PAYMENT_LINK_TYPE.CONTRACT, value: PAYMENT_LINK_TYPE.CONTRACT },
  { label: PAYMENT_LINK_TYPE.SALES_ORDER, value: PAYMENT_LINK_TYPE.SALES_ORDER },
]

/** 回款方式（手工登记） */
export const PAYMENT_METHOD = {
  BANK: '银行转账',
  ACCEPTANCE: '承兑汇票',
  CASH: '现金',
  OTHER: '其他',
}

export const paymentMethodOptions = [
  { label: PAYMENT_METHOD.BANK, value: PAYMENT_METHOD.BANK },
  { label: PAYMENT_METHOD.ACCEPTANCE, value: PAYMENT_METHOD.ACCEPTANCE },
  { label: PAYMENT_METHOD.CASH, value: PAYMENT_METHOD.CASH },
  { label: PAYMENT_METHOD.OTHER, value: PAYMENT_METHOD.OTHER },
]

/** 回款管理：按合同汇总的回款状态 */
export const CONTRACT_PAYMENT_STATUS = {
  UNPAID: '未回款',
  PARTIAL: '部分回款',
  CLEARED: '已回清',
  OVERDUE: '已逾期',
}

export const contractPaymentStatusOptions = [
  { label: CONTRACT_PAYMENT_STATUS.UNPAID, value: CONTRACT_PAYMENT_STATUS.UNPAID },
  { label: CONTRACT_PAYMENT_STATUS.PARTIAL, value: CONTRACT_PAYMENT_STATUS.PARTIAL },
  { label: CONTRACT_PAYMENT_STATUS.CLEARED, value: CONTRACT_PAYMENT_STATUS.CLEARED },
  { label: CONTRACT_PAYMENT_STATUS.OVERDUE, value: CONTRACT_PAYMENT_STATUS.OVERDUE },
]

export function contractPaymentStatusColor(status) {
  const map = {
    未回款: 'default',
    部分回款: 'processing',
    已回清: 'success',
    已逾期: 'error',
  }
  return map[status] || 'default'
}

/** 合同变更单状态 */
export const CONTRACT_CHANGE_STATUS = {
  DRAFT: '草稿',
  PENDING: '待审',
  APPROVED: '已生效',
  REJECTED: '已驳回',
  CANCELLED: '已作废',
}

export const contractChangeStatusOptions = [
  { label: CONTRACT_CHANGE_STATUS.DRAFT, value: CONTRACT_CHANGE_STATUS.DRAFT },
  { label: CONTRACT_CHANGE_STATUS.PENDING, value: CONTRACT_CHANGE_STATUS.PENDING },
  { label: CONTRACT_CHANGE_STATUS.APPROVED, value: CONTRACT_CHANGE_STATUS.APPROVED },
  { label: CONTRACT_CHANGE_STATUS.REJECTED, value: CONTRACT_CHANGE_STATUS.REJECTED },
  { label: CONTRACT_CHANGE_STATUS.CANCELLED, value: CONTRACT_CHANGE_STATUS.CANCELLED },
]

export function contractChangeStatusColor(status) {
  const map = {
    草稿: 'default',
    待审: 'processing',
    已生效: 'success',
    已驳回: 'warning',
    已作废: 'error',
  }
  return map[status] || 'default'
}

/** 变更单可改字段（快照，与新增合同可编辑业务字段对齐） */
export const CONTRACT_CHANGE_FIELDS = [
  'customerName',
  'supplierName',
  'contractName',
  'salesperson',
  'signer',
  'signedAt',
  'taxInclusive',
  'partyLegal',
  'validFrom',
  'validTo',
  'settlementCycle',
  'paymentTermDays',
  'limitAmount',
  'limitQty',
  'allowExceedQuota',
  'paymentPlanBase',
  'defaultDiscountRate',
  'priceItems',
  'lineItems',
  'paymentNodes',
  'serviceContent',
  'remark',
  'attachments',
]

export const CONTRACT_CHANGE_FIELD_LABELS = {
  customerName: '客户名称',
  supplierName: '供应商',
  contractName: '合同名称',
  salesperson: '业务员',
  signer: '签署人',
  signedAt: '签署日期',
  taxInclusive: '是否含税',
  partyLegal: '客户资质与开票信息',
  validFrom: '有效期起',
  validTo: '有效期止',
  settlementCycle: '结算周期',
  paymentTermDays: '账期天数',
  limitAmount: '额度金额',
  limitQty: '额度数量',
  allowExceedQuota: '允许超额度',
  paymentPlanBase: '回款计划基数',
  defaultDiscountRate: '默认折扣',
  priceItems: '产品协议折扣',
  lineItems: '合同明细',
  paymentNodes: '回款节点',
  serviceContent: '服务内容',
  remark: '备注',
  attachments: '扫描件',
}

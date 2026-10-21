/** 销售合同类型（订单上的「临时合同」仅作订单标识，不进合同台账） */
export const CONTRACT_TYPE = {
  STANDARD: '标准合同',
  FRAMEWORK: '框架合同',
}

export const contractTypeOptions = [
  { label: CONTRACT_TYPE.STANDARD, value: CONTRACT_TYPE.STANDARD },
  { label: CONTRACT_TYPE.FRAMEWORK, value: CONTRACT_TYPE.FRAMEWORK },
]

export const CONTRACT_STATUS = {
  DRAFT: '草稿',
  PENDING: '待审',
  ACTIVE: '生效中',
  TERMINATED: '已终止',
}

export const contractStatusOptions = [
  { label: CONTRACT_STATUS.DRAFT, value: CONTRACT_STATUS.DRAFT },
  { label: CONTRACT_STATUS.PENDING, value: CONTRACT_STATUS.PENDING },
  { label: CONTRACT_STATUS.ACTIVE, value: CONTRACT_STATUS.ACTIVE },
  { label: CONTRACT_STATUS.TERMINATED, value: CONTRACT_STATUS.TERMINATED },
]

export function contractStatusColor(status) {
  const map = {
    草稿: 'default',
    待审: 'processing',
    生效中: 'success',
    已终止: 'error',
  }
  return map[status] || 'default'
}

/** 默认回款节点（比例可改，也可改填金额） */
export const DEFAULT_PAYMENT_NODES = [
  { name: '预付款', ratio: 0.3 },
  { name: '发货款', ratio: 0.5 },
  { name: '验收款', ratio: 0.15 },
  { name: '质保金', ratio: 0.05 },
]

export const PAYMENT_LINK_TYPE = {
  CONTRACT: '合同',
  SALES_ORDER: '销售订单',
}

export const paymentLinkTypeOptions = [
  { label: PAYMENT_LINK_TYPE.CONTRACT, value: PAYMENT_LINK_TYPE.CONTRACT },
  { label: PAYMENT_LINK_TYPE.SALES_ORDER, value: PAYMENT_LINK_TYPE.SALES_ORDER },
]

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

/** 变更单可改字段（快照） */
export const CONTRACT_CHANGE_FIELDS = [
  'contractName',
  'validFrom',
  'validTo',
  'settlementCycle',
  'paymentTermStart',
  'paymentTermDays',
  'limitAmount',
  'limitQty',
  'allowExceedQuota',
  'defaultDiscountRate',
  'priceItems',
  'lineItems',
  'paymentNodes',
  'remark',
  'attachments',
]

export const CONTRACT_CHANGE_FIELD_LABELS = {
  contractName: '合同名称',
  validFrom: '有效期起',
  validTo: '有效期止',
  settlementCycle: '结算周期',
  paymentTermStart: '账期起算',
  paymentTermDays: '账期天数',
  limitAmount: '额度金额',
  limitQty: '额度数量',
  allowExceedQuota: '允许超额度',
  defaultDiscountRate: '默认折扣',
  priceItems: '产品协议价',
  lineItems: '合同明细',
  paymentNodes: '回款节点',
  remark: '备注',
  attachments: '扫描件',
}

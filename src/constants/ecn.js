export const ECN_STATUS = {
  PENDING: '待审批',
  APPROVING: '审批中',
  APPROVED: '已通过',
  EXECUTING: '执行中',
  EXECUTED: '已执行',
  REJECTED: '已驳回',
  COMPLETED: '已完成',
  CANCELLED: '已撤销',
  DRAFT: '草稿',
}

export const ECN_TYPE = {
  BOM: 'BOM变更',
  PROCESS: '工艺变更',
  MATERIAL: '物料替代',
  DRAWING: '图纸变更',
}

export const ECN_CHANGE_REASON = {
  DESIGN: '设计优化',
  CUSTOMER: '客户需求变更',
}

export const ecnChangeReasonOptions = [
  { label: ECN_CHANGE_REASON.DESIGN, value: ECN_CHANGE_REASON.DESIGN },
  { label: ECN_CHANGE_REASON.CUSTOMER, value: ECN_CHANGE_REASON.CUSTOMER },
]

export const ecnCreateTypeOptions = [{ label: ECN_TYPE.BOM, value: ECN_TYPE.BOM }]

/** 变更项操作类型 */
export const ECN_CHANGE_ITEM_TYPE = {
  MODIFY: '修改',
  REPLACE: '替换',
  REMOVE: '取消',
  ADD: '新增',
}

export const ecnChangeItemTypeOptions = [
  { label: ECN_CHANGE_ITEM_TYPE.MODIFY, value: ECN_CHANGE_ITEM_TYPE.MODIFY },
  { label: ECN_CHANGE_ITEM_TYPE.REPLACE, value: ECN_CHANGE_ITEM_TYPE.REPLACE },
  { label: ECN_CHANGE_ITEM_TYPE.REMOVE, value: ECN_CHANGE_ITEM_TYPE.REMOVE },
  { label: ECN_CHANGE_ITEM_TYPE.ADD, value: ECN_CHANGE_ITEM_TYPE.ADD },
]

/** 技术内容列表列名（区别于基本信息「变更类型」） */
export const ECN_CHANGE_ITEM_ACTION_LABEL = '变更操作'

export function ecnChangeItemTypeColor(type) {
  const map = {
    [ECN_CHANGE_ITEM_TYPE.MODIFY]: 'blue',
    [ECN_CHANGE_ITEM_TYPE.REPLACE]: 'orange',
    [ECN_CHANGE_ITEM_TYPE.REMOVE]: 'default',
    [ECN_CHANGE_ITEM_TYPE.ADD]: 'green',
  }
  return map[type] || 'default'
}

export const ECN_URGENCY = {
  NORMAL: '普通',
  URGENT: '紧急',
  CRITICAL: '特急',
}

export const ECN_ORIGIN_TYPE = {
  ECR: 'ecr',
  SALES_ORDER: 'sales_order',
  WORK_ORDER: 'work_order',
  PRODUCT: 'product',
}

export const ecnOriginOptions = [
  { label: '根据ECR', value: ECN_ORIGIN_TYPE.ECR, disabled: true },
  { label: '根据销售订单', value: ECN_ORIGIN_TYPE.SALES_ORDER },
  { label: '根据工单', value: ECN_ORIGIN_TYPE.WORK_ORDER },
  { label: '根据产品', value: ECN_ORIGIN_TYPE.PRODUCT, disabled: true },
]

export const ECN_WIP_HANDLING = {
  /** 仅升版 EBOM 档案，已下发计划/工单不变 */
  EBOM_ONLY: 'ebom_only',
  /** 同步升版 EBOM 与产品 BOM */
  EBOM_AND_PRODUCT_BOM: 'ebom_and_product_bom',
  /** 升版 EBOM，在线工单下一工序起切换新版 */
  EBOM_WITH_ONLINE_WO_SWITCH: 'ebom_with_online_wo_switch',
}

/** 执行配置（新建 / 审批 / 执行共用） */
export const ecnExecConfigOptions = [
  {
    value: ECN_WIP_HANDLING.EBOM_ONLY,
    label: '仅升级EBOM档案',
    sub: '归档旧版 EBOM 并发布新版；已下发计划与工单保持原绑定版本',
    recommended: true,
  },
  {
    value: ECN_WIP_HANDLING.EBOM_AND_PRODUCT_BOM,
    label: '同时升级EBOM与产品BOM',
    sub: '同步升版 EBOM 档案与产品 BOM，供计划与生产引用最新结构',
    recommended: false,
  },
  {
    value: ECN_WIP_HANDLING.EBOM_WITH_ONLINE_WO_SWITCH,
    label: '升级EBOM同时，在线工单切换新版',
    sub: '升版 EBOM 后，在线工单将在下一工序起切换至新版',
    recommended: false,
  },
]

/** 兼容旧值 archive_upgrade / switch_now / continue_old / record_only */
export function normalizeWipHandling(wipHandling) {
  if (
    wipHandling === 'continue_old' ||
    wipHandling === 'record_only' ||
    wipHandling === 'archive_upgrade'
  ) {
    return ECN_WIP_HANDLING.EBOM_ONLY
  }
  if (wipHandling === 'switch_now') {
    return ECN_WIP_HANDLING.EBOM_WITH_ONLINE_WO_SWITCH
  }
  return wipHandling
}

export function findExecConfigOption(wipHandling) {
  const value = normalizeWipHandling(wipHandling)
  return ecnExecConfigOptions.find((o) => o.value === value) || null
}

export function resolveExecConfigLabel(wipHandling) {
  return findExecConfigOption(wipHandling)?.label || '—'
}

export function resolveExecConfigNote(wipHandling) {
  return findExecConfigOption(wipHandling)?.sub || '—'
}

export const ecnStatusOptions = [
  { label: '全部状态', value: '' },
  { label: ECN_STATUS.DRAFT, value: ECN_STATUS.DRAFT },
  { label: ECN_STATUS.APPROVING, value: ECN_STATUS.APPROVING },
  { label: ECN_STATUS.APPROVED, value: ECN_STATUS.APPROVED },
  { label: ECN_STATUS.EXECUTED, value: ECN_STATUS.EXECUTED },
  { label: ECN_STATUS.REJECTED, value: ECN_STATUS.REJECTED },
]

/** 列表展示：关联单据文案 */
export function formatEcnOriginDoc(record = {}) {
  if (record.originType === ECN_ORIGIN_TYPE.WORK_ORDER) {
    const no = record.workOrderCode || record.workOrderNo
    return no ? `工单 ${no}` : '工单'
  }
  if (record.originType === ECN_ORIGIN_TYPE.SALES_ORDER) {
    const no = record.salesOrderNo
    return no ? `销售订单 ${no}` : '销售订单'
  }
  if (record.originType === ECN_ORIGIN_TYPE.ECR) return 'ECR'
  if (record.workOrderNo || record.workOrderCode) {
    return `工单 ${record.workOrderCode || record.workOrderNo}`
  }
  if (record.salesOrderNo) return `销售订单 ${record.salesOrderNo}`
  return '—'
}

export function resolveEcnChangeReason(record = {}) {
  return record.changeReason || record.reason || '—'
}

export const ecnTypeOptions = [
  { label: '全部类型', value: '' },
  { label: ECN_TYPE.BOM, value: ECN_TYPE.BOM },
  { label: ECN_TYPE.PROCESS, value: ECN_TYPE.PROCESS },
  { label: ECN_TYPE.MATERIAL, value: ECN_TYPE.MATERIAL },
  { label: ECN_TYPE.DRAWING, value: ECN_TYPE.DRAWING },
]

export function ecnStatusColor(status) {
  const map = {
    [ECN_STATUS.PENDING]: 'orange',
    [ECN_STATUS.APPROVING]: 'processing',
    [ECN_STATUS.APPROVED]: 'blue',
    [ECN_STATUS.EXECUTING]: 'cyan',
    [ECN_STATUS.EXECUTED]: 'success',
    [ECN_STATUS.REJECTED]: 'error',
    [ECN_STATUS.CANCELLED]: 'default',
    [ECN_STATUS.COMPLETED]: 'default',
    [ECN_STATUS.DRAFT]: 'default',
  }
  return map[status] || 'default'
}

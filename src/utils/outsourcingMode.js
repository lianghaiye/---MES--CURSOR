/** 外协订单模式：整件 vs 工序 */
export const OUTSOURCE_MODE = {
  WHOLE: 'whole',
  PROCESS: 'process',
}

export const OUTSOURCE_MODE_OPTIONS = [
  { label: '整件外协', value: OUTSOURCE_MODE.WHOLE },
  { label: '工序外协', value: OUTSOURCE_MODE.PROCESS },
]

export function normalizeOutsourceMode(mode) {
  return mode === OUTSOURCE_MODE.PROCESS ? OUTSOURCE_MODE.PROCESS : OUTSOURCE_MODE.WHOLE
}

export function outsourceModeLabel(mode) {
  return normalizeOutsourceMode(mode) === OUTSOURCE_MODE.PROCESS ? '工序外协' : '整件外协'
}

export function isProcessOutsourceOrder(order) {
  return normalizeOutsourceMode(order?.outsourceMode) === OUTSOURCE_MODE.PROCESS
}

/** 工单工序外协状态 */
export const PROCESS_OUTSOURCE_STATUS = {
  NONE: '',
  PENDING: '待外协',
  OUTSOURCING: '外协中',
  RETURNED: '已回货',
}

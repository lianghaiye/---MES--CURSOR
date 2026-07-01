/** 销售订单 / 生产上下文中 EBOM 快照的状态（区别于产品 BOM 档案的 生效/已归档） */
export const EBOM_SNAPSHOT_STATUS = {
  /** 尚未审核生成快照 */
  PENDING: '待生成',
  /** 已生成 EBOM，现行版本始终跟随最新产品 BOM（含 ECN 升版） */
  ACTIVE: '现行',
  /** 关联工单/计划已完结，该 EBOM 不再用于在制 */
  CLOSED: '已关闭',
}

export function ebomSnapshotStatusColor(status) {
  const map = {
    [EBOM_SNAPSHOT_STATUS.PENDING]: 'default',
    [EBOM_SNAPSHOT_STATUS.ACTIVE]: 'success',
    [EBOM_SNAPSHOT_STATUS.CLOSED]: 'default',
  }
  return map[status] || 'default'
}

/**
 * 解析销售明细行 EBOM 展示状态
 * @param {object} line 销售明细行
 */
export function resolveEbomSnapshotStatus(line = {}) {
  const hasSnapshot =
    Boolean(line.bomVersion || line.ebomSnapshot?.bomVersion) ||
    Boolean(line.ebomSnapshot?.materials?.length)

  if (!hasSnapshot) {
    return EBOM_SNAPSHOT_STATUS.PENDING
  }
  if (line.ebomStatus === EBOM_SNAPSHOT_STATUS.CLOSED) {
    return EBOM_SNAPSHOT_STATUS.CLOSED
  }
  return EBOM_SNAPSHOT_STATUS.ACTIVE
}

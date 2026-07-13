export const COCKPIT_ROLE = {
  EXECUTIVE: 'executive',
  OPS: 'ops',
}

export const COCKPIT_PERIOD = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
}

export const cockpitRoleOptions = [
  { label: '管理层', value: COCKPIT_ROLE.EXECUTIVE },
  { label: '运营/计划', value: COCKPIT_ROLE.OPS },
]

export const cockpitPeriodOptions = [
  { label: '今日', value: COCKPIT_PERIOD.TODAY },
  { label: '本周', value: COCKPIT_PERIOD.WEEK },
  { label: '本月', value: COCKPIT_PERIOD.MONTH },
  { label: '本季', value: COCKPIT_PERIOD.QUARTER },
]

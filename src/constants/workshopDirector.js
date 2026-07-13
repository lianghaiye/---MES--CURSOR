import { workCenterOptions, workCenterManagers } from '@/mock/workOrderOptions'

export const WORKSHOP_SCOPE_ALL = '全厂'

export const DIRECTOR_PERIOD = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
}

export const directorPeriodOptions = [
  { label: '今日', value: DIRECTOR_PERIOD.TODAY },
  { label: '本周', value: DIRECTOR_PERIOD.WEEK },
  { label: '本月', value: DIRECTOR_PERIOD.MONTH },
]

export const workshopScopeOptions = [
  { label: WORKSHOP_SCOPE_ALL, value: WORKSHOP_SCOPE_ALL },
  ...workCenterOptions.map((w) => ({ label: w, value: w })),
]

/** 根据登录用户解析默认车间范围 */
export function resolveUserDefaultWorkshop(user) {
  if (!user) return WORKSHOP_SCOPE_ALL
  if (user.defaultWorkshop) return user.defaultWorkshop
  const name = user.username || ''
  if (name === 'admin' || name === 'admin1') return WORKSHOP_SCOPE_ALL
  for (const [workshop, manager] of Object.entries(workCenterManagers)) {
    if (manager === name || manager === user.displayName) return workshop
  }
  return workCenterOptions[0] || WORKSHOP_SCOPE_ALL
}

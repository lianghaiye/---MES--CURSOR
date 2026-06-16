import { mockEmployees } from '@/mock/workOrderMaster'
import { employeeGroupState } from '@/store/employeeGroupStore'

/** 按姓名解析员工工号、岗位、工作中心（人员主数据 + 员工组别） */
export function resolveEmployeeProfile(name = '') {
  if (!name?.trim()) {
    return { employeeNo: '—', positions: '—', workCenter: '—' }
  }
  const emp = mockEmployees.find((e) => e.name === name)
  void employeeGroupState.groups
  const groups = employeeGroupState.groups.filter(
    (g) =>
      g.status !== '停用' &&
      (g.leaderName === name || (g.workers || []).some((w) => w.name === name)),
  )
  const positions = [...new Set(groups.map((g) => g.position).filter(Boolean))].join('、') || '—'
  const workCenters = [...new Set(groups.map((g) => g.workCenter).filter(Boolean))]
  return {
    employeeNo: emp?.employeeNo || '—',
    positions,
    workCenter: workCenters.length ? workCenters.join('、') : '—',
  }
}

export function employeeNameOptions() {
  return mockEmployees.map((e) => ({
    label: e.employeeNo ? `${e.name}（${e.employeeNo}）` : e.name,
    value: e.name,
  }))
}

import { reactive, watch } from 'vue'
import dayjs from 'dayjs'

const STORAGE_KEY = 'i_doms_employee_groups'
let codeSeq = 16

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.groups)) return parsed.groups
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups: employeeGroupState.groups }))
}

function generateCode() {
  const code = `WG${dayjs().format('YYYYMMDD')}${String(codeSeq++).padStart(3, '0')}`
  return code
}

function createSeedGroups() {
  return [
    {
      id: 'eg-1',
      code: 'WG20260310002',
      name: '加工小组',
      workCenter: '机泵',
      position: '泵装配调试',
      allowTaskGen: true,
      leaderParticipates: true,
      multiExecutor: true,
      status: '启用',
      leaderId: 'emp-2',
      leaderName: '张三',
      workers: [
        { id: 'emp-2', name: '张三', isLeader: true },
        { id: 'emp-3', name: '李四', isLeader: false },
        { id: 'emp-9', name: '赵六', isLeader: false },
      ],
      remark: '',
      createdAt: '2026-03-10',
    },
    {
      id: 'eg-2',
      code: 'WG20260310003',
      name: '总装小组',
      workCenter: '组装中心',
      position: '泵装配调试',
      allowTaskGen: true,
      leaderParticipates: true,
      multiExecutor: true,
      status: '启用',
      leaderId: 'emp-1',
      leaderName: '孙琴丽',
      workers: [
        { id: 'emp-1', name: '孙琴丽', isLeader: true },
        { id: 'emp-4', name: '王五', isLeader: false },
      ],
      remark: '',
      createdAt: '2026-03-10',
    },
    {
      id: 'eg-3',
      code: 'WG20260310004',
      name: '探伤小组',
      workCenter: '机泵',
      position: '质检',
      allowTaskGen: true,
      leaderParticipates: true,
      multiExecutor: true,
      status: '启用',
      leaderId: 'emp-10',
      leaderName: '陈七',
      workers: [{ id: 'emp-10', name: '陈七', isLeader: true }],
      remark: '',
      createdAt: '2026-03-10',
    },
    {
      id: 'eg-4',
      code: 'WG20260310001',
      name: '机加小组',
      workCenter: '机泵',
      position: '车间工人',
      allowTaskGen: true,
      leaderParticipates: false,
      multiExecutor: true,
      status: '启用',
      leaderId: 'emp-3',
      leaderName: '李四',
      workers: [
        { id: 'emp-3', name: '李四', isLeader: true },
        { id: 'emp-9', name: '赵六', isLeader: false },
      ],
      remark: '',
      createdAt: '2026-03-10',
    },
    {
      id: 'eg-5',
      code: 'WG20260310005',
      name: '焊接小组',
      workCenter: '机泵',
      position: '车间工人',
      allowTaskGen: true,
      leaderParticipates: true,
      multiExecutor: false,
      status: '启用',
      leaderId: 'emp-4',
      leaderName: '王五',
      workers: [
        { id: 'emp-4', name: '王五', isLeader: true },
        { id: 'emp-2', name: '张三', isLeader: false },
      ],
      remark: '',
      createdAt: '2026-03-10',
    },
  ]
}

export const employeeGroupState = reactive({
  groups: loadFromStorage() || createSeedGroups(),
})

watch(
  () => employeeGroupState.groups,
  () => persist(),
  { deep: true },
)

export function getEmployeeGroupById(id) {
  return employeeGroupState.groups.find((g) => g.id === id) || null
}

export function getEmployeeGroupByName(name) {
  return employeeGroupState.groups.find((g) => g.name === name) || null
}

export function getEnabledEmployeeGroups() {
  return employeeGroupState.groups.filter((g) => g.status === '启用')
}

export function addEmployeeGroup(payload) {
  const row = {
    id: `eg-${Date.now()}`,
    code: payload.code?.trim() || generateCode(),
    name: payload.name?.trim() || '',
    workCenter: payload.workCenter || '',
    position: payload.position || '',
    allowTaskGen: payload.allowTaskGen ?? true,
    leaderParticipates: payload.leaderParticipates ?? true,
    multiExecutor: payload.multiExecutor ?? true,
    status: payload.status || '启用',
    leaderId: payload.leaderId || '',
    leaderName: payload.leaderName || '',
    workers: payload.workers || [],
    remark: payload.remark || '',
    createdAt: dayjs().format('YYYY-MM-DD'),
  }
  employeeGroupState.groups.unshift(row)
  return row
}

export function updateEmployeeGroup(id, patch) {
  const idx = employeeGroupState.groups.findIndex((g) => g.id === id)
  if (idx === -1) return null
  Object.assign(employeeGroupState.groups[idx], patch)
  return employeeGroupState.groups[idx]
}

export function deleteEmployeeGroups(ids) {
  const set = new Set(ids)
  const before = employeeGroupState.groups.length
  employeeGroupState.groups = employeeGroupState.groups.filter((g) => !set.has(g.id))
  return before - employeeGroupState.groups.length
}

export const workCenterOptions = [
  '机泵',
  '组装中心',
  '默认工厂',
  '机加车间',
  '装配车间',
  '总装车间',
]
export const positionOptions = ['泵装配调试', '质检', '车间工人', '班组长', '操作工']

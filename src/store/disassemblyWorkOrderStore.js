import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { buildDisassemblyProcesses } from '@/mock/processRoutes'
import {
  generateDisassemblyOrderCode,
  generateDisassemblyOrderName,
  WORK_CENTER_MANAGERS,
} from '@/utils/disassemblyWorkOrder'
import { resolveOrderField } from '@/utils/workOrderNaming'

const STORAGE_KEY = 'i_doms_disassembly_work_orders'
const DATA_VERSION = 2

function normalizeOrder(row) {
  const legacyStatus = row.status || row.progress
  let status = legacyStatus
  if (status === '新建' || !status) status = '待下发'
  const normalized = { ...row, status }
  delete normalized.progress
  return normalized
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.orders)) {
        if (parsed.version === DATA_VERSION) {
          return parsed.orders.map(normalizeOrder)
        }
        if (parsed.version === 1) {
          return parsed.orders.map(normalizeOrder)
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, orders: disassemblyWorkOrderState.orders }),
  )
}

function createSeedOrders() {
  const base = [
    {
      id: 'dwo-seed-1',
      code: 'CJGD20260528001',
      name: '污水泵拆解001',
      status: '待下发',
      itemName: '污水泵',
      itemCode: 'CP2610002',
      specModel: 'ISG80-160(I)A',
      material: '铸铁',
      urgency: '普通',
      relatedScrapNo: 'BF20260528001',
      processRouteName: '装配标准路线',
      ebomName: '污水泵 EBOM V1.0',
      workCenter: '总装车间',
      personInCharge: '孙琴丽',
      planStartDate: '2026-06-01',
      planEndDate: '2026-06-10',
      reminderDate: '2026-06-08',
      creator: '王小虎',
      createdAt: '2026-05-28 10:20',
    },
    {
      id: 'dwo-seed-2',
      code: 'CJGD20260529002',
      name: '清水离心泵拆解001',
      status: '已下发',
      itemName: '清水离心泵',
      itemCode: 'CP2610001',
      specModel: 'ISG50-160',
      material: '不锈钢',
      urgency: '加急',
      relatedScrapNo: 'BF20260529002',
      processRouteName: '机加标准路线',
      ebomName: '清水离心泵 EBOM V1.0',
      workCenter: '机加车间',
      personInCharge: '张三',
      planStartDate: '2026-05-30',
      planEndDate: '2026-06-05',
      creator: 'admin1',
      createdAt: '2026-05-29 14:10',
      dispatchedAt: '2026-05-29 15:00',
      dispatchedBy: 'admin1',
    },
    {
      id: 'dwo-seed-3',
      code: 'CJGD20260601003',
      name: '立式多级泵拆解001',
      status: '执行中',
      itemName: '立式多级泵',
      itemCode: 'CP2610003',
      specModel: 'CDL4-40',
      material: '铸铁',
      urgency: '普通',
      relatedScrapNo: 'BF20260601003',
      processRouteName: '装配标准路线',
      ebomName: '立式多级泵 EBOM V1.0',
      workCenter: '装配车间',
      personInCharge: '李四',
      planStartDate: '2026-06-02',
      planEndDate: '2026-06-12',
      creator: '王小虎',
      createdAt: '2026-06-01 09:00',
      dispatchedAt: '2026-06-01 10:00',
      dispatchedBy: '王小虎',
      executedAt: '2026-06-02 08:30',
      executedBy: '李四',
    },
    {
      id: 'dwo-seed-4',
      code: 'CJGD20260602004',
      name: '深井潜水泵拆解001',
      status: '待复核',
      itemName: '深井潜水泵',
      itemCode: 'CP2610004',
      specModel: 'QJ200-50/4',
      material: '不锈钢',
      urgency: '紧急',
      relatedScrapNo: 'BF20260602004',
      processRouteName: '装配标准路线',
      ebomName: '深井潜水泵 EBOM V1.0',
      workCenter: '总装车间',
      personInCharge: '孙琴丽',
      planStartDate: '2026-06-03',
      planEndDate: '2026-06-15',
      creator: 'admin1',
      createdAt: '2026-06-02 11:30',
      dispatchedAt: '2026-06-02 12:00',
      dispatchedBy: 'admin1',
      executedAt: '2026-06-10 16:00',
      executedBy: '孙琴丽',
    },
    {
      id: 'dwo-seed-5',
      code: 'CJGD20260520005',
      name: '污水泵拆解002',
      status: '完成',
      itemName: '污水泵',
      itemCode: 'CP2610002',
      specModel: 'ISG80-160(I)A',
      material: '铸铁',
      urgency: '普通',
      relatedScrapNo: 'BF20260528001',
      processRouteName: '装配标准路线',
      ebomName: '污水泵 EBOM V1.0',
      workCenter: '总装车间',
      personInCharge: '孙琴丽',
      planStartDate: '2026-05-10',
      planEndDate: '2026-05-20',
      completedAt: '2026-05-20 16:30:00',
      creator: '王小虎',
      createdAt: '2026-05-20 08:00',
      dispatchedAt: '2026-05-20 09:00',
      dispatchedBy: '王小虎',
      executedAt: '2026-05-20 14:00',
      executedBy: '孙琴丽',
    },
  ]
  return base.map((row) => ({
    orderCategory: '拆解工单',
    orderSource: '生产报废',
    orderType: '拆解工单',
    traceStatus: '',
    standardCycleDays: 3,
    warehouse: '半成品仓',
    bom: row.ebomName,
    disassemblyQty: 1,
    remark: '',
    processes: buildDisassemblyProcesses(),
    updatedAt: row.createdAt,
    operator: row.creator,
    ...row,
  }))
}

export const disassemblyWorkOrderState = reactive({
  orders: loadFromStorage() || createSeedOrders(),
})

watch(
  () => disassemblyWorkOrderState.orders,
  () => persist(),
  { deep: true },
)

export function getDisassemblyWorkOrderById(id) {
  return disassemblyWorkOrderState.orders.find((o) => o.id === id) || null
}

export function countPendingDisassemblyOrders() {
  return disassemblyWorkOrderState.orders.filter((o) => o.status === '待下发').length
}

export function addDisassemblyWorkOrder(payload) {
  const codes = disassemblyWorkOrderState.orders.map((o) => o.code)
  const names = disassemblyWorkOrderState.orders.map((o) => o.name)
  const code = resolveOrderField(payload.code, () => generateDisassemblyOrderCode(codes))
  const name = resolveOrderField(payload.name, () =>
    generateDisassemblyOrderName(payload.itemName, names),
  )
  const row = {
    ...payload,
    id: `dwo-${Date.now()}`,
    code,
    name,
    orderCategory: '拆解工单',
    orderType: '拆解工单',
    orderSource: '生产报废',
    status: '待下发',
    traceStatus: '',
    processes: buildDisassemblyProcesses(),
    creator: payload.creator || '王小虎',
    operator: payload.creator || '王小虎',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
  disassemblyWorkOrderState.orders.unshift(row)
  return row
}

export function updateDisassemblyWorkOrder(id, patch) {
  const idx = disassemblyWorkOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return null
  Object.assign(disassemblyWorkOrderState.orders[idx], patch, {
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    operator: patch.operator || disassemblyWorkOrderState.orders[idx].creator,
  })
  if (patch.processRouteName) {
    disassemblyWorkOrderState.orders[idx].processes = buildDisassemblyProcesses()
  }
  return disassemblyWorkOrderState.orders[idx]
}

export function deleteDisassemblyWorkOrder(id) {
  const idx = disassemblyWorkOrderState.orders.findIndex((o) => o.id === id)
  if (idx === -1) return false
  if (disassemblyWorkOrderState.orders[idx].status !== '待下发') return false
  disassemblyWorkOrderState.orders.splice(idx, 1)
  return true
}

export function dispatchDisassemblyWorkOrder(id) {
  const order = disassemblyWorkOrderState.orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '工单不存在' }
  if (order.status !== '待下发') {
    return { ok: false, message: '当前状态不可下发并开始' }
  }
  order.status = '执行中'
  order.dispatchedAt = dayjs().format('YYYY-MM-DD HH:mm')
  order.dispatchedBy = order.operator || order.creator
  order.executedAt = dayjs().format('YYYY-MM-DD HH:mm')
  order.executedBy = order.personInCharge || order.operator
  order.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  return { ok: true, order }
}

export function resolvePersonInCharge(workCenter) {
  return WORK_CENTER_MANAGERS[workCenter] || '王小虎'
}

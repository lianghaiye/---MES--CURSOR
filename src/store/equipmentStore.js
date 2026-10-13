import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createEquipmentDeviceSeed,
  createInspectionStandardSeed,
  createInspectionTaskSeed,
  createMaintainOrderSeed,
  createRepairOrderSeed,
  normalizeDevice,
  normalizeInspectionStandard,
  EQUIPMENT_STATUS,
  INSPECTION_TASK_STATUS,
  MAINTAIN_ORDER_STATUS,
  REPAIR_STATUS,
} from '@/mock/equipmentSeed'

const STORAGE_KEY = 'i_doms_equipment_v1'
const SEED_VERSION_KEY = 'i_doms_equipment_seed_v'
const CURRENT_SEED_VERSION = '1'

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function shouldReseed() {
  return localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function buildSeed() {
  const devices = createEquipmentDeviceSeed()
  const standards = createInspectionStandardSeed()
  return {
    devices,
    standards,
    inspectionTasks: createInspectionTaskSeed(devices, standards),
    maintainOrders: createMaintainOrderSeed(devices),
    repairOrders: createRepairOrderSeed(devices),
  }
}

function loadInitial() {
  if (shouldReseed()) return buildSeed()
  const stored = loadRaw()
  if (stored?.devices?.length) {
    return {
      devices: (stored.devices || []).map(normalizeDevice),
      standards: (stored.standards || []).map(normalizeInspectionStandard),
      inspectionTasks: stored.inspectionTasks || [],
      maintainOrders: stored.maintainOrders || [],
      repairOrders: stored.repairOrders || [],
    }
  }
  return buildSeed()
}

const initial = loadInitial()

export const equipmentState = reactive({
  devices: initial.devices,
  standards: initial.standards,
  inspectionTasks: initial.inspectionTasks,
  maintainOrders: initial.maintainOrders,
  repairOrders: initial.repairOrders,
})

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      devices: equipmentState.devices,
      standards: equipmentState.standards,
      inspectionTasks: equipmentState.inspectionTasks,
      maintainOrders: equipmentState.maintainOrders,
      repairOrders: equipmentState.repairOrders,
    }),
  )
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

watch(equipmentState, persist, { deep: true })
persist()

let deviceSeq = equipmentState.devices.length + 1
let standardSeq = equipmentState.standards.length + 1
let taskSeq = equipmentState.inspectionTasks.length + 1
let maintainSeq = equipmentState.maintainOrders.length + 1
let repairSeq = equipmentState.repairOrders.length + 1

function nextNo(prefix, seq) {
  return `${prefix}${dayjs().format('YYYYMMDD')}${String(seq).padStart(3, '0')}`
}

/* ---------- 设备台账 ---------- */
export function listDevices(filters = {}) {
  const code = String(filters.code || '')
    .trim()
    .toUpperCase()
  const name = String(filters.name || '').trim()
  const status = filters.status
  const category = filters.category
  return equipmentState.devices.filter((d) => {
    if (
      code &&
      !String(d.code || '')
        .toUpperCase()
        .includes(code)
    )
      return false
    if (name && !String(d.name || '').includes(name)) return false
    if (status && d.status !== status) return false
    if (category && d.category !== category) return false
    return true
  })
}

export function getDeviceById(id) {
  return equipmentState.devices.find((d) => d.id === id) || null
}

export function addDevice(payload = {}, operator = 'admin1') {
  const code = String(payload.code || '').trim() || `EQ-${String(deviceSeq).padStart(3, '0')}`
  deviceSeq += 1
  if (equipmentState.devices.some((d) => d.code === code)) {
    return { ok: false, message: `设备编码「${code}」已存在` }
  }
  if (!String(payload.name || '').trim()) return { ok: false, message: '请输入设备名称' }
  const t = nowText()
  const row = normalizeDevice({
    ...payload,
    id: `eq-d-${Date.now()}`,
    code,
    creator: operator,
    createdAt: t,
    updater: operator,
    updatedAt: t,
  })
  equipmentState.devices.unshift(row)
  return { ok: true, device: row }
}

export function updateDevice(id, payload = {}, operator = 'admin1') {
  const row = getDeviceById(id)
  if (!row) return { ok: false, message: '设备不存在' }
  const nextCode = payload.code != null ? String(payload.code).trim() : row.code
  if (nextCode && equipmentState.devices.some((d) => d.id !== id && d.code === nextCode)) {
    return { ok: false, message: `设备编码「${nextCode}」已存在` }
  }
  Object.assign(row, normalizeDevice({ ...row, ...payload, code: nextCode }), {
    id: row.id,
    creator: row.creator,
    createdAt: row.createdAt,
    updater: operator,
    updatedAt: nowText(),
  })
  return { ok: true, device: row }
}

export function deleteDevice(id) {
  const idx = equipmentState.devices.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, message: '设备不存在' }
  const linked =
    equipmentState.inspectionTasks.some(
      (t) => t.deviceId === id && t.status === INSPECTION_TASK_STATUS.PENDING,
    ) ||
    equipmentState.maintainOrders.some(
      (t) => t.deviceId === id && t.status === MAINTAIN_ORDER_STATUS.PENDING,
    ) ||
    equipmentState.repairOrders.some((t) => t.deviceId === id && t.status !== REPAIR_STATUS.CLOSED)
  if (linked) return { ok: false, message: '存在未完成的点检/保养/维修任务，无法删除' }
  equipmentState.devices.splice(idx, 1)
  return { ok: true }
}

/* ---------- 点检标准 ---------- */
export function listInspectionStandards(filters = {}) {
  const keyword = String(filters.keyword || '').trim()
  return equipmentState.standards.filter((s) => {
    if (filters.enabled != null && Boolean(s.enabled) !== Boolean(filters.enabled)) return false
    if (filters.category && s.category !== filters.category) return false
    if (keyword && !`${s.code}${s.name}`.includes(keyword)) {
      return false
    }
    return true
  })
}

export function addInspectionStandard(payload = {}, operator = 'admin1') {
  const code = String(payload.code || '').trim() || `IS-${String(standardSeq).padStart(3, '0')}`
  standardSeq += 1
  if (!String(payload.name || '').trim()) return { ok: false, message: '请输入标准名称' }
  const items = (payload.items || []).filter((i) => String(i.name || '').trim())
  if (!items.length) return { ok: false, message: '请至少添加一个点检项' }
  const t = nowText()
  const row = normalizeInspectionStandard({
    ...payload,
    id: `eq-is-${Date.now()}`,
    code,
    items,
    creator: operator,
    createdAt: t,
    updater: operator,
    updatedAt: t,
  })
  equipmentState.standards.unshift(row)
  return { ok: true, standard: row }
}

export function updateInspectionStandard(id, payload = {}, operator = 'admin1') {
  const row = equipmentState.standards.find((s) => s.id === id)
  if (!row) return { ok: false, message: '点检标准不存在' }
  const items = (payload.items || row.items || []).filter((i) => String(i.name || '').trim())
  if (!items.length) return { ok: false, message: '请至少添加一个点检项' }
  Object.assign(
    row,
    normalizeInspectionStandard({
      ...row,
      ...payload,
      items,
      updater: operator,
      updatedAt: nowText(),
    }),
    { id: row.id, creator: row.creator, createdAt: row.createdAt },
  )
  return { ok: true, standard: row }
}

export function deleteInspectionStandard(id) {
  const idx = equipmentState.standards.findIndex((s) => s.id === id)
  if (idx < 0) return { ok: false, message: '点检标准不存在' }
  equipmentState.standards.splice(idx, 1)
  return { ok: true }
}

/* ---------- 点检任务 ---------- */
export function listInspectionTasks(filters = {}) {
  const keyword = String(filters.keyword || '').trim()
  return equipmentState.inspectionTasks.filter((t) => {
    if (filters.status && t.status !== filters.status) return false
    if (filters.planDate && t.planDate !== filters.planDate) return false
    if (
      keyword &&
      !`${t.taskNo}${t.deviceCode}${t.deviceName}${t.standardName}`.includes(keyword)
    ) {
      return false
    }
    return true
  })
}

/** 按标准+设备类别生成当日待执行任务（演示用） */
export function generateInspectionTasksForToday(operator = 'admin1') {
  const today = dayjs().format('YYYY-MM-DD')
  let created = 0
  equipmentState.standards
    .filter((s) => s.enabled)
    .forEach((std) => {
      const devices = equipmentState.devices.filter(
        (d) => d.category === std.category && d.status !== EQUIPMENT_STATUS.SCRAPPED,
      )
      devices.forEach((device) => {
        const exists = equipmentState.inspectionTasks.some(
          (t) => t.planDate === today && t.standardId === std.id && t.deviceId === device.id,
        )
        if (exists) return
        taskSeq += 1
        equipmentState.inspectionTasks.unshift({
          id: `eq-it-${Date.now()}-${taskSeq}`,
          taskNo: nextNo('DJ', taskSeq),
          standardId: std.id,
          standardName: std.name,
          deviceId: device.id,
          deviceCode: device.code,
          deviceName: device.name,
          planDate: today,
          status: INSPECTION_TASK_STATUS.PENDING,
          executor: '',
          executedAt: '',
          results: [],
          remark: '',
          createdAt: nowText(),
          creator: operator,
        })
        created += 1
      })
    })
  return { ok: true, created }
}

export function executeInspectionTask(id, payload = {}, operator = 'admin1') {
  const task = equipmentState.inspectionTasks.find((t) => t.id === id)
  if (!task) return { ok: false, message: '点检任务不存在' }
  if (task.status !== INSPECTION_TASK_STATUS.PENDING) {
    return { ok: false, message: '任务已执行，不可重复提交' }
  }
  const standard = equipmentState.standards.find((s) => s.id === task.standardId)
  const items = standard?.items || []
  const resultMap = payload.results || {}
  const results = items.map((item) => {
    const r = resultMap[item.id] || {}
    const ok = r.ok !== false
    return {
      itemId: item.id,
      name: item.name,
      checkType: item.checkType,
      standard: item.standard,
      ok,
      value: r.value ?? '',
      note: r.note || '',
    }
  })
  const hasAbnormal = results.some((r) => !r.ok)
  task.results = results
  task.executor = payload.executor || operator
  task.executedAt = nowText()
  task.remark = payload.remark || ''
  task.status = hasAbnormal ? INSPECTION_TASK_STATUS.ABNORMAL : INSPECTION_TASK_STATUS.DONE

  let repair = null
  if (hasAbnormal && payload.createRepair !== false) {
    const abnormalNames = results
      .filter((r) => !r.ok)
      .map((r) => r.name)
      .join('、')
    const res = addRepairOrder(
      {
        deviceId: task.deviceId,
        source: '点检异常',
        faultDesc: `点检任务 ${task.taskNo} 异常项：${abnormalNames}`,
        reporter: task.executor,
      },
      operator,
    )
    if (res.ok) repair = res.order
  }
  return { ok: true, task, repair }
}

/* ---------- 保养工单 ---------- */
export function listMaintainOrders(filters = {}) {
  const keyword = String(filters.keyword || '').trim()
  return equipmentState.maintainOrders.filter((t) => {
    if (filters.status && t.status !== filters.status) return false
    if (filters.maintainType && t.maintainType !== filters.maintainType) return false
    if (keyword && !`${t.orderNo}${t.deviceCode}${t.deviceName}`.includes(keyword)) return false
    return true
  })
}

export function addMaintainOrder(payload = {}, operator = 'admin1') {
  const device = getDeviceById(payload.deviceId)
  if (!device) return { ok: false, message: '请选择设备' }
  maintainSeq += 1
  const items = (payload.items || [])
    .map((it, i) => ({
      id: it.id || `m-${i + 1}`,
      name: String(it.name || '').trim(),
      done: false,
    }))
    .filter((it) => it.name)
  if (!items.length) return { ok: false, message: '请至少添加一个保养项' }
  const row = {
    id: `eq-mo-${Date.now()}`,
    orderNo: nextNo('BY', maintainSeq),
    deviceId: device.id,
    deviceCode: device.code,
    deviceName: device.name,
    maintainType: payload.maintainType || '日常保养',
    planDate: payload.planDate || dayjs().format('YYYY-MM-DD'),
    status: MAINTAIN_ORDER_STATUS.PENDING,
    items,
    executor: '',
    executedAt: '',
    remark: payload.remark || '',
    createdAt: nowText(),
    creator: operator,
  }
  equipmentState.maintainOrders.unshift(row)
  return { ok: true, order: row }
}

export function executeMaintainOrder(id, payload = {}, operator = 'admin1') {
  const order = equipmentState.maintainOrders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '保养工单不存在' }
  if (order.status === MAINTAIN_ORDER_STATUS.DONE) {
    return { ok: false, message: '工单已完成' }
  }
  const doneMap = payload.doneMap || {}
  order.items = (order.items || []).map((it) => ({
    ...it,
    done: doneMap[it.id] != null ? Boolean(doneMap[it.id]) : true,
  }))
  order.executor = payload.executor || operator
  order.executedAt = nowText()
  order.remark = payload.remark || order.remark
  order.status = MAINTAIN_ORDER_STATUS.DONE
  return { ok: true, order }
}

/* ---------- 维修工单 ---------- */
export function listRepairOrders(filters = {}) {
  const keyword = String(filters.keyword || '').trim()
  return equipmentState.repairOrders.filter((t) => {
    if (filters.status && t.status !== filters.status) return false
    if (filters.source && t.source !== filters.source) return false
    if (keyword && !`${t.orderNo}${t.deviceCode}${t.deviceName}${t.faultDesc}`.includes(keyword)) {
      return false
    }
    return true
  })
}

export function addRepairOrder(payload = {}, operator = 'admin1') {
  const device = getDeviceById(payload.deviceId)
  if (!device) return { ok: false, message: '请选择设备' }
  if (!String(payload.faultDesc || '').trim()) return { ok: false, message: '请填写故障描述' }
  repairSeq += 1
  const t = nowText()
  const row = {
    id: `eq-ro-${Date.now()}-${repairSeq}`,
    orderNo: nextNo('WX', repairSeq),
    deviceId: device.id,
    deviceCode: device.code,
    deviceName: device.name,
    source: payload.source || '人工报修',
    faultDesc: String(payload.faultDesc).trim(),
    status: REPAIR_STATUS.PENDING,
    reporter: payload.reporter || operator,
    handler: '',
    result: '',
    spareParts: '',
    reportedAt: t,
    closedAt: '',
    remark: payload.remark || '',
    createdAt: t,
    updatedAt: t,
  }
  equipmentState.repairOrders.unshift(row)
  if (device.status === EQUIPMENT_STATUS.IN_USE) {
    device.status = EQUIPMENT_STATUS.REPAIRING
    device.updatedAt = t
  }
  return { ok: true, order: row }
}

export function updateRepairOrder(id, payload = {}, operator = 'admin1') {
  const order = equipmentState.repairOrders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '维修工单不存在' }
  const nextStatus = payload.status || order.status
  if (payload.handler != null) order.handler = payload.handler
  if (payload.result != null) order.result = payload.result
  if (payload.spareParts != null) order.spareParts = payload.spareParts
  if (payload.remark != null) order.remark = payload.remark
  order.status = nextStatus
  order.updatedAt = nowText()
  order.updater = operator

  const device = getDeviceById(order.deviceId)
  if (nextStatus === REPAIR_STATUS.CLOSED) {
    order.closedAt = nowText()
    if (device && device.status === EQUIPMENT_STATUS.REPAIRING) {
      device.status = EQUIPMENT_STATUS.IN_USE
      device.updatedAt = nowText()
    }
  } else if (
    (nextStatus === REPAIR_STATUS.DOING || nextStatus === REPAIR_STATUS.ACCEPT) &&
    device &&
    device.status === EQUIPMENT_STATUS.IN_USE
  ) {
    device.status = EQUIPMENT_STATUS.REPAIRING
    device.updatedAt = nowText()
  }
  return { ok: true, order }
}

export function dispatchRepairOrder(id, handler, operator = 'admin1') {
  if (!String(handler || '').trim()) return { ok: false, message: '请填写维修人' }
  return updateRepairOrder(
    id,
    { handler: String(handler).trim(), status: REPAIR_STATUS.DOING },
    operator,
  )
}

export function finishRepairOrder(id, payload = {}, operator = 'admin1') {
  if (!String(payload.result || '').trim()) return { ok: false, message: '请填写处理结果' }
  return updateRepairOrder(
    id,
    {
      result: payload.result,
      spareParts: payload.spareParts || '',
      remark: payload.remark,
      status: REPAIR_STATUS.ACCEPT,
    },
    operator,
  )
}

export function acceptRepairOrder(id, operator = 'admin1') {
  return updateRepairOrder(id, { status: REPAIR_STATUS.CLOSED }, operator)
}

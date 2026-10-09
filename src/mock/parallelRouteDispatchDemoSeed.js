/**
 * 演示：网格「并行 + 全部完成」工艺路线 + 待下发工单
 * 路线名：机加并行演示路线
 */

import dayjs from 'dayjs'
import { buildRouteDispatchSnapshot } from '@/mock/processRoutes'
import { createEmptyGrid, syncStepPolicies } from '@/utils/processRouteGrid'
import { processConfigState } from '@/store/processConfigStore'
import { syncWorkOrderBlankingMaterials } from '@/utils/blankingSettleMaterial'

function getProcessRouteState() {
  // 惰性加载，避免 processRouteStore ↔ 本文件循环依赖
  // eslint-disable-next-line global-require
  return require('@/store/processRouteStore').processRouteState
}

export const PARALLEL_ROUTE_DEMO_NAME = '机加并行演示路线'
export const PARALLEL_ROUTE_DEMO_ID = 'route-011'
export const PARALLEL_ROUTE_DISPATCH_WO_ID = 'wo-parallel-route-dispatch-001'
export const PARALLEL_ROUTE_DISPATCH_WO_CODE = 'SCGD20261008002'

function getProcessIdByName(name) {
  const proc = processConfigState.processes.find((p) => p.name === name)
  return proc?.id || `proc-unknown-${name}`
}

function cell(processId, processFileId = '') {
  return processFileId ? { processId, processFileId } : { processId }
}

function buildParallelDemoGrid() {
  const p = getProcessIdByName
  const pairs = [
    [1, 1, p('下料'), 'pdoc-004'],
    [2, 1, p('粗车')],
    [2, 2, p('钻孔')],
    [3, 1, p('铣削')],
    [4, 1, p('质检'), 'pdoc-005'],
    [5, 1, p('入库'), 'pdoc-006'],
  ]
  const maxStep = 5
  const maxRow = 2
  const grid = createEmptyGrid(maxStep, maxRow)
  pairs.forEach(([step, row, processId, fileId]) => {
    grid[step - 1][row - 1] = cell(processId, fileId)
  })
  return grid
}

function buildParallelDemoRoute() {
  const grid = buildParallelDemoGrid()
  const stepPolicies = syncStepPolicies(grid, [
    { stepNo: 1, completionMode: 'all' },
    { stepNo: 2, completionMode: 'all' },
    { stepNo: 3, completionMode: 'all' },
    { stepNo: 4, completionMode: 'all' },
    { stepNo: 5, completionMode: 'all' },
  ])
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: PARALLEL_ROUTE_DEMO_ID,
    code: 'GYLX0011',
    name: PARALLEL_ROUTE_DEMO_NAME,
    status: '使用中',
    applyScope: '全部产品',
    productDisplay: '',
    remark: '第2步粗车/钻孔并行且全部完成；下发页两行步骤号均为 2，完成方式均为「全部完成」',
    grid,
    stepPolicies,
    creator: '李工艺',
    updater: '李工艺',
    createdAt: '2026-10-08 10:30:00',
    updatedAt: now,
  }
}

/** 确保工艺路线列表中有并行演示路线（覆盖同 id/name） */
export function ensureParallelRouteDemo() {
  try {
    const route = buildParallelDemoRoute()
    const list = getProcessRouteState().routes
    const idx = list.findIndex((r) => r.id === route.id || r.name === route.name)
    if (idx === -1) list.unshift(route)
    else list[idx] = { ...list[idx], ...route }
  } catch (e) {
    console.warn('[parallelRouteDispatchDemoSeed] ensure route failed', e)
  }
}

function createParallelRouteDispatchDemoOrder() {
  ensureParallelRouteDemo()
  const snap = buildRouteDispatchSnapshot(PARALLEL_ROUTE_DEMO_NAME)
  const today = dayjs().format('YYYY-MM-DD')
  const end = dayjs().add(14, 'day').format('YYYY-MM-DD')

  const wo = {
    id: PARALLEL_ROUTE_DISPATCH_WO_ID,
    code: PARALLEL_ROUTE_DISPATCH_WO_CODE,
    name: '轴套半成品并行机加演示工单',
    productName: '轴套半成品',
    materialCode: 'CP-BLANK-BAR-01',
    orderCategory: '生产工单',
    status: '待下发',
    scheduleQty: 20,
    planQty: 20,
    workCenter: '机加车间',
    bom: '轴套半成品',
    bomId: '',
    bomLabel: '轴套半成品',
    warehouse: '半成品仓',
    urgency: '普通',
    planDateRange: [today, end],
    remark: '演示：工艺路线「机加并行演示路线」；第2步粗车+钻孔并行（全部完成），步骤列同为 2',
    processRouteName: PARALLEL_ROUTE_DEMO_NAME,
    source: 'parallel-route-dispatch-demo',
    sourceOrderNo: 'SO20261008002',
    owner: 'admin1',
    processes: (snap.processes || []).map((p) => ({
      ...p,
      executors: [],
    })),
    stepPolicies: snap.stepPolicies || [],
    scheduleBatches: [],
    activeScheduleBatchId: '',
    createdAt: today,
  }
  syncWorkOrderBlankingMaterials(wo)
  return wo
}

/** 写入/覆盖待下发并行路线演示工单 */
export function ensureParallelRouteDispatchDemoWorkOrders(orders) {
  try {
    ensureParallelRouteDemo()
    const list = Array.isArray(orders) ? [...orders] : []
    const demo = createParallelRouteDispatchDemoOrder()
    const idx = list.findIndex((o) => o.id === demo.id || o.code === demo.code)
    if (idx === -1) list.unshift(demo)
    else list[idx] = { ...list[idx], ...demo, id: demo.id }
    return list
  } catch (e) {
    console.warn('[parallelRouteDispatchDemoSeed] ensure wo failed', e)
    return Array.isArray(orders) ? orders : []
  }
}

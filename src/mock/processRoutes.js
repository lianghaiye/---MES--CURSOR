import { getProcessRouteByName, getActiveRouteOptions } from '@/store/processRouteStore'
import { getProcessByName, resolveDefaultExecutors } from '@/store/processConfigStore'
import { buildWorkOrderProcessesFromGrid } from '@/utils/processRouteGrid'

/** @deprecated 兼容旧工单种子数据 */
export const processRouteMaster = {
  机加标准路线: {
    id: 'route-machining',
    name: '机加标准路线',
    steps: [
      {
        name: '裁板',
        code: 'OP-CB-01',
        icon: 'ScissorOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '卷制',
        code: 'OP-JZ-02',
        icon: 'SyncOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '机加工',
        code: 'OP-JG-03',
        icon: 'ToolOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '配比',
        code: 'OP-PB-04',
        icon: 'ExperimentOutlined',
        hasFeeding: true,
        resourceType: '工人小组',
      },
      {
        name: '入库',
        code: 'OP-RK-05',
        icon: 'InboxOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
    ],
  },
  装配标准路线: {
    id: 'route-assembly',
    name: '装配标准路线',
    steps: [
      {
        name: '领料',
        code: 'OP-LL-01',
        icon: 'ShoppingOutlined',
        hasFeeding: true,
        resourceType: '工人小组',
      },
      {
        name: '预装',
        code: 'OP-YZ-02',
        icon: 'BuildOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '总装',
        code: 'OP-ZZ-03',
        icon: 'ClusterOutlined',
        hasFeeding: false,
        resourceType: '工人小组',
      },
      {
        name: '调试',
        code: 'OP-TS-04',
        icon: 'SettingOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '入库',
        code: 'OP-RK-05',
        icon: 'InboxOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
    ],
  },
}

/** 拆解工单工序（与小程序待办流程对齐） */
export const disassemblyProcessDefs = [
  {
    name: '拆解',
    code: 'OP-CJ-01',
    icon: 'ToolOutlined',
    hasFeeding: false,
    resourceType: '工人小组',
  },
  {
    name: '拆解质检',
    code: 'OP-CJ-ZJ',
    icon: 'AuditOutlined',
    hasFeeding: false,
    resourceType: '工人',
  },
  {
    name: '入库',
    code: 'OP-CJ-RK',
    icon: 'InboxOutlined',
    hasFeeding: false,
    resourceType: '工人',
  },
]

export function buildProcessesFromRoute(routeName) {
  const route = getProcessRouteByName(routeName)
  if (route?.grid) {
    return buildWorkOrderProcessesFromGrid(route.grid, route.id)
  }

  const legacy = processRouteMaster[routeName] || processRouteMaster['机加标准路线']
  return legacy.steps.map((step, index) => {
    const proc = getProcessByName(step.name)
    return {
      id: `${legacy.id}-step-${index + 1}`,
      index: index + 1,
      name: step.name,
      processCode: proc?.code || step.code,
      processId: proc?.id,
      icon: step.icon,
      hasFeeding: step.hasFeeding,
      resourceType: proc?.resourceType || step.resourceType || '工人',
      executors: resolveDefaultExecutors(proc),
      feedingMaterials: step.hasFeeding
        ? [
            {
              id: `feed-${Date.now()}-${index}`,
              materialId: undefined,
              materialName: '',
              qty: null,
            },
          ]
        : [],
    }
  })
}

export function buildDisassemblyProcesses() {
  return disassemblyProcessDefs.map((step, index) => {
    const proc = getProcessByName(step.name)
    return {
      id: `route-disassembly-step-${index + 1}`,
      index: index + 1,
      name: step.name,
      processCode: proc?.code || step.code,
      processId: proc?.id,
      icon: step.icon,
      hasFeeding: step.hasFeeding,
      resourceType: proc?.resourceType || step.resourceType,
      executors: resolveDefaultExecutors(proc),
      feedingMaterials: [],
    }
  })
}

export function getDefaultProductRoute(productName) {
  if (productName?.includes('电机') || productName?.includes('装配')) return '离心泵标准装配路线'
  if (productName?.includes('泵体') || productName?.includes('机加')) return '泵体机加路线'
  const opts = getActiveRouteOptions({ productName })
  return opts[0] || '离心泵标准装配路线'
}

export { getActiveRouteOptions }

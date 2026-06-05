/** 工艺路线主数据：工序、资源类型及是否配置投料 */
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
  热处理路线: {
    id: 'route-heat',
    name: '热处理路线',
    steps: [
      {
        name: '入炉',
        code: 'OP-RL-01',
        icon: 'FireOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '加热',
        code: 'OP-JR-02',
        icon: 'HeatMapOutlined',
        hasFeeding: true,
        resourceType: '工人小组',
      },
      {
        name: '冷却',
        code: 'OP-LQ-03',
        icon: 'CloudOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '质检',
        code: 'OP-ZJ-04',
        icon: 'AuditOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
    ],
  },
  焊接标准路线: {
    id: 'route-welding',
    name: '焊接标准路线',
    steps: [
      {
        name: '下料',
        code: 'OP-XL-01',
        icon: 'ScissorOutlined',
        hasFeeding: true,
        resourceType: '工人',
      },
      {
        name: '组对',
        code: 'OP-ZD-02',
        icon: 'BlockOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '焊接',
        code: 'OP-HJ-03',
        icon: 'ThunderboltOutlined',
        hasFeeding: true,
        resourceType: '工人小组',
      },
      {
        name: '探伤',
        code: 'OP-TS-04',
        icon: 'ScanOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
    ],
  },
  蒸馏生产路线: {
    id: 'route-distill',
    name: '蒸馏生产路线',
    steps: [
      {
        name: '配比',
        code: 'OP-PB-01',
        icon: 'ExperimentOutlined',
        hasFeeding: true,
        resourceType: '工人小组',
      },
      {
        name: '蒸馏冷却',
        code: 'OP-ZL-02',
        icon: 'CloudOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '质检',
        code: 'OP-ZJ-03',
        icon: 'AuditOutlined',
        hasFeeding: false,
        resourceType: '工人',
      },
      {
        name: '入库',
        code: 'OP-RK-04',
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
  const route = processRouteMaster[routeName] || processRouteMaster['机加标准路线']
  return route.steps.map((step, index) => ({
    id: `${route.id}-step-${index + 1}`,
    index: index + 1,
    name: step.name,
    processCode: step.code,
    icon: step.icon,
    hasFeeding: step.hasFeeding,
    resourceType: step.resourceType || '工人',
    executors: [],
    feedingMaterials: step.hasFeeding
      ? [{ id: `feed-${Date.now()}-${index}`, materialId: undefined, materialName: '', qty: null }]
      : [],
  }))
}

export function buildDisassemblyProcesses() {
  return disassemblyProcessDefs.map((step, index) => ({
    id: `route-disassembly-step-${index + 1}`,
    index: index + 1,
    name: step.name,
    processCode: step.code,
    icon: step.icon,
    hasFeeding: step.hasFeeding,
    resourceType: step.resourceType,
    executors: [],
    feedingMaterials: [],
  }))
}

export function getDefaultProductRoute(productName) {
  if (productName?.includes('电机') || productName?.includes('装配')) return '装配标准路线'
  if (productName?.includes('热处理') || productName?.includes('模')) return '热处理路线'
  return '机加标准路线'
}

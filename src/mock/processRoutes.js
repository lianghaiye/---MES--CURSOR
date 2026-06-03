/** 工艺路线主数据：工序及是否配置投料 */
export const processRouteMaster = {
  机加标准路线: {
    id: 'route-machining',
    name: '机加标准路线',
    steps: [
      { name: '裁板', code: 'OP-CB-01', icon: 'ScissorOutlined', hasFeeding: false },
      { name: '卷制', code: 'OP-JZ-02', icon: 'SyncOutlined', hasFeeding: false },
      { name: '机加工', code: 'OP-JG-03', icon: 'ToolOutlined', hasFeeding: false },
      { name: '配比', code: 'OP-PB-04', icon: 'ExperimentOutlined', hasFeeding: true },
      { name: '入库', code: 'OP-RK-05', icon: 'InboxOutlined', hasFeeding: false },
    ],
  },
  装配标准路线: {
    id: 'route-assembly',
    name: '装配标准路线',
    steps: [
      { name: '领料', code: 'OP-LL-01', icon: 'ShoppingOutlined', hasFeeding: true },
      { name: '预装', code: 'OP-YZ-02', icon: 'BuildOutlined', hasFeeding: false },
      { name: '总装', code: 'OP-ZZ-03', icon: 'ClusterOutlined', hasFeeding: false },
      { name: '调试', code: 'OP-TS-04', icon: 'SettingOutlined', hasFeeding: false },
      { name: '入库', code: 'OP-RK-05', icon: 'InboxOutlined', hasFeeding: false },
    ],
  },
  热处理路线: {
    id: 'route-heat',
    name: '热处理路线',
    steps: [
      { name: '入炉', code: 'OP-RL-01', icon: 'FireOutlined', hasFeeding: false },
      { name: '加热', code: 'OP-JR-02', icon: 'HeatMapOutlined', hasFeeding: true },
      { name: '冷却', code: 'OP-LQ-03', icon: 'CloudOutlined', hasFeeding: false },
      { name: '质检', code: 'OP-ZJ-04', icon: 'AuditOutlined', hasFeeding: false },
    ],
  },
  焊接标准路线: {
    id: 'route-welding',
    name: '焊接标准路线',
    steps: [
      { name: '下料', code: 'OP-XL-01', icon: 'ScissorOutlined', hasFeeding: true },
      { name: '组对', code: 'OP-ZD-02', icon: 'BlockOutlined', hasFeeding: false },
      { name: '焊接', code: 'OP-HJ-03', icon: 'ThunderboltOutlined', hasFeeding: true },
      { name: '探伤', code: 'OP-TS-04', icon: 'ScanOutlined', hasFeeding: false },
    ],
  },
  蒸馏生产路线: {
    id: 'route-distill',
    name: '蒸馏生产路线',
    steps: [
      { name: '配比', code: 'OP-PB-01', icon: 'ExperimentOutlined', hasFeeding: true },
      { name: '蒸馏冷却', code: 'OP-ZL-02', icon: 'CloudOutlined', hasFeeding: false },
      { name: '质检', code: 'OP-ZJ-03', icon: 'AuditOutlined', hasFeeding: false },
      { name: '入库', code: 'OP-RK-04', icon: 'InboxOutlined', hasFeeding: false },
    ],
  },
}

export function buildProcessesFromRoute(routeName) {
  const route = processRouteMaster[routeName] || processRouteMaster['机加标准路线']
  return route.steps.map((step, index) => ({
    id: `${route.id}-step-${index + 1}`,
    index: index + 1,
    name: step.name,
    processCode: step.code,
    icon: step.icon,
    hasFeeding: step.hasFeeding,
    executors: [],
    feedingMaterials: step.hasFeeding
      ? [{ id: `feed-${Date.now()}-${index}`, materialId: undefined, materialName: '', qty: null }]
      : [],
  }))
}

export function getDefaultProductRoute(productName) {
  if (productName?.includes('电机') || productName?.includes('装配')) return '装配标准路线'
  if (productName?.includes('热处理') || productName?.includes('模')) return '热处理路线'
  return '机加标准路线'
}

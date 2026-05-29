/** 工艺路线主数据：工序及是否配置投料 */
export const processRouteMaster = {
  机加标准路线: {
    id: 'route-machining',
    name: '机加标准路线',
    steps: [
      { name: '裁板', icon: 'ScissorOutlined', hasFeeding: false },
      { name: '卷制', icon: 'SyncOutlined', hasFeeding: false },
      { name: '机加工', icon: 'ToolOutlined', hasFeeding: false },
      { name: '配比', icon: 'ExperimentOutlined', hasFeeding: true },
      { name: '入库', icon: 'InboxOutlined', hasFeeding: false },
    ],
  },
  装配标准路线: {
    id: 'route-assembly',
    name: '装配标准路线',
    steps: [
      { name: '领料', icon: 'ShoppingOutlined', hasFeeding: true },
      { name: '预装', icon: 'BuildOutlined', hasFeeding: false },
      { name: '总装', icon: 'ClusterOutlined', hasFeeding: false },
      { name: '调试', icon: 'SettingOutlined', hasFeeding: false },
      { name: '入库', icon: 'InboxOutlined', hasFeeding: false },
    ],
  },
  热处理路线: {
    id: 'route-heat',
    name: '热处理路线',
    steps: [
      { name: '入炉', icon: 'FireOutlined', hasFeeding: false },
      { name: '加热', icon: 'HeatMapOutlined', hasFeeding: true },
      { name: '冷却', icon: 'CloudOutlined', hasFeeding: false },
      { name: '质检', icon: 'AuditOutlined', hasFeeding: false },
    ],
  },
  焊接标准路线: {
    id: 'route-welding',
    name: '焊接标准路线',
    steps: [
      { name: '下料', icon: 'ScissorOutlined', hasFeeding: true },
      { name: '组对', icon: 'BlockOutlined', hasFeeding: false },
      { name: '焊接', icon: 'ThunderboltOutlined', hasFeeding: true },
      { name: '探伤', icon: 'ScanOutlined', hasFeeding: false },
    ],
  },
}

export function buildProcessesFromRoute(routeName) {
  const route = processRouteMaster[routeName] || processRouteMaster['机加标准路线']
  return route.steps.map((step, index) => ({
    id: `${route.id}-step-${index + 1}`,
    index: index + 1,
    name: step.name,
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

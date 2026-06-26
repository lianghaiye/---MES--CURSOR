/** 顶栏一级模块 */
export const topModules = [
  { key: 'home', label: '首页', path: '/home' },
  { key: 'product-process', label: '产品工艺', path: '/product-process' },
  { key: 'sales', label: '销售管理', path: '/sales' },
  { key: 'planning', label: '计划排产', path: '/planning' },
  { key: 'production', label: '生产管理', path: '/production' },
  { key: 'report-management', label: '报工管理', path: '/report-management' },
  { key: 'labor-salary', label: '工时工资', path: '/labor-salary' },
  { key: 'inventory', label: '库存管理', path: '/inventory' },
  { key: 'quality', label: '质量管理', path: '/quality' },
  { key: 'procurement', label: '采购管理', path: '/procurement' },
  { key: 'after-sales', label: '售后管理', path: '/after-sales' },
  { key: 'basic-config', label: '基础配置', path: '/basic-config' },
  { key: 'system', label: '系统管理', path: '/system' },
]

/** 顶栏「更多」下拉模块（WMS/QMS 等扩展入口） */
export const moreModules = [
  { key: 'wms', label: '仓储管理 WMS', path: '/wms' },
  { key: 'qms', label: '质量追溯 QMS', path: '/qms' },
  { key: 'equipment', label: '设备管理', path: '/equipment' },
  { key: 'report', label: '报表中心', path: '/report' },
]

/** 各模块左侧子菜单 */
export const sideMenus = {
  home: [
    { key: 'dashboard', label: '工作台', path: '/home/dashboard' },
    {
      key: 'prd',
      label: 'PRD',
      children: [
        { key: 'prd-index', label: 'IDOMS PRD', path: '/home/prd' },
        { key: 'prd-v15', label: '1.5版本迭代', path: '/home/prd/v15' },
        { key: 'prd-v151', label: '1.5.1版本迭代', path: '/home/prd/v151' },
      ],
    },
  ],
  'product-process': [
    { key: 'materials', label: '物料信息', path: '/product-process/materials' },
    { key: 'products', label: '产品信息', path: '/product-process/products' },
    { key: 'bom', label: '产品BOM', path: '/product-process/bom' },
    { key: 'routing', label: '工艺路线', path: '/product-process/routing' },
    { key: 'process-config', label: '工序配置', path: '/product-process/process-config' },
    { key: 'process-doc', label: '工艺文件', path: '/product-process/process-doc' },
    { key: 'process-category', label: '工序分类', path: '/product-process/process-category' },
    { key: 'process-form', label: '工序表单模板', path: '/product-process/process-form' },
  ],
  sales: [
    { key: 'orders', label: '销售订单', path: '/sales/orders' },
    { key: 'delivery', label: '发货管理', path: '/sales/delivery' },
    { key: 'customers', label: '客户档案', path: '/sales/customers' },
  ],
  planning: [
    { key: 'production-plan', label: '生产计划', path: '/planning/production-plan' },
    { key: 'design-task', label: '设计任务', path: '/planning/design-task' },
    { key: 'ebom', label: 'EBOM管理', path: '/planning/ebom' },
  ],
  'labor-salary': [{ key: 'labor-hour', label: '工时管理', path: '/labor-salary/labor-hour' }],
  production: [
    { key: 'work-orders', label: '生产工单', path: '/production/work-orders' },
    { key: 'assembly-work-orders', label: '总装工单', path: '/production/assembly-work-orders' },
    {
      key: 'disassembly-work-orders',
      label: '拆解工单',
      path: '/production/disassembly-work-orders',
    },
    { key: 'qc-work-orders', label: '质检工单', path: '/production/qc-work-orders' },
  ],
  'report-management': [
    { key: 'report-work', label: '报工确认', path: '/report-management/report-work' },
    { key: 'process-report', label: '工序报工', path: '/report-management/process-report' },
    { key: 'salary-summary', label: '工资核算', path: '/report-management/salary-summary' },
    { key: 'salary-detail', label: '核算详情', path: '/report-management/salary-detail' },
  ],
  inventory: [
    { key: 'stock', label: '库存查询', path: '/inventory/stock' },
    { key: 'outbound', label: '出库管理', path: '/inventory/outbound' },
    { key: 'inbound', label: '入库管理', path: '/inventory/inbound' },
    { key: 'in-out-detail', label: '出入库详情', path: '/inventory/in-out-detail' },
  ],
  quality: [
    { key: 'factory-qc', label: '出厂质检', path: '/quality/factory-qc' },
    { key: 'scrap-orders', label: '报废品管理', path: '/quality/scrap-orders' },
  ],
  procurement: [
    { key: 'purchase-req', label: '采购申请', path: '/procurement/purchase-req' },
    { key: 'purchase-orders', label: '采购订单', path: '/procurement/purchase-orders' },
    { key: 'suppliers', label: '供应商', path: '/procurement/suppliers' },
  ],
  'after-sales': [
    { key: 'service-orders', label: '服务工单', path: '/after-sales/service-orders' },
    { key: 'returns', label: '退换货', path: '/after-sales/returns' },
  ],
  'basic-config': [
    { key: 'employee-groups', label: '员工组别', path: '/basic-config/employee-groups' },
    { key: 'defect-items', label: '不良品项', path: '/basic-config/defect-items' },
    { key: 'material-grades', label: '材质管理', path: '/basic-config/material-grades' },
    { key: 'function-params', label: '功能参数', path: '/basic-config/function-params' },
    {
      key: 'warehouse-mgmt',
      label: '仓库管理',
      children: [
        { key: 'warehouses', label: '仓库列表', path: '/basic-config/warehouses' },
        {
          key: 'warehouse-categories',
          label: '仓库分类',
          path: '/basic-config/warehouse-categories',
        },
      ],
    },
  ],
  system: [
    { key: 'dict', label: '系统字典', path: '/system/dict' },
    { key: 'business-rules', label: '业务规则', path: '/system/business-rules' },
  ],
  wms: [{ key: 'warehouse', label: '仓库作业', path: '/wms/warehouse' }],
  qms: [{ key: 'trace', label: '质量追溯', path: '/qms/trace' }],
  equipment: [{ key: 'devices', label: '设备台账', path: '/equipment/devices' }],
  report: [{ key: 'overview', label: '综合报表', path: '/report/overview' }],
}

/** 根据路由路径解析所属顶栏模块 key */
export function resolveModuleKey(path) {
  const segment = path.split('/').filter(Boolean)[0]
  if (!segment) return 'home'
  const all = [...topModules, ...moreModules]
  const found = all.find((m) => m.key === segment)
  return found ? found.key : 'home'
}

/** 路由 meta.title 映射 */
export const routeTitles = {
  '/home/dashboard': '首页',
  '/home/prd': 'IDOMS PRD',
  '/home/prd/v15': '1.5版本迭代',
  '/home/prd/v151': '1.5.1版本迭代',
  '/home/prd/v151/product-material': '1.5.1 · 产品物料需求',
  '/product-process/materials': '物料信息',
  '/product-process/products': '产品信息',
  '/product-process/bom': '产品BOM',
  '/product-process/bom/new': '新增BOM',
  '/product-process/bom/:id/edit': '编辑BOM',
  '/product-process/bom/:id': 'BOM详情',
  '/product-process/routing': '工艺路线',
  '/product-process/routing/:id': '工艺路线详情',
  '/product-process/process-config': '工序配置',
  '/product-process/process-config/:id': '工序详情',
  '/product-process/process-doc': '工艺文件',
  '/product-process/process-category': '工序分类',
  '/product-process/process-form': '工序表单模板',
  '/sales/orders': '销售订单',
  '/sales/orders/:id': '销售订单详情',
  '/sales/delivery': '发货管理',
  '/sales/delivery/:id': '发货单详情',
  '/sales/customers': '客户档案',
  '/planning/production-plan': '生产计划',
  '/planning/design-task': '设计任务',
  '/planning/ebom': 'EBOM管理',
  '/production/work-orders': '生产工单',
  '/production/assembly-work-orders': '总装工单',
  '/production/disassembly-work-orders': '拆解工单',
  '/production/disassembly-work-orders/:id': '拆解工单详情',
  '/production/qc-work-orders': '质检工单',
  '/report-management/report-work': '报工确认',
  '/report-management/report-work/:id': '报工确认详情',
  '/report-management/process-report': '工序报工',
  '/report-management/process-report/wo/:workOrderId': '任务报工详情',
  '/report-management/process-report/:id': '工序报工详情',
  '/labor-salary/labor-hour': '工时管理',
  '/report-management/salary-summary': '工资核算',
  '/report-management/salary-detail': '核算详情',
  '/inventory/stock': '库存查询',
  '/inventory/outbound': '出库管理',
  '/inventory/outbound/:id': '出库单详情',
  '/inventory/sales-outbound': '出库管理',
  '/inventory/inbound': '入库管理',
  '/inventory/in-out-detail': '出入库详情',
  '/inventory/inbound/:id': '入库单详情',
  '/quality/factory-qc': '出厂质检',
  '/quality/scrap-orders': '报废品管理',
  '/quality/scrap-orders/:id': '报废品详情',
  '/system/dict': '系统字典',
  '/system/business-rules': '业务规则',
  '/procurement/purchase-req': '采购申请',
  '/procurement/purchase-orders': '采购订单',
  '/procurement/suppliers': '供应商',
  '/after-sales/service-orders': '服务工单',
  '/after-sales/returns': '退换货',
  '/wms/warehouse': '仓储管理',
  '/qms/trace': '质量追溯',
  '/equipment/devices': '设备管理',
  '/report/overview': '报表中心',
  '/basic-config/employee-groups': '员工组别',
  '/basic-config/defect-items': '不良品项',
  '/basic-config/material-grades': '材质管理',
  '/basic-config/function-params': '功能参数',
  '/basic-config/warehouse-categories': '仓库分类',
  '/basic-config/warehouses': '仓库列表',
}

/** 动态路径标题（含 :id 等参数） */
export const dynamicRouteTitles = [
  { pattern: /^\/basic-config\/warehouses\/[^/]+$/, title: '仓库详情' },
  { pattern: /^\/inventory\/inbound\/[^/]+$/, title: '入库单详情' },
  { pattern: /^\/inventory\/outbound\/[^/]+$/, title: '出库单详情' },
  { pattern: /^\/report-management\/report-work\/[^/]+$/, title: '报工确认详情' },
  { pattern: /^\/report-management\/process-report\/wo\/[^/]+$/, title: '任务报工详情' },
  { pattern: /^\/report-management\/process-report\/[^/]+$/, title: '工序报工详情' },
  { pattern: /^\/labor-salary\/labor-hour\/[^/]+$/, title: '工时详情' },
]

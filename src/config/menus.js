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
  { key: 'engineering-change', label: '工程变更', path: '/engineering-change/ecn-list' },
  { key: 'after-sales', label: '售后管理', path: '/after-sales' },
  { key: 'industrial-id', label: '工业标识', path: '/industrial-id' },
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
      key: 'data-cockpit',
      label: '数据驾驶舱',
      path: '/home/data-cockpit',
    },
    {
      key: 'director-dashboard',
      label: '车间主任工作台',
      path: '/home/director-dashboard',
    },
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
    { key: 'framework-contracts', label: '框架合同', path: '/sales/framework-contracts' },
  ],
  planning: [
    { key: 'production-plan', label: '生产计划', path: '/planning/production-plan' },
    { key: 'design-task', label: '设计任务', path: '/planning/design-task' },
    { key: 'replenish-center', label: '库存预警', path: '/planning/replenish-center' },
    { key: 'replenish-ledger', label: '补货台账', path: '/planning/replenish-ledger' },
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
    {
      key: 'material-requisition',
      label: '领料管理',
      path: '/production/material-requisition',
    },
  ],
  'report-management': [
    { key: 'report-work', label: '报工确认', path: '/report-management/report-work' },
    { key: 'process-report', label: '工序报工', path: '/report-management/process-report' },
    { key: 'salary-summary', label: '工资核算', path: '/report-management/salary-summary' },
    { key: 'salary-detail', label: '核算详情', path: '/report-management/salary-detail' },
  ],
  inventory: [
    { key: 'stock-detail', label: '库存明细', path: '/inventory/stock-detail' },
    { key: 'outbound', label: '出库管理', path: '/inventory/outbound' },
    { key: 'inbound', label: '入库管理', path: '/inventory/inbound' },
    { key: 'in-out-detail', label: '出入库详情', path: '/inventory/in-out-detail' },
    {
      key: 'deduct-records',
      label: '库存扣减记录',
      path: '/inventory/deduct-records',
    },
    {
      key: 'cut-settle',
      label: '下料结算',
      path: '/inventory/cut-settle',
    },
  ],
  quality: [
    { key: 'factory-qc', label: '出厂质检', path: '/quality/factory-qc' },
    { key: 'scrap-orders', label: '报废品管理', path: '/quality/scrap-orders' },
    { key: 'qc-template', label: '质检模板', path: '/quality/qc-template' },
  ],
  procurement: [
    { key: 'purchase-req', label: '采购申请', path: '/procurement/purchase-req' },
    { key: 'purchase-orders', label: '采购订单', path: '/procurement/purchase-orders' },
    { key: 'purchase-receipts', label: '采购收货', path: '/procurement/purchase-receipts' },
    { key: 'purchase-returns', label: '采购退货', path: '/procurement/purchase-returns' },
    { key: 'purchase-details', label: '采购明细', path: '/procurement/purchase-details' },
    { key: 'outsourcing-orders', label: '外协订单', path: '/procurement/outsourcing-orders' },
    { key: 'outsourcing-receipts', label: '外协收货', path: '/procurement/outsourcing-receipts' },
    { key: 'outsourcing-returns', label: '外协异常处理', path: '/procurement/outsourcing-returns' },
    { key: 'outsourcing-details', label: '外协明细', path: '/procurement/outsourcing-details' },
  ],
  'engineering-change': [
    { key: 'ecn-list', label: 'ECN列表', path: '/engineering-change/ecn-list' },
    { key: 'ecr-request', label: 'ECR申请', path: '/engineering-change/ecr-request' },
  ],
  'after-sales': [
    { key: 'service-orders', label: '服务工单', path: '/after-sales/service-orders' },
    { key: 'returns', label: '退换货', path: '/after-sales/returns' },
  ],
  'industrial-id': [
    {
      key: 'base-config',
      label: '基础配置',
      children: [
        {
          key: 'enterprise-info',
          label: '企业信息',
          path: '/industrial-id/base-config/enterprise-info',
        },
        {
          key: 'nameplate-template',
          label: '配置铭牌模板',
          path: '/industrial-id/base-config/nameplate-template',
        },
      ],
    },
    { key: 'label-request', label: '标识申请', path: '/industrial-id/label-request' },
    { key: 'label-management', label: '标识管理', path: '/industrial-id/label-management' },
  ],
  'basic-config': [
    { key: 'employee-groups', label: '员工组别', path: '/basic-config/employee-groups' },
    { key: 'defect-items', label: '不良品项', path: '/basic-config/defect-items' },
    { key: 'material-grades', label: '材质管理', path: '/basic-config/material-grades' },
    { key: 'units', label: '单位管理', path: '/basic-config/units' },
    { key: 'packaging', label: '包装管理', path: '/basic-config/packaging' },
    { key: 'business-dict', label: '业务字典', path: '/basic-config/business-dict' },
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
    {
      key: 'customer-mgmt',
      label: '客户管理',
      children: [
        { key: 'customers', label: '客户档案', path: '/basic-config/customers' },
        { key: 'customer-types', label: '客户类型', path: '/basic-config/customer-types' },
      ],
    },
    {
      key: 'supplier-mgmt',
      label: '供应商管理',
      children: [
        { key: 'suppliers', label: '供应商档案', path: '/basic-config/suppliers' },
        {
          key: 'supplier-categories',
          label: '供应商分类',
          path: '/basic-config/supplier-categories',
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

/** 取模块左侧菜单中第一个可导航路径（支持嵌套 children） */
export function findFirstSideMenuPath(items = []) {
  for (const item of items) {
    if (item.path) return item.path
    if (item.children?.length) {
      const nested = findFirstSideMenuPath(item.children)
      if (nested) return nested
    }
  }
  return null
}

/** 顶栏模块默认落地页：优先 mod.path（非 /{key} 占位），否则取侧栏首项 */
export function resolveModuleDefaultPath(mod) {
  if (!mod) return null
  const bare = `/${mod.key}`
  if (mod.path && mod.path !== bare) return mod.path
  return findFirstSideMenuPath(sideMenus[mod.key] || []) || mod.path || null
}

/** 路由 meta.title 映射 */
import { createPageRegistry } from './createPages'

const createPageRouteTitles = Object.fromEntries(
  createPageRegistry.map((page) => [page.newPath, page.title]),
)

export const routeTitles = {
  '/home/dashboard': '首页',
  '/home/data-cockpit': '数据驾驶舱',
  '/home/director-dashboard': '车间主任工作台',
  '/home/prd': 'IDOMS PRD',
  '/home/prd/v15': '1.5版本迭代',
  '/home/prd/v151': '1.5.1版本迭代',
  '/home/prd/v151/product-material': '1.5.1 · 产品物料需求',
  '/product-process/materials': '产品信息',
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
  '/sales/orders/:id/edit': '编辑销售订单',
  '/sales/orders/:id/approve': '审核销售订单',
  '/sales/delivery': '发货管理',
  '/sales/delivery/new': '新增发货单',
  '/sales/delivery/:id/edit': '编辑发货单',
  '/sales/delivery/:id': '发货单详情',
  '/basic-config/customers': '客户档案',
  '/basic-config/customer-types': '客户类型',
  '/basic-config/suppliers': '供应商档案',
  '/basic-config/supplier-categories': '供应商分类',
  '/sales/framework-contracts': '框架合同',
  '/planning/production-plan': '生产计划',
  '/planning/design-task': '设计任务',
  '/planning/replenish-center': '库存预警',
  '/planning/replenish-ledger': '补货台账',
  '/production/work-orders': '生产工单',
  '/production/assembly-work-orders': '总装工单',
  '/production/disassembly-work-orders': '拆解工单',
  '/production/disassembly-work-orders/:id': '拆解工单详情',
  '/production/qc-work-orders': '质检工单',
  '/production/material-requisition': '领料管理',
  '/production/material-requisition/create': '申请领料',
  '/production/material-requisition/:id': '领料申请详情',
  '/inventory/deduct-records': '库存扣减记录',
  '/inventory/deduct-records/:id': '扣减记录详情',
  '/inventory/cut-settle': '下料结算',
  '/inventory/cut-settle/:id': '下料结算详情',
  '/report-management/report-work': '报工确认',
  '/report-management/report-work/:id': '报工确认详情',
  '/report-management/process-report': '工序报工',
  '/report-management/process-report/wo/:workOrderId': '任务报工详情',
  '/report-management/process-report/:id': '工序报工详情',
  '/labor-salary/labor-hour': '工时管理',
  '/report-management/salary-summary': '工资核算',
  '/report-management/salary-detail': '核算详情',
  '/inventory/stock-detail': '库存明细',
  '/inventory/outbound': '出库管理',
  '/inventory/outbound/:id': '出库单详情',
  '/inventory/sales-outbound': '出库管理',
  '/inventory/inbound': '入库管理',
  '/inventory/in-out-detail': '出入库详情',
  '/inventory/inbound/:id': '入库单详情',
  '/quality/factory-qc': '出厂质检',
  '/quality/scrap-orders': '报废品管理',
  '/quality/scrap-orders/:id': '报废品详情',
  '/quality/qc-template': '质检模板',
  '/system/dict': '系统字典',
  '/system/business-rules': '业务规则',
  '/procurement/purchase-req': '采购申请',
  '/procurement/purchase-orders': '采购订单',
  '/procurement/purchase-orders/:id/edit': '编辑采购单',
  '/procurement/purchase-orders/:id/approve': '审核采购单',
  '/procurement/purchase-orders/:id': '采购订单详情',
  '/procurement/purchase-receipts': '采购收货',
  '/procurement/purchase-returns': '采购退货',
  '/procurement/purchase-returns/:id/edit': '编辑采购退货单',
  '/procurement/purchase-returns/:id': '采购退货详情',
  '/procurement/purchase-details': '采购明细',
  '/procurement/outsourcing-orders': '外协订单',
  '/procurement/outsourcing-orders/:id/edit': '编辑外协订单',
  '/procurement/outsourcing-orders/:id/approve': '审核外协订单',
  '/procurement/outsourcing-orders/:id': '外协订单详情',
  '/procurement/outsourcing-receipts': '外协收货',
  '/procurement/outsourcing-receipts/:id': '外协收货详情',
  '/procurement/outsourcing-returns': '外协异常处理',
  '/procurement/outsourcing-returns/:id/edit': '编辑外协异常处理单',
  '/procurement/outsourcing-returns/:id': '外协异常处理详情',
  '/procurement/outsourcing-details': '外协明细',
  '/engineering-change/ecn/new': '提交工程变更申请',
  '/engineering-change/ecn-list': 'ECN列表',
  '/engineering-change/ecr-request': 'ECR申请',
  '/engineering-change/ecr/new': '提交工程变更申请',
  '/after-sales/service-orders': '服务工单',
  '/after-sales/returns': '退换货',
  '/industrial-id/base-config/enterprise-info': '企业信息',
  '/industrial-id/base-config/nameplate-template': '配置铭牌模板',
  '/industrial-id/label-request': '标识申请',
  '/industrial-id/label-management': '标识管理',
  '/wms/warehouse': '仓储管理',
  '/qms/trace': '质量追溯',
  '/equipment/devices': '设备管理',
  '/report/overview': '报表中心',
  '/basic-config/employee-groups': '员工组别',
  '/basic-config/defect-items': '不良品项',
  '/basic-config/material-grades': '材质管理',
  '/basic-config/units': '单位管理',
  '/basic-config/packaging': '包装管理',
  '/basic-config/function-params': '功能参数',
  '/basic-config/business-dict': '业务字典',
  '/basic-config/warehouse-categories': '仓库分类',
  '/basic-config/warehouses': '仓库列表',
  ...createPageRouteTitles,
}

/** 动态路径标题（含 :id 等参数） */
export const dynamicRouteTitles = [
  { pattern: /^\/engineering-change\/ecn\/[^/]+\/detail$/, title: 'ECN详情' },
  { pattern: /^\/engineering-change\/ecr\/[^/]+\/detail$/, title: 'ECR详情' },
  { pattern: /^\/engineering-change\/ecn\/[^/]+\/approve$/, title: '审批工程变更' },
  { pattern: /^\/engineering-change\/ecn\/[^/]+\/execute$/, title: '执行工程变更' },
  { pattern: /^\/engineering-change\/ecr\/[^/]+\/approve$/, title: '审批工程变更' },
  { pattern: /^\/engineering-change\/ecr\/[^/]+\/execute$/, title: '执行工程变更' },
  { pattern: /^\/basic-config\/warehouses\/[^/]+$/, title: '仓库详情' },
  { pattern: /^\/sales\/orders\/[^/]+\/edit$/, title: '编辑销售订单' },
  { pattern: /^\/sales\/orders\/[^/]+\/approve$/, title: '审核销售订单' },
  { pattern: /^\/procurement\/purchase-req\/[^/]+\/edit$/, title: '编辑采购申请' },
  { pattern: /^\/procurement\/purchase-req\/[^/]+$/, title: '采购申请详情' },
  { pattern: /^\/procurement\/purchase-orders\/[^/]+\/edit$/, title: '编辑采购单' },
  { pattern: /^\/procurement\/purchase-orders\/[^/]+\/approve$/, title: '审核采购单' },
  { pattern: /^\/procurement\/purchase-orders\/[^/]+$/, title: '采购订单详情' },
  { pattern: /^\/procurement\/purchase-returns\/[^/]+\/edit$/, title: '编辑采购退货单' },
  { pattern: /^\/procurement\/purchase-returns\/[^/]+$/, title: '采购退货详情' },
  { pattern: /^\/procurement\/outsourcing-orders\/[^/]+\/edit$/, title: '编辑外协订单' },
  { pattern: /^\/procurement\/outsourcing-orders\/[^/]+\/approve$/, title: '审核外协订单' },
  { pattern: /^\/procurement\/outsourcing-orders\/[^/]+$/, title: '外协订单详情' },
  { pattern: /^\/procurement\/outsourcing-returns\/[^/]+\/edit$/, title: '编辑外协异常处理单' },
  { pattern: /^\/procurement\/outsourcing-returns\/[^/]+$/, title: '外协异常处理详情' },
  { pattern: /^\/basic-config\/customers\/[^/]+\/edit$/, title: '编辑客户' },
  { pattern: /^\/basic-config\/customers\/[^/]+$/, title: '客户详情' },
  { pattern: /^\/basic-config\/suppliers\/[^/]+\/edit$/, title: '编辑供应商' },
  { pattern: /^\/basic-config\/suppliers\/[^/]+$/, title: '供应商详情' },
  { pattern: /^\/inventory\/inbound\/[^/]+$/, title: '入库单详情' },
  { pattern: /^\/inventory\/outbound\/[^/]+$/, title: '出库单详情' },
  { pattern: /^\/inventory\/cut-settle\/[^/]+$/, title: '下料结算详情' },
  { pattern: /^\/report-management\/report-work\/[^/]+$/, title: '报工确认详情' },
  { pattern: /^\/report-management\/process-report\/wo\/[^/]+$/, title: '任务报工详情' },
  { pattern: /^\/report-management\/process-report\/[^/]+$/, title: '工序报工详情' },
  { pattern: /^\/labor-salary\/labor-hour\/[^/]+$/, title: '工时详情' },
  { pattern: /^\/planning\/design-task\/[^/]+\/detail$/, title: '设计任务详情' },
]

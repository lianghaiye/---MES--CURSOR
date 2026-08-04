import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/utils/auth'
import { topModules, moreModules, resolveModuleDefaultPath, routeTitles } from '@/config/menus'
import { createPageRegistry } from '@/config/createPages'
import { tabStore } from '@/composables/useTabs'

const MainLayout = () => import('@/layout/MainLayout.vue')

const emptyChild = (name, title) => ({
  name,
  component: () => import('@/views/placeholder/EmptyPage.vue'),
  meta: { title },
})

/** 顶栏模块占位路径（如 /sales）重定向到侧栏首项，兼容旧版直接 push mod.path 的导航 */
const moduleRedirectRoutes = [...topModules, ...moreModules]
  .map((mod) => {
    const target = resolveModuleDefaultPath(mod)
    if (!target) return null
    const bare = `/${mod.key}`
    if (target === bare) return null
    return { path: mod.key, redirect: target }
  })
  .filter(Boolean)

/** 新增页路由须在带 :id 的动态路由之前注册，避免 /xxx/new 被当成详情 id */
const createPageRoutes = createPageRegistry.map((page) => ({
  path: page.newPath.slice(1),
  name: page.name,
  component: page.view,
  meta: { title: page.title, listPath: page.listPath },
}))

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/product-process/bom/preview',
    name: 'product-process-bom-preview',
    component: () => import('@/views/product-process/BomPrintPreviewView.vue'),
    meta: { title: 'BOM预览', standalone: true },
  },
  {
    path: '/production/work-orders/preview',
    name: 'production-work-order-preview',
    component: () => import('@/views/production/WorkOrderPrintPreviewView.vue'),
    meta: { title: '工单预览', standalone: true },
  },
  {
    path: '/procurement/purchase-orders/preview',
    name: 'procurement-purchase-order-preview',
    component: () => import('@/views/procurement/PurchaseOrderPrintPreviewView.vue'),
    meta: { title: '采购订单预览', standalone: true },
  },
  {
    path: '/engineering-change/ecn/print',
    name: 'engineering-change-ecn-print',
    component: () => import('@/views/engineering-change/EcnPrintPreviewView.vue'),
    meta: { title: 'ECN打印', standalone: true },
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/home/dashboard',
    children: [
      { path: 'home/dashboard', ...emptyChild('home-dashboard', '首页') },
      {
        path: 'home/data-cockpit',
        name: 'home-data-cockpit',
        component: () => import('@/views/home/DataCockpitView.vue'),
        meta: { title: '数据驾驶舱' },
      },
      {
        path: 'home/director-dashboard',
        name: 'home-director-dashboard',
        component: () => import('@/views/home/WorkshopDirectorDashboardView.vue'),
        meta: { title: '车间主任工作台' },
      },
      {
        path: 'home/prd',
        name: 'home-prd-index',
        component: () => import('@/views/prd/PrdIndexView.vue'),
        meta: { title: 'IDOMS PRD' },
      },
      {
        path: 'home/prd/v15',
        name: 'home-prd-v15',
        component: () => import('@/views/prd/PrdV15View.vue'),
        meta: { title: '1.5版本迭代' },
      },
      {
        path: 'home/prd/v151',
        name: 'home-prd-v151',
        component: () => import('@/views/prd/PrdV151View.vue'),
        meta: { title: '1.5.1版本迭代' },
      },
      {
        path: 'home/prd/v151/product-bom',
        redirect: '/home/prd/v151',
      },
      {
        path: 'home/prd/v151/product-material',
        name: 'home-prd-v151-product-material',
        component: () => import('@/views/prd/PrdV151ProductMaterialView.vue'),
        meta: { title: '1.5.1 · 产品物料需求' },
      },
      ...moduleRedirectRoutes,
      ...createPageRoutes,
      {
        path: 'product-process/materials',
        redirect: '/product-process/products',
      },
      {
        path: 'product-process/materials/new',
        redirect: '/product-process/products/new',
      },
      {
        path: 'product-process/products',
        name: 'product-process-products',
        component: () => import('@/views/product-process/MasterItemInfoView.vue'),
        meta: { title: '产品信息' },
      },
      {
        path: 'product-process/bom',
        name: 'product-process-bom',
        component: () => import('@/views/product-process/ProductBomView.vue'),
        meta: { title: '产品BOM' },
      },
      {
        path: 'product-process/bom/new',
        name: 'product-process-bom-new',
        component: () => import('@/views/product-process/ProductBomCreateView.vue'),
        meta: { title: '新增BOM' },
      },
      {
        path: 'product-process/bom/:id/edit',
        name: 'product-process-bom-edit',
        component: () => import('@/views/product-process/ProductBomCreateView.vue'),
        meta: { title: '编辑BOM' },
      },
      {
        path: 'product-process/bom/:id',
        name: 'product-process-bom-detail',
        component: () => import('@/views/product-process/ProductBomDetailView.vue'),
        meta: { title: 'BOM详情' },
      },
      {
        path: 'product-process/routing',
        name: 'product-process-routing',
        component: () => import('@/views/product-process/ProcessRouteView.vue'),
        meta: { title: '工艺路线' },
      },
      {
        path: 'product-process/routing/:id',
        name: 'product-process-routing-detail',
        component: () => import('@/views/product-process/ProcessRouteDetailView.vue'),
        meta: { title: '工艺路线详情' },
      },
      {
        path: 'product-process/process-config',
        name: 'product-process-config',
        component: () => import('@/views/product-process/ProcessConfigView.vue'),
        meta: { title: '工序配置' },
      },
      {
        path: 'product-process/process-config/:id',
        name: 'product-process-config-detail',
        component: () => import('@/views/product-process/ProcessConfigDetailView.vue'),
        meta: { title: '工序详情' },
      },
      {
        path: 'product-process/process-doc',
        name: 'product-process-process-doc',
        component: () => import('@/views/product-process/ProcessDocView.vue'),
        meta: { title: '工艺文件' },
      },
      {
        path: 'product-process/process-category',
        name: 'product-process-category',
        component: () => import('@/views/product-process/ProcessCategoryView.vue'),
        meta: { title: '工序分类' },
      },
      {
        path: 'product-process/process-form',
        ...emptyChild('product-process-form', '工序表单模板'),
      },
      {
        path: 'sales/orders',
        name: 'sales-orders',
        component: () => import('@/views/sales/SalesOrderView.vue'),
        meta: { title: '销售订单' },
      },
      {
        path: 'sales/orders/:id/edit',
        name: 'sales-orders-edit',
        component: () => import('@/views/sales/SalesOrderEditView.vue'),
        meta: { title: '编辑销售订单', listPath: '/sales/orders' },
      },
      {
        path: 'sales/orders/:id',
        name: 'sales-orders-detail',
        component: () => import('@/views/sales/SalesOrderDetailView.vue'),
        meta: { title: '销售订单详情' },
      },
      {
        path: 'sales/delivery',
        name: 'sales-delivery',
        component: () => import('@/views/sales/DeliveryManagementView.vue'),
        meta: { title: '发货管理' },
      },
      {
        path: 'sales/delivery/:id',
        name: 'sales-delivery-detail',
        component: () => import('@/views/sales/DeliveryOrderDetailView.vue'),
        meta: { title: '发货单详情' },
      },
      {
        path: 'sales/customers',
        redirect: '/basic-config/customers',
      },
      {
        path: 'sales/framework-contracts',
        name: 'sales-framework-contracts',
        component: () => import('@/views/sales/FrameworkContractView.vue'),
        meta: { title: '框架合同' },
      },
      {
        path: 'planning/production-plan',
        name: 'planning-production-plan',
        component: () => import('@/views/planning/ProductionPlanView.vue'),
        meta: { title: '生产计划' },
      },
      {
        path: 'planning/design-task',
        name: 'planning-design-task',
        component: () => import('@/views/planning/DesignTaskView.vue'),
        meta: { title: '设计任务' },
      },
      {
        path: 'planning/design-task/:id/detail',
        name: 'planning-design-task-detail',
        component: () => import('@/views/planning/DesignTaskDetailView.vue'),
        meta: { title: '设计任务详情' },
      },
      {
        path: 'planning/design-task/:taskId/ebom',
        name: 'planning-ebom-design',
        component: () => import('@/views/planning/EbomDesignView.vue'),
        meta: { title: 'EBOM设计' },
      },
      {
        path: 'production/work-orders',
        name: 'production-work-orders',
        component: () => import('@/views/production/WorkOrderManagementView.vue'),
        meta: { title: '生产工单' },
      },
      {
        path: 'production/assembly-work-orders',
        name: 'production-assembly-work-orders',
        component: () => import('@/views/production/AssemblyWorkOrderManagementView.vue'),
        meta: { title: '总装工单' },
      },
      {
        path: 'production/disassembly-work-orders',
        name: 'production-disassembly-work-orders',
        component: () => import('@/views/production/DisassemblyWorkOrderManagementView.vue'),
        meta: { title: '拆解工单' },
      },
      {
        path: 'production/disassembly-work-orders/:id',
        name: 'production-disassembly-work-order-detail',
        component: () => import('@/views/production/DisassemblyWorkOrderDetailView.vue'),
        meta: { title: '拆解工单详情' },
      },
      {
        path: 'production/qc-work-orders',
        name: 'production-qc-work-orders',
        component: () => import('@/views/production/QcWorkOrderManagementView.vue'),
        meta: { title: '质检工单' },
      },
      {
        path: 'production/material-requisition',
        name: 'production-material-requisition',
        component: () => import('@/views/production/MaterialRequisitionManagementView.vue'),
        meta: { title: '领料管理' },
      },
      {
        path: 'production/material-requisition/create',
        name: 'production-material-requisition-create',
        component: () => import('@/views/production/MaterialRequisitionCreateView.vue'),
        meta: { title: '申请领料', listPath: '/production/material-requisition' },
      },
      {
        path: 'production/material-requisition/:id',
        name: 'production-material-requisition-detail',
        component: () => import('@/views/production/MaterialRequisitionDetailView.vue'),
        meta: { title: '领料申请详情', listPath: '/production/material-requisition' },
      },
      {
        path: 'report-management/report-work',
        name: 'report-management-report-work',
        component: () => import('@/views/production/ReportWorkManagementView.vue'),
        meta: { title: '报工确认' },
      },
      {
        path: 'report-management/report-work/:id',
        name: 'report-management-report-work-detail',
        component: () => import('@/views/production/ReportWorkDetailView.vue'),
        meta: { title: '登记详情' },
      },
      {
        path: 'report-management/process-report',
        name: 'report-management-process-report',
        component: () => import('@/views/production/ProcessReportManagementView.vue'),
        meta: { title: '工序报工' },
      },
      {
        path: 'report-management/process-report/wo/:workOrderId',
        name: 'report-management-process-report-wo-detail',
        component: () => import('@/views/production/ProcessReportWorkOrderDetailView.vue'),
        meta: { title: '任务报工详情' },
      },
      {
        path: 'report-management/process-report/:id',
        name: 'report-management-process-report-detail',
        component: () => import('@/views/production/ProcessReportDetailView.vue'),
        meta: { title: '工序报工详情' },
      },
      {
        path: 'report-management/salary-summary',
        name: 'report-management-salary-summary',
        component: () => import('@/views/labor-salary/SalarySummaryView.vue'),
        meta: { title: '工资核算' },
      },
      {
        path: 'report-management/salary-detail',
        name: 'report-management-salary-detail',
        component: () => import('@/views/labor-salary/SalaryDetailView.vue'),
        meta: { title: '核算详情' },
      },
      { path: 'report-management', redirect: '/report-management/report-work' },
      { path: 'production/report-work', redirect: '/report-management/report-work' },
      {
        path: 'production/report-work/:id',
        redirect: (to) => `/report-management/report-work/${to.params.id}`,
      },
      { path: 'production/process-report', redirect: '/report-management/process-report' },
      {
        path: 'production/process-report/wo/:workOrderId',
        redirect: (to) => `/report-management/process-report/wo/${to.params.workOrderId}`,
      },
      {
        path: 'production/process-report/:id',
        redirect: (to) => `/report-management/process-report/${to.params.id}`,
      },
      {
        path: 'labor-salary/labor-hour',
        name: 'labor-salary-labor-hour',
        component: () => import('@/views/labor-salary/LaborHourManagementView.vue'),
        meta: { title: '工时管理' },
      },
      {
        path: 'labor-salary/labor-hour/:id',
        name: 'labor-salary-labor-hour-detail',
        component: () => import('@/views/labor-salary/LaborHourDetailView.vue'),
        meta: { title: '工时详情' },
      },
      { path: 'labor-salary/salary-summary', redirect: '/report-management/salary-summary' },
      { path: 'labor-salary/salary-detail', redirect: '/report-management/salary-detail' },
      { path: 'labor-salary/salary-stats', redirect: '/report-management/salary-summary' },
      { path: 'production/shop-floor', redirect: '/production/qc-work-orders' },
      {
        path: 'inventory/stock-detail',
        name: 'inventory-stock-detail',
        component: () => import('@/views/inventory/InventoryDetailView.vue'),
        meta: { title: '库存明细' },
      },
      {
        path: 'inventory/stock',
        redirect: '/inventory/stock-detail',
      },
      {
        path: 'inventory/outbound',
        name: 'inventory-outbound',
        component: () => import('@/views/inventory/OutboundManagementView.vue'),
        meta: { title: '出库管理' },
      },
      {
        path: 'inventory/outbound/:id/edit',
        name: 'inventory-outbound-edit',
        component: () => import('@/views/inventory/OutboundOrderEditView.vue'),
        meta: { title: '编辑出库单', listPath: '/inventory/outbound' },
      },
      {
        path: 'inventory/outbound/:id',
        name: 'inventory-outbound-detail',
        component: () => import('@/views/inventory/OutboundOrderDetailView.vue'),
        meta: { title: '出库单详情' },
      },
      { path: 'inventory/sales-outbound', redirect: '/inventory/outbound' },
      {
        path: 'inventory/inbound',
        name: 'inventory-inbound',
        component: () => import('@/views/inventory/InboundManagementView.vue'),
        meta: { title: '入库管理' },
      },
      {
        path: 'inventory/inbound/:id/edit',
        name: 'inventory-inbound-edit',
        component: () => import('@/views/inventory/InboundOrderEditView.vue'),
        meta: { title: '编辑入库单', listPath: '/inventory/inbound' },
      },
      {
        path: 'inventory/inbound/:id',
        name: 'inventory-inbound-detail',
        component: () => import('@/views/inventory/InboundOrderDetailView.vue'),
        meta: { title: '入库单详情' },
      },
      {
        path: 'inventory/in-out-detail',
        name: 'inventory-in-out-detail',
        component: () => import('@/views/inventory/InOutDetailView.vue'),
        meta: { title: '出入库详情' },
      },
      { path: 'inventory/in-out', redirect: '/inventory/in-out-detail' },
      {
        path: 'inventory/deduct-records',
        name: 'inventory-deduct-records',
        component: () => import('@/views/inventory/InventoryDeductRecordView.vue'),
        meta: { title: '库存扣减记录' },
      },
      {
        path: 'inventory/deduct-records/:id',
        name: 'inventory-deduct-record-detail',
        component: () => import('@/views/inventory/InventoryDeductDetailView.vue'),
        meta: { title: '扣减记录详情', listPath: '/inventory/deduct-records' },
      },
      {
        path: 'inventory/cut-settle',
        name: 'inventory-cut-settle',
        component: () => import('@/views/inventory/CutSettleRecordView.vue'),
        meta: { title: '下料结算' },
      },
      {
        path: 'inventory/cut-settle/:id',
        name: 'inventory-cut-settle-detail',
        component: () => import('@/views/inventory/CutSettleDetailView.vue'),
        meta: { title: '下料结算详情', listPath: '/inventory/cut-settle' },
      },
      {
        path: 'quality/factory-qc',
        name: 'quality-factory-qc',
        component: () => import('@/views/quality/FactoryQcView.vue'),
        meta: { title: '出厂质检' },
      },
      {
        path: 'quality/factory-qc/:id',
        name: 'quality-factory-qc-detail',
        component: () => import('@/views/quality/FactoryQcDetailView.vue'),
        meta: { title: '出厂质检详情' },
      },
      { path: 'quality/inspection', redirect: '/quality/factory-qc' },
      { path: 'quality/defect', redirect: '/quality/scrap-orders' },
      {
        path: 'quality/scrap-orders',
        name: 'quality-scrap-orders',
        component: () => import('@/views/quality/ScrapManagementView.vue'),
        meta: { title: '报废品管理' },
      },
      {
        path: 'quality/scrap-orders/:id',
        name: 'quality-scrap-order-detail',
        component: () => import('@/views/quality/ScrapOrderDetailView.vue'),
        meta: { title: '报废品详情' },
      },
      {
        path: 'quality/qc-template',
        name: 'quality-qc-template',
        component: () => import('@/views/industrial-id/ProductTemplateView.vue'),
        meta: { title: '质检模板' },
      },
      {
        path: 'procurement/purchase-req',
        name: 'procurement-purchase-req',
        component: () => import('@/views/procurement/PurchaseRequisitionView.vue'),
        meta: { title: '采购申请' },
      },
      {
        path: 'procurement/purchase-req/:id/edit',
        name: 'procurement-purchase-req-edit',
        component: () => import('@/views/procurement/PurchaseRequisitionEditView.vue'),
        meta: { title: '编辑采购申请', listPath: '/procurement/purchase-req' },
      },
      {
        path: 'procurement/purchase-req/:id',
        name: 'procurement-purchase-req-detail',
        component: () => import('@/views/procurement/PurchaseRequisitionDetailView.vue'),
        meta: { title: '采购申请详情' },
      },
      {
        path: 'procurement/purchase-orders',
        name: 'procurement-purchase-orders',
        component: () => import('@/views/procurement/PurchaseOrderView.vue'),
        meta: { title: '采购订单' },
      },
      {
        path: 'procurement/purchase-orders/:id/edit',
        name: 'procurement-purchase-orders-edit',
        component: () => import('@/views/procurement/PurchaseOrderEditView.vue'),
        meta: { title: '编辑采购单', listPath: '/procurement/purchase-orders' },
      },
      {
        path: 'procurement/purchase-orders/:id/approve',
        name: 'procurement-purchase-orders-approve',
        component: () => import('@/views/procurement/PurchaseOrderApproveView.vue'),
        meta: { title: '审核采购单', listPath: '/procurement/purchase-orders' },
      },
      {
        path: 'procurement/purchase-orders/:id',
        name: 'procurement-purchase-orders-detail',
        component: () => import('@/views/procurement/PurchaseOrderDetailView.vue'),
        meta: { title: '采购订单详情' },
      },
      {
        path: 'procurement/purchase-details',
        name: 'procurement-purchase-details',
        component: () => import('@/views/procurement/PurchaseDetailView.vue'),
        meta: { title: '采购明细' },
      },
      {
        path: 'procurement/suppliers',
        redirect: '/procurement/purchase-details',
      },
      {
        path: 'engineering-change',
        redirect: '/engineering-change/ecn-list',
      },
      {
        path: 'engineering-change/ecn-list',
        name: 'engineering-change-ecn-list',
        component: () => import('@/views/engineering-change/EcnListView.vue'),
        meta: { title: 'ECN列表', changeModule: 'ecn' },
      },
      {
        path: 'engineering-change/ecn/new',
        name: 'engineering-change-ecn-new',
        component: () => import('@/views/engineering-change/EcnCreateView.vue'),
        meta: { title: '提交工程变更申请', changeModule: 'ecn' },
      },
      {
        path: 'engineering-change/ecn/:id/approve',
        name: 'engineering-change-ecn-approve',
        component: () => import('@/views/engineering-change/EcnApproveView.vue'),
        meta: { title: '审批工程变更', changeModule: 'ecn' },
      },
      {
        path: 'engineering-change/ecn/:id/execute',
        name: 'engineering-change-ecn-execute',
        component: () => import('@/views/engineering-change/EcnExecuteView.vue'),
        meta: { title: '执行工程变更', changeModule: 'ecn' },
      },
      {
        path: 'engineering-change/ecn/:id/detail',
        name: 'engineering-change-ecn-detail',
        component: () => import('@/views/engineering-change/EcnDetailView.vue'),
        meta: { title: 'ECN详情', changeModule: 'ecn' },
      },
      {
        path: 'engineering-change/ecr-request',
        name: 'engineering-change-ecr-request',
        component: () => import('@/views/engineering-change/EcnListView.vue'),
        meta: { title: 'ECR申请', changeModule: 'ecr' },
      },
      {
        path: 'engineering-change/ecr/new',
        name: 'engineering-change-ecr-new',
        component: () => import('@/views/engineering-change/EcnCreateView.vue'),
        meta: { title: '提交工程变更申请', changeModule: 'ecr' },
      },
      {
        path: 'engineering-change/ecr/:id/approve',
        name: 'engineering-change-ecr-approve',
        component: () => import('@/views/engineering-change/EcnApproveView.vue'),
        meta: { title: '审批工程变更', changeModule: 'ecr' },
      },
      {
        path: 'engineering-change/ecr/:id/execute',
        name: 'engineering-change-ecr-execute',
        component: () => import('@/views/engineering-change/EcnExecuteView.vue'),
        meta: { title: '执行工程变更', changeModule: 'ecr' },
      },
      {
        path: 'engineering-change/ecr/:id/detail',
        name: 'engineering-change-ecr-detail',
        component: () => import('@/views/engineering-change/EcnDetailView.vue'),
        meta: { title: 'ECR详情', changeModule: 'ecr' },
      },
      {
        path: 'engineering-change/ecr-change',
        ...emptyChild('engineering-change-ecr-change', 'ECR变更'),
      },
      {
        path: 'after-sales/service-orders',
        ...emptyChild('after-sales-service-orders', '服务工单'),
      },
      { path: 'after-sales/returns', ...emptyChild('after-sales-returns', '退换货') },
      { path: 'wms/warehouse', ...emptyChild('wms-warehouse', '仓储管理') },
      { path: 'qms/trace', ...emptyChild('qms-trace', '质量追溯') },
      { path: 'equipment/devices', ...emptyChild('equipment-devices', '设备管理') },
      { path: 'report/overview', ...emptyChild('report-overview', '报表中心') },
      {
        path: 'basic-config/employee-groups',
        name: 'basic-config-employee-groups',
        component: () => import('@/views/basic-config/EmployeeGroupView.vue'),
        meta: { title: '员工组别' },
      },
      {
        path: 'basic-config/defect-items',
        name: 'basic-config-defect-items',
        component: () => import('@/views/basic-config/DefectItemView.vue'),
        meta: { title: '不良品项' },
      },
      {
        path: 'basic-config/material-grades',
        name: 'basic-config-material-grades',
        component: () => import('@/views/basic-config/MaterialGradeView.vue'),
        meta: { title: '材质管理' },
      },
      {
        path: 'basic-config/units',
        name: 'basic-config-units',
        component: () => import('@/views/basic-config/UnitManagementView.vue'),
        meta: { title: '单位管理' },
      },
      {
        path: 'basic-config/packaging',
        name: 'basic-config-packaging',
        component: () => import('@/views/basic-config/PackagingManagementView.vue'),
        meta: { title: '包装管理' },
      },
      {
        path: 'basic-config/function-params',
        name: 'basic-config-function-params',
        component: () => import('@/views/basic-config/FunctionParamView.vue'),
        meta: { title: '功能参数' },
      },
      {
        path: 'basic-config/business-dict',
        name: 'basic-config-business-dict',
        component: () => import('@/views/basic-config/BusinessDictView.vue'),
        meta: { title: '业务字典' },
      },
      {
        path: 'basic-config/warehouse-categories',
        name: 'basic-config-warehouse-categories',
        component: () => import('@/views/basic-config/WarehouseCategoryView.vue'),
        meta: { title: '仓库分类' },
      },
      {
        path: 'basic-config/warehouses',
        name: 'basic-config-warehouses',
        component: () => import('@/views/basic-config/WarehouseView.vue'),
        meta: { title: '仓库列表' },
      },
      {
        path: 'basic-config/warehouses/:id',
        name: 'basic-config-warehouse-detail',
        component: () => import('@/views/basic-config/WarehouseDetailView.vue'),
        meta: { title: '仓库详情' },
      },
      {
        path: 'basic-config/customer-types',
        name: 'basic-config-customer-types',
        component: () => import('@/views/basic-config/customers/CustomerTypeView.vue'),
        meta: { title: '客户类型' },
      },
      {
        path: 'basic-config/customers',
        name: 'basic-config-customers',
        component: () => import('@/views/basic-config/customers/CustomerProfileView.vue'),
        meta: { title: '客户档案' },
      },
      {
        path: 'basic-config/customers/:id/edit',
        name: 'basic-config-customers-edit',
        component: () => import('@/views/basic-config/customers/CustomerEditView.vue'),
        meta: { title: '编辑客户', listPath: '/basic-config/customers' },
      },
      {
        path: 'basic-config/customers/:id',
        name: 'basic-config-customers-detail',
        component: () => import('@/views/basic-config/customers/CustomerDetailView.vue'),
        meta: { title: '客户详情' },
      },
      {
        path: 'basic-config/supplier-categories',
        name: 'basic-config-supplier-categories',
        component: () => import('@/views/basic-config/suppliers/SupplierCategoryView.vue'),
        meta: { title: '供应商分类' },
      },
      {
        path: 'basic-config/suppliers',
        name: 'basic-config-suppliers',
        component: () => import('@/views/basic-config/suppliers/SupplierProfileView.vue'),
        meta: { title: '供应商档案' },
      },
      {
        path: 'basic-config/suppliers/:id/edit',
        name: 'basic-config-suppliers-edit',
        component: () => import('@/views/basic-config/suppliers/SupplierEditView.vue'),
        meta: { title: '编辑供应商', listPath: '/basic-config/suppliers' },
      },
      {
        path: 'basic-config/suppliers/:id',
        name: 'basic-config-suppliers-detail',
        component: () => import('@/views/basic-config/suppliers/SupplierDetailView.vue'),
        meta: { title: '供应商详情' },
      },
      {
        path: 'system/dict',
        name: 'system-dict',
        component: () => import('@/views/system/SystemDictView.vue'),
        meta: { title: '系统字典' },
      },
      {
        path: 'system/business-rules',
        name: 'system-business-rules',
        component: () => import('@/views/system/BusinessRuleView.vue'),
        meta: { title: '业务规则' },
      },
      {
        path: 'industrial-id',
        redirect: '/industrial-id/base-config/enterprise-info',
      },
      {
        path: 'industrial-id/base-config/enterprise-info',
        name: 'industrial-id-enterprise-info',
        component: () => import('@/views/industrial-id/EnterpriseInfoView.vue'),
        meta: { title: '企业信息' },
      },
      {
        path: 'industrial-id/base-config/product-template',
        redirect: '/quality/qc-template',
      },
      {
        path: 'industrial-id/base-config/nameplate-template',
        name: 'industrial-id-nameplate-template',
        component: () => import('@/views/industrial-id/NameplateTemplateView.vue'),
        meta: { title: '配置铭牌模板' },
      },
      {
        path: 'industrial-id/label-request',
        name: 'industrial-id-label-request',
        component: () => import('@/views/industrial-id/LabelRequestView.vue'),
        meta: { title: '标识申请' },
      },
      {
        path: 'industrial-id/label-management',
        name: 'industrial-id-label-management',
        component: () => import('@/views/industrial-id/LabelManagementView.vue'),
        meta: { title: '标识管理' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/home/dashboard' },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

router.onError((error, to) => {
  const message = error?.message || String(error)
  if (!/Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(message)) return

  const reloadKey = `chunk-reload:${to.fullPath}`
  if (sessionStorage.getItem(reloadKey)) {
    console.error('[router] lazy chunk load failed after reload:', message)
    sessionStorage.removeItem(reloadKey)
    return
  }

  console.error('[router] lazy chunk load failed, reloading once:', message)
  sessionStorage.setItem(reloadKey, '1')
  window.location.reload()
})

router.beforeEach((to, from, next) => {
  if (to.meta.public) {
    if (to.name === 'login' && isLoggedIn()) {
      next('/home/dashboard')
      return
    }
    next()
    return
  }

  if (!isLoggedIn()) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta?.standalone) {
    next()
    return
  }

  const fullPath = to.fullPath
  const pathOnly = to.path
  const title = routeTitles[pathOnly] || routeTitles[fullPath] || to.meta?.title || '页面'
  const exists = tabStore.tabs.find((t) => {
    if (t.path === fullPath || t.path === pathOnly) return true
    return t.path.split('?')[0] === pathOnly
  })
  if (!exists) {
    tabStore.tabs.push({
      path: fullPath.includes('?') ? fullPath : pathOnly,
      title,
      closable: pathOnly !== '/home/dashboard',
    })
    tabStore.activePath = fullPath.includes('?') ? fullPath : pathOnly
  } else {
    // 优先使用已有带 query 的页签 path，避免切回丢参
    tabStore.activePath = exists.path
  }
  next()
})

export default router

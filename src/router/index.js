import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/utils/auth'
import { routeTitles } from '@/config/menus'
import { tabStore } from '@/composables/useTabs'

const MainLayout = () => import('@/layout/MainLayout.vue')

const emptyChild = (name, title) => ({
  name,
  component: () => import('@/views/placeholder/EmptyPage.vue'),
  meta: { title },
})

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
    path: '/',
    component: MainLayout,
    redirect: '/home/dashboard',
    children: [
      { path: 'home/dashboard', ...emptyChild('home-dashboard', '首页') },
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
      {
        path: 'product-process/materials',
        name: 'product-process-materials',
        component: () => import('@/views/product-process/MaterialInfoView.vue'),
        meta: { title: '物料信息' },
      },
      {
        path: 'product-process/products',
        name: 'product-process-products',
        component: () => import('@/views/product-process/ProductInfoView.vue'),
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
      { path: 'sales/customers', ...emptyChild('sales-customers', '客户档案') },
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
      { path: 'inventory/stock', ...emptyChild('inventory-stock', '库存查询') },
      {
        path: 'inventory/outbound',
        name: 'inventory-outbound',
        component: () => import('@/views/inventory/OutboundManagementView.vue'),
        meta: { title: '出库管理' },
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
        path: 'procurement/purchase-req',
        name: 'procurement-purchase-req',
        component: () => import('@/views/procurement/PurchaseRequisitionView.vue'),
        meta: { title: '采购申请' },
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
      { path: 'procurement/suppliers', ...emptyChild('procurement-suppliers', '供应商') },
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
        path: 'basic-config/function-params',
        name: 'basic-config-function-params',
        component: () => import('@/views/basic-config/FunctionParamView.vue'),
        meta: { title: '功能参数' },
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
        name: 'industrial-id-product-template',
        component: () => import('@/views/industrial-id/ProductTemplateView.vue'),
        meta: { title: '配置产品信息更新模板' },
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
  if (/Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(message)) {
    console.error('[router] lazy chunk load failed, reloading:', message)
    window.location.assign(to.fullPath)
  }
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

  const fullPath = to.path
  const title = routeTitles[fullPath] || to.meta?.title || '页面'
  const exists = tabStore.tabs.find((t) => t.path === fullPath)
  if (!exists) {
    tabStore.tabs.push({
      path: fullPath,
      title,
      closable: fullPath !== '/home/dashboard',
    })
  }
  tabStore.activePath = fullPath
  next()
})

export default router

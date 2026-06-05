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
    path: '/',
    component: MainLayout,
    redirect: '/home/dashboard',
    children: [
      { path: 'home/dashboard', ...emptyChild('home-dashboard', '首页') },
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
      { path: 'product-process/routing', ...emptyChild('product-routing', '工艺路线') },
      {
        path: 'product-process/process-config',
        ...emptyChild('product-process-config', '工序配置'),
      },
      { path: 'product-process/process-doc', ...emptyChild('product-process-doc', '工艺文件') },
      {
        path: 'product-process/process-category',
        ...emptyChild('product-process-category', '工序分类'),
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
      { path: 'planning/design-task', ...emptyChild('planning-design-task', '设计任务') },
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
        path: 'production/qc-work-orders',
        name: 'production-qc-work-orders',
        component: () => import('@/views/production/QcWorkOrderManagementView.vue'),
        meta: { title: '质检工单' },
      },
      { path: 'production/shop-floor', redirect: '/production/qc-work-orders' },
      { path: 'inventory/stock', ...emptyChild('inventory-stock', '库存查询') },
      {
        path: 'inventory/outbound',
        name: 'inventory-outbound',
        component: () => import('@/views/inventory/OutboundManagementView.vue'),
        meta: { title: '出库管理' },
      },
      { path: 'inventory/sales-outbound', redirect: '/inventory/outbound' },
      { path: 'inventory/in-out', ...emptyChild('inventory-in-out', '出入库') },
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
      { path: 'quality/defect', ...emptyChild('quality-defect', '不良品') },
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
        path: 'after-sales/service-orders',
        ...emptyChild('after-sales-service-orders', '服务工单'),
      },
      { path: 'after-sales/returns', ...emptyChild('after-sales-returns', '退换货') },
      { path: 'wms/warehouse', ...emptyChild('wms-warehouse', '仓储管理') },
      { path: 'qms/trace', ...emptyChild('qms-trace', '质量追溯') },
      { path: 'equipment/devices', ...emptyChild('equipment-devices', '设备管理') },
      { path: 'report/overview', ...emptyChild('report-overview', '报表中心') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/home/dashboard' },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
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

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
      { path: 'product-process/bom', ...emptyChild('product-bom', 'BOM 管理') },
      { path: 'product-process/routing', ...emptyChild('product-routing', '工艺路线') },
      {
        path: 'sales/orders',
        name: 'sales-orders',
        component: () => import('@/views/sales/SalesOrderView.vue'),
        meta: { title: '销售订单' },
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
        path: 'production/qc-work-orders',
        name: 'production-qc-work-orders',
        component: () => import('@/views/production/QcWorkOrderManagementView.vue'),
        meta: { title: '质检工单' },
      },
      { path: 'production/shop-floor', redirect: '/production/qc-work-orders' },
      { path: 'inventory/stock', ...emptyChild('inventory-stock', '库存查询') },
      { path: 'inventory/in-out', ...emptyChild('inventory-in-out', '出入库') },
      { path: 'quality/inspection', ...emptyChild('quality-inspection', '检验任务') },
      { path: 'quality/defect', ...emptyChild('quality-defect', '不良品') },
      { path: 'procurement/purchase-req', ...emptyChild('procurement-purchase-req', '采购申请') },
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

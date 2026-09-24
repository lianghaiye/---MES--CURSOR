/**
 * 工作台 mock：工序任务、工单进度、右侧栏内容、收藏候选
 */
import { moreModules, sideMenus, topModules } from '@/config/menus'

export const WORKBENCH_PERIOD_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '本月', value: 'month' },
]

export const WORK_ORDER_PROGRESS_TABS = [
  { key: 'notStarted', label: '未开始' },
  { key: 'running', label: '执行中' },
  { key: 'dueIn3Days', label: '3天内到期' },
  { key: 'overdueOpen', label: '超期未完工' },
  { key: 'overdueDoneMonth', label: '本月超期完成' },
  { key: 'doneToday', label: '今日完成' },
  { key: 'doneMonth', label: '本月完成' },
]

const PROCESS_TONES = ['blue', 'cyan', 'orange', 'purple', 'green', 'magenta']

/** 可配置的工序任务全集 */
export const WORKBENCH_PROCESS_CATALOG = [
  { id: 'mold', name: '造型' },
  { id: 'pour', name: '浇筑' },
  { id: 'grind', name: '修磨' },
  { id: 'sand', name: '清沙' },
  { id: 'unpack', name: '开箱' },
  { id: 'blast', name: '抛丸' },
  { id: 'anneal', name: '退火' },
  { id: 'normalize', name: '正火' },
  { id: 'machine', name: '加工' },
  { id: 'paint', name: '喷涂' },
]

export function createDefaultVisibleProcessIds() {
  return ['mold', 'pour', 'grind', 'sand', 'unpack', 'blast', 'anneal']
}

const PROCESS_METRIC_SEED = {
  mold: { taskCount: 1105, planQty: 7565, goodQty: 7488, badQty: 0, progress: 99 },
  pour: { taskCount: 85, planQty: 373, goodQty: 326, badQty: 0, progress: 87 },
  grind: { taskCount: 12, planQty: 48, goodQty: 10, badQty: 0, progress: 21, needStart: true },
  sand: { taskCount: 6, planQty: 30, goodQty: 0, badQty: 0, progress: 0, needStart: true },
  unpack: { taskCount: 0, planQty: 0, goodQty: 0, badQty: 0, progress: 0 },
  blast: { taskCount: 18, planQty: 90, goodQty: 72, badQty: 2, progress: 80, needStart: true },
  anneal: { taskCount: 9, planQty: 40, goodQty: 28, badQty: 0, progress: 70, needStart: true },
  normalize: { taskCount: 5, planQty: 20, goodQty: 8, badQty: 0, progress: 40, needStart: true },
  machine: { taskCount: 32, planQty: 160, goodQty: 140, badQty: 4, progress: 88 },
  paint: { taskCount: 4, planQty: 16, goodQty: 2, badQty: 0, progress: 12, needStart: true },
}

/** 从系统侧栏收集二级 / 三级可收藏菜单（不含一级模块本身） */
export function buildFavoriteCatalogFromMenus() {
  const modules = [...topModules, ...moreModules]
  const list = []
  const seen = new Set()

  modules.forEach((mod) => {
    const items = sideMenus[mod.key] || []
    walkMenuItems(items, {
      module: mod.label,
      moduleKey: mod.key,
      parentLabel: '',
      level: 2,
      list,
      seen,
    })
  })

  return list
}

function walkMenuItems(items, ctx) {
  ;(items || []).forEach((item) => {
    if (item.children?.length) {
      // 分组节点本身无 path 时，子项为三级
      walkMenuItems(item.children, {
        ...ctx,
        parentLabel: item.label,
        level: 3,
      })
    }
    if (!item.path) return
    const key = item.path
    if (ctx.seen.has(key)) return
    ctx.seen.add(key)
    ctx.list.push({
      key,
      title: item.label,
      module: ctx.module,
      moduleKey: ctx.moduleKey,
      parentLabel: ctx.parentLabel || '',
      level: ctx.level,
      path: item.path,
      icon: pickIcon(ctx.moduleKey, item.key),
    })
  })
}

function pickIcon(moduleKey, itemKey) {
  const map = {
    'work-orders': 'file',
    'process-report': 'unordered-list',
    'report-work': 'form',
    'production-plan': 'calendar',
    'purchase-orders': 'shopping',
    'outsourcing-orders': 'apartment',
    inbound: 'inbox',
    'incoming-qc': 'safety',
    orders: 'shop',
  }
  if (map[itemKey]) return map[itemKey]
  if (moduleKey === 'production') return 'file'
  if (moduleKey === 'inventory') return 'inbox'
  if (moduleKey === 'quality') return 'safety'
  if (moduleKey === 'procurement' || moduleKey === 'outsourcing') return 'shopping'
  return 'file'
}

/** @deprecated 保留兼容；实际目录由 buildFavoriteCatalogFromMenus 生成 */
export const WORKBENCH_FAVORITE_CATALOG = buildFavoriteCatalogFromMenus()

export function createDefaultFavorites() {
  const catalog = buildFavoriteCatalogFromMenus()
  const prefer = [
    '/production/work-orders',
    '/report-management/process-report',
    '/report-management/report-work',
  ]
  return prefer
    .map((path, idx) => {
      const hit = catalog.find((c) => c.path === path)
      if (!hit) return null
      return { ...hit, id: `fav-${idx + 1}`, sort: idx + 1 }
    })
    .filter(Boolean)
}

/** 工序任务卡片（按可见配置 + 周期） */
export function buildProcessTaskCards(
  period = 'today',
  { includeNotStarted = true, visibleIds = null } = {},
) {
  const scale = period === 'month' ? 3.2 : period === 'yesterday' ? 0.85 : 1
  const order =
    Array.isArray(visibleIds) && visibleIds.length ? visibleIds : createDefaultVisibleProcessIds()

  return order
    .map((id, idx) => {
      const meta = WORKBENCH_PROCESS_CATALOG.find((p) => p.id === id)
      if (!meta) return null
      const seed = PROCESS_METRIC_SEED[id] || {
        taskCount: 0,
        planQty: 0,
        goodQty: 0,
        badQty: 0,
        progress: 0,
      }
      const muted = seed.needStart && !includeNotStarted
      return {
        id,
        name: meta.name,
        tone: PROCESS_TONES[idx % PROCESS_TONES.length],
        taskCount: muted ? 0 : Math.round((seed.taskCount || 0) * scale),
        planQty: muted ? 0 : Math.round((seed.planQty || 0) * scale),
        goodQty: muted ? 0 : Math.round((seed.goodQty || 0) * scale),
        badQty: muted ? 0 : Math.round((seed.badQty || 0) * scale),
        progress: muted ? 0 : seed.progress || 0,
      }
    })
    .filter(Boolean)
}

export function createMockWorkOrderProgressRows() {
  const today = '2026-09-24'
  return [
    {
      id: 'wo-p-1',
      workOrderNo: 'POS202609230001',
      workOrderId: 'wo-demo-1',
      productCode: 'ZG-HT200',
      productName: '铸铁泵体毛坯',
      specModel: 'IS80-65-160',
      unit: '件',
      status: '未开始',
      tabKeys: ['notStarted'],
      planStart: '2026-09-25 08:00',
      planEnd: '2026-09-28 18:00',
      planQty: 120,
      scheduleQty: 120,
      goodQty: 0,
      badQty: 0,
    },
    {
      id: 'wo-p-2',
      workOrderNo: 'POS202609230002',
      workOrderId: 'wo-demo-2',
      productCode: 'MJ-MF-001',
      productName: '机械密封件',
      specModel: 'Φ45',
      unit: '套',
      status: '未开始',
      tabKeys: ['notStarted', 'dueIn3Days'],
      planStart: '2026-09-24 08:00',
      planEnd: '2026-09-26 18:00',
      planQty: 80,
      scheduleQty: 60,
      goodQty: 0,
      badQty: 0,
    },
    {
      id: 'wo-p-3',
      workOrderNo: 'POS202609220015',
      workOrderId: 'wo-demo-3',
      productCode: 'FLG-80',
      productName: '碳钢法兰',
      specModel: 'DN80 PN16',
      unit: '片',
      status: '执行中',
      tabKeys: ['running', 'dueIn3Days'],
      planStart: '2026-09-22 08:00',
      planEnd: '2026-09-25 18:00',
      planQty: 200,
      scheduleQty: 200,
      goodQty: 126,
      badQty: 4,
    },
    {
      id: 'wo-p-4',
      workOrderNo: 'POS202609180008',
      workOrderId: 'wo-demo-4',
      productCode: 'SEAL-80',
      productName: '橡胶密封垫',
      specModel: 'DN80',
      unit: '个',
      status: '执行中',
      tabKeys: ['running', 'overdueOpen'],
      planStart: '2026-09-18 08:00',
      planEnd: '2026-09-20 18:00',
      planQty: 500,
      scheduleQty: 480,
      goodQty: 310,
      badQty: 12,
    },
    {
      id: 'wo-p-5',
      workOrderNo: 'POS202609100003',
      workOrderId: 'wo-demo-5',
      productCode: 'IMP-120',
      productName: '叶轮铸件',
      specModel: 'Φ120',
      unit: '件',
      status: '已完成',
      tabKeys: ['doneMonth', 'overdueDoneMonth'],
      planStart: '2026-09-08 08:00',
      planEnd: '2026-09-10 18:00',
      actualEnd: '2026-09-12 16:00',
      planQty: 50,
      scheduleQty: 50,
      goodQty: 48,
      badQty: 2,
    },
    {
      id: 'wo-p-6',
      workOrderNo: 'POS202609240001',
      workOrderId: 'wo-demo-6',
      productCode: 'SHAFT-45',
      productName: '泵轴',
      specModel: 'Φ45×320',
      unit: '根',
      status: '已完成',
      tabKeys: ['doneToday', 'doneMonth'],
      planStart: `${today} 08:00`,
      planEnd: `${today} 17:00`,
      actualEnd: `${today} 15:30`,
      planQty: 30,
      scheduleQty: 30,
      goodQty: 30,
      badQty: 0,
    },
  ]
}

export function createMockScenarios() {
  return [
    {
      id: 'sc-1',
      title: '外协管理全流程',
      summary: '从外协下单、发料、回货质检到入库结算',
      link: 'https://blacklake.feishu.cn/wiki/GNCuwm2QRiVdQdkEclvc4Cr7nLh',
      sort: 1,
      enabled: true,
    },
    {
      id: 'sc-2',
      title: '需求计划与补货',
      summary: '库存预警驱动补货与采购申请',
      link: 'https://blacklake.feishu.cn/wiki/GNCuwm2QRiVdQdkEclvc4Cr7nLh',
      sort: 2,
      enabled: true,
    },
    {
      id: 'sc-3',
      title: '工单执行与报工',
      summary: '工单下发、工序任务领取与报工确认',
      link: 'https://blacklake.feishu.cn/wiki/GNCuwm2QRiVdQdkEclvc4Cr7nLh',
      sort: 3,
      enabled: true,
    },
    {
      id: 'sc-4',
      title: '来料质检闭环',
      summary: '收货、质检、入库与不合格处置',
      link: 'https://blacklake.feishu.cn/wiki/GNCuwm2QRiVdQdkEclvc4Cr7nLh',
      sort: 4,
      enabled: true,
    },
  ]
}

export function createMockReleases() {
  return [
    {
      id: 'rel-1',
      versionTag: '2609',
      title: '【产品功能升级提醒】采购/外协收货终结与质检处理方案',
      publishDate: '2026-09-23',
      publishedAt: '2026-09-23 10:30:00',
      publisher: 'I-DOMS',
      contentHtml: `<p>尊敬的用户，本次更新的内容有：</p>
<ol>
<li>【采购管理】收货单支持终结并释放占用</li>
<li>【质量管理】质检处理方案四桶汇总展示，处置上限按收货数量</li>
<li>【外协管理】外协订单终结规则与发料锁定</li>
</ol>
<h3>1. 【采购管理】收货终结</h3>
<p>进行中的收货单可终结未完成行，释放订单占用数量，允许再次开立收货。</p>
<h3>2. 【质量管理】处理方案</h3>
<p>来料/外协质检按合格入库、让步、退换/返工报废拆分数量，详情与打印同步展示。</p>`,
      status: 'published',
      scopeType: 'all',
      tenantIds: [],
      likeCount: 3,
      dislikeCount: 0,
      sort: 1,
    },
    {
      id: 'rel-2',
      versionTag: '2608',
      title: '【产品功能升级提醒】订单变更与结案',
      publishDate: '2026-09-10',
      publishedAt: '2026-09-10 10:45:46',
      publisher: 'I-DOMS',
      contentHtml: `<p>采购/外协订单支持取消行、短结与终结规则完善。</p>
<ul>
<li>订单行取消与短结</li>
<li>终结前门禁校验</li>
</ul>`,
      status: 'published',
      scopeType: 'tenants',
      tenantIds: ['tenant-demo', 'tenant-zb'],
      likeCount: 8,
      dislikeCount: 1,
      sort: 2,
    },
    {
      id: 'rel-3',
      versionTag: '2608',
      title: '车间主任工作台上线（草稿示例）',
      publishDate: '2026-08-28',
      publishedAt: '',
      publisher: 'I-DOMS',
      contentHtml: `<p>按车间维度汇总待办与快捷入口。此条为草稿，不会出现在工作台。</p>`,
      status: 'draft',
      scopeType: 'all',
      tenantIds: [],
      likeCount: 0,
      dislikeCount: 0,
      sort: 3,
    },
  ]
}

export function createMockGuides() {
  return [
    {
      id: 'gd-1',
      title: '开局必知',
      summary: '登录、组织切换与常用入口',
      link: 'https://blacklake.feishu.cn/wiki/GNCuwm2QRiVdQdkEclvc4Cr7nLh',
      sort: 1,
      enabled: true,
    },
    {
      id: 'gd-2',
      title: '弄懂系统术语',
      summary: '工单、工序任务、收货、质检等概念',
      link: 'https://blacklake.feishu.cn/wiki/GNCuwm2QRiVdQdkEclvc4Cr7nLh',
      sort: 2,
      enabled: true,
    },
    {
      id: 'gd-3',
      title: '上传数据检查清单',
      summary: '主数据导入前的准备事项',
      link: 'https://blacklake.feishu.cn/wiki/GNCuwm2QRiVdQdkEclvc4Cr7nLh',
      sort: 3,
      enabled: true,
    },
  ]
}

export function createMockFeedbacks() {
  return [
    {
      id: 'fb-1',
      content: '希望工作台能自定义工序任务卡片顺序',
      creator: '张三',
      createdAt: '2026-09-20 10:22:00',
      status: '待处理',
      reply: '',
    },
    {
      id: 'fb-2',
      content: '收藏入口希望支持拖拽排序',
      creator: '李四',
      createdAt: '2026-09-18 15:08:00',
      status: '已回复',
      reply: '已纳入后续迭代，感谢反馈。',
    },
  ]
}

<template>
  <div class="kit-supply" :class="{ 'is-screen': isScreen }">
    <header v-if="!drillStack.length" class="page-header">
      <div class="header-main">
        <h1 class="title">{{ isScreen ? '齐套与供应看板' : '齐套与供应进度' }}</h1>
        <span class="updated">更新于 {{ dashboard.updatedAt }}</span>
      </div>
      <div class="header-actions">
        <a-button type="primary" ghost @click="refresh">刷新</a-button>
        <a-button v-if="isScreen" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏展示' }}
        </a-button>
      </div>
    </header>

    <!-- 列表层：Tab 在上，搜索在 Tab 下 -->
    <template v-if="!drillStack.length">
      <a-tabs v-model:activeKey="activeTab" class="main-tabs">
        <a-tab-pane v-for="tab in KIT_SUPPLY_TABS" :key="tab.key" :tab="tab.label" />
      </a-tabs>

      <div class="filter-bar">
        <a-input-search
          v-model:value="keyword"
          allow-clear
          placeholder="搜索当前报表：订单号 / 客户 / 物料 / 工序 / 供应商"
          class="search"
          @search="refresh"
        />
        <span class="view-count">当前视图 {{ currentViewCount }} 行</span>
      </div>

      <!-- 装配齐套 -->
      <section v-show="activeTab === 'kitting'" class="panel">
        <div class="panel-toolbar">
          <a-radio-group v-model:value="kitView" button-style="solid" size="small">
            <a-radio-button :value="KIT_VIEW_MODE.PLAN">按生产计划</a-radio-button>
            <a-radio-button :value="KIT_VIEW_MODE.SALES">按销售订单</a-radio-button>
          </a-radio-group>
          <span class="hint">
            点行下钻缺件明细。按生产计划时每个产品一行；单号为计划单号（销售来源通常同销售订单号）。
          </span>
        </div>
        <a-table
          :columns="kittingColumns"
          :data-source="dashboard.kitting"
          :pagination="tablePagination"
          :scroll="{ x: 1280 }"
          row-key="id"
          size="middle"
          :custom-row="kittingRowProps"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'docNo'">
              <div class="cell-stack">
                <span>{{ record.docNo }}</span>
                <span class="cell-sub">{{ record.docNoLabel }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'product'">
              <div class="cell-stack">
                <span class="cell-strong">{{ record.productName || '—' }}</span>
                <span class="cell-sub">
                  规格 {{ record.specModel || '—' }} · 材质 {{ record.material || '—' }}
                </span>
                <span class="cell-sub">
                  图号 {{ record.drawingNo || '—' }} · 外部工号
                  {{ record.externalWorkNo || '—' }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'qty'">
              {{ record.qtyText }}
            </template>
            <template v-else-if="column.key === 'kitRate'">
              <div class="rate-cell">
                <a-progress
                  :percent="record.kitRatePct"
                  :status="progressStatus(record.statusKey)"
                  size="small"
                  :show-info="false"
                />
                <span class="rate-text">{{ record.kitRatePct }}%</span>
              </div>
            </template>
            <template v-else-if="column.key === 'missingCount'">
              <span :class="{ 'text-danger': record.missingCount > 0 }">{{
                record.missingCount
              }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.statusKey)">{{ record.statusLabel }}</a-tag>
            </template>
            <template v-else-if="column.key === 'planAssemblyDate'">
              {{ formatShortDate(record.planAssemblyDate) }}
            </template>
          </template>
        </a-table>
        <p class="foot-note">
          齐套按零件项种计；缺件有在途为黄，无来源为红。口径对齐生产计划缺口与按单库存。
        </p>
      </section>

      <section v-show="activeTab === 'part-process'" class="panel">
        <a-table
          :columns="partProcessColumns"
          :data-source="dashboard.partProcess"
          :pagination="tablePagination"
          row-key="id"
          size="middle"
          :custom-row="partProcessRowProps"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'processRate'">
              <div class="rate-cell">
                <a-progress :percent="record.processRatePct" size="small" :show-info="false" />
                <span class="rate-text"
                  >{{ record.processDone }}/{{ record.processTotal || '—' }}</span
                >
              </div>
            </template>
          </template>
        </a-table>
      </section>

      <section v-show="activeTab === 'outsourcing'" class="panel">
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">本月准时回厂率</div>
            <div class="kpi-value tone-warn">
              {{ dashboard.outsourcing.kpis.monthOnTimeRatePct }}%
            </div>
            <div class="kpi-sub">目标 ≥ {{ dashboard.outsourcing.kpis.monthOnTimeTarget }}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">在外协件订单</div>
            <div class="kpi-value">{{ dashboard.outsourcing.kpis.activeOrderCount }}</div>
            <div class="kpi-sub">未关闭 / 未回齐</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">逾期未回厂</div>
            <div class="kpi-value tone-danger">{{ dashboard.outsourcing.kpis.overdueCount }}</div>
            <div class="kpi-sub">按计划回厂日</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">平均逾期时长</div>
            <div class="kpi-value tone-danger">{{ dashboard.outsourcing.kpis.avgOverdueDays }}</div>
            <div class="kpi-sub">天 / 逾期单</div>
          </div>
        </div>
        <h3 class="sub-title">按厂商准时率排名</h3>
        <a-table
          :columns="vendorColumns"
          :data-source="dashboard.outsourcing.vendors"
          :pagination="tablePagination"
          row-key="id"
          size="middle"
          :custom-row="vendorRowProps"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'onTimeRate'">
              <div class="rate-cell">
                <a-progress
                  :percent="record.onTimeRatePct"
                  :status="record.onTimeRatePct >= 95 ? 'success' : 'active'"
                  size="small"
                  :show-info="false"
                />
                <span class="rate-text">{{ record.onTimeRatePct }}%</span>
              </div>
            </template>
          </template>
        </a-table>
        <p class="foot-note">点行下钻该厂商外协订单。近 90 天准时率；交期取计划结束日。</p>
      </section>

      <section v-show="activeTab === 'long-lead'" class="panel">
        <a-table
          :columns="longLeadColumns"
          :data-source="dashboard.longLead"
          :pagination="tablePagination"
          row-key="id"
          size="middle"
          :custom-row="longLeadRowProps"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'risk'">
              <a-tag :color="record.risk === 'high' ? 'error' : 'warning'">{{
                record.riskLabel
              }}</a-tag>
            </template>
            <template v-else-if="column.key === 'gapQty'">
              <span :class="toneClass(record.tone)">{{ record.gapQty }}</span>
            </template>
          </template>
        </a-table>
      </section>

      <section v-show="activeTab === 'material-util'" class="panel">
        <a-table
          :columns="utilColumns"
          :data-source="dashboard.materialUtil"
          :pagination="tablePagination"
          row-key="id"
          size="middle"
          :custom-row="utilRowProps"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'utilRate'">
              <div class="rate-cell">
                <a-progress
                  :percent="Math.min(record.utilRatePct, 100)"
                  size="small"
                  :show-info="false"
                />
                <span class="rate-text">{{ record.utilRatePct }}%</span>
              </div>
            </template>
          </template>
        </a-table>
      </section>
    </template>

    <!-- 下钻层：面包屑 + 搜索 + KPI + 明细（参考图1） -->
    <template v-else>
      <nav class="breadcrumb">
        <a
          v-for="(crumb, idx) in breadcrumbItems"
          :key="`${crumb.key}-${idx}`"
          class="crumb"
          :class="{ current: idx === breadcrumbItems.length - 1 }"
          @click.prevent="onCrumbClick(idx)"
        >
          <span v-if="idx > 0" class="crumb-sep">›</span>
          {{ crumb.label }}
        </a>
      </nav>

      <div class="filter-bar">
        <a-input-search
          v-model:value="drillKeyword"
          allow-clear
          placeholder="搜索当前报表：订单号 / 客户 / 物料 / 工序 / 供应商"
          class="search"
        />
        <span class="view-count">当前视图 {{ drillViewCount }} 行</span>
      </div>

      <!-- 齐套缺件下钻 -->
      <template v-if="currentDrill?.type === 'kit'">
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">订单齐套率</div>
            <div
              class="kpi-value"
              :class="currentDrill.row.kitRatePct < 100 ? 'tone-danger' : 'tone-ok'"
            >
              {{ currentDrill.row.kitRatePct }}%
            </div>
            <div class="kpi-sub">目标: 100%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">缺件项</div>
            <div
              class="kpi-value"
              :class="currentDrill.row.missingCount > 0 ? 'tone-danger' : 'tone-ok'"
            >
              {{ currentDrill.row.missingCount }}
            </div>
            <div class="kpi-sub">项</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">计划装配日</div>
            <div class="kpi-value">{{ formatShortDate(currentDrill.row.planAssemblyDate) }}</div>
            <div class="kpi-sub">{{ daysToAssemblyText(currentDrill.row.planAssemblyDate) }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">客户 / 型号</div>
            <div class="kpi-value kpi-value-sm">{{ currentDrill.row.customerName }}</div>
            <div class="kpi-sub">
              {{ currentDrill.row.specModel || currentDrill.row.productName || '—' }}
            </div>
          </div>
        </div>

        <section class="panel">
          <div class="panel-head">
            <h3 class="sub-title">缺件明细 · {{ currentDrill.row.docNo }}</h3>
            <span class="hint">点击行下钻到来源单据</span>
          </div>
          <a-table
            :columns="shortageColumns"
            :data-source="filteredShortageLines"
            :pagination="false"
            row-key="id"
            size="middle"
            :custom-row="shortageRowProps"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="record.statusColor">{{ record.statusLabel }}</a-tag>
              </template>
            </template>
          </a-table>
          <div class="logic-box">
            下钻逻辑：缺口 = 需求 − 现库存；状态优先级「已齐套 → 待到货（在途可覆盖）→ 部分缺口 →
            严重缺料」。点面包屑返回上一级。
          </div>
          <div v-if="!isScreen" class="drill-actions">
            <a-space>
              <a-button @click="goPlan(currentDrill.row.planIds?.[0])">打开生产计划</a-button>
              <a-button @click="goPath('/procurement/purchase-req')">采购申请</a-button>
              <a-button @click="goPath('/procurement/outsourcing-orders')">外协订单</a-button>
            </a-space>
          </div>
        </section>
      </template>

      <!-- 厂商外协下钻 -->
      <template v-else-if="currentDrill?.type === 'vendor'">
        <section class="panel">
          <div class="panel-head">
            <h3 class="sub-title">外协订单 · {{ currentDrill.vendor }}</h3>
            <span class="hint">点击行打开外协订单</span>
          </div>
          <a-table
            :columns="vendorOrderColumns"
            :data-source="filteredVendorOrders"
            :pagination="false"
            row-key="id"
            size="middle"
            :custom-row="(record) => ({ onClick: () => goOutsourcing(record.id) })"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'overdueDays'">
                <span :class="{ 'text-danger': record.overdueDays > 0 }">{{
                  record.overdueDays || '—'
                }}</span>
              </template>
            </template>
          </a-table>
        </section>
      </template>
    </template>
  </div>
</template>

<script>
export default { name: 'KitSupplyProgressView' }
</script>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import dayjs from 'dayjs'
import {
  KIT_SUPPLY_TABS,
  KIT_VIEW_MODE,
  buildKitSupplyDashboard,
  getOutsourcingOrdersForVendor,
} from '@/utils/kitSupplyDashboard'

const props = defineProps({
  mode: { type: String, default: 'page' },
})

const router = useRouter()
const route = useRoute()
const isScreen = computed(() => props.mode === 'screen' || route.meta?.standalone === true)

const keyword = ref('')
const drillKeyword = ref('')
const activeTab = ref('kitting')
const kitView = ref(KIT_VIEW_MODE.PLAN)
const dashboard = ref(buildKitSupplyDashboard({ kitView: kitView.value }))
const isFullscreen = ref(false)
/** @type {import('vue').Ref<Array<{ type: string, row?: object, vendor?: string }>>} */
const drillStack = ref([])

const tablePagination = computed(() =>
  isScreen.value
    ? { pageSize: 8, showSizeChanger: false }
    : { pageSize: 10, showSizeChanger: true },
)

const currentDrill = computed(() =>
  drillStack.value.length ? drillStack.value[drillStack.value.length - 1] : null,
)

const breadcrumbItems = computed(() => {
  const items = [{ key: 'root', label: rootTabLabel.value }]
  drillStack.value.forEach((d, i) => {
    if (d.type === 'kit') {
      items.push({
        key: `kit-${i}`,
        label: d.row?.crumbLabel || `${d.row?.customerName || ''} · ${d.row?.docNo || ''}`,
      })
    } else if (d.type === 'vendor') {
      items.push({ key: `vendor-${i}`, label: d.vendor || '外协厂商' })
    }
  })
  return items
})

const rootTabLabel = computed(() => {
  const hit = KIT_SUPPLY_TABS.find((t) => t.key === activeTab.value)
  return hit?.label || '齐套与供应进度'
})

const currentViewCount = computed(() => {
  if (activeTab.value === 'kitting') return dashboard.value.kitting?.length || 0
  if (activeTab.value === 'part-process') return dashboard.value.partProcess?.length || 0
  if (activeTab.value === 'outsourcing') return dashboard.value.outsourcing?.vendors?.length || 0
  if (activeTab.value === 'long-lead') return dashboard.value.longLead?.length || 0
  if (activeTab.value === 'material-util') return dashboard.value.materialUtil?.length || 0
  return 0
})

const filteredShortageLines = computed(() => {
  const lines = currentDrill.value?.row?.shortageLines || []
  const kw = drillKeyword.value.trim().toLowerCase()
  if (!kw) return lines
  return lines.filter((l) =>
    [l.itemCode, l.itemName, l.specMaterialText, l.supplyType, l.sourceDocNo]
      .join(' ')
      .toLowerCase()
      .includes(kw),
  )
})

const filteredVendorOrders = computed(() => {
  const orders = getOutsourcingOrdersForVendor(dashboard.value, currentDrill.value?.vendor)
  const kw = drillKeyword.value.trim().toLowerCase()
  if (!kw) return orders
  return orders.filter((o) =>
    [o.orderNo, o.salesOrderNo, o.processName, o.vendor].join(' ').toLowerCase().includes(kw),
  )
})

const drillViewCount = computed(() => {
  if (currentDrill.value?.type === 'kit') return filteredShortageLines.value.length
  if (currentDrill.value?.type === 'vendor') return filteredVendorOrders.value.length
  return 0
})

const kittingColumns = computed(() => [
  {
    title: kitView.value === KIT_VIEW_MODE.PLAN ? '计划单号' : '销售订单号',
    key: 'docNo',
    width: 150,
  },
  { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 110, ellipsis: true },
  { title: '产品型号', key: 'product', width: 260 },
  { title: '数量', key: 'qty', width: 100, align: 'right' },
  { title: '计划装配日', key: 'planAssemblyDate', width: 100 },
  { title: '齐套率', key: 'kitRate', width: 150 },
  { title: '缺件项', key: 'missingCount', width: 80, align: 'right' },
  { title: '状态', key: 'status', width: 96 },
])

const partProcessColumns = [
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '销售单', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 130 },
  { title: '工单号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 130 },
  { title: '当前工序', dataIndex: 'currentProcess', key: 'currentProcess', width: 120 },
  { title: '工序进度', key: 'processRate', width: 160 },
  { title: '工单状态', dataIndex: 'status', key: 'status', width: 100 },
]

const vendorColumns = [
  { title: '外协厂商', dataIndex: 'vendor', key: 'vendor', ellipsis: true },
  { title: '协作类型', dataIndex: 'collabType', key: 'collabType', width: 120 },
  { title: '在外订单', dataIndex: 'activeCount', key: 'activeCount', width: 90, align: 'right' },
  { title: '准时回厂率（近90天）', key: 'onTimeRate', width: 200 },
  {
    title: '平均逾期(天)',
    dataIndex: 'avgOverdueDays',
    key: 'avgOverdueDays',
    width: 110,
    align: 'right',
  },
]

const vendorOrderColumns = [
  { title: '外协单号', dataIndex: 'orderNo', key: 'orderNo', width: 140 },
  { title: '销售单', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 120 },
  { title: '工序/名称', dataIndex: 'processName', key: 'processName', ellipsis: true },
  { title: '计划回厂', dataIndex: 'planEndDate', key: 'planEndDate', width: 110 },
  { title: '回货状态', dataIndex: 'returnStatus', key: 'returnStatus', width: 90 },
  { title: '逾期(天)', key: 'overdueDays', width: 80, align: 'right' },
]

const longLeadColumns = [
  { title: '风险', key: 'risk', width: 90 },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '供应型态', dataIndex: 'supplyType', key: 'supplyType', width: 90 },
  { title: '销售单', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 120 },
  { title: '需求日', dataIndex: 'needDate', key: 'needDate', width: 110 },
  {
    title: '供货期(天)',
    dataIndex: 'leadTimeDays',
    key: 'leadTimeDays',
    width: 100,
    align: 'right',
  },
  { title: '缺口', key: 'gapQty', width: 80, align: 'right' },
  { title: '在途', dataIndex: 'inTransitQty', key: 'inTransitQty', width: 80, align: 'right' },
]

const utilColumns = [
  { title: '工单号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 150 },
  { title: '销售单', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 130 },
  { title: '理论需求', dataIndex: 'theoryText', key: 'theoryText', width: 110, align: 'right' },
  { title: '实发/实耗', dataIndex: 'actualText', key: 'actualText', width: 110, align: 'right' },
  { title: '利用率', key: 'utilRate', width: 180 },
]

const shortageColumns = [
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '规格 / 材质', dataIndex: 'specMaterialText', key: 'specMaterialText', width: 140 },
  { title: '需求', dataIndex: 'demandQty', key: 'demandQty', width: 72, align: 'right' },
  { title: '现库存', dataIndex: 'availableQty', key: 'availableQty', width: 80, align: 'right' },
  { title: '在途/在制', dataIndex: 'inTransitQty', key: 'inTransitQty', width: 90, align: 'right' },
  { title: '预计到位', dataIndex: 'etaText', key: 'etaText', width: 90 },
  { title: '状态', key: 'status', width: 100 },
]

function refresh() {
  dashboard.value = buildKitSupplyDashboard({
    keyword: keyword.value,
    kitView: kitView.value,
  })
}

watch([keyword, kitView], () => refresh())
watch(activeTab, () => {
  drillStack.value = []
  drillKeyword.value = ''
})

function formatShortDate(v) {
  if (!v) return '—'
  const d = dayjs(v)
  return d.isValid() ? d.format('MM-DD') : String(v).slice(5, 10) || v
}

function daysToAssemblyText(v) {
  if (!v) return '—'
  const d = dayjs(v)
  if (!d.isValid()) return '—'
  const diff = d.startOf('day').diff(dayjs().startOf('day'), 'day')
  if (diff > 0) return `距今 ${diff} 天`
  if (diff === 0) return '今天'
  return `已过 ${Math.abs(diff)} 天`
}

function progressStatus(statusKey) {
  if (statusKey === 'ready') return 'success'
  if (statusKey === 'basic') return 'active'
  return 'exception'
}

function statusColor(statusKey) {
  if (statusKey === 'ready') return 'success'
  if (statusKey === 'basic') return 'processing'
  return 'error'
}

function toneClass(tone) {
  if (tone === 'danger') return 'text-danger'
  if (tone === 'warn') return 'text-warn'
  return ''
}

function pushDrill(frame) {
  drillStack.value = [...drillStack.value, frame]
  drillKeyword.value = ''
}

function onCrumbClick(idx) {
  if (idx >= breadcrumbItems.value.length - 1) return
  if (idx === 0) {
    drillStack.value = []
    drillKeyword.value = ''
    return
  }
  drillStack.value = drillStack.value.slice(0, idx)
  drillKeyword.value = ''
}

function kittingRowProps(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: () => pushDrill({ type: 'kit', row: record }),
  }
}

function shortageRowProps(record) {
  return {
    style: { cursor: isScreen.value ? 'default' : 'pointer' },
    onClick: () => {
      if (isScreen.value) return
      goPlan(record.planId)
    },
  }
}

function partProcessRowProps(record) {
  return {
    style: { cursor: record.workOrderId ? 'pointer' : 'default' },
    onClick: () => {
      if (!record.workOrderId || isScreen.value) return
      goPath('/production/work-orders')
    },
  }
}

function vendorRowProps(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: () => pushDrill({ type: 'vendor', vendor: record.vendor }),
  }
}

function longLeadRowProps(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: () => {
      if (isScreen.value) return
      goPlan(record.planId)
    },
  }
}

function utilRowProps(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: () => {
      if (isScreen.value) return
      if (record.workOrderNo && !String(record.workOrderNo).includes('演示')) {
        goPath('/production/work-orders')
      } else {
        goPath('/inventory/cut-settle')
      }
    },
  }
}

function goPath(path) {
  router.push(path)
}

function goPlan(planId) {
  if (!planId) {
    goPath('/planning/production-plan')
    return
  }
  goPath({ path: '/planning/production-plan', query: { planId: String(planId) } })
}

function goOutsourcing(id) {
  if (isScreen.value) return
  goPath({ path: '/procurement/outsourcing-orders', query: id ? { id: String(id) } : {} })
}

function toggleFullscreen() {
  const el = document.documentElement
  if (!document.fullscreenElement) {
    el.requestFullscreen?.()
    isFullscreen.value = true
  } else {
    document.exitFullscreen?.()
    isFullscreen.value = false
  }
}

function onFsChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  refresh()
  document.addEventListener('fullscreenchange', onFsChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
})
</script>

<style lang="less" scoped>
.kit-supply {
  margin: -12px;
  padding: 16px 20px 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}

.kit-supply.is-screen {
  margin: 0;
  min-height: 100vh;
  padding: 20px 28px 32px;
  background: #0b1220;
  color: #e8eef8;

  .title,
  .sub-title,
  .hint,
  .foot-note,
  .updated,
  .kpi-label,
  .kpi-sub,
  .view-count,
  .cell-sub {
    color: #c9d4e8;
  }

  .title {
    color: #fff;
    font-size: 28px;
  }

  .panel,
  .kpi-card {
    background: #141c2e;
    border-color: #243049;
  }

  .breadcrumb .crumb {
    color: #69b1ff;
  }

  .search :deep(.ant-input-affix-wrapper),
  .search :deep(.ant-input) {
    background: #1a2438;
    border-color: #2a3a55;
    color: #e8eef8;
  }

  :deep(.ant-table) {
    background: transparent;
    color: #e8eef8;
  }

  :deep(.ant-table-thead > tr > th) {
    background: #1a2438;
    color: #9db0cc;
    border-bottom-color: #243049;
  }

  :deep(.ant-table-tbody > tr > td) {
    border-bottom-color: #243049;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: #1a2438 !important;
  }

  .logic-box {
    background: #243049;
    border-color: #3a4d6e;
    color: #c9d4e8;
  }
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}

.header-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f1f1f;
}

.updated {
  font-size: 12px;
  color: #8c8c8c;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.main-tabs {
  margin-bottom: 0;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 12px 0 14px;
}

.search {
  width: min(520px, 100%);
}

.view-count {
  font-size: 13px;
  color: #8c8c8c;
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 14px;
}

.crumb {
  color: #1677ff;
  cursor: pointer;
}

.crumb.current {
  color: #262626;
  cursor: default;
  font-weight: 500;
}

.crumb-sep {
  margin-right: 6px;
  color: #bfbfbf;
}

.panel {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.panel-toolbar,
.panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hint,
.foot-note {
  font-size: 12px;
  color: #8c8c8c;
}

.foot-note {
  margin: 12px 0 0;
}

.sub-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 960px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.kpi-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px 16px;
}

.kpi-label {
  font-size: 13px;
  color: #8c8c8c;
}

.kpi-value {
  margin-top: 4px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #1f1f1f;
}

.kpi-value-sm {
  font-size: 20px;
}

.kpi-value.tone-warn {
  color: #d46b08;
}

.kpi-value.tone-danger {
  color: #cf1322;
}

.kpi-value.tone-ok {
  color: #389e0d;
}

.kpi-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #bfbfbf;
}

.rate-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rate-cell :deep(.ant-progress) {
  flex: 1;
  margin: 0;
}

.rate-text {
  width: 64px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
}

.cell-strong {
  font-weight: 500;
}

.cell-sub {
  font-size: 12px;
  color: #8c8c8c;
}

.text-danger {
  color: #cf1322;
  font-weight: 600;
}

.text-warn {
  color: #d48806;
  font-weight: 600;
}

.logic-box {
  margin-top: 14px;
  padding: 10px 12px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  font-size: 12px;
  color: #874d00;
  line-height: 1.5;
}

.drill-actions {
  margin-top: 12px;
}
</style>

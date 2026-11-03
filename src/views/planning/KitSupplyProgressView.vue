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
      <div class="view-tabs-bar">
        <a-tabs v-model:activeKey="activeTab" class="view-tabs" :tab-bar-style="{ margin: 0 }">
          <a-tab-pane v-for="tab in KIT_SUPPLY_TABS" :key="tab.key" :tab="tab.label" />
        </a-tabs>
      </div>

      <div class="filter-card">
        <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <template v-if="activeTab === 'kitting'">
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="单号">
                  <a-input
                    v-model:value="filters.docNo"
                    allow-clear
                    placeholder="计划单号 / 销售单号"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="客户">
                  <a-input
                    v-model:value="filters.customerName"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="产品编码">
                  <a-input
                    v-model:value="filters.productCode"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="产品名称">
                  <a-input
                    v-model:value="filters.productName"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="规格型号">
                  <a-input
                    v-model:value="filters.specModel"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="材质">
                  <a-input
                    v-model:value="filters.material"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="图号">
                  <a-input
                    v-model:value="filters.drawingNo"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="外部工号">
                  <a-input
                    v-model:value="filters.externalWorkNo"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
            </template>
            <template v-else-if="activeTab === 'part-process'">
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="物料编码">
                  <a-input
                    v-model:value="filters.itemCode"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="物料名称">
                  <a-input
                    v-model:value="filters.itemName"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="工单号">
                  <a-input
                    v-model:value="filters.workOrderNo"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="当前工序">
                  <a-input
                    v-model:value="filters.currentProcess"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
            </template>
            <template v-else-if="activeTab === 'outsourcing'">
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="外协厂商">
                  <a-input
                    v-model:value="filters.vendor"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="协作类型">
                  <a-input
                    v-model:value="filters.collabType"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
            </template>
            <template v-else-if="activeTab === 'long-lead'">
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="物料编码">
                  <a-input
                    v-model:value="filters.itemCode"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="物料名称">
                  <a-input
                    v-model:value="filters.itemName"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="供应型态">
                  <a-input
                    v-model:value="filters.supplyType"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
            </template>
            <template v-else>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="工单号">
                  <a-input
                    v-model:value="filters.workOrderNo"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
            </template>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item class="filter-actions-item">
                <a-space>
                  <a-button type="primary" size="small" @click="refresh">查询</a-button>
                  <a-button size="small" @click="resetFilters">重置</a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <!-- 齐套进度 -->
      <section v-show="activeTab === 'kitting'" class="panel">
        <div class="panel-toolbar">
          <a-radio-group v-model:value="kitView" button-style="solid" size="small">
            <a-radio-button :value="KIT_VIEW_MODE.PRODUCTION_WORK_ORDER">按生产工单</a-radio-button>
            <a-radio-button :value="KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER">按总装工单</a-radio-button>
            <a-radio-button :value="KIT_VIEW_MODE.PLAN">按生产计划</a-radio-button>
          </a-radio-group>
          <span class="hint">点行下钻缺件明细。按生产计划时同计划单号/销售单号/客户合并展示。</span>
        </div>
        <a-table
          :columns="kittingDisplayColumns"
          :data-source="kittingPagedRows"
          :pagination="kittingPagination"
          :scroll="{ x: 1280 }"
          row-key="id"
          size="middle"
          bordered
          :custom-row="kittingRowProps"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ (kittingPager.current - 1) * kittingPager.pageSize + index + 1 }}
            </template>
            <template v-else-if="column.key === 'docNo'">
              {{ record.docNo || '—' }}
            </template>
            <template v-else-if="column.key === 'salesOrderNo'">
              {{ record.salesOrderNo || '-' }}
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
            <template v-else-if="column.key === 'urgency'">
              <a-tag :color="urgencyTagColor(record.urgency)">{{
                urgencyDisplayLabel(record.urgency)
              }}</a-tag>
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ formatCreatedAt(record.createdAt) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.statusKey)">{{ record.statusLabel }}</a-tag>
            </template>
            <template v-else-if="column.key === 'planAssemblyDate'">
              {{ formatShortDate(record.planAssemblyDate) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button
                v-if="canRequisition(record)"
                type="link"
                size="small"
                @click.stop="goRequisition(record)"
              >
                去领料
              </a-button>
              <span v-else>—</span>
            </template>
          </template>
        </a-table>
        <p class="foot-note">
          齐套按零件项种计；缺件有在途为黄，无来源为红。口径对齐生产计划缺口与按单库存。按工单可直接发起领料。
        </p>
      </section>

      <section v-show="activeTab === 'part-process'" class="panel">
        <a-table
          :columns="partProcessColumns"
          :data-source="dashboard.partProcess"
          :pagination="tablePagination"
          row-key="id"
          size="middle"
          bordered
          :custom-row="partProcessRowProps"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'processRate'">
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
          bordered
          :custom-row="vendorRowProps"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'onTimeRate'">
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
          bordered
          :custom-row="longLeadRowProps"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'risk'">
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
          bordered
          :custom-row="utilRowProps"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'utilRate'">
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

    <!-- 下钻层（投屏等场景保留内嵌；业务页齐套下钻已改新标签） -->
    <template v-else>
      <div class="crumb-bar">
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
        <a-space>
          <a-button size="small" @click="refresh">刷新</a-button>
          <a-button type="primary" ghost size="small" @click="onCrumbClick(0)">返回列表</a-button>
        </a-space>
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
            <div class="kpi-label">计划日期</div>
            <div class="kpi-value">{{ formatShortDate(currentDrill.row.planAssemblyDate) }}</div>
            <div class="kpi-sub">{{ daysToAssemblyText(currentDrill.row.planAssemblyDate) }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">客户 / 产品</div>
            <div class="kpi-value kpi-value-sm">{{ currentDrill.row.customerName }}</div>
            <div class="kpi-sub">{{ currentDrill.row.productName || '—' }}</div>
          </div>
        </div>

        <div class="filter-card drill-filter-card">
          <a-form :model="drillFilters" layout="inline" class="filter-form horizontal-form">
            <a-row :gutter="[12, 8]" style="width: 100%">
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="物料编码">
                  <a-input
                    v-model:value="drillFilters.itemCode"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="物料名称">
                  <a-input
                    v-model:value="drillFilters.itemName"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="型号规格">
                  <a-input
                    v-model:value="drillFilters.specModel"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :sm="12" :md="6">
                <a-form-item label="材质">
                  <a-input
                    v-model:value="drillFilters.material"
                    allow-clear
                    placeholder="请输入"
                    size="small"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>

        <section class="panel">
          <div class="panel-head">
            <h3 class="sub-title">
              物料明细 · {{ currentDrill.row.productName || '—' }} ·
              {{ currentDrill.row.specModel || '—' }} · {{ currentDrill.row.material || '—' }} ·
              外部工号 {{ currentDrill.row.externalWorkNo || '—' }}
            </h3>
          </div>
          <a-table
            :columns="shortageColumns"
            :data-source="filteredShortageLines"
            :pagination="false"
            row-key="id"
            size="middle"
            bordered
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                <span class="level-no" :style="levelNoStyle(record.levelNo)">{{
                  record.levelNo || index + 1
                }}</span>
              </template>
              <template v-else-if="column.key === 'demandQty'">
                {{ formatQtyUnit(record.demandQty, record.unit) }}
              </template>
              <template v-else-if="column.key === 'physicalQty'">
                {{ formatQtyUnit(record.physicalQty ?? record.stockQty, record.unit) }}
              </template>
              <template v-else-if="column.key === 'allocatedQty'">
                {{ formatQtyUnit(record.allocatedQty ?? record.availableQty, record.unit) }}
              </template>
              <template v-else-if="column.key === 'othersAllocatedQty'">
                {{ formatQtyUnit(record.othersAllocatedQty || 0, record.unit) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.statusColor">{{ record.statusLabel }}</a-tag>
              </template>
            </template>
          </a-table>
          <div class="logic-box">
            <div>
              缺料状态（缺口 = 需求 − 本单占用）：已齐套：缺口 ≤ 0；待到货：有缺口，且在途 ≥
              缺口；部分缺口：有缺口，且 0 &lt; 在途 &lt; 缺口；严重缺料：有缺口，且在途 =
              0；被高优先占用：他单占用 &gt; 0 且在途 = 0
            </div>
            <div>
              占用口径：可用池 = 实物 − 手动锁定；无人手动时按「紧急度 → 计划日期 →
              创建时间」自动预占。有手动占用后锁定优先保留再重算。抢占/让路见「占用明细」。
            </div>
          </div>
        </section>
      </template>

      <!-- 厂商外协下钻 -->
      <template v-else-if="currentDrill?.type === 'vendor'">
        <div class="filter-bar">
          <a-input-search
            v-model:value="drillKeyword"
            allow-clear
            placeholder="搜索外协单号 / 工序"
            class="search"
          />
        </div>
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
            bordered
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
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { formatQty } from '@/utils/numberFormat'
import {
  urgencyLabel as sharedUrgencyLabel,
  urgencyTagColor as sharedUrgencyTagColor,
} from '@/constants/urgency'
import {
  KIT_SUPPLY_TABS,
  KIT_VIEW_MODE,
  isWorkOrderKitView,
  buildKitSupplyDashboard,
  getOutsourcingOrdersForVendor,
} from '@/utils/kitSupplyDashboard'

const props = defineProps({
  mode: { type: String, default: 'page' },
})

const router = useRouter()
const route = useRoute()
const { openTab } = useTabs()
const isScreen = computed(() => props.mode === 'screen' || route.meta?.standalone === true)

const drillKeyword = ref('')
const drillFilters = ref(createEmptyDrillFilters())
const activeTab = ref('kitting')
const kitView = ref(KIT_VIEW_MODE.PRODUCTION_WORK_ORDER)
const filters = ref(createEmptyFilters())
const dashboard = ref(buildKitSupplyDashboard({ kitView: kitView.value }))
const isFullscreen = ref(false)
/** @type {import('vue').Ref<Array<{ type: string, row?: object, vendor?: string }>>} */
const drillStack = ref([])

function createEmptyFilters() {
  return {
    docNo: '',
    customerName: '',
    productCode: '',
    productName: '',
    specModel: '',
    material: '',
    drawingNo: '',
    externalWorkNo: '',
    itemCode: '',
    itemName: '',
    workOrderNo: '',
    currentProcess: '',
    vendor: '',
    collabType: '',
    supplyType: '',
  }
}

function createEmptyDrillFilters() {
  return {
    itemCode: '',
    itemName: '',
    specModel: '',
    material: '',
  }
}

const tablePagination = computed(() =>
  isScreen.value
    ? { pageSize: 8, showSizeChanger: false }
    : { pageSize: 10, showSizeChanger: true },
)

const kittingPager = reactive({
  current: 1,
  pageSize: isScreen.value ? 8 : 10,
})

watch(isScreen, (v) => {
  kittingPager.pageSize = v ? 8 : Math.max(kittingPager.pageSize, 10)
  kittingPager.current = 1
})

const kittingPagination = computed(() => ({
  current: kittingPager.current,
  pageSize: kittingPager.pageSize,
  total: dashboard.value.kitting?.length || 0,
  showSizeChanger: !isScreen.value,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t) => `共 ${t} 条`,
  onChange: (page, pageSize) => {
    kittingPager.current = page
    kittingPager.pageSize = pageSize
  },
}))

const kittingPagedRows = computed(() => {
  const list = dashboard.value.kitting || []
  const start = (kittingPager.current - 1) * kittingPager.pageSize
  return list.slice(start, start + kittingPager.pageSize)
})

/** 当前页内同计划/销售单号合并（按工单维度不合并） */
function buildAdjacentDocRowSpans(rows = []) {
  const spans = new Array(rows.length).fill(1)
  let i = 0
  while (i < rows.length) {
    const key = String(rows[i]?.docNo || '')
    let j = i + 1
    while (j < rows.length && String(rows[j]?.docNo || '') === key) j += 1
    const span = j - i
    spans[i] = span
    for (let k = i + 1; k < j; k += 1) spans[k] = 0
    i = j
  }
  return spans
}

const kittingMergeEnabled = computed(() => kitView.value === KIT_VIEW_MODE.PLAN)

const kittingDocRowSpans = computed(() => {
  if (!kittingMergeEnabled.value) return kittingPagedRows.value.map(() => 1)
  return buildAdjacentDocRowSpans(kittingPagedRows.value)
})

const KITTING_MERGE_KEYS = new Set(['docNo', 'salesOrderNo', 'customerName'])

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

const filteredShortageLines = computed(() => {
  // 含已齐套行，便于打开占用明细看多单争用；缺料项 KPI 仍用 shortageLines
  const row = currentDrill.value?.row
  const lines = row?.allLines?.length ? row.allLines : row?.shortageLines || []
  const f = drillFilters.value
  return lines.filter((l) => {
    if (
      f.itemCode &&
      !String(l.itemCode || '')
        .toLowerCase()
        .includes(f.itemCode.trim().toLowerCase())
    )
      return false
    if (
      f.itemName &&
      !String(l.itemName || '')
        .toLowerCase()
        .includes(f.itemName.trim().toLowerCase())
    )
      return false
    if (
      f.specModel &&
      !String(l.specModel || l.specMaterialText || '')
        .toLowerCase()
        .includes(f.specModel.trim().toLowerCase())
    )
      return false
    if (
      f.material &&
      !String(l.material || l.specMaterialText || '')
        .toLowerCase()
        .includes(f.material.trim().toLowerCase())
    )
      return false
    return true
  })
})

const filteredVendorOrders = computed(() => {
  const orders = getOutsourcingOrdersForVendor(dashboard.value, currentDrill.value?.vendor)
  const kw = drillKeyword.value.trim().toLowerCase()
  if (!kw) return orders
  return orders.filter((o) =>
    [o.orderNo, o.processName, o.vendor].join(' ').toLowerCase().includes(kw),
  )
})

const kittingDocLabel = computed(() => {
  if (kitView.value === KIT_VIEW_MODE.PRODUCTION_WORK_ORDER) return '生产工单号'
  if (kitView.value === KIT_VIEW_MODE.ASSEMBLY_WORK_ORDER) return '总装工单号'
  return '计划单号'
})

const kittingColumns = computed(() => {
  const cols = [
    { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
    {
      title: kittingDocLabel.value,
      key: 'docNo',
      width: 160,
    },
    { title: '销售单号', key: 'salesOrderNo', width: 150 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 110, ellipsis: true },
    { title: '产品型号', key: 'product', width: 260 },
    { title: '数量', key: 'qty', width: 100, align: 'right' },
    { title: '计划日期', key: 'planAssemblyDate', width: 100 },
    { title: '齐套率', key: 'kitRate', width: 150 },
    { title: '缺件项', key: 'missingCount', width: 80, align: 'right' },
    { title: '紧急度', key: 'urgency', width: 88 },
    { title: '创建时间', key: 'createdAt', width: 120 },
    { title: '状态', key: 'status', width: 96 },
  ]
  if (isWorkOrderKitView(kitView.value)) {
    cols.push({ title: '操作', key: 'actions', width: 96, fixed: 'right' })
  }
  return cols
})

const kittingDisplayColumns = computed(() =>
  kittingColumns.value.map((col) => {
    if (!kittingMergeEnabled.value || !KITTING_MERGE_KEYS.has(col.key)) return col
    return {
      ...col,
      customCell: (_record, index) => ({
        rowSpan: kittingDocRowSpans.value[index] ?? 1,
        style: { verticalAlign: 'middle' },
      }),
    }
  }),
)

const partProcessColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '工单号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 130 },
  { title: '当前工序', dataIndex: 'currentProcess', key: 'currentProcess', width: 120 },
  { title: '工序进度', key: 'processRate', width: 160 },
  { title: '工单状态', dataIndex: 'status', key: 'status', width: 100 },
]

const vendorColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
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
  { title: '工序/名称', dataIndex: 'processName', key: 'processName', ellipsis: true },
  { title: '计划回厂', dataIndex: 'planEndDate', key: 'planEndDate', width: 110 },
  { title: '回货状态', dataIndex: 'returnStatus', key: 'returnStatus', width: 90 },
  { title: '逾期(天)', key: 'overdueDays', width: 80, align: 'right' },
]

const longLeadColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '风险', key: 'risk', width: 90 },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '供应型态', dataIndex: 'supplyType', key: 'supplyType', width: 90 },
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
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '工单号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 150 },
  { title: '理论需求', dataIndex: 'theoryText', key: 'theoryText', width: 110, align: 'right' },
  { title: '实发/实耗', dataIndex: 'actualText', key: 'actualText', width: 110, align: 'right' },
  { title: '利用率', key: 'utilRate', width: 180 },
]

const shortageColumns = [
  { title: '序号', key: 'index', width: 72, align: 'left' },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 110 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '规格 / 材质', dataIndex: 'specMaterialText', key: 'specMaterialText', width: 120 },
  { title: '需求', key: 'demandQty', width: 88, align: 'right' },
  { title: '实物库存', key: 'physicalQty', width: 88, align: 'right' },
  { title: '本单占用', key: 'allocatedQty', width: 88, align: 'right' },
  { title: '他单占用', key: 'othersAllocatedQty', width: 88, align: 'right' },
  { title: '在途/在制', dataIndex: 'inTransitQty', key: 'inTransitQty', width: 88, align: 'right' },
  { title: '预计到位', dataIndex: 'etaText', key: 'etaText', width: 80 },
  { title: '状态', key: 'status', width: 110 },
]

function levelNoStyle(levelNo) {
  const parts = String(levelNo || '')
    .split('.')
    .filter(Boolean)
  const depth = Math.max(0, parts.length - 1)
  return { paddingLeft: `${depth * 12}px`, fontVariantNumeric: 'tabular-nums' }
}

function formatQtyUnit(qty, unit) {
  const q = formatQty(qty)
  const u = String(unit || '').trim()
  if (q === '—' || q === '') return u ? `— ${u}` : '—'
  return u ? `${q} ${u}` : q
}

function refresh() {
  dashboard.value = buildKitSupplyDashboard({
    ...filters.value,
    kitView: kitView.value,
  })
  kittingPager.current = 1
}

function resetFilters() {
  filters.value = createEmptyFilters()
  refresh()
}

watch(kitView, () => refresh())
watch(activeTab, () => {
  drillStack.value = []
  drillKeyword.value = ''
  filters.value = createEmptyFilters()
  refresh()
})

function formatShortDate(v) {
  if (!v) return '—'
  const d = dayjs(v)
  return d.isValid() ? d.format('MM-DD') : String(v).slice(5, 10) || v
}

function formatCreatedAt(v) {
  if (!v) return '—'
  const d = dayjs(v)
  if (d.isValid()) return d.format(String(v).includes(':') ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')
  return String(v)
}

function urgencyTagColor(urgency) {
  return sharedUrgencyTagColor(urgency)
}

function urgencyDisplayLabel(urgency) {
  return sharedUrgencyLabel(urgency)
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
  drillFilters.value = createEmptyDrillFilters()
}

function onCrumbClick(idx) {
  if (idx >= breadcrumbItems.value.length - 1) return
  if (idx === 0) {
    drillStack.value = []
    drillKeyword.value = ''
    drillFilters.value = createEmptyDrillFilters()
    return
  }
  drillStack.value = drillStack.value.slice(0, idx)
  drillKeyword.value = ''
  drillFilters.value = createEmptyDrillFilters()
}

function openKitShortageDetail(record) {
  if (!record?.id) return
  if (isScreen.value) {
    pushDrill({ type: 'kit', row: record })
    return
  }
  const title = `缺件明细 ${record.docNo || ''}`.trim()
  openCreateTab(router, openTab, {
    path: `/production/kit-supply/shortage/${encodeURIComponent(record.id)}`,
    title,
    query: { kitView: kitView.value },
  })
}

function canRequisition(record) {
  return (
    isWorkOrderKitView(kitView.value) &&
    record?.workOrderId &&
    record?.docNo &&
    record.docNo !== '待派工' &&
    record.docNo !== '—'
  )
}

function goRequisition(record) {
  if (!canRequisition(record)) {
    message.warning('当前行无有效工单，无法发起领料')
    return
  }
  openCreateTab(router, openTab, {
    path: '/production/material-requisition/create',
    title: '申请领料',
    query: {
      workOrderId: record.workOrderId,
      workOrderCode: record.workOrderNo || record.docNo,
    },
  })
}

function kittingRowProps(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: () => openKitShortageDetail(record),
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

.view-tabs-bar {
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid var(--divider, #e5e6eb);
  border-bottom: none;
  border-radius: 6px;
  padding: 0 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.view-tabs-bar :deep(.view-tabs.ant-tabs) {
  margin: 0;
}

.view-tabs-bar :deep(.ant-tabs-nav) {
  margin: 0 !important;
}

.view-tabs-bar :deep(.ant-tabs-nav::before) {
  left: -16px !important;
  right: -16px !important;
  border-bottom: 1px solid var(--divider, #e5e6eb) !important;
}

.view-tabs-bar :deep(.ant-tabs-tab) {
  padding: 14px 0 !important;
}

.view-tabs-bar :deep(.ant-tabs-tab-btn) {
  font-size: 15px !important;
  font-weight: 600 !important;
  line-height: 22px !important;
}

.view-tabs-bar :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  font-weight: 700 !important;
}

.view-tabs-bar :deep(.ant-tabs-ink-bar) {
  height: 3px !important;
  bottom: 0 !important;
}

.view-tabs-bar :deep(.ant-tabs-content-holder) {
  display: none !important;
}

.filter-card {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--divider, #e5e6eb);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.horizontal-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.horizontal-form :deep(.filter-actions-item) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 32px;
}

.view-count {
  font-size: 13px;
  color: #8c8c8c;
  white-space: nowrap;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 0 0 14px;
}

.search {
  width: min(520px, 100%);
}

.crumb-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--divider, #e5e6eb);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  line-height: 24px;
}

.crumb {
  color: #1677ff;
  cursor: pointer;
  font-weight: 600;
}

.crumb.current {
  color: #262626;
  cursor: default;
}

.crumb-sep {
  margin: 0 2px;
  color: #bfbfbf;
}

.drill-filter-card {
  margin-bottom: 12px;
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

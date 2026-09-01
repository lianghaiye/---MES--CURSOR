<template>
  <div
    ref="rootEl"
    class="wo-monitor"
    :class="{ 'is-fullscreen': isFullscreen, 'is-standalone': isStandalone }"
  >
    <header class="monitor-header">
      <div class="header-left">
        <h1 class="title">工单监管看板</h1>
        <div class="carousel-setting" title="工单执行情况与工人接单按分页自动轮播">
          <a-switch v-model:checked="carouselEnabled" size="small" />
          <span class="carousel-label">轮播</span>
          <a-input-number
            v-model:value="carouselSeconds"
            :min="5"
            :max="300"
            :step="5"
            :disabled="!carouselEnabled"
            size="small"
            class="carousel-seconds"
          />
          <span class="carousel-label">秒/页</span>
          <span v-if="carouselEnabled" class="carousel-page">
            工单 {{ page }}/{{ totalPages }}
            <template v-if="workerTotalPages > 1">
              · 工人 {{ workerPage }}/{{ workerTotalPages }}</template
            >
          </span>
        </div>
        <span class="updated">更新于 {{ dashboard.updatedAt }}</span>
      </div>
      <div class="header-filters">
        <a-segmented v-model:value="period" :options="MONITOR_PERIOD_OPTIONS" size="large" />
        <a-select
          v-model:value="woType"
          :options="MONITOR_WO_TYPE_OPTIONS"
          style="width: 128px"
          size="large"
        />
        <a-select
          v-model:value="workCenter"
          :options="MONITOR_WORK_CENTER_OPTIONS"
          style="width: 150px"
          size="large"
        />
        <a-button type="primary" ghost size="large" @click="refresh">刷新</a-button>
        <a-button size="large" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏展示' }}
        </a-button>
      </div>
    </header>

    <section class="kpi-row">
      <div class="kpi-block">
        <div class="kpi-block-title">工单数量</div>
        <div class="kpi-metrics">
          <div class="kpi-item">
            <div class="kpi-label">待下发</div>
            <div class="kpi-value tone-warn">{{ dashboard.kpis.pending }}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">进行中</div>
            <div class="kpi-value tone-run">{{ dashboard.kpis.running }}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">已完成</div>
            <div class="kpi-value tone-ok">{{ dashboard.kpis.done }}</div>
          </div>
        </div>
        <div class="kpi-hint">待下发/进行中为当前快照；已完成按统计周期</div>
      </div>
      <div class="kpi-block">
        <div class="kpi-block-title">报工数量</div>
        <div class="kpi-metrics">
          <div class="kpi-item">
            <div class="kpi-label">笔数</div>
            <div class="kpi-value">{{ dashboard.kpis.reportCount }}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">良品数</div>
            <div class="kpi-value tone-ok">{{ formatMonitorQty(dashboard.kpis.goodQty) }}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">不良品数</div>
            <div class="kpi-value tone-bad">{{ formatMonitorQty(dashboard.kpis.badQty) }}</div>
          </div>
        </div>
        <div class="kpi-hint">按报工创建时间落入{{ periodLabel }}统计</div>
      </div>
      <div class="kpi-block">
        <div class="kpi-block-title">工序状态</div>
        <div class="kpi-metrics kpi-metrics-3">
          <div class="kpi-item">
            <div class="kpi-label">已报工</div>
            <div class="kpi-value tone-ok">{{ dashboard.kpis.processDone }}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">在制</div>
            <div class="kpi-value tone-run">{{ dashboard.kpis.processRunning }}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">待领取</div>
            <div class="kpi-value tone-idle">{{ dashboard.kpis.processClaim }}</div>
          </div>
        </div>
        <div class="kpi-hint">一次报工即完成；在制=已到工人端尚未报工</div>
      </div>
    </section>

    <div class="main-row">
      <section class="panel exec-panel">
        <div class="panel-head">
          <div class="panel-title">工单执行情况</div>
          <a-radio-group v-model:value="listStatus" button-style="solid" size="small">
            <a-radio-button
              v-for="opt in MONITOR_LIST_STATUS_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </a-radio-button>
          </a-radio-group>
        </div>

        <a-empty v-if="!dashboard.list.rows.length" description="暂无工单" class="panel-empty" />
        <div v-else ref="woListEl" class="wo-list">
          <article v-for="row in dashboard.list.rows" :key="row.id" class="wo-card">
            <div class="wo-card-head">
              <div class="wo-main">
                <a class="wo-no" @click="openWorkOrder(row)">{{ row.orderNo }}</a>
                <a-tag v-if="row.batchLabel" class="wo-tag batch-tag">{{ row.batchLabel }}</a-tag>
                <span v-if="row.productName" class="wo-field" :title="row.productName">{{
                  row.productName
                }}</span>
                <span v-if="row.productCode" class="wo-field muted" :title="row.productCode">{{
                  row.productCode
                }}</span>
                <span v-if="row.specModel" class="wo-field muted" :title="row.specModel">{{
                  row.specModel
                }}</span>
                <span v-if="row.material" class="wo-field muted" :title="row.material">{{
                  row.material
                }}</span>
                <a-tag class="wo-tag type-tag">{{ row.woTypeLabel }}</a-tag>
                <a-tag class="wo-tag status-tag" :class="`st-${row.status}`">{{
                  row.status
                }}</a-tag>
                <a-tag v-if="row.overdue" class="wo-tag overdue-tag">逾期</a-tag>
              </div>
              <div class="wo-meta">
                <span>工作中心 {{ row.workCenter }}</span>
                <span
                  >计划/排产 {{ formatMonitorQty(row.planQty) }}/{{
                    formatMonitorQty(row.scheduleQty)
                  }}</span
                >
                <span>计划日期 {{ row.planDateText }}</span>
              </div>
            </div>

            <div v-if="row.routeSteps.length" class="route-flow">
              <div
                v-for="(step, si) in row.routeSteps"
                :key="`${row.id}-${step.stepNo}`"
                class="route-step"
              >
                <div
                  class="step-nodes"
                  :class="{
                    parallel: step.parallel,
                    compact: step.compact,
                    dense: step.nodes.length >= 6,
                  }"
                >
                  <div v-if="step.parallel" class="parallel-badge">
                    并行 {{ step.nodes.length }}
                  </div>
                  <div
                    v-for="node in visibleStepNodes(row.id, step)"
                    :key="node.id"
                    class="proc-node"
                    :class="`tone-${node.tone}`"
                  >
                    <div class="proc-name" :title="node.name">{{ node.name }}</div>
                    <div class="proc-status">{{ node.status }}</div>
                    <div class="proc-qty">
                      计划 {{ formatMonitorQty(node.planQty) }} / 良
                      {{ formatMonitorQty(node.goodQty) }} / 不良
                      {{ formatMonitorQty(node.badQty) }}
                    </div>
                  </div>
                </div>
                <div v-if="si < row.routeSteps.length - 1" class="route-arrow">→</div>
              </div>
            </div>
            <div v-else class="route-empty">暂无工艺路线 / 任务数据</div>
          </article>
        </div>

        <div class="panel-footer">
          <span class="page-indicator">共 {{ dashboard.list.total }} 单 · 每页 {{ pageSize }}</span>
          <a-pagination
            v-model:current="page"
            :page-size="pageSize"
            :total="dashboard.list.total"
            size="small"
            :show-size-changer="false"
            simple
          />
        </div>
      </section>

      <aside class="panel worker-panel">
        <div class="panel-head">
          <div class="panel-title">工人接单情况</div>
          <div class="worker-head-stats">
            忙 {{ dashboard.workers.busy }} · 待命 {{ dashboard.workers.standby }} · 闲
            {{ dashboard.workers.idle }}
          </div>
        </div>
        <a-empty v-if="!workerContentCount" description="暂无工人数据" class="panel-empty" />
        <template v-else>
          <div ref="workerListEl" class="worker-list">
            <template v-for="item in pagedWorkerItems" :key="item.id">
              <div v-if="item.kind === 'group-title'" class="person-section-title">工人小组</div>
              <div v-else-if="item.kind === 'person-title'" class="person-section-title">
                单工人
              </div>
              <div
                v-else-if="item.kind === 'group'"
                class="group-card"
                :class="{ busy: item.data.groupBusy }"
              >
                <div class="group-head">
                  <div class="group-title">
                    <span class="group-name">{{ item.data.name }}</span>
                    <span v-if="item.chunkTotal > 1" class="group-chunk-badge">
                      {{ item.chunkIndex + 1 }}/{{ item.chunkTotal }}
                    </span>
                    <span
                      class="group-status"
                      :class="item.data.groupBusy ? 'is-busy' : 'is-idle'"
                      >{{ item.data.groupStatus }}</span
                    >
                  </div>
                  <div class="group-hint">
                    <template v-if="item.chunkIndex > 0">续 · </template>
                    {{ item.data.groupHint }}
                    <template v-if="item.memberTotal > GROUP_MEMBER_CHUNK">
                      · 共 {{ item.memberTotal }} 人
                    </template>
                  </div>
                </div>
                <div class="group-members">
                  <div
                    v-for="m in item.membersSlice"
                    :key="`${item.id}-${m.name}`"
                    class="worker-row nested"
                    :class="m.statusTone"
                  >
                    <div class="worker-avatar">{{ m.name.slice(0, 1) }}</div>
                    <div class="worker-info">
                      <div class="worker-name">
                        {{ m.name }}
                        <span v-if="m.isLeader" class="leader-badge">组长</span>
                      </div>
                      <div class="worker-sub">{{ m.sub }}</div>
                    </div>
                    <div class="worker-right">
                      <span class="worker-status" :class="`is-${m.statusTone}`">{{
                        m.status
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-else-if="item.kind === 'person'"
                class="worker-row"
                :class="{ busy: item.data.busy }"
              >
                <div class="worker-avatar">{{ item.data.name.slice(0, 1) }}</div>
                <div class="worker-info">
                  <div class="worker-name">{{ item.data.name }}</div>
                  <div class="worker-sub">{{ item.data.sub }}</div>
                </div>
                <div class="worker-right">
                  <span class="worker-status" :class="item.data.busy ? 'is-busy' : 'is-idle'">
                    {{ item.data.status }}
                  </span>
                  <span v-if="item.data.taskCount" class="worker-count"
                    >{{ item.data.taskCount }} 任务</span
                  >
                </div>
              </div>
            </template>
          </div>
          <div class="panel-footer worker-footer">
            <span class="page-indicator"
              >共 {{ workerContentCount }} 项 · {{ workerPage }}/{{ workerTotalPages }}</span
            >
            <a-pagination
              v-model:current="workerPage"
              :page-size="workerPageSize"
              :total="workerContentCount"
              size="small"
              :show-size-changer="false"
              simple
            />
          </div>
        </template>
      </aside>
    </div>
  </div>
</template>

<script>
export default { name: 'WorkOrderMonitorView' }
</script>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { processReportState } from '@/store/processReportStore'
import { employeeGroupState } from '@/store/employeeGroupStore'
import {
  MONITOR_LIST_STATUS,
  MONITOR_LIST_STATUS_OPTIONS,
  MONITOR_PERIOD,
  MONITOR_PERIOD_OPTIONS,
  MONITOR_WO_TYPE,
  MONITOR_WO_TYPE_OPTIONS,
  MONITOR_WORK_CENTER_OPTIONS,
  buildWorkOrderMonitorDashboard,
  formatMonitorQty,
} from '@/utils/workOrderMonitorDashboard'

const CAROUSEL_STORAGE_KEY = 'i_doms_wo_monitor_carousel'
const PARALLEL_VISIBLE = 4
/** 大组按块拆到多页：每块最多人数（轮播可看完全组，无人被折叠掉） */
const GROUP_MEMBER_CHUNK = 8

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const rootEl = ref(null)
const woListEl = ref(null)
const workerListEl = ref(null)

const isStandalone = computed(() => Boolean(route.meta.standalone))

const period = ref(MONITOR_PERIOD.TODAY)
const woType = ref(MONITOR_WO_TYPE.ALL)
const workCenter = ref('')
const listStatus = ref(MONITOR_LIST_STATUS.RUNNING)
const page = ref(1)
const pageSize = ref(3)
const workerPage = ref(1)
/** 每页展示的「内容项」数：1 小组分块卡或 1 单工人 = 1 项（不含分区标题） */
const workerPageSize = ref(3)
const tick = ref(0)

const carouselEnabled = ref(true)
const carouselSeconds = ref(15)
const isFullscreen = ref(false)
let carouselTimer = null
let resizeObserver = null

function loadCarouselSettings() {
  try {
    const raw = localStorage.getItem(CAROUSEL_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (typeof parsed.enabled === 'boolean') carouselEnabled.value = parsed.enabled
    const sec = Number(parsed.seconds)
    if (Number.isFinite(sec) && sec >= 5) carouselSeconds.value = Math.min(300, Math.round(sec))
  } catch {
    /* ignore */
  }
}

function persistCarouselSettings() {
  localStorage.setItem(
    CAROUSEL_STORAGE_KEY,
    JSON.stringify({
      enabled: carouselEnabled.value,
      seconds: carouselSeconds.value,
    }),
  )
}

const periodLabel = computed(() => {
  const hit = MONITOR_PERIOD_OPTIONS.find((o) => o.value === period.value)
  return hit?.label || '本日'
})

const dashboard = computed(() => {
  void tick.value
  void workOrderState.orders
  void assemblyWorkOrderState.orders
  void processReportState.records
  void employeeGroupState.groups
  return buildWorkOrderMonitorDashboard({
    period: period.value,
    woType: woType.value,
    workCenter: workCenter.value,
    listStatus: listStatus.value,
    page: page.value,
    pageSize: pageSize.value,
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil((dashboard.value.list.total || 0) / pageSize.value)),
)

/**
 * 工人区展平为可分页内容项。
 * 大组按 GROUP_MEMBER_CHUNK 拆成多张续页卡，轮播可看完全员。
 * 分区标题不计入 pageSize，随当页首个同类型内容自动带出。
 */
const workerContentItems = computed(() => {
  const items = []
  ;(dashboard.value.workers.groups || []).forEach((g) => {
    const members = g.members || []
    const memberTotal = members.length
    if (!memberTotal) {
      items.push({
        kind: 'group',
        id: `group-${g.id}`,
        data: g,
        membersSlice: [],
        chunkIndex: 0,
        chunkTotal: 1,
        memberTotal: 0,
      })
      return
    }
    const chunkTotal = Math.ceil(memberTotal / GROUP_MEMBER_CHUNK)
    for (let i = 0; i < chunkTotal; i += 1) {
      const start = i * GROUP_MEMBER_CHUNK
      items.push({
        kind: 'group',
        id: `group-${g.id}-c${i}`,
        data: g,
        membersSlice: members.slice(start, start + GROUP_MEMBER_CHUNK),
        chunkIndex: i,
        chunkTotal,
        memberTotal,
      })
    }
  })
  ;(dashboard.value.workers.individuals || []).forEach((w) => {
    items.push({ kind: 'person', id: w.id, data: w })
  })
  return items
})

const workerContentCount = computed(() => workerContentItems.value.length)

const workerTotalPages = computed(() =>
  Math.max(1, Math.ceil(workerContentCount.value / Math.max(1, workerPageSize.value))),
)

const pagedWorkerItems = computed(() => {
  const size = Math.max(1, workerPageSize.value)
  const idx = Math.min(Math.max(1, workerPage.value), workerTotalPages.value) - 1
  const slice = workerContentItems.value.slice(idx * size, idx * size + size)
  if (!slice.length) return []

  const out = []
  let shownGroupTitle = false
  let shownPersonTitle = false
  slice.forEach((item) => {
    if (item.kind === 'group' && !shownGroupTitle) {
      out.push({ kind: 'group-title', id: `title-group-${idx}`, data: null })
      shownGroupTitle = true
    }
    if (item.kind === 'person' && !shownPersonTitle) {
      out.push({ kind: 'person-title', id: `title-person-${idx}`, data: null })
      shownPersonTitle = true
    }
    out.push(item)
  })
  return out
})

watch([period, woType, workCenter, listStatus], () => {
  page.value = 1
  workerPage.value = 1
})

watch(pageSize, (n, prev) => {
  if (n !== prev) page.value = 1
})

watch(workerPageSize, (n, prev) => {
  if (n !== prev) workerPage.value = 1
})

watch([carouselEnabled, carouselSeconds], () => {
  persistCarouselSettings()
  restartCarousel()
})

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = 1
})

watch(workerTotalPages, (pages) => {
  if (workerPage.value > pages) workerPage.value = 1
})

function refresh() {
  tick.value += 1
  nextTick(() => measurePageSizes())
}

function clearCarousel() {
  if (carouselTimer) {
    clearInterval(carouselTimer)
    carouselTimer = null
  }
}

function advanceCarouselPages() {
  if (totalPages.value > 1) {
    page.value = page.value >= totalPages.value ? 1 : page.value + 1
  }
  if (workerTotalPages.value > 1) {
    workerPage.value = workerPage.value >= workerTotalPages.value ? 1 : workerPage.value + 1
  }
}

function restartCarousel() {
  clearCarousel()
  if (!carouselEnabled.value) return
  const sec = Math.max(5, Number(carouselSeconds.value) || 15)
  carouselSeconds.value = sec
  carouselTimer = setInterval(() => {
    advanceCarouselPages()
  }, sec * 1000)
}

function measurePageSizes() {
  const woEl = woListEl.value
  if (woEl?.clientHeight) {
    const est = isStandalone.value || isFullscreen.value ? 148 : 168
    const n = Math.max(1, Math.min(6, Math.floor(woEl.clientHeight / est)))
    if (n !== pageSize.value) pageSize.value = n
  }
  const wkEl = workerListEl.value
  if (wkEl?.clientHeight) {
    // 分块小组卡（最多 8 人）偏高，每页条数保守
    const est = 160
    const n = Math.max(1, Math.min(3, Math.floor(wkEl.clientHeight / est)))
    if (n !== workerPageSize.value) workerPageSize.value = n
  }
}

function bindResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => measurePageSizes())
  if (rootEl.value) resizeObserver.observe(rootEl.value)
  if (woListEl.value) resizeObserver.observe(woListEl.value)
  if (workerListEl.value) resizeObserver.observe(workerListEl.value)
}

async function toggleFullscreen() {
  const el = rootEl.value
  if (!el) return
  try {
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.()
    } else {
      await document.exitFullscreen?.()
    }
  } catch {
    isFullscreen.value = !isFullscreen.value
  }
}

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === rootEl.value
  nextTick(() => measurePageSizes())
}

function visibleStepNodes(_woId, step) {
  if (step.nodes.length <= PARALLEL_VISIBLE) return step.nodes
  return step.nodes.slice(0, PARALLEL_VISIBLE)
}

function openWorkOrder(row) {
  const path = `${row.listPath}?keyword=${encodeURIComponent(row.orderNo)}`
  if (isStandalone.value) {
    window.open(router.resolve(path).href, '_blank')
    return
  }
  openTab(path, row.orderNo)
  router.push(path)
}

onMounted(() => {
  loadCarouselSettings()
  restartCarousel()
  document.addEventListener('fullscreenchange', onFullscreenChange)
  nextTick(() => {
    measurePageSizes()
    bindResizeObserver()
  })
})

onUnmounted(() => {
  clearCarousel()
  resizeObserver?.disconnect()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (document.fullscreenElement === rootEl.value) {
    document.exitFullscreen?.().catch(() => {})
  }
})

watch(
  () => [dashboard.value.list.rows.length, workerContentCount.value, isFullscreen.value],
  () =>
    nextTick(() => {
      measurePageSizes()
      bindResizeObserver()
    }),
)
</script>

<style lang="less" scoped>
.wo-monitor {
  --bg: #071525;
  --panel: #0d2137;
  --panel-2: #102a44;
  --border: rgba(64, 158, 255, 0.22);
  --text: #e8f3ff;
  --muted: rgba(232, 243, 255, 0.55);
  --accent: #3aa0ff;
  --ok: #3dd68c;
  --warn: #f5a623;
  --bad: #ff6b6b;
  --run: #4db3ff;
  /* 适配内容区高度；字体随视口缩放，常见车间电视 1080p/4K 可读 */
  height: calc(100vh - 132px);
  min-height: 560px;
  max-height: 100%;
  padding: clamp(12px, 1vw, 20px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: radial-gradient(ellipse at top, rgba(32, 96, 180, 0.35), transparent 55%), var(--bg);
  color: var(--text);
  border-radius: 8px;
}

.wo-monitor.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 3000;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  max-height: none;
  border-radius: 0;
  padding: clamp(16px, 1.5vw, 28px);
}

.wo-monitor.is-standalone {
  height: 100vh;
  min-height: 100vh;
  max-height: none;
  border-radius: 0;
  margin: 0;
}

.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: clamp(10px, 1vw, 16px);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 14px;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: clamp(18px, 1.5vw, 28px);
  font-weight: 700;
  letter-spacing: 1px;
}

.carousel-setting {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
}

.carousel-label {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.carousel-seconds {
  width: 72px;
}

.carousel-setting :deep(.ant-input-number) {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--border);
  color: var(--text);
}
.carousel-setting :deep(.ant-input-number-input) {
  color: var(--text);
}
.carousel-setting :deep(.ant-input-number-handler-wrap) {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--border);
}

.carousel-page {
  font-size: 12px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.updated {
  font-size: clamp(11px, 0.9vw, 13px);
  color: var(--muted);
}

.header-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.kpi-row {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.9fr;
  gap: clamp(8px, 0.8vw, 12px);
  margin-bottom: clamp(10px, 1vw, 16px);
  flex-shrink: 0;
}

.kpi-block {
  background: linear-gradient(180deg, rgba(22, 70, 120, 0.45), rgba(10, 28, 48, 0.9));
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: clamp(10px, 1vw, 16px);
}

.kpi-block-title {
  font-size: clamp(13px, 1vw, 15px);
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--accent);
}

.kpi-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.kpi-metrics-3 {
  grid-template-columns: repeat(3, 1fr);
}

.kpi-metrics-4 {
  grid-template-columns: repeat(4, 1fr);
}

.kpi-label {
  font-size: clamp(11px, 0.9vw, 13px);
  color: var(--muted);
}

.kpi-value {
  margin-top: 4px;
  font-size: clamp(22px, 2.2vw, 40px);
  font-weight: 700;
  line-height: 1.1;
}

.kpi-value.tone-ok {
  color: var(--ok);
}
.kpi-value.tone-bad {
  color: var(--bad);
}
.kpi-value.tone-run {
  color: var(--run);
}
.kpi-value.tone-warn {
  color: var(--warn);
}
.kpi-value.tone-idle {
  color: #9ad0ff;
}

.kpi-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

.main-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 22vw);
  gap: clamp(8px, 0.8vw, 12px);
  flex: 1;
  min-height: 0;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
}

.panel-empty {
  padding: 48px 0;
  :deep(.ant-empty-description) {
    color: var(--muted);
  }
}

.wo-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wo-card {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  background: var(--panel-2);
  border: 1px solid rgba(64, 158, 255, 0.16);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}

.wo-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.wo-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.wo-no {
  color: #7ec3ff;
  font-weight: 600;
  cursor: pointer;
}

.wo-field {
  color: var(--text);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.wo-field.muted {
  color: var(--muted);
}

.batch-tag {
  margin: 0;
  color: #c9b8ff !important;
  background: rgba(140, 110, 255, 0.22) !important;
  border-color: rgba(180, 150, 255, 0.5) !important;
}

.overdue-tag {
  margin: 0;
  color: #ffd0d0 !important;
  background: rgba(255, 77, 79, 0.28) !important;
  border-color: rgba(255, 120, 117, 0.6) !important;
}

.type-tag {
  margin: 0;
  color: #d6ebff !important;
  background: rgba(58, 160, 255, 0.28) !important;
  border-color: rgba(126, 195, 255, 0.55) !important;
}

.status-tag {
  margin: 0;
  border: 1px solid transparent;
}

.status-tag.st-执行中 {
  color: #9ad0ff !important;
  background: rgba(77, 179, 255, 0.22) !important;
  border-color: rgba(77, 179, 255, 0.5) !important;
}

.status-tag.st-已下发 {
  color: #cfe7ff !important;
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
}

.status-tag.st-已完成 {
  color: #b8f0d2 !important;
  background: rgba(61, 214, 140, 0.2) !important;
  border-color: rgba(61, 214, 140, 0.45) !important;
}

.status-tag.st-待下发 {
  color: #ffe2a8 !important;
  background: rgba(245, 166, 35, 0.18) !important;
  border-color: rgba(245, 166, 35, 0.4) !important;
}

.status-tag.st-暂停 {
  color: #ffc9c9 !important;
  background: rgba(255, 107, 107, 0.18) !important;
  border-color: rgba(255, 107, 107, 0.45) !important;
}

.wo-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--muted);
}

.route-flow {
  display: flex;
  align-items: stretch;
  gap: 6px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.route-step {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.step-nodes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.step-nodes.parallel {
  padding: 8px 8px 6px;
  border: 1px dashed rgba(64, 158, 255, 0.35);
  border-radius: 6px;
  max-width: 360px;
}

.step-nodes.compact.parallel {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.step-nodes.dense.parallel {
  grid-template-columns: repeat(2, minmax(110px, 1fr));
}

.parallel-badge {
  grid-column: 1 / -1;
  font-size: 11px;
  color: #9ad0ff;
  margin-bottom: 2px;
}

.expand-btn {
  grid-column: 1 / -1;
  margin-top: 2px;
  border: 1px dashed rgba(126, 195, 255, 0.45);
  background: rgba(58, 160, 255, 0.12);
  color: #9ad0ff;
  border-radius: 4px;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
}

.expand-btn:hover {
  background: rgba(58, 160, 255, 0.22);
}

.proc-node {
  min-width: 132px;
  max-width: 180px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
}

.proc-node.tone-done {
  border-color: rgba(61, 214, 140, 0.7);
  background: rgba(61, 214, 140, 0.18);
  box-shadow: 0 0 0 1px rgba(61, 214, 140, 0.25) inset;
}

.proc-node.tone-running {
  border-color: rgba(77, 179, 255, 0.75);
  background: rgba(77, 179, 255, 0.16);
}

.proc-node.tone-queue {
  border-color: rgba(245, 166, 35, 0.55);
  background: rgba(245, 166, 35, 0.12);
}

.proc-node.tone-claim {
  border-color: rgba(180, 180, 180, 0.45);
  background: rgba(255, 255, 255, 0.04);
}

.proc-node.tone-paused {
  border-color: rgba(255, 107, 107, 0.65);
  background: rgba(255, 107, 107, 0.12);
}

.proc-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proc-status {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
}

.proc-node.tone-done .proc-status {
  color: var(--ok);
  font-weight: 600;
}

.proc-qty {
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
}

.route-arrow {
  color: rgba(126, 195, 255, 0.7);
  font-size: 16px;
  padding: 0 2px;
}

.route-empty {
  font-size: 12px;
  color: var(--muted);
}

.panel-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

.page-indicator {
  font-size: 12px;
  color: var(--muted);
}

.worker-footer {
  flex-shrink: 0;
}

.group-chunk-badge {
  margin-left: 6px;
  font-size: 11px;
  color: #9ad0ff;
  background: rgba(58, 160, 255, 0.18);
  border: 1px solid rgba(58, 160, 255, 0.35);
  border-radius: 3px;
  padding: 0 5px;
  font-variant-numeric: tabular-nums;
}

.group-more {
  margin-top: 4px;
  padding-left: 42px;
  font-size: 11px;
  color: var(--muted);
}

.worker-panel {
  min-height: 0;
  max-height: none;
}

.worker-head-stats {
  font-size: 12px;
  color: var(--muted);
}

.worker-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-card {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(64, 158, 255, 0.12);
}

.group-card.busy {
  background: rgba(77, 179, 255, 0.08);
  border-color: rgba(77, 179, 255, 0.28);
}

.group-head {
  margin-bottom: 8px;
}

.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.group-name {
  font-weight: 700;
  font-size: 13px;
}

.group-status.is-busy {
  color: var(--run);
  font-size: 12px;
  font-weight: 600;
}

.group-status.is-idle {
  color: var(--ok);
  font-size: 12px;
  font-weight: 600;
}

.group-hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
}

.group-members {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.worker-row.nested {
  margin-bottom: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.18);
}

.worker-row.standby {
  opacity: 0.92;
}

.leader-badge {
  margin-left: 6px;
  font-size: 11px;
  color: #ffe2a8;
  background: rgba(245, 166, 35, 0.2);
  border: 1px solid rgba(245, 166, 35, 0.35);
  border-radius: 3px;
  padding: 0 4px;
}

.person-section-title {
  margin: 10px 4px 6px;
  font-size: 12px;
  color: var(--muted);
}

.person-empty {
  margin: 8px 0 12px;
  opacity: 0.85;
}

.person-empty :deep(.ant-empty-description) {
  color: var(--muted);
}

.worker-status.is-standby {
  color: var(--warn);
}

.worker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.worker-row.busy {
  background: rgba(77, 179, 255, 0.08);
}

.worker-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(58, 160, 255, 0.25);
  color: #9ad0ff;
  font-weight: 600;
  flex-shrink: 0;
}

.worker-info {
  flex: 1;
  min-width: 0;
}

.worker-name {
  font-size: 13px;
  font-weight: 600;
}

.worker-sub {
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worker-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.worker-status {
  font-size: 12px;
  font-weight: 600;
}

.worker-status.is-busy {
  color: var(--run);
}

.worker-status.is-idle {
  color: var(--ok);
}

.worker-count {
  font-size: 11px;
  color: var(--muted);
}

:deep(.ant-segmented) {
  background: rgba(255, 255, 255, 0.08);
}
:deep(.ant-segmented-item) {
  color: rgba(232, 243, 255, 0.78) !important;
}
:deep(.ant-segmented-item-label) {
  color: inherit !important;
}
/* 选中滑块默认近白底，必须用深色字，否则「本日」消失 */
:deep(.ant-segmented-item-selected),
:deep(.ant-segmented-item-selected .ant-segmented-item-label) {
  color: #071525 !important;
}
:deep(.ant-segmented-thumb) {
  background: #e8f3ff !important;
}
:deep(.ant-select-selector),
:deep(.ant-pagination-item),
:deep(.ant-pagination-prev .ant-pagination-item-link),
:deep(.ant-pagination-next .ant-pagination-item-link) {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}
:deep(.ant-select-selection-item),
:deep(.ant-pagination),
:deep(.ant-pagination-total-text) {
  color: var(--text) !important;
}
:deep(.ant-radio-button-wrapper) {
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  border-color: var(--border);
}
:deep(.ant-radio-button-wrapper-checked) {
  background: rgba(58, 160, 255, 0.25) !important;
  color: #fff !important;
  border-color: var(--accent) !important;
}

@media (max-width: 1200px) {
  .wo-monitor {
    height: auto;
    min-height: calc(100vh - 132px);
    overflow: auto;
  }
  .kpi-row,
  .main-row {
    grid-template-columns: 1fr;
  }
  .main-row {
    flex: none;
    min-height: 480px;
  }
  .worker-panel {
    max-height: 360px;
  }
}

@media (min-width: 1920px) {
  .wo-monitor:not(.is-fullscreen) {
    height: calc(100vh - 140px);
  }
}
</style>

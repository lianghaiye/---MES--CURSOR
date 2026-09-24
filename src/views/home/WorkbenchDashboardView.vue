<template>
  <div class="workbench-dashboard page-shell">
    <a-row :gutter="[12, 12]">
      <a-col :xs="24" :xl="18">
        <div class="main-stack">
          <!-- 工序任务 -->
          <section class="panel-card process-panel">
            <div class="panel-header">
              <div class="panel-header-left">
                <span class="panel-title">工序任务</span>
                <a-button
                  type="link"
                  size="small"
                  class="header-action settings-btn"
                  @click="processModalOpen = true"
                >
                  <SettingOutlined />
                  设置
                </a-button>
                <a-checkbox v-model:checked="includeNotStarted" class="soft-check">
                  包含未开始生产任务
                </a-checkbox>
              </div>
              <div class="panel-header-right">
                <a-tooltip title="刷新">
                  <a-button
                    type="text"
                    class="refresh-btn"
                    :loading="refreshing"
                    @click="onRefresh"
                  >
                    <ReloadOutlined />
                  </a-button>
                </a-tooltip>
                <a-radio-group
                  v-model:value="period"
                  size="small"
                  button-style="solid"
                  class="period-group"
                >
                  <a-radio-button
                    v-for="opt in WORKBENCH_PERIOD_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </a-radio-button>
                </a-radio-group>
              </div>
            </div>

            <div class="process-grid">
              <div
                v-for="card in visibleProcessCards"
                :key="card.id"
                class="process-card"
                :class="`tone-${card.tone}`"
                @click="goProcessReport"
              >
                <span class="process-ribbon">{{ card.name }}</span>
                <div class="process-body">
                  <div class="process-left">
                    <div class="process-num">{{ formatNum(card.taskCount) }}</div>
                    <div class="process-unit">生产任务数</div>
                  </div>
                  <div class="process-right">
                    <div class="stat-line">
                      <span>计划数</span>
                      <b>{{ formatNum(card.planQty) }}</b>
                    </div>
                    <div class="stat-line">
                      <span class="good">良品数</span>
                      <b class="good">{{ formatNum(card.goodQty) }}</b>
                    </div>
                    <div class="stat-line">
                      <span class="warn">不良品数</span>
                      <b class="warn">{{ formatNum(card.badQty) }}</b>
                    </div>
                  </div>
                </div>
                <div class="process-foot">
                  <span class="progress-label">进度</span>
                  <div class="progress-track">
                    <a-progress
                      :percent="card.progress"
                      :show-info="false"
                      :stroke-width="6"
                      :stroke-color="toneColor(card.tone)"
                      trail-color="rgba(0,0,0,0.06)"
                    />
                  </div>
                  <span class="progress-pct">{{ card.progress }}%</span>
                </div>
              </div>
            </div>
            <button
              v-if="canExpandProcess"
              type="button"
              class="expand-bar"
              @click="processExpanded = !processExpanded"
            >
              <span>{{ processExpanded ? '收起' : `展开更多工序（${hiddenProcessCount}）` }}</span>
              <DownOutlined v-if="!processExpanded" />
              <UpOutlined v-else />
            </button>
          </section>

          <!-- 我的收藏 -->
          <section class="panel-card favorite-panel">
            <div class="panel-header">
              <span class="panel-title">我的收藏</span>
              <a-button
                type="link"
                size="small"
                class="header-action"
                @click="favoriteModalOpen = true"
              >
                <PlusOutlined />
                添加收藏
              </a-button>
            </div>
            <div v-if="favorites.length" class="favorite-grid">
              <div
                v-for="(fav, idx) in favorites"
                :key="fav.id"
                class="favorite-card"
                :class="`fav-tone-${idx % 5}`"
                @click="goPath(fav.path, fav.title)"
              >
                <div class="favorite-icon">
                  <component :is="resolveFavIcon(fav.icon)" />
                </div>
                <div class="favorite-body">
                  <div class="favorite-title">{{ fav.title }}</div>
                  <div class="favorite-module">{{ favSubtitle(fav) }}</div>
                </div>
                <button
                  type="button"
                  class="favorite-remove"
                  title="取消收藏"
                  @click.stop="onRemoveFavorite(fav)"
                >
                  <CloseOutlined />
                </button>
              </div>
              <button type="button" class="favorite-add-tile" @click="favoriteModalOpen = true">
                <PlusOutlined />
                <span>添加</span>
              </button>
            </div>
            <div v-else class="favorite-empty">
              <a-empty description="暂无收藏" :image="Empty.PRESENTED_IMAGE_SIMPLE">
                <a-button type="primary" size="small" @click="favoriteModalOpen = true">
                  添加收藏
                </a-button>
              </a-empty>
            </div>
          </section>

          <!-- 工单进度报表 -->
          <section class="panel-card wo-panel">
            <div class="panel-header">
              <span class="panel-title">工单进度报表</span>
              <span class="panel-hint">共 {{ woRows.length }} 条</span>
            </div>
            <div class="wo-tabs">
              <a-radio-group
                v-model:value="woTab"
                size="small"
                button-style="solid"
                class="wo-tab-group"
              >
                <a-radio-button
                  v-for="tab in WORK_ORDER_PROGRESS_TABS"
                  :key="tab.key"
                  :value="tab.key"
                >
                  {{ tab.label }}
                  <em class="tab-count">{{ tabCounts[tab.key] || 0 }}</em>
                </a-radio-button>
              </a-radio-group>
            </div>
            <div class="wo-table-wrap">
              <a-table
                :columns="woColumns"
                :data-source="woRows"
                row-key="id"
                size="middle"
                :pagination="
                  woRows.length > 12
                    ? { pageSize: 12, size: 'small', showTotal: (t) => `共 ${t} 条` }
                    : false
                "
                :scroll="{ x: 1280, y: 420 }"
              >
                <template #bodyCell="{ column, record, index }">
                  <template v-if="column.key === 'index'">
                    <span class="row-index">{{ index + 1 }}</span>
                  </template>
                  <template v-else-if="column.key === 'workOrderNo'">
                    <a class="link-code" @click.prevent="goWorkOrder(record)">{{
                      record.workOrderNo
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-badge :status="statusBadge(record.status)" :text="record.status" />
                  </template>
                  <template v-else-if="column.key === 'planQty'">
                    {{ formatNum(record.planQty) }}
                  </template>
                  <template v-else-if="column.key === 'scheduleQty'">
                    {{ formatNum(record.scheduleQty) }}
                  </template>
                  <template v-else-if="column.key === 'goodQty'">
                    <span class="qty-good">{{ formatNum(record.goodQty) }}</span>
                  </template>
                  <template v-else-if="column.key === 'badQty'">
                    <span class="qty-bad">{{ formatNum(record.badQty) }}</span>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a class="action-link" @click.prevent="goWorkOrder(record)">查看详情</a>
                  </template>
                </template>
              </a-table>
            </div>
          </section>
        </div>
      </a-col>

      <a-col :xs="24" :xl="6">
        <div class="side-stack">
          <section class="panel-card side-panel">
            <div class="panel-header">
              <span class="panel-title">场景解决方案</span>
              <a class="more-link" @click.prevent="goAdmin('scenarios')">更多</a>
            </div>
            <ul v-if="scenarios.length" class="side-list">
              <li v-for="item in scenarios" :key="item.id" @click="goPath(item.link, item.title)">
                <span class="side-marker scenario" />
                <div class="side-text">
                  <div class="side-item-title">{{ item.title }}</div>
                  <div class="side-item-sub">{{ item.summary }}</div>
                </div>
                <RightOutlined class="side-arrow" />
              </li>
            </ul>
            <a-empty v-else :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无内容" />
          </section>

          <section class="panel-card side-panel">
            <div class="panel-header">
              <span class="panel-title">月度功能发布</span>
              <a class="more-link" @click.prevent="goAdmin('releases')">更多</a>
            </div>
            <ul v-if="releases.length" class="side-list release-list">
              <li v-for="item in releases" :key="item.id" @click="openRelease(item)">
                <span class="ver-pill">{{ item.versionTag }}</span>
                <div class="side-text">
                  <div class="side-item-title">{{ item.title }}</div>
                </div>
                <span class="release-date">{{ formatMd(item.publishDate) }}</span>
              </li>
            </ul>
            <a-empty v-else :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无内容" />
          </section>

          <section class="panel-card side-panel feedback-panel">
            <div class="panel-header">
              <span class="panel-title">意见反馈</span>
            </div>
            <div class="feedback-box">
              <a-textarea
                v-model:value="feedbackText"
                :rows="3"
                placeholder="欢迎提出你的宝贵意见，我们会认真对待每一条反馈"
                :maxlength="500"
                :bordered="false"
              />
              <div class="feedback-footer">
                <span class="feedback-count">{{ feedbackText.length }}/500</span>
                <a-button
                  type="primary"
                  size="small"
                  :loading="feedbackSubmitting"
                  @click="onSubmitFeedback"
                >
                  提交
                </a-button>
              </div>
            </div>
          </section>

          <section class="panel-card side-panel">
            <div class="panel-header">
              <span class="panel-title">新手入门</span>
              <a class="more-link" @click.prevent="goAdmin('guides')">更多</a>
            </div>
            <ul v-if="guides.length" class="side-list guide-list">
              <li
                v-for="(item, idx) in guides"
                :key="item.id"
                @click="goPath(item.link, item.title)"
              >
                <span class="guide-icon" :class="`g-${idx % 4}`">
                  <BookOutlined v-if="idx % 4 === 0" />
                  <ReadOutlined v-else-if="idx % 4 === 1" />
                  <FileTextOutlined v-else-if="idx % 4 === 2" />
                  <BulbOutlined v-else />
                </span>
                <div class="side-text">
                  <div class="side-item-title">{{ item.title }}</div>
                  <div class="side-item-sub">{{ item.summary }}</div>
                </div>
                <RightOutlined class="side-arrow" />
              </li>
            </ul>
            <a-empty v-else :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无内容" />
          </section>
        </div>
      </a-col>
    </a-row>

    <WorkbenchFavoriteModal v-model:open="favoriteModalOpen" />
    <WorkbenchProcessConfigModal v-model:open="processModalOpen" />

    <a-modal
      v-model:open="releaseModalOpen"
      :title="activeRelease?.title || '功能发布'"
      :footer="null"
      width="520px"
    >
      <p class="release-meta">
        <span class="ver-pill">{{ activeRelease?.versionTag }}</span>
        <span>{{ activeRelease?.publishDate }}</span>
      </p>
      <p class="release-content">{{ activeRelease?.content }}</p>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Empty, message, Modal } from 'ant-design-vue'
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  CalendarOutlined,
  CloseOutlined,
  DownOutlined,
  FileOutlined,
  FileTextOutlined,
  FormOutlined,
  InboxOutlined,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UnorderedListOutlined,
  UpOutlined,
} from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { getUser } from '@/utils/auth'
import {
  WORKBENCH_PERIOD_OPTIONS,
  WORK_ORDER_PROGRESS_TABS,
  buildProcessTaskCards,
} from '@/mock/workbench'
import {
  listEnabledGuides,
  listEnabledReleases,
  listEnabledScenarios,
  listFavorites,
  listVisibleProcessIds,
  listWorkOrderProgressRows,
  refreshWorkbenchData,
  removeFavorite,
  submitFeedback,
  workbenchState,
} from '@/store/workbenchStore'
import WorkbenchFavoriteModal from '@/views/home/components/WorkbenchFavoriteModal.vue'
import WorkbenchProcessConfigModal from '@/views/home/components/WorkbenchProcessConfigModal.vue'

const router = useRouter()
const { openTab } = useTabs()

const period = ref('today')
const includeNotStarted = ref(true)
const processExpanded = ref(false)
const PROCESS_ROW_SIZE = 5
const woTab = ref('notStarted')
const favoriteModalOpen = ref(false)
const processModalOpen = ref(false)
const feedbackText = ref('')
const feedbackSubmitting = ref(false)
const releaseModalOpen = ref(false)
const activeRelease = ref(null)
const refreshing = ref(false)
const refreshTick = ref(0)

const processCards = computed(() => {
  void workbenchState.visibleProcessIds
  void refreshTick.value
  return buildProcessTaskCards(period.value, {
    includeNotStarted: includeNotStarted.value,
    visibleIds: listVisibleProcessIds(),
  })
})

const visibleProcessCards = computed(() => {
  if (processExpanded.value) return processCards.value
  return processCards.value.slice(0, PROCESS_ROW_SIZE)
})

const canExpandProcess = computed(() => processCards.value.length > PROCESS_ROW_SIZE)

const hiddenProcessCount = computed(() => Math.max(0, processCards.value.length - PROCESS_ROW_SIZE))

const favorites = computed(() => {
  void workbenchState.favorites
  return listFavorites()
})

const scenarios = computed(() => {
  void workbenchState.scenarios
  return listEnabledScenarios()
})

const releases = computed(() => {
  void workbenchState.releases
  return listEnabledReleases()
})

const guides = computed(() => {
  void workbenchState.guides
  return listEnabledGuides()
})

const woRows = computed(() => {
  void workbenchState.workOrderRows
  void refreshTick.value
  return listWorkOrderProgressRows(woTab.value)
})

const tabCounts = computed(() => {
  void workbenchState.workOrderRows
  void refreshTick.value
  const map = {}
  WORK_ORDER_PROGRESS_TABS.forEach((tab) => {
    map[tab.key] = listWorkOrderProgressRows(tab.key).length
  })
  return map
})

const woColumns = [
  { title: '#', key: 'index', width: 52 },
  { title: '工单编号', key: 'workOrderNo', dataIndex: 'workOrderNo', width: 150 },
  { title: '产品编号', dataIndex: 'productCode', width: 110 },
  { title: '产品名称', dataIndex: 'productName', ellipsis: true },
  { title: '产品规格', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 60 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 90 },
  { title: '计划开始', dataIndex: 'planStart', width: 140 },
  { title: '计划结束', dataIndex: 'planEnd', width: 140 },
  { title: '计划数', key: 'planQty', dataIndex: 'planQty', width: 80, align: 'right' },
  { title: '排产数', key: 'scheduleQty', dataIndex: 'scheduleQty', width: 80, align: 'right' },
  { title: '良品数', key: 'goodQty', dataIndex: 'goodQty', width: 80, align: 'right' },
  { title: '不良品数', key: 'badQty', dataIndex: 'badQty', width: 90, align: 'right' },
  { title: '操作', key: 'actions', fixed: 'right', width: 100 },
]

const favIconMap = {
  file: FileOutlined,
  'unordered-list': UnorderedListOutlined,
  form: FormOutlined,
  calendar: CalendarOutlined,
  shopping: ShoppingOutlined,
  apartment: ApartmentOutlined,
  inbox: InboxOutlined,
  safety: SafetyCertificateOutlined,
  shop: ShopOutlined,
}

function resolveFavIcon(icon) {
  return favIconMap[icon] || FileOutlined
}

function favSubtitle(fav) {
  if (fav.parentLabel) return `${fav.module} · ${fav.parentLabel}`
  return fav.module || ''
}

function toneColor(tone) {
  const map = {
    blue: '#1677ff',
    cyan: '#13c2c2',
    orange: '#fa8c16',
    purple: '#722ed1',
    green: '#52c41a',
    magenta: '#eb2f96',
  }
  return map[tone] || '#1677ff'
}

function formatNum(n) {
  const num = Number(n) || 0
  return num.toLocaleString('zh-CN')
}

function statusBadge(status) {
  if (status === '已完成') return 'success'
  if (status === '执行中') return 'processing'
  if (status === '未开始') return 'default'
  return 'default'
}

function formatMd(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`
  return dateStr
}

function goPath(path, title) {
  if (!path) {
    message.info('暂无跳转链接')
    return
  }
  openTab(path, title || '页面')
  router.push(path)
}

function goProcessReport() {
  goPath('/report-management/process-report', '工序报工')
}

function goWorkOrder(record) {
  const code = record.workOrderNo
  const path = `/production/work-orders?code=${encodeURIComponent(code)}`
  openTab(path, `工单 ${code}`)
  router.push({ path: '/production/work-orders', query: { code } })
}

function goAdmin(tab) {
  const path = `/home/workbench-admin?tab=${tab}`
  openTab(path, '工作台内容管理')
  router.push({ path: '/home/workbench-admin', query: { tab } })
}

function onRemoveFavorite(fav) {
  Modal.confirm({
    title: '取消收藏',
    content: `确认取消收藏「${fav.title}」？`,
    onOk: () => {
      const res = removeFavorite(fav.id)
      if (res.ok) message.success(res.message)
      else message.warning(res.message)
    },
  })
}

function onRefresh() {
  refreshing.value = true
  try {
    const res = refreshWorkbenchData()
    refreshTick.value += 1
    message.success(res.message || '已刷新')
  } finally {
    setTimeout(() => {
      refreshing.value = false
    }, 300)
  }
}

function openRelease(item) {
  activeRelease.value = item
  releaseModalOpen.value = true
}

function onSubmitFeedback() {
  feedbackSubmitting.value = true
  try {
    const user = getUser()
    const res = submitFeedback(feedbackText.value, user?.displayName || user?.name || '当前用户')
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success(res.message)
    feedbackText.value = ''
  } finally {
    feedbackSubmitting.value = false
  }
}
</script>

<script>
export default { name: 'WorkbenchDashboardView' }
</script>

<style lang="less" scoped>
@primary: #1677ff;
@text: rgba(0, 0, 0, 0.88);
@text-secondary: rgba(0, 0, 0, 0.45);
@border: #f0f0f0;
@bg-page: #f5f7fb;

.workbench-dashboard {
  padding: 4px 4px 20px;
  min-height: 100%;
}

.panel-card {
  background: #fff;
  border: 1px solid @border;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 1px 2px rgba(15, 35, 95, 0.04);
}

.main-stack,
.side-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.panel-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.settings-btn {
  padding-inline: 4px;
  height: auto;
  color: rgba(0, 0, 0, 0.55);

  &:hover {
    color: @primary;
  }
}

.refresh-btn {
  color: rgba(0, 0, 0, 0.45);

  &:hover {
    color: @primary;
  }
}

.panel-title {
  position: relative;
  padding-left: 11px;
  font-size: 15px;
  font-weight: 600;
  color: @text;
  line-height: 1.2;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 2px;
    bottom: 2px;
    width: 3px;
    border-radius: 2px;
    background: @primary;
  }
}

.panel-hint {
  font-size: 12px;
  color: @text-secondary;
}

.header-action {
  padding-inline: 0;
}

.soft-check {
  color: @text-secondary;
  font-size: 13px;
}

/* —— 工序任务 —— */
.process-panel {
  margin-bottom: 0;
}

.process-grid {
  display: grid;
  /* 参考图双栏排版较宽，一行最多 5 张；不足不拉伸 */
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  justify-content: start;
}

.process-card {
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 10px;
  padding: 0;
  cursor: pointer;
  border: 1px solid #e8eef5;
  background: linear-gradient(180deg, #f7faff 0%, #fff 48%);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: #91caff;
    box-shadow: 0 6px 16px rgba(22, 119, 255, 0.1);
  }

  &.tone-cyan {
    background: linear-gradient(180deg, #f0fffe 0%, #fff 48%);
    .process-ribbon {
      background: #13c2c2;
    }
  }
  &.tone-orange {
    background: linear-gradient(180deg, #fff8f0 0%, #fff 48%);
    .process-ribbon {
      background: #fa8c16;
    }
  }
  &.tone-purple {
    background: linear-gradient(180deg, #f9f0ff 0%, #fff 48%);
    .process-ribbon {
      background: #722ed1;
    }
  }
  &.tone-green {
    background: linear-gradient(180deg, #f6ffed 0%, #fff 48%);
    .process-ribbon {
      background: #52c41a;
    }
  }
  &.tone-magenta {
    background: linear-gradient(180deg, #fff0f6 0%, #fff 48%);
    .process-ribbon {
      background: #eb2f96;
    }
  }
  &.tone-blue {
    background: linear-gradient(180deg, #f7faff 0%, #fff 48%);
    .process-ribbon {
      background: @primary;
    }
  }
}

.process-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 12px 0 10px;
  border-radius: 0 0 10px 0;
  background: @primary;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.process-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 92px;
  padding: 32px 12px 12px;
}

.process-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-right: 8px;
  text-align: center;
}

.process-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding-left: 10px;
  border-left: 1px dashed #d9e2ef;
}

.process-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: rgba(0, 0, 0, 0.85);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.process-unit {
  margin-top: 4px;
  font-size: 12px;
  color: @text-secondary;
  line-height: 1.2;
}

.stat-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  line-height: 1.3;
  color: @text-secondary;

  b {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.75);
    font-variant-numeric: tabular-nums;
  }

  .good,
  b.good {
    color: #52c41a;
  }

  .warn,
  b.warn {
    color: #fa8c16;
  }
}

.process-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 10px;
  border-top: 1px solid #f0f3f8;
}

.progress-label,
.progress-pct {
  flex-shrink: 0;
  font-size: 12px;
  color: @text-secondary;
  font-variant-numeric: tabular-nums;
}

.progress-track {
  flex: 1;
  min-width: 0;

  :deep(.ant-progress) {
    margin: 0;
    line-height: 1;
  }

  :deep(.ant-progress-outer) {
    padding-inline-end: 0;
    margin: 0;
  }

  :deep(.ant-progress-inner) {
    border-radius: 3px;
  }
}

.expand-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 12px;
  padding: 8px 0 0;
  border: none;
  border-top: 1px dashed #e8eef7;
  background: transparent;
  font-size: 13px;
  color: @primary;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

@media (max-width: 1200px) {
  .process-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .process-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* —— 收藏 —— */
.favorite-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.favorite-card {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 12px;
  border: 1px solid @border;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.18s,
    box-shadow 0.18s,
    transform 0.18s;

  &:hover {
    transform: translateY(-1px);
    border-color: #91caff;
    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.08);

    .favorite-remove {
      opacity: 1;
    }
  }

  &.fav-tone-0 .favorite-icon {
    background: #e6f4ff;
    color: @primary;
  }
  &.fav-tone-1 .favorite-icon {
    background: #f6ffed;
    color: #52c41a;
  }
  &.fav-tone-2 .favorite-icon {
    background: #fff7e6;
    color: #fa8c16;
  }
  &.fav-tone-3 .favorite-icon {
    background: #f9f0ff;
    color: #722ed1;
  }
  &.fav-tone-4 .favorite-icon {
    background: #e6fffb;
    color: #13c2c2;
  }
}

.favorite-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.favorite-title {
  font-size: 13px;
  font-weight: 600;
  color: @text;
  line-height: 1.25;
}

.favorite-module {
  margin-top: 1px;
  font-size: 11px;
  color: @text-secondary;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.favorite-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.45);
  opacity: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: opacity 0.15s;

  &:hover {
    background: #fff1f0;
    color: #ff4d4f;
  }
}

.favorite-add-tile {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 56px;
  border: 1px dashed #c9d8f0;
  border-radius: 8px;
  background: #fafcff;
  color: @primary;
  cursor: pointer;
  font-size: 13px;
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover {
    border-color: @primary;
    background: #f0f7ff;
  }
}

.favorite-empty {
  padding: 8px 0;
}

/* —— 工单表 —— */
.wo-tabs {
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.wo-tab-group {
  :deep(.ant-radio-button-wrapper) {
    border-radius: 6px !important;
    margin-right: 6px;
    border-inline-start-width: 1px !important;
    height: 30px;
    line-height: 28px;
    padding-inline: 10px;

    &::before {
      display: none !important;
    }
  }
}

.period-group {
  :deep(.ant-radio-button-wrapper) {
    min-width: 52px;
    text-align: center;
  }
}

.tab-count {
  margin-left: 4px;
  font-style: normal;
  font-size: 12px;
  opacity: 0.7;
}

.wo-table-wrap {
  border: 1px solid @border;
  border-radius: 8px;
  overflow: hidden;
  min-height: 480px;

  :deep(.ant-table-thead > tr > th) {
    background: #f7f9fc;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.65);
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: #f5f9ff;
  }

  :deep(.ant-table-body) {
    min-height: 420px;
  }
}

.row-index {
  color: @text-secondary;
  font-variant-numeric: tabular-nums;
}

.link-code {
  color: @primary;
  font-weight: 500;

  &:hover {
    color: #4096ff;
  }
}

.action-link {
  color: @primary;
  font-size: 13px;
  padding: 0 2px;

  &.danger {
    color: #ff4d4f;
  }

  &:hover {
    opacity: 0.85;
  }
}

.qty-good {
  color: #389e0d;
  font-variant-numeric: tabular-nums;
}

.qty-bad {
  color: #cf1322;
  font-variant-numeric: tabular-nums;
}

/* —— 右侧栏 —— */
.side-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-panel {
  .panel-header {
    margin-bottom: 6px;
  }
}

.more-link {
  font-size: 12px;
  color: @text-secondary;

  &:hover {
    color: @primary;
  }

  &::after {
    content: ' ›';
  }
}

.side-list {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 8px;
    margin: 0 -4px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: #f5f9ff;

      .side-item-title {
        color: @primary;
      }

      .side-arrow {
        opacity: 1;
        color: @primary;
      }
    }
  }
}

.side-marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.scenario {
    background: @primary;
    box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.15);
  }
}

.side-text {
  flex: 1;
  min-width: 0;
}

.side-item-title {
  font-size: 13px;
  font-weight: 500;
  color: @text;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-item-sub {
  margin-top: 2px;
  font-size: 12px;
  color: @text-secondary;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.side-arrow {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.25);
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.ver-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  background: #e6f4ff;
  color: @primary;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.release-date {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.feedback-box {
  border: 1px solid @border;
  border-radius: 8px;
  background: #fafbfe;
  padding: 8px 10px 8px;
  transition: border-color 0.15s;

  &:focus-within {
    border-color: #91caff;
    background: #fff;
  }

  :deep(textarea.ant-input) {
    background: transparent;
    resize: none;
    padding: 4px 0;
  }
}

.feedback-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}

.feedback-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
}

.guide-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;

  &.g-0 {
    background: #e6f4ff;
    color: @primary;
  }
  &.g-1 {
    background: #f6ffed;
    color: #52c41a;
  }
  &.g-2 {
    background: #fff7e6;
    color: #fa8c16;
  }
  &.g-3 {
    background: #f9f0ff;
    color: #722ed1;
  }
}

.release-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: @text-secondary;
}

.release-content {
  margin: 0;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
}
</style>

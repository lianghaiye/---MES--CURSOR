<template>
  <div class="director-dashboard page-shell">
    <section class="toolbar-card">
      <div class="toolbar-left">
        <h2 class="page-title">车间主任工作台</h2>
        <span class="updated-at">更新于 {{ dashboard.updatedAt }}</span>
      </div>
      <div class="toolbar-right">
        <span class="filter-label">车间</span>
        <a-select
          v-model:value="workshop"
          :options="workshopScopeOptions"
          style="width: 140px"
          @change="persistWorkshop"
        />
        <span class="filter-label">统计周期</span>
        <a-segmented v-model:value="period" :options="directorPeriodOptions" />
      </div>
    </section>

    <section class="kpi-section">
      <a-row :gutter="12">
        <a-col v-for="kpi in dashboard.kpis" :key="kpi.key" :xs="24" :sm="12" :md="8" :xl="4">
          <div class="kpi-card" :class="`tone-${kpi.tone}`">
            <div class="kpi-title">{{ kpi.title }}</div>
            <div class="kpi-value">
              {{ kpi.value }}<span class="kpi-unit">{{ kpi.unit }}</span>
            </div>
            <div class="kpi-sub">{{ kpi.sub }}</div>
          </div>
        </a-col>
      </a-row>
    </section>

    <a-row :gutter="16" class="main-row">
      <a-col :xs="24" :lg="16">
        <section class="panel-card todo-panel">
          <div class="panel-header">
            <div>
              <span class="panel-title">待办事项</span>
              <a-badge :count="dashboard.todoTotal" :overflow-count="99" class="todo-badge" />
            </div>
            <a-radio-group v-model:value="todoFilter" size="small" button-style="solid">
              <a-radio-button value="all">全部</a-radio-button>
              <a-radio-button v-for="cat in visibleCategories" :key="cat" :value="cat">
                {{ cat }} ({{ dashboard.todoGroups[cat] || 0 }})
              </a-radio-button>
            </a-radio-group>
          </div>

          <a-empty v-if="!filteredTodos.length" description="当前暂无待办" />
          <div v-else class="todo-list">
            <div
              v-for="item in filteredTodos"
              :key="item.id"
              class="todo-item"
              @click="openTodo(item)"
            >
              <div class="todo-main">
                <a-tag :color="categoryColor(item.category)" class="todo-tag">{{
                  item.category
                }}</a-tag>
                <span class="todo-title">{{ item.title }}</span>
                <a-tag v-if="item.urgency === 'high'" color="red" size="small">紧急</a-tag>
              </div>
              <div class="todo-sub">{{ item.subtitle }}</div>
              <div class="todo-time">{{ item.time || '—' }}</div>
            </div>
          </div>
        </section>
      </a-col>

      <a-col :xs="24" :lg="8">
        <section class="panel-card shortcut-panel">
          <div class="panel-header">
            <span class="panel-title">快捷入口</span>
          </div>
          <div class="shortcut-grid">
            <button
              v-for="sc in DIRECTOR_SHORTCUTS"
              :key="sc.key"
              type="button"
              class="shortcut-item"
              @click="goShortcut(sc.path)"
            >
              <span class="shortcut-dot" :style="{ background: sc.color }" />
              <span class="shortcut-label">{{ sc.label }}</span>
            </button>
          </div>
        </section>

        <section class="panel-card summary-panel">
          <div class="panel-header">
            <span class="panel-title">待办分布</span>
          </div>
          <div class="summary-list">
            <div v-for="cat in TODO_CATEGORY_ORDER" :key="cat" class="summary-row">
              <span>{{ cat }}</span>
              <a-badge
                :count="dashboard.todoGroups[cat] || 0"
                :number-style="{
                  backgroundColor: (dashboard.todoGroups[cat] || 0) > 0 ? '#1677ff' : '#d9d9d9',
                }"
              />
            </div>
          </div>
        </section>
      </a-col>
    </a-row>

    <DirectorTodoDrawer v-model:open="drawerOpen" :item="activeTodo" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  directorPeriodOptions,
  workshopScopeOptions,
  resolveUserDefaultWorkshop,
  DIRECTOR_PERIOD,
} from '@/constants/workshopDirector'
import {
  buildWorkshopDirectorDashboard,
  DIRECTOR_SHORTCUTS,
  TODO_CATEGORY_ORDER,
} from '@/utils/workshopDirectorDashboard'
import { getUser } from '@/utils/auth'
import DirectorTodoDrawer from '@/views/home/components/DirectorTodoDrawer.vue'

const WORKSHOP_STORAGE_KEY = 'i_doms_director_workshop'

const router = useRouter()
const user = getUser()
const workshop = ref(localStorage.getItem(WORKSHOP_STORAGE_KEY) || resolveUserDefaultWorkshop(user))
const period = ref(DIRECTOR_PERIOD.TODAY)
const todoFilter = ref('all')
const drawerOpen = ref(false)
const activeTodo = ref(null)

const dashboard = computed(() =>
  buildWorkshopDirectorDashboard({ workshop: workshop.value, period: period.value }),
)

const visibleCategories = computed(() =>
  TODO_CATEGORY_ORDER.filter((cat) => (dashboard.value.todoGroups[cat] || 0) > 0),
)

const filteredTodos = computed(() => {
  if (todoFilter.value === 'all') return dashboard.value.todos
  return dashboard.value.todos.filter((t) => t.category === todoFilter.value)
})

watch(visibleCategories, (cats) => {
  if (todoFilter.value !== 'all' && !cats.includes(todoFilter.value)) {
    todoFilter.value = 'all'
  }
})

function persistWorkshop(value) {
  localStorage.setItem(WORKSHOP_STORAGE_KEY, value)
}

function categoryColor(category) {
  const map = {
    待下发工单: 'blue',
    待审核报工: 'purple',
    待确认报工: 'cyan',
    计划风险: 'orange',
    待质检: 'green',
    待审核报废: 'magenta',
    待审批出入库: 'gold',
    'ECN 待办': 'geekblue',
  }
  return map[category] || 'default'
}

function openTodo(item) {
  activeTodo.value = item
  drawerOpen.value = true
}

function goShortcut(path) {
  router.push(path)
}
</script>

<script>
export default { name: 'WorkshopDirectorDashboardView' }
</script>

<style lang="less" scoped>
.director-dashboard {
  padding: 12px 16px 24px;
}

.toolbar-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.updated-at {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}

.kpi-section {
  margin-bottom: 12px;
}

.kpi-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
  min-height: 108px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &.tone-blue {
    border-top: 3px solid #1677ff;
  }
  &.tone-purple {
    border-top: 3px solid #722ed1;
  }
  &.tone-orange {
    border-top: 3px solid #fa8c16;
  }
  &.tone-green {
    border-top: 3px solid #52c41a;
  }
  &.tone-cyan {
    border-top: 3px solid #13c2c2;
  }
  &.tone-red {
    border-top: 3px solid #ff4d4f;
  }
}

.kpi-title {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}

.kpi-value {
  font-size: 26px;
  font-weight: 600;
  margin: 6px 0;
  line-height: 1.2;
}

.kpi-unit {
  font-size: 14px;
  font-weight: 400;
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
}

.kpi-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.panel-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
}

.todo-badge {
  margin-left: 8px;
}

.todo-list {
  max-height: 520px;
  overflow: auto;
}

.todo-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    border-color: #91caff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.08);
  }
}

.todo-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.todo-tag {
  margin: 0;
}

.todo-title {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.todo-sub {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}

.todo-time {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.2s,
    border-color 0.2s;

  &:hover {
    background: #f0f7ff;
    border-color: #91caff;
  }
}

.shortcut-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.shortcut-label {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}
</style>

<template>
  <div class="function-param-page">
    <div class="section-head">
      <span class="section-title">参数配置</span>
      <span class="section-hint">左侧选择分类，右侧定位到对应配置</span>
    </div>

    <div class="param-layout">
      <aside class="param-nav">
        <div class="param-nav-title">分类</div>
        <a-anchor
          :affix="false"
          :items="anchorItems"
          :get-container="getScrollContainer"
          :target-offset="12"
          @click="onAnchorClick"
        />
      </aside>

      <main ref="scrollRef" class="param-content">
        <section
          v-for="group in categoryGroups"
          :id="`fp-cat-${group.key}`"
          :key="group.key"
          class="param-group"
        >
          <div class="param-group-head">
            <h3 class="param-group-title">{{ group.label }}</h3>
            <p v-if="group.description" class="param-group-desc">{{ group.description }}</p>
          </div>

          <div class="table-card">
            <a-table
              :columns="columns"
              :data-source="group.rows"
              row-key="key"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'config'">
                  <FunctionParamConfigCell :record="record" />
                </template>
                <template v-else-if="column.key === 'description'">
                  <span v-if="record.description" class="desc-text">{{ record.description }}</span>
                </template>
              </template>
            </a-table>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script>
export default { name: 'FunctionParamView' }
</script>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { getFunctionParamCategoryGroups } from '@/store/functionParamStore'
import FunctionParamConfigCell from './components/FunctionParamConfigCell.vue'

const columns = [
  { title: '业务场景', dataIndex: 'scenario', key: 'scenario', width: 160 },
  { title: '配置项', key: 'config', width: 520 },
  { title: '说明', key: 'description' },
]

const categoryGroups = computed(() => getFunctionParamCategoryGroups())

const anchorItems = computed(() =>
  categoryGroups.value.map((group) => ({
    key: group.key,
    href: `#fp-cat-${group.key}`,
    title: `${group.label}（${group.rows.length}）`,
  })),
)

const scrollRef = ref(null)

function getScrollContainer() {
  return scrollRef.value || window
}

function onAnchorClick(e, link) {
  e.preventDefault()
  const href = link?.href || ''
  const id = href.startsWith('#') ? href.slice(1) : href.replace(/^.*#/, '')
  nextTick(() => {
    const el = document.getElementById(id)
    const container = scrollRef.value
    if (!el || !container) return
    const top =
      container.scrollTop +
      (el.getBoundingClientRect().top - container.getBoundingClientRect().top) -
      8
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  })
}
</script>

<style scoped>
.function-param-page {
  padding: 0;
  height: calc(100vh - 120px);
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}

.section-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.param-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.param-nav {
  flex: 0 0 200px;
  background: #fff;
  border-radius: 6px;
  padding: 12px 8px 12px 12px;
  border: 1px solid #f0f0f0;
  overflow: auto;
}

.param-nav-title {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
  padding-left: 4px;
}

.param-nav :deep(.ant-anchor-link) {
  padding-block: 6px;
}

.param-nav :deep(.ant-anchor-link-title) {
  font-size: 13px;
}

.param-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding-right: 4px;
}

.param-group {
  margin-bottom: 20px;
  scroll-margin-top: 8px;
}

.param-group-head {
  margin-bottom: 8px;
  padding: 0 2px;
}

.param-group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.param-group-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.table-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #f0f0f0;
}

.desc-text {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  line-height: 1.6;
}
</style>

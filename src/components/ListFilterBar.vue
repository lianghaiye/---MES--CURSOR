<template>
  <div class="list-filter-bar">
    <div
      ref="fieldsEl"
      class="list-filter-fields"
      :class="{ 'is-collapsed': !expanded && collapsible }"
    >
      <slot />
    </div>
    <div class="list-filter-footer">
      <div class="list-filter-actions">
        <a-button type="primary" size="small" @click="emit('search')">
          <SearchOutlined />
          {{ searchText }}
        </a-button>
        <a-button size="small" @click="emit('reset')">
          <ReloadOutlined />
          {{ resetText }}
        </a-button>
        <a-button
          v-if="collapsible"
          type="link"
          size="small"
          class="list-filter-toggle"
          @click="expanded = !expanded"
        >
          {{ expanded ? '收起' : '展开' }}
          <UpOutlined v-if="expanded" />
          <DownOutlined v-else />
        </a-button>
      </div>
      <div v-if="$slots.toolbar" class="list-filter-toolbar">
        <slot name="toolbar" />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ListFilterBar' }
</script>

<script setup>
import { computed, nextTick, onMounted, onUpdated, ref } from 'vue'
import { SearchOutlined, ReloadOutlined, UpOutlined, DownOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  /** 超过该数量（默认 2 行 × 5 列 = 10）显示展开/收起 */
  collapseCount: { type: Number, default: 10 },
  searchText: { type: String, default: '查询' },
  resetText: { type: String, default: '重置' },
  /** 若已知字段数可传入，避免依赖 DOM 计数 */
  fieldCount: { type: Number, default: null },
})

const emit = defineEmits(['search', 'reset'])

const fieldsEl = ref(null)
const measuredCount = ref(0)
const expanded = ref(false)

function measureFields() {
  const root = fieldsEl.value
  if (!root) return
  measuredCount.value = Array.from(root.children).filter(
    (el) => el && el.nodeType === 1 && !el.classList?.contains('list-filter-skip'),
  ).length
}

onMounted(() => nextTick(measureFields))
onUpdated(() => nextTick(measureFields))

const effectiveCount = computed(() =>
  props.fieldCount != null ? props.fieldCount : measuredCount.value,
)
const collapsible = computed(() => effectiveCount.value > props.collapseCount)
</script>

<style lang="less">
/* 全局：列表筛选一行 5 个 */
.list-filter-bar {
  width: 100%;
}

.list-filter-fields {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px 8px;
  width: 100%;

  > .ant-form-item,
  > .list-filter-item {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  &.is-collapsed > *:nth-child(n + 11) {
    display: none !important;
  }
}

.list-filter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.list-filter-actions,
.list-filter-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.list-filter-toggle {
  padding-inline: 4px;
}

@media (max-width: 1199px) {
  .list-filter-fields {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    &.is-collapsed > *:nth-child(n + 11) {
      display: none !important;
    }

    /* 中屏仍按「最多两行可见」：3×2=6；但产品规则以桌面 5×2 为准，收起阈值保持 10 */
  }
}

@media (max-width: 767px) {
  .list-filter-fields {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}
</style>

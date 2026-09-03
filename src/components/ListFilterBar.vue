<template>
  <div class="list-filter-bar" :class="{ 'is-collapsed': !expanded && collapsible }">
    <div ref="fieldsEl" class="list-filter-fields">
      <slot />
      <div class="list-filter-actions-cell">
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
    </div>
    <div v-if="$slots.toolbar" class="list-filter-toolbar">
      <slot name="toolbar" />
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
  /**
   * 超过该数量显示展开/收起。
   * 默认 9：一行 5 个、第二行末尾留给按钮，第 10 个条件起需展开。
   */
  collapseCount: { type: Number, default: 9 },
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
    (el) =>
      el &&
      el.nodeType === 1 &&
      !el.classList?.contains('list-filter-skip') &&
      !el.classList?.contains('list-filter-actions-cell'),
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
/* 全局：列表筛选一行 5 个；按钮固定第二行末尾 */
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

  > .list-filter-actions-cell {
    grid-column: 5;
    grid-row: 2;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 8px;
    align-self: end;
    min-height: 32px;
  }

  /* 条件不足 5 个：按钮与条件同一行 */
  > .list-filter-actions-cell:nth-child(-n + 5) {
    grid-row: 1;
  }
}

.list-filter-bar.is-collapsed .list-filter-fields > .ant-form-item:nth-child(n + 10),
.list-filter-bar.is-collapsed .list-filter-fields > .list-filter-item:nth-child(n + 10) {
  display: none !important;
}

.list-filter-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.list-filter-toggle {
  padding-inline: 4px;
}

@media (max-width: 1199px) {
  .list-filter-fields {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    > .list-filter-actions-cell {
      grid-column: 3;
      grid-row: 2;
    }

    > .list-filter-actions-cell:nth-child(-n + 3) {
      grid-row: 1;
    }
  }

  .list-filter-bar.is-collapsed .list-filter-fields > .ant-form-item:nth-child(n + 6),
  .list-filter-bar.is-collapsed .list-filter-fields > .list-filter-item:nth-child(n + 6) {
    display: none !important;
  }
}

@media (max-width: 767px) {
  .list-filter-fields {
    grid-template-columns: repeat(1, minmax(0, 1fr));

    > .list-filter-actions-cell {
      grid-column: 1;
      grid-row: auto;
      justify-content: flex-start;
    }
  }
}
</style>

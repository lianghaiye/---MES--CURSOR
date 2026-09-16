<template>
  <div class="section-card detail-section-card" :class="{ 'is-collapsed': collapsed }">
    <div class="section-title-row">
      <div class="section-title-left">
        <div class="section-title">
          <slot name="title">{{ title }}</slot>
        </div>
        <slot name="extra" />
      </div>
      <div class="section-title-actions">
        <slot name="actions" />
        <a-button type="link" size="small" class="collapse-toggle" @click="toggle">
          {{ collapsed ? '展开 ▾' : '收起 ▴' }}
        </a-button>
      </div>
    </div>
    <div v-show="!collapsed" class="section-body">
      <slot />
    </div>
  </div>
</template>

<script>
export default { name: 'DetailSectionCard' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  /** 默认是否收起 */
  defaultCollapsed: { type: Boolean, default: false },
  /** 受控收起（可选，配合 v-model:collapsed） */
  collapsed: { type: Boolean, default: undefined },
})

const emit = defineEmits(['update:collapsed'])

const innerCollapsed = ref(props.defaultCollapsed)

const isControlled = computed(() => props.collapsed !== undefined)

const collapsed = computed(() => (isControlled.value ? props.collapsed : innerCollapsed.value))

watch(
  () => props.defaultCollapsed,
  (val) => {
    if (!isControlled.value) innerCollapsed.value = val
  },
)

function toggle() {
  const next = !collapsed.value
  if (isControlled.value) {
    emit('update:collapsed', next)
  } else {
    innerCollapsed.value = next
  }
}
</script>

<style lang="less" scoped>
.detail-section-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &.is-collapsed {
    padding-bottom: 10px;
  }
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0;
}

.detail-section-card:not(.is-collapsed) .section-title-row {
  margin-bottom: 12px;
}

.section-title-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
  margin: 0;
}

.section-title-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.collapse-toggle {
  padding: 0 4px;
  height: auto;
  line-height: 22px;
  color: #1677ff;

  &:hover,
  &:focus {
    color: #4096ff;
  }
}

.section-body {
  min-width: 0;
}
</style>

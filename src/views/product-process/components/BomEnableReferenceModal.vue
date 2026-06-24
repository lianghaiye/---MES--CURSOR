<template>
  <a-modal
    :open="open"
    title="审核发布确认"
    :width="520"
    ok-text="是，同步升级"
    cancel-text="否，仅发布"
    @update:open="emit('update:open', $event)"
    @ok="handleConfirm(true)"
    @cancel="handleConfirm(false)"
  >
    <p class="ref-tip">
      检测到【{{ bomName }}】BOM 版本存在
      <strong>{{ refCount }}</strong>
      个父级 BOM 引用关联，确认生效前是否同步升级引用版本？
    </p>
    <ul v-if="refs.length" class="ref-list">
      <li v-for="ref in refs.slice(0, 8)" :key="ref.parentBomId">
        {{ ref.parentItemName || ref.parentBomName }}（{{ ref.parentVersion }}）
      </li>
      <li v-if="refs.length > 8">… 等共 {{ refs.length }} 条</li>
    </ul>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  bomName: { type: String, default: '' },
  refs: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const refCount = computed(() => props.refs.length)

function handleConfirm(upgrade) {
  emit('update:open', false)
  emit('confirm', upgrade)
}
</script>

<style lang="less" scoped>
.ref-tip {
  margin-bottom: 12px;
  line-height: 1.6;
}

.ref-list {
  margin: 0;
  padding-left: 20px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;

  li + li {
    margin-top: 4px;
  }
}
</style>

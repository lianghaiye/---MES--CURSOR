<template>
  <div class="executor-tag-picker">
    <div class="tag-box" :class="{ disabled: !resourceType }" @click="openModal">
      <a-tag
        v-for="name in executors"
        :key="name"
        closable
        color="processing"
        class="executor-tag"
        @close.stop="remove(name)"
      >
        {{ name }}
      </a-tag>
      <span v-if="!executors?.length" class="placeholder">{{ displayPlaceholder }}</span>
      <SearchOutlined class="picker-icon" @click.stop="openModal" />
    </div>

    <SelectPersonModal v-model:open="personModalOpen" :selected="executors" @confirm="onConfirm" />
    <SelectGroupModal v-model:open="groupModalOpen" :selected="executors" @confirm="onConfirm" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import SelectPersonModal from './SelectPersonModal.vue'
import SelectGroupModal from './SelectGroupModal.vue'

const props = defineProps({
  executors: { type: Array, default: () => [] },
  resourceType: { type: String, default: '' },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:executors'])

const personModalOpen = ref(false)
const groupModalOpen = ref(false)

const displayPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder
  if (props.resourceType === '工人小组') return '请选择执行组别'
  return '请选择执行人'
})

function openModal() {
  if (!props.resourceType) {
    message.warning('请先选择资源类型')
    return
  }
  if (props.resourceType === '工人小组') {
    groupModalOpen.value = true
  } else {
    personModalOpen.value = true
  }
}

function remove(name) {
  emit(
    'update:executors',
    (props.executors || []).filter((n) => n !== name),
  )
}

function onConfirm(names) {
  emit('update:executors', names || [])
}
</script>

<style lang="less" scoped>
.executor-tag-picker {
  width: 100%;
}

.tag-box {
  min-height: 32px;
  padding: 4px 28px 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  position: relative;
  background: #fff;
  transition: border-color 0.2s;

  &:hover:not(.disabled) {
    border-color: #1677ff;
  }

  &.disabled {
    cursor: not-allowed;
    background: #f5f5f5;
  }
}

.executor-tag {
  margin: 0;
}

.placeholder {
  color: #bfbfbf;
  font-size: 12px;
  line-height: 22px;
}

.picker-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #8c8c8c;
  font-size: 14px;
}
</style>

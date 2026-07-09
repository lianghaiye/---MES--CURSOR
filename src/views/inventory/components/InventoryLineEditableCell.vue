<template>
  <div
    class="line-body-cell"
    :class="{
      editable,
      editing: active,
      'line-body-cell--num': numeric,
    }"
    @click="onCellClick"
  >
    <div v-if="active" class="edit-wrap" @click.stop>
      <slot name="edit" :end-edit="onEndEdit" />
    </div>
    <span v-else :class="{ placeholder: editable && empty }">{{ displayText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  editable: { type: Boolean, default: true },
  active: { type: Boolean, default: false },
  display: { type: [String, Number], default: '' },
  placeholder: { type: String, default: '-' },
  empty: { type: Boolean, default: false },
  numeric: { type: Boolean, default: false },
})

const emit = defineEmits(['activate', 'end'])

const displayText = computed(() => {
  if (props.empty) return props.placeholder
  if (props.display === '' || props.display == null) return props.placeholder
  return props.display
})

function onCellClick() {
  if (!props.editable || props.active) return
  emit('activate')
}

function onEndEdit() {
  emit('end')
}
</script>

<style lang="less" scoped>
.line-body-cell {
  min-height: 28px;
  line-height: 28px;

  &.editable {
    cursor: pointer;

    &:hover {
      background: #fafafa;
    }
  }

  &.editing {
    padding: 0;
  }

  &--num {
    text-align: right;
  }

  .edit-wrap {
    width: 100%;
  }

  .placeholder {
    color: rgba(0, 0, 0, 0.35);
  }
}
</style>

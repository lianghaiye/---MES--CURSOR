<template>
  <div class="line-table-foot">
    <div class="line-add-row">
      <a-button type="link" size="small" class="add-detail-link" @click="emit('add-line')">
        添加明细行
      </a-button>
    </div>
    <div class="line-summary-scroll">
      <table class="line-summary-table" :style="summaryTableStyle">
        <colgroup>
          <col v-for="col in columns" :key="col.key" :style="colWidthStyle(col)" />
        </colgroup>
        <tbody>
          <tr>
            <td
              v-for="(col, index) in columns"
              :key="col.key"
              :style="{ textAlign: col.align || 'left' }"
            >
              <slot name="cell" :column="col" :index="index" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  scrollX: { type: Number, default: 900 },
})

const emit = defineEmits(['add-line'])

const summaryTableStyle = computed(() => ({
  width: `${props.scrollX}px`,
  minWidth: `${props.scrollX}px`,
}))

function colWidthStyle(col) {
  if (col.width) return { width: `${col.width}px` }
  return {}
}
</script>

<script>
export default { name: 'InventoryLineTableFooter' }
</script>

<style lang="less" scoped>
.line-table-foot {
  flex-shrink: 0;
  min-width: 0;
  width: 100%;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.line-add-row {
  padding: 4px 12px;
  border-bottom: 1px dashed #f0f0f0;
}

.add-detail-link {
  padding: 0;
  height: auto;
}

.line-summary-scroll {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  background: #fafafa;
  -webkit-overflow-scrolling: touch;
  cursor: grab;
  touch-action: pan-x;

  &.is-dragging,
  &:active {
    cursor: grabbing;
  }
}

.line-summary-table {
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 13px;
  font-weight: 600;

  td {
    padding: 8px 8px;
    border-right: 1px solid #f0f0f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:last-child {
      border-right: none;
    }
  }
}
</style>

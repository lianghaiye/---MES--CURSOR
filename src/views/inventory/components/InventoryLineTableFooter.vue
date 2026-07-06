<template>
  <div class="line-table-foot">
    <div class="line-add-row">
      <a-button type="link" size="small" class="add-detail-link" @click="emit('add-line')">
        添加明细行
      </a-button>
    </div>
    <div class="line-summary-row">
      <table class="line-summary-table" :style="{ minWidth: `${scrollX}px` }">
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
defineProps({
  columns: { type: Array, default: () => [] },
  scrollX: { type: Number, default: 900 },
})

const emit = defineEmits(['add-line'])

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

.line-summary-row {
  overflow-x: auto;
  background: #fafafa;
}

.line-summary-table {
  width: 100%;
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

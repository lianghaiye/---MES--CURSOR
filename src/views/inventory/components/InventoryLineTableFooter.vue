<template>
  <div ref="footRef" class="line-table-foot">
    <div class="line-add-row">
      <a-button type="link" size="small" class="add-detail-link" @click="onAddLine">
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
import { computed, nextTick, ref } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  scrollX: { type: Number, default: 900 },
})

const emit = defineEmits(['add-line'])

const footRef = ref(null)

const summaryTableStyle = computed(() => ({
  width: `${props.scrollX}px`,
  minWidth: `${props.scrollX}px`,
}))

function colWidthStyle(col) {
  if (col.width) return { width: `${col.width}px` }
  return {}
}

function findScrollParent(el) {
  const pageContent = el?.closest?.('.page-content')
  if (pageContent) return pageContent
  let node = el?.parentElement
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY)
    if (canScrollY) return node
    node = node.parentElement
  }
  return document.scrollingElement || document.documentElement
}

/** 明细增高后整页上移，保证「添加明细行」贴在可视区底部 */
function keepAddVisible() {
  const run = () => {
    const foot = footRef.value
    if (!foot) return
    const scroller = findScrollParent(foot)
    const sRect = scroller.getBoundingClientRect()
    const fRect = foot.getBoundingClientRect()
    const bottomGap = 12
    let delta = fRect.bottom - (sRect.bottom - bottomGap)

    // 吸底时底部已对齐：仍按最后一行高度上移，跟着新增行走
    if (delta < 1) {
      const panel = foot.previousElementSibling
      const lastRow = panel?.querySelector?.('.ant-table-tbody > tr:last-child')
      const rowH = lastRow?.getBoundingClientRect().height || 39
      const maxScroll = scroller.scrollHeight - scroller.clientHeight
      const remain = maxScroll - scroller.scrollTop
      if (remain > 2) delta = Math.min(rowH, remain)
    }

    if (delta > 1) {
      scroller.scrollBy({ top: delta, behavior: 'smooth' })
    }
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      run()
      setTimeout(run, 100)
    })
  })
}

function onAddLine() {
  emit('add-line')
  keepAddVisible()
}

defineExpose({ keepAddVisible })
</script>

<script>
export default { name: 'InventoryLineTableFooter' }
</script>

<style lang="less" scoped>
.line-table-foot {
  /* 明细变长时吸底，滚动整页时「添加明细行」仍可见 */
  position: sticky;
  bottom: 0;
  z-index: 20;
  flex-shrink: 0;
  min-width: 0;
  width: 100%;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
}

.line-add-row {
  padding: 4px 12px;
  border-bottom: 1px dashed #f0f0f0;
  background: #fff;
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

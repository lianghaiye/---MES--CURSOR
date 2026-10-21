import { onBeforeUnmount, ref } from 'vue'

/** 按表格容器高度同步 ant-table scroll.y，避免外部分页叠在表体上 */
export function useTableScrollY(minHeight = 240) {
  const tableWrapRef = ref(null)
  const tableScrollY = ref(Math.max(minHeight, 360))
  let observer = null

  function syncTableScrollY() {
    const el = tableWrapRef.value
    if (!el) return
    const header = el.querySelector('.ant-table-header') || el.querySelector('.ant-table-thead')
    const headerH = header?.offsetHeight || 39
    tableScrollY.value = Math.max(minHeight, Math.floor(el.clientHeight - headerH))
  }

  function unbindTableResize() {
    observer?.disconnect()
    observer = null
  }

  function bindTableResize() {
    unbindTableResize()
    const el = tableWrapRef.value
    if (!el) return
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => syncTableScrollY())
      observer.observe(el)
    }
    syncTableScrollY()
  }

  onBeforeUnmount(unbindTableResize)

  return { tableWrapRef, tableScrollY, bindTableResize, unbindTableResize, syncTableScrollY }
}

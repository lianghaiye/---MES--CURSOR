import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const RESIZE_DEBOUNCE_MS = 120
const ROW_COUNT_DEBOUNCE_MS = 80

function syncFooterTableWidth(panel, configuredScrollX = 0) {
  const summaryTable = panel.querySelector('.line-summary-table')
  if (!summaryTable) return

  const width = Math.max(Number(configuredScrollX) || 0, summaryTable.scrollWidth || 0)
  if (width > 0) {
    summaryTable.style.width = `${width}px`
    summaryTable.style.minWidth = `${width}px`
  }
}

function debounce(fn, wait) {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }
}

/**
 * 出入库/采购等新增页明细表：
 * - 不定高、不出现表内纵向滚动；行随内容撑开，整页上下滚动查看
 * - 标题栏由 FormCreateShell sticky 固定
 * - 横向滚动：底部合计区域可见滚动条，表头/表体同步 scrollLeft
 */
export function useInventoryLineTableScroll({ scrollX, getRowCount }) {
  const panelRef = ref(null)
  const panelStyle = ref({})
  let observer = null
  let measuring = false
  let teardownScrollSync = null

  function bindHorizontalScrollSync() {
    teardownScrollSync?.()
    teardownScrollSync = null

    const panel = panelRef.value
    if (!panel) return

    const configuredScrollX = typeof scrollX === 'object' ? scrollX.value : scrollX
    syncFooterTableWidth(panel, configuredScrollX)

    const footerScroll = panel.querySelector('.line-summary-scroll')
    const tableHeader = panel.querySelector('.ant-table-header')
    const tableBody = panel.querySelector('.ant-table-body')
    const tableContent = panel.querySelector('.ant-table-content')
    const tableScrollEl = tableContent || tableBody || tableHeader
    if (!footerScroll) return

    const syncFrom = (left, source) => {
      if (source !== 'footer' && footerScroll.scrollLeft !== left) {
        footerScroll.scrollLeft = left
      }
      if (source !== 'header' && tableHeader && tableHeader.scrollLeft !== left) {
        tableHeader.scrollLeft = left
      }
      if (source !== 'body' && tableBody && tableBody.scrollLeft !== left) {
        tableBody.scrollLeft = left
      }
      if (source !== 'content' && tableContent && tableContent.scrollLeft !== left) {
        tableContent.scrollLeft = left
      }
    }

    const onFooterScroll = () => syncFrom(footerScroll.scrollLeft, 'footer')
    const onBodyScroll = () => syncFrom(tableBody?.scrollLeft ?? 0, 'body')
    const onHeaderScroll = () => syncFrom(tableHeader?.scrollLeft ?? 0, 'header')
    const onContentScroll = () => syncFrom(tableContent?.scrollLeft ?? 0, 'content')

    const onHorizontalWheel = (event) => {
      if (!tableScrollEl) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!delta) return
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) && !event.shiftKey) return
      tableScrollEl.scrollLeft += delta
      syncFrom(tableScrollEl.scrollLeft, tableContent ? 'content' : 'body')
      if (footerScroll.scrollLeft !== tableScrollEl.scrollLeft) {
        footerScroll.scrollLeft = tableScrollEl.scrollLeft
      }
      event.preventDefault()
    }

    let dragActive = false
    let dragStartX = 0
    let dragStartScrollLeft = 0

    const onFooterMouseDown = (event) => {
      if (event.button !== 0) return
      dragActive = true
      dragStartX = event.clientX
      dragStartScrollLeft = footerScroll.scrollLeft
      footerScroll.classList.add('is-dragging')
      event.preventDefault()
    }

    const onFooterMouseMove = (event) => {
      if (!dragActive) return
      footerScroll.scrollLeft = dragStartScrollLeft - (event.clientX - dragStartX)
      syncFrom(footerScroll.scrollLeft, 'footer')
    }

    const stopFooterDrag = () => {
      if (!dragActive) return
      dragActive = false
      footerScroll.classList.remove('is-dragging')
    }

    footerScroll.addEventListener('scroll', onFooterScroll, { passive: true })
    tableBody?.addEventListener('scroll', onBodyScroll, { passive: true })
    tableHeader?.addEventListener('scroll', onHeaderScroll, { passive: true })
    tableContent?.addEventListener('scroll', onContentScroll, { passive: true })
    panel.addEventListener('wheel', onHorizontalWheel, { passive: false })
    footerScroll.addEventListener('mousedown', onFooterMouseDown)
    window.addEventListener('mousemove', onFooterMouseMove)
    window.addEventListener('mouseup', stopFooterDrag)

    teardownScrollSync = () => {
      footerScroll.removeEventListener('scroll', onFooterScroll)
      tableBody?.removeEventListener('scroll', onBodyScroll)
      tableHeader?.removeEventListener('scroll', onHeaderScroll)
      tableContent?.removeEventListener('scroll', onContentScroll)
      panel.removeEventListener('wheel', onHorizontalWheel)
      footerScroll.removeEventListener('mousedown', onFooterMouseDown)
      window.removeEventListener('mousemove', onFooterMouseMove)
      window.removeEventListener('mouseup', stopFooterDrag)
      stopFooterDrag()
    }
  }

  async function updateScrollY() {
    const panel = panelRef.value
    if (!panel || measuring) return
    measuring = true
    // 不定高：不锁盒子高度、不设表内纵向滚动
    panelStyle.value = {}
    measuring = false
    await nextTick()
    bindHorizontalScrollSync()
  }

  const debouncedUpdateScrollY = debounce(updateScrollY, RESIZE_DEBOUNCE_MS)
  const debouncedRowCountUpdate = debounce(updateScrollY, ROW_COUNT_DEBOUNCE_MS)

  onMounted(() => {
    nextTick(updateScrollY)
    setTimeout(updateScrollY, 150)
    window.addEventListener('resize', debouncedUpdateScrollY)
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(debouncedUpdateScrollY)
      nextTick(() => {
        const panel = panelRef.value
        if (!panel) return
        observer.observe(panel)
      })
    }
  })

  onUnmounted(() => {
    window.removeEventListener('resize', debouncedUpdateScrollY)
    observer?.disconnect()
    observer = null
    teardownScrollSync?.()
    teardownScrollSync = null
  })

  watch(
    () => getRowCount?.(),
    () => nextTick(debouncedRowCountUpdate),
  )

  watch(
    () => (typeof scrollX === 'object' ? scrollX.value : scrollX),
    () => nextTick(debouncedUpdateScrollY),
  )

  const isScrolling = computed(() => false)

  const tableScroll = computed(() => ({
    x: typeof scrollX === 'object' ? scrollX.value : scrollX,
  }))

  return { panelRef, panelStyle, tableScroll, isScrolling, updateScrollY }
}

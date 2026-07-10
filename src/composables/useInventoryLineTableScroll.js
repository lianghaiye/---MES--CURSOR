import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const VIEWPORT_BOTTOM_GAP = 16
const DEFAULT_HEADER_HEIGHT = 39
const DEFAULT_FOOTER_HEIGHT = 72
const DEFAULT_EMPTY_BODY_HEIGHT = 48
const ROW_HEIGHT = 39
const RESIZE_DEBOUNCE_MS = 120
const ROW_COUNT_DEBOUNCE_MS = 80

/**
 * 从明细盒子上沿到当前可视区域底边的可用高度。
 * 必须用视口计算，不能用 page-content 底边（会随内容撑高导致盒子过高）。
 */
function getAvailableMaxHeight(panel) {
  if (!panel) return 400
  const rect = panel.getBoundingClientRect()
  const viewportMax = window.innerHeight - rect.top - VIEWPORT_BOTTOM_GAP

  const modalBody = panel.closest('.ant-modal-body')
  if (modalBody) {
    const modalRect = modalBody.getBoundingClientRect()
    const modalMax = modalRect.bottom - rect.top - VIEWPORT_BOTTOM_GAP
    return Math.max(160, Math.floor(Math.min(viewportMax, modalMax)))
  }

  return Math.max(160, Math.floor(viewportMax))
}

function estimateBodyHeight(rowCount) {
  if (rowCount <= 0) return DEFAULT_EMPTY_BODY_HEIGHT
  return rowCount * ROW_HEIGHT
}

function measurePanelParts(panel, rowCount) {
  const footerEl = panel.querySelector('.line-table-foot')
  const thead = panel.querySelector('.ant-table-thead')
  const footerH = footerEl?.offsetHeight ?? DEFAULT_FOOTER_HEIGHT
  const headerH = thead?.offsetHeight ?? DEFAULT_HEADER_HEIGHT
  const bodyH =
    rowCount > 0
      ? estimateBodyHeight(rowCount)
      : (panel.querySelector('.ant-table-tbody')?.offsetHeight ?? DEFAULT_EMPTY_BODY_HEIGHT)
  return { headerH, bodyH, footerH, naturalTotal: headerH + bodyH + footerH }
}

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
 * 出入库/采购明细表：
 * - 内容未超出：盒子随明细行增高（可留白）
 * - 超出可视高度：盒子锁定高度，表头固定，数据区滚动
 * - 底部「添加明细行 / 合计」始终在盒子最下方
 * - 横向滚动：底部合计区域可见滚动条，表头/表体同步 scrollLeft
 */
export function useInventoryLineTableScroll({ scrollX, getRowCount }) {
  const panelRef = ref(null)
  const bodyScrollY = ref(undefined)
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

    const availableMax = getAvailableMaxHeight(panel)
    const rowCount = getRowCount?.() ?? 0
    const { headerH, footerH, naturalTotal } = measurePanelParts(panel, rowCount)

    if (naturalTotal <= availableMax) {
      if (bodyScrollY.value != null) {
        bodyScrollY.value = undefined
      }
      panelStyle.value = { maxHeight: `${availableMax}px` }
    } else {
      const nextY = Math.max(120, availableMax - headerH - footerH)
      bodyScrollY.value = nextY
      panelStyle.value = {
        height: `${availableMax}px`,
        maxHeight: `${availableMax}px`,
        display: 'flex',
        flexDirection: 'column',
      }
    }

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
        const host = panel.closest('.form-body') || panel.closest('.ant-modal-body')
        if (host) observer.observe(host)
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

  const isScrolling = computed(() => bodyScrollY.value != null)

  const tableScroll = computed(() => {
    const scroll = { x: typeof scrollX === 'object' ? scrollX.value : scrollX }
    if (bodyScrollY.value) scroll.y = bodyScrollY.value
    return scroll
  })

  return { panelRef, panelStyle, tableScroll, isScrolling, updateScrollY }
}

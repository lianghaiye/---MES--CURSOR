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
      : panel.querySelector('.ant-table-tbody')?.offsetHeight ?? DEFAULT_EMPTY_BODY_HEIGHT
  return { headerH, bodyH, footerH, naturalTotal: headerH + bodyH + footerH }
}

function syncFooterTableWidth(panel) {
  const mainTable =
    panel.querySelector('.ant-table-body > table') ||
    panel.querySelector('.ant-table-content > table')
  const summaryTable = panel.querySelector('.line-summary-table')
  if (!mainTable || !summaryTable) return
  const width = mainTable.offsetWidth
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
 * 出入库明细表：
 * - 内容未超出：盒子随明细行增高（可留白）
 * - 超出可视高度：盒子锁定高度，表头固定，数据区滚动
 * - 底部「添加明细行 / 合计」始终在盒子最下方
 * - 横向滚动仅保留底部合计区域一条滚动条
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

    syncFooterTableWidth(panel)

    const footerScroll = panel.querySelector('.line-summary-scroll')
    const tableHeader = panel.querySelector('.ant-table-header')
    const tableBody = panel.querySelector('.ant-table-body')
    if (!footerScroll) return

    const applyScrollLeft = (left) => {
      if (tableHeader && tableHeader.scrollLeft !== left) {
        tableHeader.scrollLeft = left
      }
      if (tableBody && tableBody.scrollLeft !== left) {
        tableBody.scrollLeft = left
      }
    }

    const onFooterScroll = () => {
      applyScrollLeft(footerScroll.scrollLeft)
    }

    footerScroll.addEventListener('scroll', onFooterScroll, { passive: true })
    teardownScrollSync = () => footerScroll.removeEventListener('scroll', onFooterScroll)
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
        panelStyle.value = { maxHeight: `${availableMax}px` }
      } else {
        panelStyle.value = { maxHeight: `${availableMax}px` }
      }
    } else {
      const nextY = Math.max(120, availableMax - headerH - footerH)
      const nextStyle = {
        height: `${availableMax}px`,
        maxHeight: `${availableMax}px`,
        display: 'flex',
        flexDirection: 'column',
      }
      if (bodyScrollY.value !== nextY) bodyScrollY.value = nextY
      const prev = panelStyle.value
      if (
        prev.height !== nextStyle.height ||
        prev.maxHeight !== nextStyle.maxHeight ||
        prev.display !== nextStyle.display
      ) {
        panelStyle.value = nextStyle
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
    window.addEventListener('resize', debouncedUpdateScrollY)
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(debouncedUpdateScrollY)
      nextTick(() => {
        const formBody = panelRef.value?.closest('.form-body')
        if (formBody) observer.observe(formBody)
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

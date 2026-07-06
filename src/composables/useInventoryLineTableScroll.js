import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const VIEWPORT_BOTTOM_GAP = 16
const DEFAULT_HEADER_HEIGHT = 39
const DEFAULT_FOOTER_HEIGHT = 72
const DEFAULT_EMPTY_BODY_HEIGHT = 48

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

function measurePanelParts(panel) {
  const footerEl = panel.querySelector('.line-table-foot')
  const thead = panel.querySelector('.ant-table-thead')
  const tbody = panel.querySelector('.ant-table-tbody')
  const footerH = footerEl?.offsetHeight ?? DEFAULT_FOOTER_HEIGHT
  const headerH = thead?.offsetHeight ?? DEFAULT_HEADER_HEIGHT
  const bodyH = tbody?.offsetHeight ?? DEFAULT_EMPTY_BODY_HEIGHT
  return { headerH, bodyH, footerH, naturalTotal: headerH + bodyH + footerH }
}

/**
 * 出入库明细表：
 * - 内容未超出：盒子随明细行增高（可留白）
 * - 超出可视高度：盒子锁定高度，表头固定，数据区滚动
 * - 底部「添加明细行 / 合计」始终在盒子最下方
 */
export function useInventoryLineTableScroll({ scrollX, getRowCount }) {
  const panelRef = ref(null)
  const bodyScrollY = ref(undefined)
  const panelStyle = ref({})
  let observer = null
  let measuring = false

  async function updateScrollY() {
    const panel = panelRef.value
    if (!panel || measuring) return
    measuring = true

    const availableMax = getAvailableMaxHeight(panel)

    bodyScrollY.value = undefined
    panelStyle.value = { maxHeight: `${availableMax}px` }

    await nextTick()
    await nextTick()

    const { headerH, footerH, naturalTotal } = measurePanelParts(panel)

    if (naturalTotal <= availableMax) {
      bodyScrollY.value = undefined
      panelStyle.value = { maxHeight: `${availableMax}px` }
    } else {
      bodyScrollY.value = Math.max(120, availableMax - headerH - footerH)
      panelStyle.value = {
        height: `${availableMax}px`,
        maxHeight: `${availableMax}px`,
        display: 'flex',
        flexDirection: 'column',
      }
    }

    measuring = false
  }

  onMounted(() => {
    nextTick(updateScrollY)
    window.addEventListener('resize', updateScrollY)
    window.addEventListener('scroll', updateScrollY, true)
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateScrollY())
      nextTick(() => {
        const formBody = panelRef.value?.closest('.form-body')
        if (formBody) observer.observe(formBody)
      })
    }
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateScrollY)
    window.removeEventListener('scroll', updateScrollY, true)
    observer?.disconnect()
    observer = null
  })

  watch(
    () => getRowCount(),
    () => nextTick(updateScrollY),
  )

  const isScrolling = computed(() => bodyScrollY.value != null)

  const tableScroll = computed(() => {
    const scroll = { x: typeof scrollX === 'object' ? scrollX.value : scrollX }
    if (bodyScrollY.value) scroll.y = bodyScrollY.value
    return scroll
  })

  return { panelRef, panelStyle, tableScroll, isScrolling, updateScrollY }
}

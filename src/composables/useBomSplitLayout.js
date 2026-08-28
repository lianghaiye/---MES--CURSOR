import { ref, watch, onMounted, onUnmounted } from 'vue'

const STORAGE_COLLAPSED = 'i_doms_bom_tree_collapsed'
const STORAGE_WIDTH = 'i_doms_bom_tree_width'
const MIN_LEFT_WIDTH = 200
const MAX_LEFT_WIDTH = 520
const DEFAULT_WIDTH = 280

function scopedKey(base, scopeKey) {
  return scopeKey ? `${base}_${scopeKey}` : base
}

function readCollapsed(scopeKey) {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_COLLAPSED, scopeKey))
    if (raw != null) return raw === '1' || raw === 'true'
  } catch {
    /* ignore */
  }
  return false
}

function readWidth(scopeKey) {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_WIDTH, scopeKey))
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, n))
  } catch {
    /* ignore */
  }
  return DEFAULT_WIDTH
}

/**
 * BOM 详情/编辑页左右分栏：树面板宽度、折叠状态与拖拽调宽。
 * @param {{ scopeKey?: string }} [options]
 */
export function useBomSplitLayout(options = {}) {
  const scopeKey = options.scopeKey || ''
  const leftSidebarCollapsed = ref(readCollapsed(scopeKey))
  const leftPanelWidth = ref(readWidth(scopeKey))

  let resizing = false
  let resizeStartX = 0
  let resizeStartWidth = 0

  function collapseLeft() {
    leftSidebarCollapsed.value = true
  }

  function expandLeft() {
    leftSidebarCollapsed.value = false
  }

  function toggleLeft() {
    leftSidebarCollapsed.value = !leftSidebarCollapsed.value
  }

  function onResizeMouseDown(e) {
    resizing = true
    resizeStartX = e.clientX
    resizeStartWidth = leftPanelWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onResizeMouseMove(e) {
    if (!resizing) return
    const next = resizeStartWidth + (e.clientX - resizeStartX)
    leftPanelWidth.value = Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, next))
  }

  function onResizeMouseUp() {
    if (!resizing) return
    resizing = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  watch(leftSidebarCollapsed, (value) => {
    try {
      localStorage.setItem(scopedKey(STORAGE_COLLAPSED, scopeKey), value ? '1' : '0')
    } catch {
      /* ignore */
    }
  })

  watch(leftPanelWidth, (value) => {
    try {
      localStorage.setItem(scopedKey(STORAGE_WIDTH, scopeKey), String(value))
    } catch {
      /* ignore */
    }
  })

  onMounted(() => {
    document.addEventListener('mousemove', onResizeMouseMove)
    document.addEventListener('mouseup', onResizeMouseUp)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', onResizeMouseMove)
    document.removeEventListener('mouseup', onResizeMouseUp)
  })

  return {
    leftSidebarCollapsed,
    leftPanelWidth,
    collapseLeft,
    expandLeft,
    toggleLeft,
    onResizeMouseDown,
    MIN_LEFT_WIDTH,
    MAX_LEFT_WIDTH,
  }
}

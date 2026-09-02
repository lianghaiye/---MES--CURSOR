import { computed, onMounted, onUnmounted, ref, toValue } from 'vue'
import {
  DRAWER_MASK_STYLE,
  DRAWER_PLACEMENT,
  DRAWER_WIDTH_PX,
  DRAWER_NARROW_BREAKPOINT,
  normalizeDrawerSize,
} from '@/utils/drawerWidth'

/**
 * 抽屉宽度：S 360 / M 520 / L 720；≤768px 自动 100%
 *
 * @param {import('vue').MaybeRefOrGetter<'s'|'m'|'l'>} [sizeSource='m']
 */
export function useDrawerWidth(sizeSource = 'm') {
  const isNarrowViewport = ref(false)

  function updateViewport() {
    if (typeof window === 'undefined') return
    isNarrowViewport.value = window.innerWidth <= DRAWER_NARROW_BREAKPOINT
  }

  onMounted(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateViewport)
  })

  const drawerSize = computed(() => normalizeDrawerSize(toValue(sizeSource)))

  const drawerWidth = computed(() => {
    if (isNarrowViewport.value) return '100%'
    return DRAWER_WIDTH_PX[drawerSize.value]
  })

  /** 可直接 v-bind 到 a-drawer */
  const drawerBind = computed(() => ({
    placement: DRAWER_PLACEMENT,
    width: drawerWidth.value,
    maskStyle: DRAWER_MASK_STYLE,
  }))

  return {
    drawerSize,
    drawerWidth,
    drawerBind,
    isNarrowViewport,
  }
}

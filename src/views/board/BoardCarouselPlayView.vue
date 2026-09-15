<template>
  <div ref="rootRef" class="carousel-play" @mousemove="showChrome" @click="showChrome">
    <div v-if="fatalError" class="fatal">
      <div class="fatal-title">{{ fatalError }}</div>
      <a-button type="primary" @click="closeOrBack">关闭</a-button>
    </div>

    <template v-else>
      <div class="stage" :class="[`trans-${scheme?.transition || 'cut'}`, { sliding }]">
        <div
          v-for="(slide, idx) in slides"
          :key="slide.key"
          class="slide"
          :class="{
            active: idx === currentIndex,
            prev: idx === prevIndex,
          }"
        >
          <iframe
            v-if="!slide.embedBlocked"
            class="frame"
            :src="slide.src"
            :title="slide.title"
            @load="onFrameLoad(idx)"
            @error="onFrameError(idx)"
          />
          <div v-else class="embed-block">
            <div class="embed-title">该页面不允许嵌入</div>
            <div class="embed-sub">{{ slide.title }}</div>
            <a-button type="primary" ghost @click="openExternal(slide.src)">打开原址</a-button>
          </div>
        </div>
      </div>

      <div v-if="finished" class="finished-mask">
        <div class="finished-title">已播完</div>
        <a-button type="primary" @click="restart">重新播放</a-button>
      </div>

      <div class="chrome" :class="{ visible: chromeVisible || paused || finished }">
        <div class="badge">{{ badgeText }}</div>
        <div class="controls">
          <a-button size="small" @click="goPrev">上一页</a-button>
          <a-button size="small" type="primary" @click="togglePause">
            {{ paused ? '继续' : '暂停' }}
          </a-button>
          <a-button size="small" @click="goNext(true)">下一页</a-button>
          <a-button size="small" @click="closeOrBack">退出</a-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCarouselSchemeById, resolvePlayableItems } from '@/store/boardCarouselStore'

const route = useRoute()
const router = useRouter()

const rootRef = ref(null)
const scheme = ref(null)
const slides = ref([])
const currentIndex = ref(0)
const prevIndex = ref(-1)
const paused = ref(false)
const finished = ref(false)
const sliding = ref(false)
const chromeVisible = ref(true)
const fatalError = ref('')

let timer = null
let chromeTimer = null
let slideAnimTimer = null

const badgeText = computed(() => {
  if (!slides.value.length) return ''
  const cur = slides.value[currentIndex.value]
  return `${cur?.title || '—'} · ${currentIndex.value + 1}/${slides.value.length}`
})

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function scheduleNext() {
  clearTimer()
  if (paused.value || finished.value || !slides.value.length) return
  const dwell = Math.max(1, slides.value[currentIndex.value]?.dwellSeconds || 15) * 1000
  timer = setTimeout(() => goNext(false), dwell)
}

function showChrome() {
  chromeVisible.value = true
  if (chromeTimer) clearTimeout(chromeTimer)
  chromeTimer = setTimeout(() => {
    if (!paused.value && !finished.value) chromeVisible.value = false
  }, 2500)
}

function applyTransitionHint() {
  sliding.value = true
  if (slideAnimTimer) clearTimeout(slideAnimTimer)
  slideAnimTimer = setTimeout(() => {
    sliding.value = false
  }, 450)
}

function goTo(index, { manual = false } = {}) {
  if (!slides.value.length) return
  const n = slides.value.length
  let next = index
  if (next < 0) next = n - 1
  if (next >= n) {
    if (scheme.value?.afterRound === 'stop') {
      finished.value = true
      paused.value = true
      clearTimer()
      return
    }
    next = 0
  }
  prevIndex.value = currentIndex.value
  currentIndex.value = next
  finished.value = false
  applyTransitionHint()
  if (!manual) scheduleNext()
  else scheduleNext()
}

function goNext(manual) {
  goTo(currentIndex.value + 1, { manual })
}

function goPrev() {
  finished.value = false
  goTo(currentIndex.value - 1, { manual: true })
}

function togglePause() {
  if (finished.value) return
  paused.value = !paused.value
  if (paused.value) clearTimer()
  else scheduleNext()
  showChrome()
}

function restart() {
  finished.value = false
  paused.value = false
  currentIndex.value = 0
  prevIndex.value = -1
  scheduleNext()
  showChrome()
}

function openExternal(url) {
  window.open(url, '_blank')
}

function onFrameLoad() {
  /* noop — X-Frame 无法可靠检测；用户可通过占位手动标记未来扩展 */
}

function onFrameError(idx) {
  if (slides.value[idx]) slides.value[idx].embedBlocked = true
}

function closeOrBack() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.()
  }
  if (window.history.length > 1) router.back()
  else window.close()
}

function loadScheme() {
  const id = route.params.schemeId
  const s = getCarouselSchemeById(id)
  if (!s) {
    fatalError.value = '轮播方案不存在'
    return
  }
  if (s.enabled === false) {
    fatalError.value = '该轮播方案已停用'
    return
  }
  scheme.value = s
  const playable = resolvePlayableItems(s).map((p) => ({ ...p, embedBlocked: false }))
  if (!playable.length) {
    fatalError.value = '没有可播放的有效条目（看板可能已停用或地址无效）'
    return
  }
  slides.value = playable
  currentIndex.value = 0
  scheduleNext()
  showChrome()
}

async function tryFullscreen() {
  if (route.query.fullscreen !== '1') return
  try {
    await rootRef.value?.requestFullscreen?.()
  } catch {
    /* 浏览器可能拒绝 */
  }
}

function onKey(e) {
  if (e.code === 'Space') {
    e.preventDefault()
    togglePause()
  } else if (e.code === 'ArrowRight') goNext(true)
  else if (e.code === 'ArrowLeft') goPrev()
  else if (e.code === 'Escape') showChrome()
}

onMounted(() => {
  loadScheme()
  tryFullscreen()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  clearTimer()
  if (chromeTimer) clearTimeout(chromeTimer)
  if (slideAnimTimer) clearTimeout(slideAnimTimer)
  window.removeEventListener('keydown', onKey)
})

watch(
  () => route.params.schemeId,
  () => {
    fatalError.value = ''
    clearTimer()
    loadScheme()
  },
)
</script>

<style scoped lang="less">
.carousel-play {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  color: #fff;
}

.fatal {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
}

.fatal-title {
  font-size: 20px;
}

.stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateX(0);
  z-index: 0;
}

.slide.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 2;
}

.frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: #111;
}

.embed-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  background: #1a1a1a;
}

.embed-title {
  font-size: 22px;
  font-weight: 600;
}

.embed-sub {
  opacity: 0.65;
  max-width: 80%;
  word-break: break-all;
  text-align: center;
}

/* fade */
.trans-fade .slide {
  transition: opacity 0.4s ease;
}

/* cut — no transition */
.trans-cut .slide {
  transition: none;
}

/* slide */
.trans-slide .slide {
  transition:
    transform 0.4s ease,
    opacity 0.4s ease;
  opacity: 0;
  transform: translateX(40px);
}

.trans-slide .slide.active {
  opacity: 1;
  transform: translateX(0);
}

.trans-slide .slide.prev {
  opacity: 0;
  transform: translateX(-40px);
}

.finished-mask {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.finished-title {
  font-size: 28px;
  font-weight: 600;
}

.chrome {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.chrome.visible {
  opacity: 1;
  pointer-events: auto;
}

.badge {
  font-size: 14px;
  opacity: 0.9;
}

.controls {
  display: flex;
  gap: 8px;
}
</style>

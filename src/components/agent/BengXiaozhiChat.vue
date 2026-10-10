<template>
  <div class="bxz-root" :data-theme="theme">
    <!-- 可拖动悬浮小人 -->
    <div
      v-show="!open"
      class="bxz-fab"
      :class="{ 'is-dragging': dragging }"
      :style="fabStyle"
      @pointerdown="onFabPointerDown"
    >
      <div class="bxz-fab__hover-bubble" aria-hidden="true">
        <span>我是泵小智，</span>
        <span>有疑问可以问我哦！～</span>
      </div>
      <button type="button" class="bxz-fab__hit" title="泵小智" @click="onFabClick">
        <img :src="avatarUrl" alt="泵小智" class="bxz-fab__avatar" draggable="false" />
      </button>
    </div>

    <!-- 遮罩（大尺寸抽屉） -->
    <div v-if="open && sizeMode === 'large'" class="bxz-mask" @click="open = false" />

    <!-- 对话面板：小窗 / 右侧抽屉 -->
    <div
      v-show="open"
      class="bxz-panel"
      :class="sizeMode === 'large' ? 'bxz-panel--drawer' : 'bxz-panel--small'"
      :style="panelStyle"
      role="dialog"
      aria-label="泵小智助手"
    >
      <div
        v-if="sizeMode === 'large'"
        class="bxz-resize"
        title="拖动调整宽度"
        @pointerdown.stop="onResizePointerDown"
      />
      <header class="bxz-panel__header">
        <div class="bxz-panel__brand">
          <img :src="avatarUrl" alt="" class="bxz-panel__avatar" />
          <div>
            <div class="bxz-panel__title">泵小智</div>
            <div class="bxz-panel__sub">MES 智能助手</div>
          </div>
        </div>
        <div class="bxz-panel__actions">
          <button
            type="button"
            class="bxz-icon-btn"
            :title="sizeMode === 'small' ? '放大为右侧抽屉' : '缩小为浮窗'"
            @click="toggleSize"
          >
            {{ sizeMode === 'small' ? '放大' : '缩小' }}
          </button>
          <button type="button" class="bxz-icon-btn" title="新对话" @click="resetChat">
            新对话
          </button>
          <button type="button" class="bxz-icon-btn" title="关闭" @click="open = false">✕</button>
        </div>
      </header>

      <div ref="listRef" class="bxz-panel__body">
        <div v-if="!hasUserMessage" class="bxz-welcome">
          <img :src="avatarUrl" alt="" class="bxz-welcome__avatar" />
          <div class="bxz-welcome__name">泵小智</div>
          <div class="bxz-welcome__bubble">
            HI!
            ～我是泵小智，你的专属人工智能助手～我可以回答有关系统操作、功能使用、报错处理、业务流程有关的问题哦！～请把你的疑问交给我也吧！～
          </div>
          <div class="bxz-welcome__tips">
            <button
              v-for="q in suggestions"
              :key="q"
              type="button"
              class="bxz-tip"
              :disabled="sending"
              @click="sendText(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <template v-else>
          <div
            v-for="(m, idx) in messages"
            :key="idx"
            class="bxz-msg"
            :class="m.role === 'user' ? 'bxz-msg--user' : 'bxz-msg--bot'"
          >
            <img v-if="m.role === 'assistant'" :src="avatarUrl" alt="" class="bxz-msg__avatar" />
            <div class="bxz-msg__bubble" :class="{ 'is-error': m.error }">
              <span class="bxz-msg__text">{{ m.content }}</span>
              <span v-if="m.streaming" class="bxz-msg__cursor">▍</span>
            </div>
          </div>
        </template>
      </div>

      <footer class="bxz-panel__footer">
        <div v-if="followUps.length" class="bxz-followups">
          <button
            v-for="f in followUps"
            :key="f"
            type="button"
            class="bxz-tip bxz-tip--sm"
            :disabled="sending"
            @click="sendText(f)"
          >
            {{ f }}
          </button>
        </div>
        <div class="bxz-composer">
          <textarea
            v-model="input"
            class="bxz-composer__input"
            rows="2"
            placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
            :disabled="sending"
            @keydown="onKeydown"
          />
          <button
            type="button"
            class="bxz-composer__send"
            :disabled="sending || !input.trim()"
            @click="sendText(input)"
          >
            {{ sending ? '…' : '发送' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { streamAgentChat } from '@/api/agent'
import { effectiveTheme } from '@/store/uiAppearanceStore'
import avatarUrl from '@/assets/agent/beng-xiaozhi-mascot.png'

const FAB_POS_KEY = 'i_doms_bxz_fab_pos'
const SIZE_KEY = 'i_doms_bxz_size_mode'
const DRAWER_W_KEY = 'i_doms_bxz_drawer_width'
const DRAWER_MIN = 360
const DRAWER_MAX = 880

const suggestions = [
  '如何快速查看我负责的工单和任务进度？',
  '怎么创建销售订单？',
  '质检模板怎么配？',
]

const theme = effectiveTheme
const open = ref(false)
const sizeMode = ref('small') // small | large
const input = ref('')
const sending = ref(false)
const conversationId = ref('')
const messages = ref([])
const followUps = ref([])
const listRef = ref(null)
let abortCtrl = null

const fabPos = ref({ right: 28, bottom: 28 })
const drawerWidth = ref(440)
const dragging = ref(false)
let dragMoved = false
let dragState = null
let resizeState = null

const hasUserMessage = computed(() => messages.value.some((m) => m.role === 'user'))

const fabStyle = computed(() => ({
  right: `${fabPos.value.right}px`,
  bottom: `${fabPos.value.bottom}px`,
  left: 'auto',
  top: 'auto',
}))

const panelStyle = computed(() => {
  if (sizeMode.value !== 'large') return undefined
  return { width: `${clampDrawer(drawerWidth.value)}px` }
})

function loadPrefs() {
  try {
    const pos = JSON.parse(localStorage.getItem(FAB_POS_KEY) || 'null')
    if (pos && typeof pos.right === 'number' && typeof pos.bottom === 'number') {
      fabPos.value = clampFab(pos.right, pos.bottom)
    }
  } catch {
    /* ignore */
  }
  const size = localStorage.getItem(SIZE_KEY)
  if (size === 'small' || size === 'large') sizeMode.value = size
  const dw = Number(localStorage.getItem(DRAWER_W_KEY))
  if (Number.isFinite(dw) && dw > 0) drawerWidth.value = clampDrawer(dw)
}

function saveFabPos() {
  localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPos.value))
}

function clampDrawer(width) {
  const max =
    typeof window !== 'undefined' ? Math.min(DRAWER_MAX, window.innerWidth - 24) : DRAWER_MAX
  return Math.min(Math.max(DRAWER_MIN, width), Math.max(DRAWER_MIN, max))
}

function clampFab(right, bottom) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  const fabW = 96
  const fabH = 120
  return {
    right: Math.min(Math.max(8, right), Math.max(8, w - fabW - 8)),
    bottom: Math.min(Math.max(8, bottom), Math.max(8, h - fabH - 8)),
  }
}

function onFabPointerDown(e) {
  if (e.button != null && e.button !== 0) return
  dragging.value = true
  dragMoved = false
  const startX = e.clientX
  const startY = e.clientY
  const startRight = fabPos.value.right
  const startBottom = fabPos.value.bottom
  dragState = { startX, startY, startRight, startBottom }
  e.currentTarget?.setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onFabPointerMove)
  window.addEventListener('pointerup', onFabPointerUp, { once: true })
}

function onFabPointerMove(e) {
  if (!dragState) return
  const dx = e.clientX - dragState.startX
  const dy = e.clientY - dragState.startY
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true
  // right/bottom 与鼠标方向相反
  fabPos.value = clampFab(dragState.startRight - dx, dragState.startBottom - dy)
}

function onFabPointerUp() {
  window.removeEventListener('pointermove', onFabPointerMove)
  dragging.value = false
  dragState = null
  saveFabPos()
}

function onFabClick() {
  if (dragMoved) return
  open.value = true
}

function toggleSize() {
  sizeMode.value = sizeMode.value === 'small' ? 'large' : 'small'
  localStorage.setItem(SIZE_KEY, sizeMode.value)
}

function onResizePointerDown(e) {
  if (e.button != null && e.button !== 0) return
  e.preventDefault()
  resizeState = { startX: e.clientX, startW: drawerWidth.value }
  e.currentTarget?.setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onResizePointerMove)
  window.addEventListener('pointerup', onResizePointerUp, { once: true })
}

function onResizePointerMove(e) {
  if (!resizeState) return
  const dx = resizeState.startX - e.clientX
  drawerWidth.value = clampDrawer(resizeState.startW + dx)
}

function onResizePointerUp() {
  window.removeEventListener('pointermove', onResizePointerMove)
  resizeState = null
  localStorage.setItem(DRAWER_W_KEY, String(drawerWidth.value))
}

function resetChat() {
  abortCtrl?.abort()
  abortCtrl = null
  sending.value = false
  conversationId.value = ''
  messages.value = []
  followUps.value = []
  input.value = ''
}

async function scrollBottom() {
  await nextTick()
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendText(input.value)
  }
}

async function sendText(text) {
  const content = String(text || '').trim()
  if (!content || sending.value) return

  followUps.value = []
  input.value = ''
  messages.value.push({ role: 'user', content })
  const botMsg = { role: 'assistant', content: '', streaming: true }
  messages.value.push(botMsg)
  sending.value = true
  await scrollBottom()

  abortCtrl?.abort()
  abortCtrl = new AbortController()

  try {
    await streamAgentChat({
      content,
      conversationId: conversationId.value || undefined,
      signal: abortCtrl.signal,
      onEvent(type, data) {
        if (type === 'meta' && data.conversationId) {
          conversationId.value = data.conversationId
        }
        if (type === 'delta' && data.content) {
          botMsg.content += data.content
          if (data.conversationId) conversationId.value = data.conversationId
          scrollBottom()
        }
        if (type === 'follow_up' && data.content) {
          followUps.value = [...followUps.value, data.content].slice(-6)
        }
        if (type === 'error') {
          botMsg.error = true
          botMsg.content = botMsg.content || data.message || '回答失败，请稍后重试'
          message.error(data.message || '泵小智暂时无法回答')
        }
      },
    })
    if (!botMsg.content) {
      botMsg.content = '（未收到回复，请确认代理服务已启动且扣子配置正确）'
      botMsg.error = true
    }
  } catch (err) {
    if (err?.name === 'AbortError') return
    botMsg.error = true
    botMsg.content = err?.message || '网络异常'
    message.error(botMsg.content)
  } finally {
    botMsg.streaming = false
    sending.value = false
    await scrollBottom()
  }
}

function onResize() {
  fabPos.value = clampFab(fabPos.value.right, fabPos.value.bottom)
  drawerWidth.value = clampDrawer(drawerWidth.value)
}

onMounted(() => {
  loadPrefs()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onFabPointerMove)
  window.removeEventListener('pointermove', onResizePointerMove)
  abortCtrl?.abort()
})
</script>

<style lang="less" scoped>
.bxz-root {
  --bxz-primary: #1677ff;
  --bxz-primary-hover: #4096ff;
  --bxz-text: rgba(0, 0, 0, 0.88);
  --bxz-text-secondary: rgba(0, 0, 0, 0.45);
  --bxz-border: #f0f0f0;
  --bxz-bubble-bg: #fff;
  --bxz-user-bg: #e6f4ff;
  --bxz-tip-bg: rgba(255, 255, 255, 0.92);
  --bxz-panel-bg: #ffffff;
  --bxz-header-bg: #ffffff;
  --bxz-footer-bg: #ffffff;
  --bxz-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);

  &[data-theme='dark'] {
    --bxz-primary: #4096ff;
    --bxz-primary-hover: #69b1ff;
    --bxz-text: rgba(255, 255, 255, 0.88);
    --bxz-text-secondary: rgba(255, 255, 255, 0.45);
    --bxz-border: #303030;
    --bxz-bubble-bg: #1f1f1f;
    --bxz-user-bg: rgba(22, 119, 255, 0.28);
    --bxz-tip-bg: #2a2a2a;
    --bxz-panel-bg: #141414;
    --bxz-header-bg: #141414;
    --bxz-footer-bg: #141414;
    --bxz-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }
}

.bxz-fab {
  position: fixed;
  z-index: 1050;
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  touch-action: none;
  cursor: grab;
  user-select: none;

  &.is-dragging {
    cursor: grabbing;
  }

  &__hover-bubble {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    width: 196px;
    box-sizing: border-box;
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--bxz-bubble-bg);
    color: var(--bxz-text);
    font-size: 13px;
    line-height: 1.5;
    box-shadow: var(--bxz-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    text-align: center;
    pointer-events: none;
    opacity: 0;
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
    z-index: 2;
    white-space: nowrap;

    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--bxz-bubble-bg);
    }
  }

  &:hover:not(.is-dragging) .bxz-fab__hover-bubble {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  &__hit {
    border: none;
    background: transparent;
    padding: 0;
    cursor: inherit;
  }

  &__avatar {
    width: 88px;
    height: 88px;
    object-fit: contain;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.18));
    pointer-events: none;
  }
}

.bxz-mask {
  position: fixed;
  inset: 0;
  z-index: 1040;
  background: rgba(0, 0, 0, 0.28);
}

.bxz-panel {
  position: fixed;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  background: var(--bxz-panel-bg);
  box-shadow: var(--bxz-shadow);
  overflow: hidden;
  border: 1px solid var(--bxz-border);

  &--small {
    right: 24px;
    bottom: 24px;
    width: min(400px, calc(100vw - 32px));
    height: min(620px, calc(100vh - 48px));
    border-radius: 16px;
  }

  &--drawer {
    top: 0;
    right: 0;
    bottom: 0;
    height: 100vh;
    border-radius: 0;
    border-right: none;
    border-top: none;
    border-bottom: none;
  }
}

.bxz-resize {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 2;

  &:hover,
  &:active {
    background: var(--bxz-primary);
    opacity: 0.18;
  }
}

.bxz-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bxz-header-bg);
  border-bottom: 1px solid var(--bxz-border);
  color: var(--bxz-text);
}

.bxz-panel__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bxz-panel__avatar {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.bxz-panel__title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.bxz-panel__sub {
  font-size: 12px;
  color: var(--bxz-text-secondary);
}

.bxz-panel__actions {
  display: flex;
  gap: 6px;
}

.bxz-icon-btn {
  border: 1px solid var(--bxz-border);
  background: var(--bxz-tip-bg);
  color: var(--bxz-text);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: var(--bxz-primary);
    color: var(--bxz-primary);
  }
}

.bxz-panel__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 14px;
  background: var(--bxz-panel-bg);
}

.bxz-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--bxz-text);
  padding-top: 8px;
}

.bxz-welcome__avatar {
  width: 96px;
  height: 96px;
  object-fit: contain;
  margin-bottom: 4px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12));
}

.bxz-welcome__name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}

.bxz-welcome__bubble {
  width: 100%;
  background: var(--bxz-bubble-bg);
  color: var(--bxz-text);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.65;
  margin-bottom: 14px;
  box-shadow: var(--bxz-shadow);
  border: 1px solid var(--bxz-border);
}

.bxz-welcome__tips {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.bxz-tip {
  max-width: 100%;
  text-align: left;
  border: 1px solid var(--bxz-border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--bxz-tip-bg);
  color: var(--bxz-text);
  font-size: 13px;
  line-height: 1.45;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition:
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: var(--bxz-primary);
    color: var(--bxz-primary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--sm {
    font-size: 12px;
    padding: 6px 10px;
  }
}

.bxz-msg {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;

  &--user {
    justify-content: flex-end;

    .bxz-msg__bubble {
      background: var(--bxz-user-bg);
      border-bottom-right-radius: 4px;
    }
  }

  &--bot {
    .bxz-msg__bubble {
      background: var(--bxz-bubble-bg);
      border-bottom-left-radius: 4px;
    }
  }
}

.bxz-msg__avatar {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
  margin-top: 2px;
}

.bxz-msg__bubble {
  max-width: 82%;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--bxz-text);
  border: 1px solid var(--bxz-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  &.is-error {
    background: #fff2f0;
    color: #a8071a;
    border-color: #ffccc7;
  }
}

.bxz-msg__cursor {
  display: inline-block;
  margin-left: 2px;
  animation: bxz-blink 1s step-end infinite;
}

@keyframes bxz-blink {
  50% {
    opacity: 0;
  }
}

.bxz-panel__footer {
  padding: 10px 12px 12px;
  background: var(--bxz-footer-bg);
  border-top: 1px solid var(--bxz-border);
}

.bxz-followups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.bxz-composer {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.bxz-composer__input {
  flex: 1;
  resize: none;
  border: 1px solid var(--bxz-border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  line-height: 1.45;
  outline: none;
  font-family: inherit;
  background: var(--bxz-bubble-bg);
  color: var(--bxz-text);

  &:focus {
    border-color: var(--bxz-primary);
  }

  &:disabled {
    opacity: 0.7;
  }
}

.bxz-composer__send {
  flex-shrink: 0;
  height: 40px;
  min-width: 64px;
  border: none;
  border-radius: 10px;
  background: var(--bxz-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--bxz-primary-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

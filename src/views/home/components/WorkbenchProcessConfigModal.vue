<template>
  <a-modal
    :open="open"
    title="配置工序"
    width="720px"
    destroy-on-close
    ok-text="确定"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <p class="hint">可通过拖拽，对面板上的工序进行排序；勾选后展示在「工序任务」卡片中。</p>

    <div class="section-label">已显示工序</div>
    <div class="process-zone shown" @dragover.prevent @drop="onDropZone('shown')">
      <div
        v-for="(item, index) in shownList"
        :key="item.id"
        class="process-chip"
        :class="{ dragging: dragId === item.id }"
        draggable="true"
        @dragstart="onDragStart(item.id, 'shown', index)"
        @dragover.prevent="onDragOver('shown', index)"
        @drop.stop="onDropItem('shown', index)"
        @dragend="onDragEnd"
      >
        <a-checkbox :checked="true" @change="() => unshow(item.id)" />
        <span class="chip-name">{{ item.name }}</span>
        <span class="drag-handle" title="拖拽排序">
          <HolderOutlined />
        </span>
      </div>
      <div v-if="!shownList.length" class="zone-empty">勾选下方工序以展示到面板</div>
    </div>

    <div class="section-label">未显示工序</div>
    <div class="process-zone hidden" @dragover.prevent @drop="onDropZone('hidden')">
      <div
        v-for="(item, index) in hiddenList"
        :key="item.id"
        class="process-chip"
        :class="{ dragging: dragId === item.id }"
        draggable="true"
        @dragstart="onDragStart(item.id, 'hidden', index)"
        @dragover.prevent="onDragOver('hidden', index)"
        @drop.stop="onDropItem('hidden', index)"
        @dragend="onDragEnd"
      >
        <a-checkbox :checked="false" @change="() => show(item.id)" />
        <span class="chip-name">{{ item.name }}</span>
        <span class="drag-handle" title="拖拽排序">
          <HolderOutlined />
        </span>
      </div>
      <div v-if="!hiddenList.length" class="zone-empty">全部工序已展示</div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { HolderOutlined } from '@ant-design/icons-vue'
import { WORKBENCH_PROCESS_CATALOG } from '@/mock/workbench'
import { listVisibleProcessIds, saveVisibleProcessIds } from '@/store/workbenchStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const shownIds = ref([])
const dragId = ref(null)
const dragFrom = ref(null)
const dragFromIndex = ref(-1)

watch(
  () => props.open,
  (open) => {
    if (open) shownIds.value = listVisibleProcessIds()
  },
)

const shownList = computed(() =>
  shownIds.value.map((id) => WORKBENCH_PROCESS_CATALOG.find((p) => p.id === id)).filter(Boolean),
)

const hiddenList = computed(() =>
  WORKBENCH_PROCESS_CATALOG.filter((p) => !shownIds.value.includes(p.id)),
)

function show(id) {
  if (shownIds.value.includes(id)) return
  shownIds.value = [...shownIds.value, id]
}

function unshow(id) {
  shownIds.value = shownIds.value.filter((x) => x !== id)
}

function onDragStart(id, zone, index) {
  dragId.value = id
  dragFrom.value = zone
  dragFromIndex.value = index
}

function onDragOver() {
  /* allow drop */
}

function onDragEnd() {
  dragId.value = null
  dragFrom.value = null
  dragFromIndex.value = -1
}

function moveId(id, toZone, toIndex) {
  let nextShown = [...shownIds.value]
  nextShown = nextShown.filter((x) => x !== id)
  if (toZone === 'shown') {
    const insertAt = Math.max(0, Math.min(toIndex ?? nextShown.length, nextShown.length))
    nextShown.splice(insertAt, 0, id)
  }
  shownIds.value = nextShown
}

function onDropItem(zone, index) {
  if (!dragId.value) return
  moveId(dragId.value, zone, index)
  onDragEnd()
}

function onDropZone(zone) {
  if (!dragId.value) return
  if (zone === 'shown') moveId(dragId.value, 'shown', shownIds.value.length)
  else moveId(dragId.value, 'hidden')
  onDragEnd()
}

function handleOk() {
  const res = saveVisibleProcessIds(shownIds.value)
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  emit('saved')
  emit('update:open', false)
}
</script>

<script>
export default { name: 'WorkbenchProcessConfigModal' }
</script>

<style lang="less" scoped>
.hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.section-label {
  margin: 12px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
}

.process-zone {
  min-height: 72px;
  padding: 10px;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;
  background: #fafafa;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  &.shown {
    border-color: #91caff;
    background: #f5f9ff;
  }
}

.zone-empty {
  width: 100%;
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.35);
}

.process-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  background: #fff;
  cursor: grab;
  user-select: none;
  transition:
    box-shadow 0.15s,
    border-color 0.15s;

  &:hover {
    border-color: #91caff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.08);
  }

  &.dragging {
    opacity: 0.55;
  }
}

.chip-name {
  flex: 1;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.drag-handle {
  color: rgba(0, 0, 0, 0.35);
  font-size: 14px;
  display: inline-flex;
}
</style>

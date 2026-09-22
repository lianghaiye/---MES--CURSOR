<template>
  <div class="route-editor-layout">
    <div class="grid-tip">
      温馨提示：目前支持最大并行数: {{ MAX_ROUTE_PARALLEL }}，最大步数: {{ MAX_ROUTE_STEPS }}
    </div>

    <div class="editor-main">
      <!-- 左侧：工序分类 + 工序列表 -->
      <div class="left-panel panel-box" :style="{ width: `${leftWidth}px` }">
        <div class="box-title">工序</div>
        <ul class="category-list">
          <li
            v-for="cat in activeCategories"
            :key="cat"
            class="category-item"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >
            {{ cat }}
          </li>
        </ul>
        <div class="process-gallery-box">
          <div class="process-gallery">
            <div
              v-for="proc in currentProcesses"
              :key="proc.id"
              class="process-tile"
              :class="{ active: pendingProcessId === proc.id }"
              draggable="true"
              :title="proc.name"
              @click="selectPendingProcess(proc)"
              @dragstart="onDragStart(proc, $event)"
            >
              {{ proc.name }}
            </div>
          </div>
        </div>
      </div>
      <div class="resize-handle" title="拖动调整宽度" @mousedown.prevent="startResize" />

      <!-- 中间：流程网格 -->
      <div class="center-panel panel-box">
        <div class="grid-area">
          <div class="grid-scroll">
            <div class="grid-header">
              <div class="corner-cell" />
              <template v-for="col in stepCount" :key="`h-${col}`">
                <div class="step-header">第{{ col }}步</div>
                <a-button
                  type="link"
                  size="small"
                  class="gap-add-btn"
                  :disabled="stepCount >= MAX_ROUTE_STEPS"
                  title="在此之后插入一步"
                  @click="insertStepAt(col - 1)"
                >
                  +
                </a-button>
              </template>
            </div>
            <template v-for="row in rowCount" :key="`r-${row}`">
              <div class="grid-row">
                <div class="row-label">{{ row }}</div>
                <template v-for="col in stepCount" :key="`${row}-${col}`">
                  <div
                    class="grid-cell"
                    :class="{
                      selected: isSelected(col - 1, row - 1),
                      filled: hasCell(col - 1, row - 1),
                    }"
                    @click="onCellClick(col - 1, row - 1)"
                    @dragover.prevent
                    @drop="onDrop(col - 1, row - 1, $event)"
                  >
                    <template v-if="getCellProcess(col - 1, row - 1)">
                      <div class="cell-tile">
                        <CloseOutlined
                          class="cell-remove"
                          @click.stop="removeCell(col - 1, row - 1)"
                        />
                        <span class="cell-name">{{ getCellProcess(col - 1, row - 1).name }}</span>
                      </div>
                    </template>
                  </div>
                  <div v-if="col < stepCount" class="cell-gap-spacer" />
                </template>
              </div>
              <div class="row-gap">
                <div class="corner-cell" />
                <a-button
                  type="link"
                  size="small"
                  class="gap-add-btn row-gap-btn"
                  :disabled="rowCount >= MAX_ROUTE_PARALLEL"
                  title="在此之后插入一行"
                  @click="insertRowAt(row - 1)"
                >
                  +
                </a-button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 右侧：工序信息 + 文件配置 -->
      <div class="right-panel panel-box">
        <template v-if="selectedMeta">
          <div class="box-title">工序信息</div>
          <div class="info-rows">
            <div class="info-row">
              <span class="k">工序名称：</span>
              <span class="v">{{ selectedMeta.processName || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="k">工序编号：</span>
              <span class="v">{{ selectedMeta.processCode || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="k">资源类型：</span>
              <span class="v">{{ selectedMeta.resourceType || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="k">报工类型：</span>
              <span class="v">{{ selectedMeta.reportMode || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="k">工序配置项：</span>
              <span class="v">
                <template v-if="selectedMeta.configLabels?.length">
                  <a-tag
                    v-for="label in selectedMeta.configLabels"
                    :key="label"
                    color="blue"
                    class="config-tag"
                  >
                    {{ label }}
                  </a-tag>
                </template>
                <template v-else>—</template>
              </span>
            </div>
          </div>

          <div class="box-title sub-title">文件配置</div>
          <a-form layout="vertical" size="small" class="file-form">
            <a-form-item label="工艺文件">
              <a-select
                :value="selectedMeta.processFileId"
                allow-clear
                show-search
                size="small"
                placeholder="请选择 工艺文件"
                :options="docOpts"
                :filter-option="filterDocOption"
                @change="onDocChange"
              />
            </a-form-item>
          </a-form>
        </template>
        <div v-else class="right-empty">请点击网格中的工序</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import {
  getActiveProcessCategories,
  getProcessesByCategory,
  getProcessById,
} from '@/store/processConfigStore'
import { getEnabledProcessDocs } from '@/store/processDocStore'
import {
  MAX_ROUTE_PARALLEL,
  MAX_ROUTE_STEPS,
  normalizeGrid,
  getSelectedCellMeta,
  insertStepAfter,
  insertRowAfter,
} from '@/utils/processRouteGrid'

const props = defineProps({
  grid: { type: Array, default: () => [] },
  selectedStep: { type: Number, default: -1 },
  selectedRow: { type: Number, default: -1 },
})

const emit = defineEmits(['update:grid', 'update:selectedStep', 'update:selectedRow'])

const activeCategories = computed(() => getActiveProcessCategories())
const activeCategory = ref('')
const pendingProcessId = ref('')
const dragProcessId = ref('')
const leftWidth = ref(220)

const localGrid = ref(normalizeGrid(props.grid))

watch(
  activeCategories,
  (cats) => {
    if (!cats.length) {
      activeCategory.value = ''
      return
    }
    if (!cats.includes(activeCategory.value)) activeCategory.value = cats[0]
  },
  { immediate: true },
)

watch(
  () => props.grid,
  (v) => {
    localGrid.value = normalizeGrid(v)
  },
  { deep: true },
)

const stepCount = computed(() => localGrid.value.length || 1)
const rowCount = computed(() => Math.max(1, localGrid.value[0]?.length || 1))

const currentProcesses = computed(() => getProcessesByCategory(activeCategory.value))

const docOpts = computed(() =>
  getEnabledProcessDocs().map((d) => ({
    label: d.name,
    value: d.id,
  })),
)

const selectedMeta = computed(() => {
  if (props.selectedStep < 0 || props.selectedRow < 0) return null
  return getSelectedCellMeta(localGrid.value, props.selectedStep, props.selectedRow)
})

function emitGrid() {
  emit('update:grid', normalizeGrid(localGrid.value))
}

function isSelected(step, row) {
  return props.selectedStep === step && props.selectedRow === row
}

function hasCell(step, row) {
  return Boolean(localGrid.value[step]?.[row]?.processId)
}

function getCellProcess(step, row) {
  const cell = localGrid.value[step]?.[row]
  if (!cell?.processId) return null
  const proc = getProcessById(cell.processId)
  return proc ? { ...proc, processFileId: cell.processFileId } : { name: cell.processName }
}

function selectPendingProcess(proc) {
  pendingProcessId.value = proc.id
}

function onDragStart(proc, e) {
  dragProcessId.value = proc.id
  e.dataTransfer?.setData('text/plain', proc.id)
}

function placeProcess(step, row, processId) {
  if (!processId) return
  if (step >= MAX_ROUTE_STEPS) {
    message.warning(`最大步数 ${MAX_ROUTE_STEPS}`)
    return
  }
  if (row >= MAX_ROUTE_PARALLEL) {
    message.warning(`最大并行数 ${MAX_ROUTE_PARALLEL}`)
    return
  }
  const proc = getProcessById(processId)
  if (!localGrid.value[step]) localGrid.value[step] = []
  localGrid.value[step][row] = {
    processId,
    processName: proc?.name,
    processFileId: localGrid.value[step][row]?.processFileId || '',
  }
  emitGrid()
  emit('update:selectedStep', step)
  emit('update:selectedRow', row)
}

function onCellClick(step, row) {
  if (pendingProcessId.value) {
    placeProcess(step, row, pendingProcessId.value)
    pendingProcessId.value = ''
    return
  }
  emit('update:selectedStep', step)
  emit('update:selectedRow', row)
}

function onDrop(step, row, e) {
  const id = e.dataTransfer?.getData('text/plain') || dragProcessId.value
  placeProcess(step, row, id)
  dragProcessId.value = ''
}

function removeCell(step, row) {
  if (localGrid.value[step]) localGrid.value[step][row] = null
  emitGrid()
  if (isSelected(step, row)) {
    emit('update:selectedStep', -1)
    emit('update:selectedRow', -1)
  }
}

function insertStepAt(afterIndex) {
  if (stepCount.value >= MAX_ROUTE_STEPS) {
    message.warning(`最大步数 ${MAX_ROUTE_STEPS}`)
    return
  }
  localGrid.value = insertStepAfter(localGrid.value, afterIndex)
  if (props.selectedStep > afterIndex) {
    emit('update:selectedStep', props.selectedStep + 1)
  }
  emitGrid()
}

function insertRowAt(afterIndex) {
  if (rowCount.value >= MAX_ROUTE_PARALLEL) {
    message.warning(`最大并行数 ${MAX_ROUTE_PARALLEL}`)
    return
  }
  localGrid.value = insertRowAfter(localGrid.value, afterIndex)
  if (props.selectedRow > afterIndex) {
    emit('update:selectedRow', props.selectedRow + 1)
  }
  emitGrid()
}

function onDocChange(docId) {
  const step = props.selectedStep
  const row = props.selectedRow
  const cell = localGrid.value[step]?.[row]
  if (!cell) return
  cell.processFileId = docId || ''
  emitGrid()
}

function filterDocOption(input, option) {
  const kw = String(input || '')
    .trim()
    .toLowerCase()
  if (!kw) return true
  return String(option?.label || '')
    .toLowerCase()
    .includes(kw)
}

function startResize(e) {
  const startX = e.clientX
  const startW = leftWidth.value
  const onMove = (ev) => {
    leftWidth.value = Math.min(360, Math.max(180, startW + (ev.clientX - startX)))
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.route-editor-layout {
  background: transparent;
}

.grid-tip {
  padding: 8px 0 12px;
  font-size: 13px;
  color: #666;
}

.editor-main {
  display: flex;
  align-items: stretch;
  min-height: 480px;
  gap: 0;
}

.panel-box {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
}

.left-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 480px;
}

.resize-handle {
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  align-self: stretch;
  margin: 0 4px;
  border-radius: 3px;
  background: transparent;
}

.resize-handle:hover {
  background: #bae0ff;
}

.box-title {
  padding: 10px 12px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.box-title.sub-title {
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
  max-height: 160px;
  overflow: auto;
}

.category-item {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: #333;
  transition: background 0.2s;
}

.category-item:hover {
  background: #f5f5f5;
}

.category-item.active {
  background: #e6f4ff;
  color: #1677ff;
  font-weight: 500;
}

.process-gallery-box {
  flex: 1;
  overflow: auto;
  min-height: 200px;
}

.process-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px;
}

.process-tile {
  min-height: 52px;
  border: 1px solid #91caff;
  border-radius: 4px;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6px 4px;
  cursor: grab;
  user-select: none;
  line-height: 1.3;
}

.process-tile.active {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.25);
  font-weight: 600;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 4px;
  margin-right: 8px;
}

.grid-area {
  flex: 1;
  overflow: auto;
  padding: 12px;
  min-height: 280px;
}

.grid-scroll {
  min-width: max-content;
}

.grid-header,
.grid-row {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 0;
}

.corner-cell,
.row-label {
  width: 32px;
  text-align: center;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.step-header {
  width: 96px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  flex-shrink: 0;
}

.gap-add-btn {
  padding: 0 2px;
  height: auto;
  line-height: 1;
  flex-shrink: 0;
  min-width: 20px;
}

.cell-gap-spacer {
  width: 20px;
  flex-shrink: 0;
}

.row-gap {
  display: flex;
  align-items: center;
  height: 22px;
  margin: 2px 0;
}

.row-gap-btn {
  margin-left: 0;
}

.grid-cell {
  width: 96px;
  height: 64px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  background: #fafafa;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-cell.filled {
  border-style: solid;
  border-color: #91caff;
  background: #fff;
  padding: 4px;
}

.grid-cell.selected {
  border-color: #1677ff;
  box-shadow: inset 0 0 0 1px #1677ff;
}

.cell-tile {
  width: 100%;
  height: 100%;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 4px;
}

.cell-name {
  font-size: 12px;
  color: #1677ff;
  text-align: center;
  line-height: 1.2;
}

.cell-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: #ff4d4f;
  z-index: 1;
}

.right-panel {
  width: 280px;
  flex-shrink: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.info-rows {
  padding: 12px 14px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 6px;
}

.info-row .k {
  color: rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}

.info-row .v {
  color: rgba(0, 0, 0, 0.88);
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.config-tag {
  margin-bottom: 4px;
}

.file-form {
  padding: 0 14px 12px;
}

.right-empty {
  color: #999;
  font-size: 13px;
  text-align: center;
  padding-top: 40px;
}
</style>

<template>
  <div class="route-editor-layout">
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
          <div
            class="process-gallery"
            :style="{ gridTemplateColumns: `repeat(${galleryCols}, 1fr)` }"
          >
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

      <!-- 中间：配置工艺路线 -->
      <div class="center-panel panel-box">
        <div class="box-title">配置工艺路线</div>
        <div class="grid-tip">
          温馨提示：目前支持最大并行数: {{ MAX_ROUTE_PARALLEL }}，最大步数: {{ MAX_ROUTE_STEPS }}
        </div>
        <div class="grid-area">
          <div class="grid-scroll">
            <div class="grid-header">
              <div class="corner-cell" />
              <div v-for="col in stepCount" :key="`h-${col}`" class="step-ctrl">
                <div class="step-ctrl-row">
                  <button
                    type="button"
                    class="ctrl-btn ctrl-minus"
                    :disabled="stepCount <= 1"
                    title="删除本步"
                    @click="removeStepAtIndex(col - 1)"
                  >
                    <MinusOutlined />
                  </button>
                  <span class="ctrl-label">第{{ col }}步</span>
                  <button
                    type="button"
                    class="ctrl-btn ctrl-plus"
                    :disabled="stepCount >= MAX_ROUTE_STEPS"
                    title="在此之后插入一步"
                    @click="insertStepAt(col - 1)"
                  >
                    <PlusOutlined />
                  </button>
                </div>
                <a-select
                  v-if="countProcessesInStep(localGrid, col - 1) >= 2"
                  size="small"
                  class="completion-select"
                  :value="getCompletionModeAt(localPolicies, col - 1)"
                  :options="COMPLETION_MODE_OPTIONS"
                  :title="completionHint(col - 1)"
                  @change="(v) => setCompletionMode(col - 1, v)"
                />
                <div v-else class="completion-placeholder" title="单工序默认为全部完成">
                  全部完成
                </div>
              </div>
            </div>
            <template v-for="row in rowCount" :key="`r-${row}`">
              <div class="grid-row">
                <div class="row-ctrl">
                  <button
                    type="button"
                    class="ctrl-btn ctrl-plus"
                    :disabled="rowCount >= MAX_ROUTE_PARALLEL"
                    title="在此之后插入一行"
                    @click="insertRowAt(row - 1)"
                  >
                    <PlusOutlined />
                  </button>
                  <span class="ctrl-label">{{ row }}</span>
                  <button
                    type="button"
                    class="ctrl-btn ctrl-minus"
                    :disabled="rowCount <= 1"
                    title="删除本行"
                    @click="removeRowAtIndex(row - 1)"
                  >
                    <MinusOutlined />
                  </button>
                </div>
                <div
                  v-for="col in stepCount"
                  :key="`${row}-${col}`"
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
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 右侧：工序信息 + 文件配置（各自独立盒子） -->
      <div class="right-column">
        <div class="right-panel panel-box">
          <div class="box-title">工序信息</div>
          <template v-if="selectedMeta">
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
          </template>
          <div v-else class="right-empty">请点击网格中的工序</div>
        </div>

        <div class="right-panel panel-box file-config-panel">
          <div class="box-title">文件配置</div>
          <a-form v-if="selectedMeta" layout="vertical" size="small" class="file-form">
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
          <div v-else class="right-empty compact">请先选择工序</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { CloseOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons-vue'
import {
  getActiveProcessCategories,
  getProcessesByCategory,
  getProcessById,
} from '@/store/processConfigStore'
import { getEnabledProcessDocs } from '@/store/processDocStore'
import {
  MAX_ROUTE_PARALLEL,
  MAX_ROUTE_STEPS,
  COMPLETION_MODE_OPTIONS,
  normalizeGrid,
  getSelectedCellMeta,
  insertStepAfter,
  insertRowAfter,
  removeStepAt,
  removeRowAt,
  syncStepPolicies,
  insertStepPolicyAfter,
  removeStepPolicyAt,
  getCompletionModeAt,
  countProcessesInStep,
  normalizeCompletionMode,
} from '@/utils/processRouteGrid'

const props = defineProps({
  grid: { type: Array, default: () => [] },
  stepPolicies: { type: Array, default: () => [] },
  selectedStep: { type: Number, default: -1 },
  selectedRow: { type: Number, default: -1 },
})

const emit = defineEmits([
  'update:grid',
  'update:stepPolicies',
  'update:selectedStep',
  'update:selectedRow',
])

const activeCategories = computed(() => getActiveProcessCategories())
const activeCategory = ref('')
const pendingProcessId = ref('')
const dragProcessId = ref('')
const leftWidth = ref(220)

/** 拖宽后磁贴列数：窄 3 列，加宽后 4 列，再宽 5 列 */
const galleryCols = computed(() => {
  if (leftWidth.value >= 320) return 5
  if (leftWidth.value >= 260) return 4
  return 3
})

const localGrid = ref(normalizeGrid(props.grid))
const localPolicies = ref(syncStepPolicies(props.grid, props.stepPolicies))

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
    localPolicies.value = syncStepPolicies(v, props.stepPolicies)
  },
  { deep: true },
)

watch(
  () => props.stepPolicies,
  (v) => {
    localPolicies.value = syncStepPolicies(localGrid.value, v)
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

function emitPolicies(next = localPolicies.value) {
  const synced = syncStepPolicies(localGrid.value, next)
  localPolicies.value = synced
  emit('update:stepPolicies', synced)
}

function completionHint(stepIndex) {
  const mode = getCompletionModeAt(localPolicies.value, stepIndex)
  return mode === 'any' ? '下发时从本步候选中勾选要做的工序（可多选）' : '本步所有工序都要做完'
}

function setCompletionMode(stepIndex, mode) {
  const next = syncStepPolicies(localGrid.value, localPolicies.value)
  if (!next[stepIndex]) return
  next[stepIndex] = {
    ...next[stepIndex],
    completionMode: normalizeCompletionMode(mode),
  }
  emitPolicies(next)
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
  normalizePoliciesForSparseSteps()
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
  normalizePoliciesForSparseSteps()
  if (isSelected(step, row)) {
    emit('update:selectedStep', -1)
    emit('update:selectedRow', -1)
  }
}

function normalizePoliciesForSparseSteps() {
  const next = syncStepPolicies(localGrid.value, localPolicies.value)
  next.forEach((p, i) => {
    if (countProcessesInStep(localGrid.value, i) < 2) {
      p.completionMode = 'all'
    }
  })
  emitPolicies(next)
}

function insertStepAt(afterIndex) {
  if (stepCount.value >= MAX_ROUTE_STEPS) {
    message.warning(`最大步数 ${MAX_ROUTE_STEPS}`)
    return
  }
  localPolicies.value = insertStepPolicyAfter(
    syncStepPolicies(localGrid.value, localPolicies.value),
    afterIndex,
  )
  localGrid.value = insertStepAfter(localGrid.value, afterIndex)
  if (props.selectedStep > afterIndex) {
    emit('update:selectedStep', props.selectedStep + 1)
  }
  emitGrid()
  emitPolicies(localPolicies.value)
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

function stepHasProcess(stepIndex) {
  return (localGrid.value[stepIndex] || []).some((c) => c?.processId)
}

function rowHasProcess(rowIndex) {
  return localGrid.value.some((step) => step?.[rowIndex]?.processId)
}

function removeStepAtIndex(index) {
  if (stepCount.value <= 1) {
    message.warning('至少保留一步')
    return
  }
  const doRemove = () => {
    localPolicies.value = removeStepPolicyAt(
      syncStepPolicies(localGrid.value, localPolicies.value),
      index,
    )
    localGrid.value = removeStepAt(localGrid.value, index)
    if (props.selectedStep === index) {
      emit('update:selectedStep', -1)
      emit('update:selectedRow', -1)
    } else if (props.selectedStep > index) {
      emit('update:selectedStep', props.selectedStep - 1)
    }
    emitGrid()
    emitPolicies(localPolicies.value)
  }
  if (stepHasProcess(index)) {
    Modal.confirm({
      title: '删除步骤',
      content: `第${index + 1}步已配置工序，确定删除？`,
      okType: 'danger',
      onOk: doRemove,
    })
    return
  }
  doRemove()
}

function removeRowAtIndex(index) {
  if (rowCount.value <= 1) {
    message.warning('至少保留一行')
    return
  }
  const doRemove = () => {
    localGrid.value = removeRowAt(localGrid.value, index)
    if (props.selectedRow === index) {
      emit('update:selectedStep', -1)
      emit('update:selectedRow', -1)
    } else if (props.selectedRow > index) {
      emit('update:selectedRow', props.selectedRow - 1)
    }
    emitGrid()
  }
  if (rowHasProcess(index)) {
    Modal.confirm({
      title: '删除行',
      content: `第${index + 1}行已配置工序，确定删除？`,
      okType: 'danger',
      onOk: doRemove,
    })
    return
  }
  doRemove()
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
  padding: 8px 12px 0;
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
  padding: 12px 14px 8px;
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  background: transparent;
  border-bottom: none;
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
  gap: 8px;
  margin-bottom: 8px;
}

.corner-cell {
  width: 36px;
  flex-shrink: 0;
}

.step-ctrl {
  width: 110px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  min-height: 52px;
}

.step-ctrl-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
}

.completion-select {
  width: 100%;
  font-size: 12px;
}

.completion-select :deep(.ant-select-selector) {
  padding-inline: 4px !important;
  font-size: 12px;
}

.completion-placeholder {
  width: 100%;
  text-align: center;
  font-size: 11px;
  line-height: 24px;
  color: rgba(0, 0, 0, 0.45);
}

.row-ctrl {
  width: 36px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.ctrl-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  font-size: 12px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.ctrl-btn :deep(.anticon) {
  font-size: 12px;
  font-weight: 400;
}

.ctrl-plus {
  color: #1677ff;
}

.ctrl-minus {
  color: #ff4d4f;
}

.ctrl-btn:hover:not(:disabled) {
  opacity: 0.75;
}

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ctrl-label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  line-height: 1.2;
  text-align: center;
}

.grid-cell {
  width: 110px;
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

.right-column {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 480px;
}

.right-panel {
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.right-panel:first-child {
  flex: 1;
  min-height: 0;
}

.file-config-panel {
  flex-shrink: 0;
}

.info-rows {
  padding: 4px 14px 12px;
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
  padding: 24px 12px 32px;
}

.right-empty.compact {
  padding: 8px 12px 16px;
}
</style>

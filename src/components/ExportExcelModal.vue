<template>
  <a-modal
    :open="open"
    title="导出 Excel"
    width="760px"
    destroy-on-close
    :body-style="{ paddingBottom: '12px' }"
    @cancel="emit('update:open', false)"
  >
    <div class="export-scope-section">
      <div class="section-label">导出范围</div>
      <a-radio-group v-model:value="scope" class="scope-radio-group">
        <a-radio value="filtered" :disabled="filteredCount === 0">
          当前查询结果（{{ filteredCount }} 条）
        </a-radio>
        <a-radio value="selected" :disabled="selectedCount === 0">
          已勾选行（{{ selectedCount }} 条）
        </a-radio>
      </a-radio-group>
      <a-alert
        v-if="filteredCount === 0 && selectedCount === 0"
        type="warning"
        show-icon
        message="无数据可导出"
        class="scope-hint"
      />
      <a-alert
        v-else-if="scope === 'selected' && selectedCount === 0"
        type="info"
        show-icon
        message="请先在列表中勾选要导出的行"
        class="scope-hint"
      />
    </div>

    <div class="export-fields-section">
      <div class="fields-toolbar">
        <span class="section-label">导出字段</span>
        <span class="field-count">已选 {{ checkedCount }}/{{ localSettings.length }}</span>
        <a-space :size="0" class="toolbar-actions">
          <a-button type="link" size="small" @click="checkAll(true)">全选</a-button>
          <a-divider type="vertical" />
          <a-button type="link" size="small" @click="checkAll(false)">全不选</a-button>
        </a-space>
      </div>

      <div class="fields-layout">
        <div class="field-picker">
          <div class="panel-caption">勾选要导出的列</div>
          <div class="field-grid">
            <label v-for="item in localSettings" :key="item.key" class="field-grid-item">
              <a-checkbox v-model:checked="item.checked" />
              <span class="field-title" :title="item.title">{{ item.title }}</span>
            </label>
          </div>
        </div>

        <div class="field-order">
          <div class="panel-caption">列顺序（已选）</div>
          <a-empty
            v-if="!checkedFields.length"
            :image="false"
            description="请先勾选导出字段"
            class="order-empty"
          />
          <div v-else class="order-list">
            <div v-for="(item, index) in checkedFields" :key="item.key" class="order-item">
              <span class="order-title" :title="item.title">{{ item.title }}</span>
              <a-space :size="0" class="order-actions">
                <a-button
                  type="text"
                  size="small"
                  :disabled="index === 0"
                  aria-label="上移"
                  @click="moveCheckedUp(index)"
                >
                  <UpOutlined />
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  :disabled="index === checkedFields.length - 1"
                  aria-label="下移"
                  @click="moveCheckedDown(index)"
                >
                  <DownOutlined />
                </a-button>
              </a-space>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="exportCount > 0" class="export-preview">
      将导出 <strong>{{ exportCount }}</strong> 条数据，共 <strong>{{ checkedCount }}</strong> 列
    </div>

    <template #footer>
      <a-space>
        <a-button @click="resetDefault">恢复默认</a-button>
        <a-button @click="emit('update:open', false)">取消</a-button>
        <a-button type="primary" :disabled="!canExport" @click="handleConfirm">确认导出</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { UpOutlined, DownOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  open: Boolean,
  settings: { type: Array, default: () => [] },
  defaultSettings: { type: Array, default: () => [] },
  filteredCount: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
})

const emit = defineEmits(['update:open', 'update:settings', 'export'])

const scope = ref('filtered')
const localSettings = ref([])

const checkedFields = computed(() =>
  [...localSettings.value].filter((item) => item.checked).sort((a, b) => a.order - b.order),
)

const checkedCount = computed(() => checkedFields.value.length)

const exportCount = computed(() =>
  scope.value === 'selected' ? props.selectedCount : props.filteredCount,
)

const canExport = computed(() => exportCount.value > 0 && checkedCount.value > 0)

watch(
  () => props.open,
  (visible) => {
    if (visible) {
      localSettings.value = JSON.parse(JSON.stringify(props.settings)).sort(
        (a, b) => a.order - b.order,
      )
      scope.value = props.selectedCount > 0 && props.filteredCount === 0 ? 'selected' : 'filtered'
    }
  },
)

function checkAll(checked) {
  localSettings.value.forEach((item) => {
    item.checked = checked
  })
}

function swapOrderByKey(keyA, keyB) {
  const itemA = localSettings.value.find((item) => item.key === keyA)
  const itemB = localSettings.value.find((item) => item.key === keyB)
  if (!itemA || !itemB) return
  const tmp = itemA.order
  itemA.order = itemB.order
  itemB.order = tmp
  localSettings.value.sort((a, b) => a.order - b.order)
}

function moveCheckedUp(index) {
  const list = checkedFields.value
  if (index <= 0) return
  swapOrderByKey(list[index].key, list[index - 1].key)
}

function moveCheckedDown(index) {
  const list = checkedFields.value
  if (index >= list.length - 1) return
  swapOrderByKey(list[index].key, list[index + 1].key)
}

function resetDefault() {
  localSettings.value = JSON.parse(JSON.stringify(props.defaultSettings))
}

function handleConfirm() {
  if (!canExport.value) {
    if (exportCount.value === 0) {
      message.warning('无数据可导出')
    } else {
      message.warning('请至少选择一个导出字段')
    }
    return
  }
  emit('update:settings', JSON.parse(JSON.stringify(localSettings.value)))
  emit('export', {
    scope: scope.value,
    settings: JSON.parse(JSON.stringify(localSettings.value)),
  })
}
</script>

<style lang="less" scoped>
.section-label {
  font-weight: 500;
  margin-right: 8px;
}

.export-scope-section {
  margin-bottom: 14px;
}

.scope-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.scope-hint {
  margin-top: 8px;
}

.export-fields-section {
  margin-bottom: 8px;
}

.fields-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-bottom: 8px;
}

.field-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.toolbar-actions {
  margin-left: auto;
}

.fields-layout {
  display: flex;
  gap: 12px;
  min-height: 0;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.field-picker,
.field-order {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.field-picker {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  background: #fafafa;
}

.field-order {
  width: 220px;
  flex-shrink: 0;
  padding: 10px 12px;
  background: #fff;
  border-left: 1px solid #f0f0f0;
}

.panel-caption {
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.field-grid {
  max-height: 260px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
  padding-right: 4px;
}

.field-grid-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  cursor: pointer;
  line-height: 1.4;
}

.field-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  word-break: break-all;
}

.order-list {
  max-height: 260px;
  overflow-y: auto;
}

.order-empty {
  margin: 24px 0;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.order-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-actions {
  flex-shrink: 0;
}

.export-preview {
  margin-top: 10px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

@media (max-width: 640px) {
  .fields-layout {
    flex-direction: column;
  }

  .field-order {
    width: 100%;
    border-left: none;
    border-top: 1px solid #f0f0f0;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>

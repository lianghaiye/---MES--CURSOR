<template>
  <a-modal
    :open="open"
    title="导出 Excel"
    width="560px"
    destroy-on-close
    ok-text="确认导出"
    cancel-text="取消"
    :ok-button-props="{ disabled: !canExport }"
    @ok="handleConfirm"
    @cancel="emit('update:open', false)"
  >
    <div class="export-scope-section">
      <div class="section-label">导出范围</div>
      <a-radio-group v-model:value="scope">
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
      <div class="section-label">导出字段</div>
      <a-table
        :columns="fieldColumns"
        :data-source="localSettings"
        row-key="key"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'checked'">
            <a-checkbox v-model:checked="record.checked" />
          </template>
          <template v-else-if="column.key === 'sort'">
            <a-space :size="4">
              <a-button type="text" size="small" :disabled="index === 0" @click="moveUp(index)">
                <UpOutlined />
              </a-button>
              <a-button
                type="text"
                size="small"
                :disabled="index === localSettings.length - 1"
                @click="moveDown(index)"
              >
                <DownOutlined />
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <div v-if="exportCount > 0" class="export-preview">
      将导出 <strong>{{ exportCount }}</strong> 条数据
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

const fieldColumns = [
  { title: '字段名', dataIndex: 'title', width: 200 },
  { title: '导出', key: 'checked', width: 64, align: 'center' },
  { title: '排序', key: 'sort', width: 80, align: 'center' },
]

const exportCount = computed(() =>
  scope.value === 'selected' ? props.selectedCount : props.filteredCount,
)

const canExport = computed(() => {
  if (exportCount.value === 0) return false
  return localSettings.value.some((s) => s.checked)
})

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

function moveUp(index) {
  if (index <= 0) return
  const arr = localSettings.value
  ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
  arr.forEach((item, i) => {
    item.order = i
  })
}

function moveDown(index) {
  const arr = localSettings.value
  if (index >= arr.length - 1) return
  ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
  arr.forEach((item, i) => {
    item.order = i
  })
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
  margin-bottom: 8px;
}

.export-scope-section {
  margin-bottom: 16px;
}

.scope-hint {
  margin-top: 8px;
}

.export-fields-section {
  margin-bottom: 12px;
}

.export-preview {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>

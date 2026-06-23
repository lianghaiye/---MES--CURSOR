<template>
  <a-modal
    :open="open"
    title="按BOM添加"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    class="add-by-bom-modal"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="add-by-bom-form">
      <a-form-item label="BOM名称" required>
        <div class="parent-picker-row">
          <a-select
            v-model:value="selectedRowKey"
            show-search
            allow-clear
            size="small"
            placeholder="搜索BOM名称/编号，选择已关联BOM"
            class="parent-select"
            :filter-option="filterOption"
            :options="selectOptions"
            @change="onSelectChange"
          />
          <a-button type="link" size="small" class="advanced-btn" @click="advancedOpen = true">
            高级选择
          </a-button>
        </div>
      </a-form-item>

      <a-form-item label="用量系数" required>
        <a-input-number
          v-model:value="usageCoefficient"
          size="small"
          :min="0"
          :precision="2"
          placeholder="请输入"
          class="usage-coef-input"
        />
        <div class="field-hint">等于本级单位用量；子项单位用量 = 用量系数 × 子件原单位用量</div>
      </a-form-item>

      <div v-if="selectedRow" class="selected-preview">
        <div class="preview-row">
          <span class="preview-label">BOM名称</span>
          <span>{{ selectedRow.bomName || '—' }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">BOM编号</span>
          <span>{{ selectedRow.bomNo || '—' }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">版本</span>
          <span>{{ selectedRow.bomVersion || '—' }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">物品名称</span>
          <span>{{ selectedRow.name }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">规格型号</span>
          <span>{{ selectedRow.specModel || '—' }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">类型</span>
          <span>{{ selectedRow.itemType }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">子件项数</span>
          <span>{{ selectedRow.subItemCount ?? 0 }}</span>
        </div>
        <div class="preview-tip">确定后将添加所选物品及其 BOM 下级结构</div>
      </div>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRow" @click="handleConfirm">确定</a-button>
    </template>

    <SelectBomMaterialModal
      v-model:open="advancedOpen"
      title="选择产品/物料"
      :only-with-bom="true"
      :multiple="false"
      @selected="onAdvancedSelected"
    />
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  buildBomLinkedPickerRows,
  findBomLinkedPickerRow,
} from '@/utils/bomWithBomPicker'
import SelectBomMaterialModal from './SelectBomMaterialModal.vue'

const props = defineProps({
  open: Boolean,
})

const emit = defineEmits(['update:open', 'confirm'])

const selectedRowKey = ref(undefined)
const selectedRow = ref(null)
const usageCoefficient = ref(1)
const advancedOpen = ref(false)
const listVersion = ref(0)

const linkedRows = computed(() => {
  void listVersion.value
  return buildBomLinkedPickerRows()
})

const selectOptions = computed(() =>
  linkedRows.value.map((r) => ({
    label: r.bomVersion ? `${r.bomName}（${r.bomVersion}）` : r.bomName || r.name,
    value: r.rowKey,
    searchText: `${r.bomName} ${r.bomNo} ${r.code} ${r.name}`,
  })),
)

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    selectedRowKey.value = undefined
    selectedRow.value = null
    usageCoefficient.value = 1
    advancedOpen.value = false
    listVersion.value += 1
  },
)

watch(
  () => advancedOpen.value,
  (visible) => {
    if (!visible) listVersion.value += 1
  },
)

function filterOption(input, option) {
  const text = (option?.searchText ?? option?.label ?? '').toLowerCase()
  return text.includes(input.toLowerCase())
}

function onSelectChange(rowKey) {
  selectedRow.value = rowKey ? findBomLinkedPickerRow(rowKey) : null
}

function onAdvancedSelected(items) {
  const row = Array.isArray(items) ? items[0] : items
  if (!row?.code) return
  const rowKey = `${row.itemType}-${row.id}`
  const hit = findBomLinkedPickerRow(rowKey)
  if (!hit) {
    message.warning('所选物品未关联使用中的 BOM')
    return
  }
  selectedRowKey.value = rowKey
  selectedRow.value = hit
}

function resetForm() {
  selectedRowKey.value = undefined
  selectedRow.value = null
  usageCoefficient.value = 1
  advancedOpen.value = false
}

function handleCancel() {
  resetForm()
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRow.value) {
    message.warning('请选择BOM名称')
    return
  }
  const coef = Number(usageCoefficient.value)
  if (Number.isNaN(coef) || coef < 0) {
    message.warning('请输入有效的用量系数')
    return
  }
  emit('confirm', {
    pickerRow: selectedRow.value,
    usageCoefficient: coef,
  })
  resetForm()
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.add-by-bom-modal {
  .parent-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .parent-select {
    flex: 1;
    min-width: 0;
  }

  .usage-coef-input {
    width: 160px;
  }

  .field-hint {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.5;
  }

  .advanced-btn {
    flex-shrink: 0;
    padding: 0 4px;
  }

  .selected-preview {
    padding: 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    font-size: 13px;
  }

  .preview-row {
    display: flex;
    gap: 12px;
    margin-bottom: 6px;

    .preview-label {
      width: 72px;
      flex-shrink: 0;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .preview-tip {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed #e8e8e8;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>

<template>
  <a-modal
    :open="open"
    title="设置筛选条件"
    width="860px"
    :mask-closable="false"
    destroy-on-close
    class="bom-sub-item-filter-modal"
    @cancel="handleCancel"
  >
    <div v-if="!localConditions.length" class="empty-wrap">
      <a-empty :image="false" description="暂无筛选条件">
        <a-button type="dashed" size="small" @click="addCondition">
          <PlusOutlined />
          添加筛选条件
        </a-button>
      </a-empty>
    </div>

    <div v-else class="condition-list">
      <div v-for="(cond, index) in localConditions" :key="cond.id" class="condition-row">
        <a-select
          v-if="index > 0"
          v-model:value="cond.logic"
          size="small"
          class="logic-select"
          :options="logicOptions"
        />
        <span v-else class="logic-placeholder">当</span>

        <a-select
          v-model:value="cond.field"
          size="small"
          class="field-select"
          :options="fieldOptions"
          @change="() => onFieldChange(cond)"
        />

        <a-select
          v-model:value="cond.operator"
          size="small"
          class="operator-select"
          :options="operatorOptions(cond.field)"
        />

        <template v-if="needsValue(cond.operator)">
          <a-select
            v-if="isSelectField(cond.field)"
            v-model:value="cond.value"
            allow-clear
            size="small"
            class="value-input"
            placeholder="请选择"
            :options="valueOptions(cond.field)"
          />
          <a-input-number
            v-else-if="isNumberField(cond.field)"
            v-model:value="cond.value"
            size="small"
            class="value-input"
            placeholder="请输入"
          />
          <a-input
            v-else
            v-model:value="cond.value"
            allow-clear
            size="small"
            class="value-input"
            placeholder="请输入"
          />
        </template>
        <span v-else class="value-placeholder">—</span>

        <a-button
          type="text"
          size="small"
          danger
          class="remove-btn"
          @click="removeCondition(cond.id)"
        >
          <DeleteOutlined />
        </a-button>
      </div>

      <a-button type="dashed" block size="small" class="add-btn" @click="addCondition">
        <PlusOutlined />
        添加筛选条件
      </a-button>
    </div>

    <template #footer>
      <a-button @click="handleReset">清空</a-button>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  bomSubItemFilterFields,
  bomSubItemFilterLogicOptions,
  bomSubItemFilterOperatorOptions,
  createEmptyFilterCondition,
} from '@/mock/bomSubItemFilterFields'

const props = defineProps({
  open: Boolean,
  conditions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const logicOptions = bomSubItemFilterLogicOptions
const fieldOptions = bomSubItemFilterFields.map((f) => ({ label: f.label, value: f.key }))
const localConditions = ref([])

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    localConditions.value = props.conditions?.length
      ? JSON.parse(JSON.stringify(props.conditions))
      : [createEmptyFilterCondition()]
  },
)

function operatorOptions(fieldKey) {
  const meta = bomSubItemFilterFields.find((f) => f.key === fieldKey)
  const type = meta?.type || 'text'
  return bomSubItemFilterOperatorOptions[type] || bomSubItemFilterOperatorOptions.text
}

function isSelectField(fieldKey) {
  return bomSubItemFilterFields.find((f) => f.key === fieldKey)?.type === 'select'
}

function isNumberField(fieldKey) {
  return bomSubItemFilterFields.find((f) => f.key === fieldKey)?.type === 'number'
}

function valueOptions(fieldKey) {
  const meta = bomSubItemFilterFields.find((f) => f.key === fieldKey)
  return (meta?.options || []).map((v) => ({ label: v, value: v }))
}

function needsValue(operator) {
  return operator !== 'empty' && operator !== 'notEmpty'
}

function onFieldChange(cond) {
  const ops = operatorOptions(cond.field)
  if (!ops.some((o) => o.value === cond.operator)) {
    cond.operator = ops[0]?.value || 'contains'
  }
  cond.value = isNumberField(cond.field) ? undefined : ''
}

function addCondition() {
  localConditions.value.push(createEmptyFilterCondition())
}

function removeCondition(id) {
  localConditions.value = localConditions.value.filter((c) => c.id !== id)
}

function handleReset() {
  localConditions.value = []
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  emit('confirm', JSON.parse(JSON.stringify(localConditions.value)))
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.bom-sub-item-filter-modal {
  .empty-wrap {
    padding: 24px 0 8px;
  }

  .condition-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 420px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .condition-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
  }

  .logic-select {
    width: 72px;
    flex-shrink: 0;
  }

  .logic-placeholder {
    width: 72px;
    flex-shrink: 0;
    color: rgba(0, 0, 0, 0.45);
    font-size: 13px;
    text-align: center;
  }

  .field-select {
    width: 160px;
    flex-shrink: 0;
  }

  .operator-select {
    width: 110px;
    flex-shrink: 0;
  }

  .value-input {
    flex: 1;
    min-width: 140px;
  }

  .value-placeholder {
    flex: 1;
    min-width: 140px;
    color: rgba(0, 0, 0, 0.25);
    text-align: center;
  }

  .remove-btn {
    flex-shrink: 0;
  }

  .add-btn {
    margin-top: 4px;
  }
}
</style>

<template>
  <a-modal
    :open="open"
    title="批量修改"
    width="560px"
    :mask-closable="false"
    destroy-on-close
    class="bom-material-batch-edit-modal"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="batch-form">
      <a-form-item label="修改字段" required>
        <a-select
          v-model:value="form.field"
          size="small"
          placeholder="请选择"
          :options="fieldOptions"
          @change="onFieldChange"
        />
      </a-form-item>
      <a-form-item label="修改方式" required>
        <a-radio-group v-model:value="form.method" size="small">
          <a-radio value="fixed">固定值</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="修改为" required>
        <a-input-number
          v-if="form.field === 'unitQty'"
          v-model:value="form.unitQty"
          size="small"
          :min="0"
          :precision="2"
          placeholder="请输入"
          style="width: 100%"
        />
        <a-textarea v-else v-model:value="form.remark" :rows="4" placeholder="请输入" allow-clear />
      </a-form-item>
    </a-form>

    <div class="batch-tips">
      <div>1. 通过批量修改可快速修改相同字段的数据内容</div>
      <div>2. 仅支持批量修改单位用量与备注</div>
      <div>3. 每次最多修改200条数据。</div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定修改</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'

const MAX_BATCH_SIZE = 200

const props = defineProps({
  open: Boolean,
  count: { type: Number, default: 0 },
})

const emit = defineEmits(['update:open', 'confirm'])

const fieldOptions = [
  { label: '单位用量', value: 'unitQty' },
  { label: '备注', value: 'remark' },
]

const form = reactive({
  field: 'unitQty',
  method: 'fixed',
  unitQty: undefined,
  remark: '',
})

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    form.field = 'unitQty'
    form.method = 'fixed'
    form.unitQty = undefined
    form.remark = ''
  },
)

function onFieldChange() {
  form.unitQty = undefined
  form.remark = ''
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (props.count > MAX_BATCH_SIZE) {
    message.warning(`每次最多修改 ${MAX_BATCH_SIZE} 条数据`)
    return
  }
  if (form.field === 'unitQty') {
    const val = Number(form.unitQty)
    if (Number.isNaN(val) || val < 0) {
      message.warning('请输入有效的单位用量')
      return
    }
    emit('confirm', { field: 'unitQty', value: val })
  } else {
    emit('confirm', { field: 'remark', value: form.remark ?? '' })
  }
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.bom-material-batch-edit-modal {
  .batch-form {
    margin-bottom: 12px;
  }

  .batch-tips {
    padding: 10px 12px;
    background: #fafafa;
    border-radius: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
    line-height: 1.8;
  }
}
</style>

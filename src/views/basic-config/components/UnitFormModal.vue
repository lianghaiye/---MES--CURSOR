<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑单位' : '新增单位'"
    width="520px"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="unit-form">
      <a-form-item label="单位编码" required>
        <a-input
          v-model:value="form.code"
          placeholder="留空则自动生成，如 UNIT011"
          :disabled="isEdit"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="单位名称" required>
        <a-input v-model:value="form.name" placeholder="如：件、根、米" allow-clear />
      </a-form-item>
      <a-form-item label="适用类型" required>
        <a-checkbox-group v-model:value="form.scopes" :options="UNIT_SCOPE_OPTIONS" />
        <div class="field-hint">勾选后，该单位会出现在对应业务下拉中</div>
      </a-form-item>
      <a-form-item label="状态">
        <a-radio-group v-model:value="form.status">
          <a-radio value="启用">启用</a-radio>
          <a-radio value="停用">停用</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="排序">
        <a-input-number v-model:value="form.sort" :min="0" :precision="0" style="width: 100%" />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="form.remark" :rows="2" placeholder="选填" allow-clear />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">确定</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { UNIT_SCOPE, UNIT_SCOPE_OPTIONS, UNIT_STATUS, addUnit, updateUnit } from '@/store/unitStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const isEdit = computed(() => Boolean(props.record?.id))
const saving = ref(false)
const form = reactive({
  code: '',
  name: '',
  scopes: [UNIT_SCOPE.INVENTORY, UNIT_SCOPE.PURCHASE],
  status: UNIT_STATUS.ENABLED,
  sort: 10,
  remark: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    if (props.record?.id) {
      form.code = props.record.code || ''
      form.name = props.record.name || ''
      form.scopes = [...(props.record.scopes || [])]
      form.status = props.record.status || UNIT_STATUS.ENABLED
      form.sort = props.record.sort ?? 10
      form.remark = props.record.remark || ''
    } else {
      form.code = ''
      form.name = ''
      form.scopes = [UNIT_SCOPE.INVENTORY, UNIT_SCOPE.PURCHASE]
      form.status = UNIT_STATUS.ENABLED
      form.sort = 10
      form.remark = ''
    }
  },
)

function handleCancel() {
  visible.value = false
}

function handleSave() {
  saving.value = true
  const payload = {
    code: form.code,
    name: form.name,
    scopes: [...form.scopes],
    status: form.status,
    sort: form.sort,
    remark: form.remark,
  }
  const res = isEdit.value ? updateUnit(props.record.id, payload) : addUnit(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '单位已更新' : '单位已创建')
  emit('saved')
  visible.value = false
}
</script>

<style scoped>
.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>

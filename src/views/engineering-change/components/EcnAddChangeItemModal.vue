<template>
  <a-modal
    :open="open"
    title="新增物料变更项"
    width="560px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-alert
      type="info"
      show-icon
      message="新增物料不在当前 BOM 中，需指定挂载层级与用量"
      style="margin-bottom: 16px"
    />
    <a-form layout="vertical" size="small">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="物料编码" required>
            <a-input v-model:value="form.materialCode" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="物料名称" required>
            <a-input v-model:value="form.materialName" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="规格型号">
            <a-input v-model:value="form.specModel" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="材质">
            <a-input v-model:value="form.material" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="单位用量" required>
            <a-input-number
              v-model:value="form.unitQty"
              :min="0"
              :precision="4"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="挂载层级">
            <a-auto-complete
              v-model:value="form.levelPath"
              :options="levelPathOpts"
              allow-clear
              placeholder="选择或输入挂载位置"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="变更说明">
        <a-textarea v-model:value="form.changeNote" :rows="2" placeholder="可选" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定添加</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  levelPaths: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const form = reactive({
  materialCode: '',
  materialName: '',
  specModel: '',
  material: '',
  unitQty: 1,
  levelPath: undefined,
  changeNote: '',
})

const levelPathOpts = computed(() => {
  const paths = new Set(props.levelPaths.filter(Boolean))
  return [...paths].map((p) => ({ label: p, value: p }))
})

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    form.materialCode = ''
    form.materialName = ''
    form.specModel = ''
    form.material = ''
    form.unitQty = 1
    form.levelPath = undefined
    form.changeNote = ''
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!form.materialCode?.trim() || !form.materialName?.trim()) {
    message.warning('请填写物料编码与名称')
    return
  }
  if (form.unitQty == null || form.unitQty <= 0) {
    message.warning('请填写有效的单位用量')
    return
  }
  const levelPath = form.levelPath?.trim() || ''
  emit('confirm', {
    materialCode: form.materialCode.trim(),
    materialName: form.materialName.trim(),
    specModel: form.specModel?.trim() || '',
    material: form.material?.trim() || '',
    afterUnitQty: form.unitQty,
    afterMaterial: form.material?.trim() || '',
    levelPath: levelPath || '',
    changeNote: form.changeNote?.trim() || '',
  })
  emit('update:open', false)
}
</script>

<script>
export default { name: 'EcnAddChangeItemModal' }
</script>

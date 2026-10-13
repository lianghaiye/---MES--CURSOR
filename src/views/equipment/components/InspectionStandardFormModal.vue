<template>
  <a-modal
    :open="open"
    :title="record?.id ? '编辑点检标准' : '新增点检标准'"
    :confirm-loading="saving"
    destroy-on-close
    width="800px"
    @ok="handleSave"
    @cancel="emit('update:open', false)"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="horizontal"
      :label-col="{ flex: '0 0 96px' }"
    >
      <a-row :gutter="[12, 8]">
        <a-col :span="12">
          <a-form-item label="标准编码" name="code">
            <a-input v-model:value="form.code" allow-clear placeholder="空则自动生成" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="标准名称" name="name">
            <a-input v-model:value="form.name" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="适用类别" name="category">
            <a-select
              v-model:value="form.category"
              :options="EQUIPMENT_CATEGORY_OPTIONS"
              placeholder="请选择"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="点检周期" name="cycle">
            <a-select
              v-model:value="form.cycle"
              :options="INSPECTION_CYCLE_OPTIONS"
              placeholder="请选择"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="启用">
            <a-switch
              v-model:checked="form.enabled"
              checked-children="开"
              un-checked-children="关"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="items-head">
        <span>点检项</span>
        <a-button type="link" size="small" @click="addItem">+ 添加</a-button>
      </div>
      <div v-for="(item, i) in form.items" :key="item.id" class="item-row">
        <a-input v-model:value="item.name" placeholder="点检项名称" style="flex: 1.2" />
        <a-select v-model:value="item.checkType" :options="checkTypeOpts" style="width: 100px" />
        <a-input v-model:value="item.standard" placeholder="合格标准" style="flex: 1" />
        <a-checkbox v-model:checked="item.required">必检</a-checkbox>
        <a-button type="text" danger @click="form.items.splice(i, 1)">删除</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { EQUIPMENT_CATEGORY_OPTIONS, INSPECTION_CYCLE_OPTIONS } from '@/mock/equipmentSeed'
import { addInspectionStandard, updateInspectionStandard } from '@/store/equipmentStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const formRef = ref(null)
const saving = ref(false)
const checkTypeOpts = [
  { label: '勾选', value: '勾选' },
  { label: '数值', value: '数值' },
]
const form = reactive(emptyForm())
const rules = {
  name: [{ required: true, message: '请输入标准名称' }],
  category: [{ required: true, message: '请选择适用类别' }],
  cycle: [{ required: true, message: '请选择点检周期' }],
}

function emptyItem() {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    checkType: '勾选',
    standard: '',
    required: true,
  }
}

function emptyForm() {
  return {
    code: '',
    name: '',
    category: '机加工设备',
    cycle: '每日',
    enabled: true,
    items: [emptyItem()],
  }
}

function addItem() {
  form.items.push(emptyItem())
}

watch(
  () => [props.open, props.record],
  ([open]) => {
    if (!open) return
    if (props.record?.id) {
      Object.assign(form, {
        ...props.record,
        items: (props.record.items || []).map((it) => ({ ...it })),
      })
    } else {
      Object.assign(form, emptyForm())
    }
  },
)

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const payload = {
      code: form.code,
      name: form.name,
      category: form.category,
      cycle: form.cycle,
      enabled: form.enabled,
      items: form.items,
    }
    const res = props.record?.id
      ? updateInspectionStandard(props.record.id, payload)
      : addInspectionStandard(payload)
    if (!res.ok) {
      message.warning(res.message || '保存失败')
      return
    }
    message.success('保存成功')
    emit('update:open', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.items-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0;
  font-weight: 600;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>

<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑仓库' : '新增仓库'"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="warehouse-form">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="仓库编号" name="code">
            <a-input v-model:value="form.code" placeholder="留空则自动生成 CK+年月+流水" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="仓库名称" name="name" required>
            <a-input v-model:value="form.name" placeholder="请输入 仓库名称" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="仓库类型" name="categoryId" required>
            <a-select
              v-model:value="form.categoryId"
              placeholder="请选择 仓库类型"
              :options="categoryOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="管理员" name="managerName" required>
            <a-input
              :value="form.managerName"
              readonly
              placeholder="请选择 管理员"
              class="picker-input"
              @click="personModalOpen = true"
            >
              <template #suffix>
                <SearchOutlined class="picker-suffix" @click.stop="personModalOpen = true" />
              </template>
            </a-input>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="仓库排序" name="sortOrder" required>
            <a-input-number
              v-model:value="form.sortOrder"
              :min="1"
              style="width: 100%"
              placeholder="请输入排序"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="所属工作中心">
            <a-select
              v-model:value="form.workCenter"
              allow-clear
              placeholder="请选择 所属工作中心"
              :options="workCenterOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="允许负库存">
            <a-switch
              v-model:checked="form.allowNegativeInventory"
              checked-children="是"
              un-checked-children="否"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="仓库地址">
            <a-input v-model:value="form.address" placeholder="请输入 仓库地址" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea
              v-model:value="form.remark"
              placeholder="请输入 备注"
              :rows="2"
              :maxlength="200"
              show-count
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">
          <CloseCircleOutlined />
          取消
        </a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">
          <PlusCircleOutlined />
          保存
        </a-button>
      </a-space>
    </template>

    <SelectPersonModal
      v-model:open="personModalOpen"
      :selected="form.managerName ? [form.managerName] : []"
      @confirm="onManagerConfirm"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseCircleOutlined, PlusCircleOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { addWarehouse, updateWarehouse, WAREHOUSE_WORK_CENTERS } from '@/store/warehouseStore'
import { getWarehouseCategoryOptions } from '@/store/warehouseCategoryStore'
import SelectPersonModal from '@/views/production/components/SelectPersonModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const formRef = ref()
const saving = ref(false)
const personModalOpen = ref(false)

const form = reactive({
  code: '',
  name: '',
  categoryId: undefined,
  managerName: '',
  sortOrder: 1,
  workCenter: undefined,
  allowNegativeInventory: false,
  address: '',
  remark: '',
})

const isEdit = computed(() => Boolean(props.record?.id))
const categoryOpts = computed(() => getWarehouseCategoryOptions())
const workCenterOpts = WAREHOUSE_WORK_CENTERS.map((v) => ({ label: v, value: v }))

const rules = {
  name: [{ required: true, message: '请输入仓库名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择仓库类型', trigger: 'change' }],
  managerName: [{ required: true, message: '请选择管理员', trigger: 'change' }],
  sortOrder: [{ required: true, message: '请输入仓库排序', trigger: 'change' }],
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const r = props.record
    form.code = r?.code || ''
    form.name = r?.name || ''
    form.categoryId = r?.categoryId
    form.managerName = r?.managerName || ''
    form.sortOrder = r?.sortOrder ?? 1
    form.workCenter = r?.workCenter || undefined
    form.allowNegativeInventory = Boolean(r?.allowNegativeInventory)
    form.address = r?.address || ''
    form.remark = r?.remark || ''
  },
)

function onManagerConfirm(names) {
  form.managerName = names?.[0] || ''
  formRef.value?.validateFields(['managerName']).catch(() => {})
}

function handleCancel() {
  emit('update:open', false)
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  const res = isEdit.value
    ? updateWarehouse(props.record.id, { ...form })
    : addWarehouse({ ...form })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已保存' : '已新增')
  emit('saved')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.warehouse-form {
  .picker-input {
    cursor: pointer;
  }

  .picker-suffix {
    color: #8c8c8c;
    cursor: pointer;
  }
}
</style>

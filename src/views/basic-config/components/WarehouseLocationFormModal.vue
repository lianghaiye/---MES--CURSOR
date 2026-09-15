<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1120px"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="horizontal" class="location-form">
      <div class="field-panel">
        <a-row :gutter="[16, 8]">
          <a-col :span="6">
            <a-form-item label="所属仓库" name="warehouseId" required>
              <a-select
                v-model:value="form.warehouseId"
                show-search
                option-filter-prop="label"
                placeholder="请选择所属仓库"
                :options="warehouseOpts"
                :disabled="isEdit"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="货位编码" name="code" required>
              <a-input v-model:value="form.code" placeholder="如 YL-A-01-01-01" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="货位名称">
              <a-input v-model:value="form.name" placeholder="默认与编码相同" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="库区" name="zone">
              <a-select
                v-model:value="form.zone"
                allow-clear
                placeholder="请选择库区"
                :options="zoneOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="最大件数">
              <a-input-number
                v-model:value="form.maxQty"
                :min="0"
                style="width: 100%"
                placeholder="不限制"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="最大承重(kg)">
              <a-input-number
                v-model:value="form.maxWeight"
                :min="0"
                style="width: 100%"
                placeholder="不限制"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="货位类型" name="locationType" required>
              <a-select
                v-model:value="form.locationType"
                placeholder="请选择货位类型"
                :options="typeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="占用状态">
              <a-select v-model:value="form.occupyStatus" :options="occupyOpts" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="通道">
              <a-input v-model:value="form.aisle" placeholder="01" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="货架">
              <a-input v-model:value="form.rack" placeholder="01" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="层">
              <a-input v-model:value="form.level" placeholder="01" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="位">
              <a-input v-model:value="form.bin" placeholder="01" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="启用">
              <a-switch
                v-model:checked="form.enabled"
                checked-children="启用"
                un-checked-children="停用"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="允许混放SKU">
              <a-switch v-model:checked="form.mixSku" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="允许混放批次">
              <a-switch v-model:checked="form.mixBatch" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="200"
                show-count
                placeholder="请输入备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </div>
    </a-form>
    <template #footer>
      <a-space>
        <a-button :size="pageMode ? 'small' : 'middle'" @click="handleCancel">取消</a-button>
        <a-button
          type="primary"
          :size="pageMode ? 'small' : 'middle'"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </a-button>
      </a-space>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  addWarehouseLocation,
  updateWarehouseLocation,
  LOCATION_TYPE_OPTIONS,
  LOCATION_OCCUPY_OPTIONS,
  LOCATION_ZONE_OPTIONS,
} from '@/store/warehouseLocationStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  record: { type: Object, default: null },
  defaultWarehouseId: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

const formRef = ref()
const saving = ref(false)
const isEdit = computed(() => Boolean(props.record?.id))

const form = reactive({
  warehouseId: undefined,
  code: '',
  name: '',
  zone: 'A区',
  locationType: '存储位',
  occupyStatus: '空闲',
  aisle: '01',
  rack: '01',
  level: '01',
  bin: '01',
  maxQty: null,
  maxWeight: null,
  enabled: true,
  mixSku: true,
  mixBatch: true,
  remark: '',
})

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/basic-config/warehouse-locations',
  getTitle: () => (isEdit.value ? '编辑货位' : '新增货位'),
})

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions().map((o) => {
    const wh = warehouseState.warehouses.find((w) => w.name === o.value)
    return { label: o.label, value: wh?.id || o.value }
  })
})

const typeOpts = LOCATION_TYPE_OPTIONS.map((v) => ({ label: v, value: v }))
const occupyOpts = LOCATION_OCCUPY_OPTIONS.map((v) => ({ label: v, value: v }))
const zoneOpts = LOCATION_ZONE_OPTIONS.map((v) => ({ label: v, value: v }))

const rules = {
  warehouseId: [{ required: true, message: '请选择所属仓库', trigger: 'change' }],
  code: [{ required: true, message: '请输入货位编码', trigger: 'blur' }],
  locationType: [{ required: true, message: '请选择货位类型', trigger: 'change' }],
}

watch(
  () => isActive.value,
  (v) => {
    if (!v) return
    const r = props.record
    form.warehouseId = r?.warehouseId || props.defaultWarehouseId || undefined
    form.code = r?.code || ''
    form.name = r?.name || ''
    form.zone = r?.zone || 'A区'
    form.locationType = r?.locationType || '存储位'
    form.occupyStatus = r?.occupyStatus || '空闲'
    form.aisle = r?.aisle || '01'
    form.rack = r?.rack || '01'
    form.level = r?.level || '01'
    form.bin = r?.bin || '01'
    form.maxQty = r?.maxQty ?? null
    form.maxWeight = r?.maxWeight ?? null
    form.enabled = r?.enabled !== false
    form.mixSku = r?.mixSku !== false
    form.mixBatch = r?.mixBatch !== false
    form.remark = r?.remark || ''
  },
)

function handleSave() {
  formRef.value?.validate().then(() => {
    saving.value = true
    const res = isEdit.value
      ? updateWarehouseLocation(props.record.id, { ...form })
      : addWarehouseLocation({ ...form })
    saving.value = false
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('已保存')
    emit('saved', res.location)
    closeAfterSave()
  })
}
</script>

<style lang="less" scoped>
@label-width: 108px;

.field-panel {
  padding: 12px 12px 4px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.location-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 12px;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 @label-width;
    width: @label-width;
    max-width: @label-width;
    padding-bottom: 0;
    padding-right: 8px;
  }

  :deep(.ant-form-item-label > label) {
    height: 32px;
    line-height: 32px;
    font-size: 13px;
    white-space: nowrap;

    &::after {
      margin-inline: 2px 0;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  :deep(.ant-input),
  :deep(.ant-select),
  :deep(.ant-input-number) {
    width: 100%;
  }

  .remark-item {
    :deep(.ant-form-item-row) {
      align-items: flex-start;
    }

    :deep(.ant-form-item-label > label) {
      height: 22px;
      line-height: 22px;
      margin-top: 4px;
    }
  }
}
</style>

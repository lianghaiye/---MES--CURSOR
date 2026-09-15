<template>
  <a-modal
    :open="open"
    title="批量生成货位"
    ok-text="生成"
    :confirm-loading="saving"
    destroy-on-close
    width="640px"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <p class="hint">按库区、通道、货架、层、位生成编码，格式：前缀-库区-通道-货架-层-位。</p>
    <a-form layout="vertical" :model="form">
      <a-form-item label="所属仓库" required>
        <a-select
          v-model:value="form.warehouseId"
          show-search
          option-filter-prop="label"
          placeholder="请选择仓库"
          :options="warehouseOpts"
          @change="onWarehouseChange"
        />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="编码前缀">
            <a-input v-model:value="form.prefix" placeholder="如 YL" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="库区">
            <a-select v-model:value="form.zone" :options="zoneOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="货位类型">
            <a-select v-model:value="form.locationType" :options="typeOpts" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="通道（起-止）">
            <a-input-group compact>
              <a-input-number v-model:value="form.aisleFrom" :min="1" style="width: 50%" />
              <a-input-number v-model:value="form.aisleTo" :min="1" style="width: 50%" />
            </a-input-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="货架（起-止）">
            <a-input-group compact>
              <a-input-number v-model:value="form.rackFrom" :min="1" style="width: 50%" />
              <a-input-number v-model:value="form.rackTo" :min="1" style="width: 50%" />
            </a-input-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="层（起-止）">
            <a-input-group compact>
              <a-input-number v-model:value="form.levelFrom" :min="1" style="width: 50%" />
              <a-input-number v-model:value="form.levelTo" :min="1" style="width: 50%" />
            </a-input-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="位（起-止）">
            <a-input-group compact>
              <a-input-number v-model:value="form.binFrom" :min="1" style="width: 50%" />
              <a-input-number v-model:value="form.binTo" :min="1" style="width: 50%" />
            </a-input-group>
          </a-form-item>
        </a-col>
      </a-row>
      <a-space>
        <a-checkbox v-model:checked="form.mixSku">允许混放SKU</a-checkbox>
        <a-checkbox v-model:checked="form.mixBatch">允许混放批次</a-checkbox>
      </a-space>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getWarehouseById, getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  batchCreateWarehouseLocations,
  generateLocationPrefix,
  LOCATION_TYPE_OPTIONS,
  LOCATION_ZONE_OPTIONS,
} from '@/store/warehouseLocationStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  defaultWarehouseId: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'created'])

const saving = ref(false)
const form = reactive({
  warehouseId: undefined,
  prefix: '',
  zone: 'A区',
  locationType: '存储位',
  aisleFrom: 1,
  aisleTo: 1,
  rackFrom: 1,
  rackTo: 1,
  levelFrom: 1,
  levelTo: 1,
  binFrom: 1,
  binTo: 2,
  mixSku: true,
  mixBatch: true,
})

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions().map((o) => {
    const wh = warehouseState.warehouses.find((w) => w.name === o.value)
    return { label: o.label, value: wh?.id || o.value }
  })
})

const typeOpts = LOCATION_TYPE_OPTIONS.map((v) => ({ label: v, value: v }))
const zoneOpts = LOCATION_ZONE_OPTIONS.map((v) => ({ label: v, value: v }))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.warehouseId = props.defaultWarehouseId || undefined
    onWarehouseChange(form.warehouseId)
    form.zone = 'A区'
    form.locationType = '存储位'
    form.aisleFrom = 1
    form.aisleTo = 1
    form.rackFrom = 1
    form.rackTo = 1
    form.levelFrom = 1
    form.levelTo = 1
    form.binFrom = 1
    form.binTo = 2
  },
)

function onWarehouseChange(id) {
  const wh = getWarehouseById(id)
  form.prefix = wh ? generateLocationPrefix(wh) : ''
}

function handleOk() {
  saving.value = true
  const res = batchCreateWarehouseLocations({ ...form })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  const skipText = res.skipped?.length ? `，跳过已存在 ${res.skipped.length} 个` : ''
  message.success(`已生成 ${res.created.length} 个货位${skipText}`)
  emit('created')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.hint {
  margin: 0 0 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>

<template>
  <a-modal
    :open="open"
    :title="mode === 'copy' ? '复制入库明细' : '编辑入库明细'"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form v-if="draft" layout="vertical" size="small">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="物品编码">
            <a-input :value="draft.itemCode" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="物品名称">
            <a-input :value="draft.itemName" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="入库仓库" required>
            <a-select
              v-model:value="draft.warehouse"
              allow-clear
              placeholder="请选择仓库"
              :options="warehouseOpts"
              @change="refreshStock"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="入库数量" required>
            <a-input-number v-model:value="draft.qty" :min="0" style="width: 100%" @change="onQtyChange" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="重量">
            <a-input-number v-model:value="draft.weight" :min="0" :precision="3" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="单价">
            <a-input-number
              v-model:value="draft.unitPrice"
              :min="0"
              :precision="2"
              style="width: 100%"
              @change="onUnitPriceChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="总价">
            <a-input-number
              v-model:value="draft.totalPrice"
              :min="0"
              :precision="2"
              style="width: 100%"
              @change="onTotalPriceChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="来源">
            <a-select
              v-model:value="draft.lineSource"
              allow-clear
              placeholder="请选择来源"
              :options="lineSourceOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="关联业务单据">
            <a-input v-model:value="draft.sourceDocNo" allow-clear placeholder="请输入关联业务单据" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { inboundLineSourceOptions } from '@/mock/inboundOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  enrichInboundLine,
  syncInboundLineTotalFromUnit,
  syncInboundLineUnitFromTotal,
} from '@/utils/inboundLineHelpers'

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  mode: { type: String, default: 'edit' },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = ref(null)
const lineSourceOpts = inboundLineSourceOptions.map((v) => ({ label: v, value: v }))

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.line) {
      draft.value = null
      return
    }
    draft.value = reactive(enrichInboundLine({ ...props.line }))
  },
)

function refreshStock() {
  if (!draft.value) return
  Object.assign(draft.value, enrichInboundLine(draft.value))
}

function onQtyChange() {
  if (!draft.value) return
  syncInboundLineTotalFromUnit(draft.value)
}

function onUnitPriceChange() {
  if (!draft.value) return
  syncInboundLineTotalFromUnit(draft.value)
}

function onTotalPriceChange() {
  if (!draft.value) return
  syncInboundLineUnitFromTotal(draft.value)
}

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!draft.value) return
  if (!draft.value.warehouse) {
    message.warning('请选择入库仓库')
    return
  }
  if (draft.value.qty == null || Number(draft.value.qty) <= 0) {
    message.warning('请输入入库数量')
    return
  }
  emit('confirm', enrichInboundLine({ ...draft.value }))
  emit('update:open', false)
}
</script>

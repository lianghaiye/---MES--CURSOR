<template>
  <a-modal
    :open="open"
    title="采购收货单"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="header-form horizontal-form">
      <a-row :gutter="[12, 8]" style="width: 100%">
        <a-col :span="8">
          <a-form-item label="采购单号" required>
            <a-input :value="purchaseOrder?.orderNo" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="合同编号">
            <a-input v-model:value="form.contractNo" size="small" placeholder="请输入 合同编号" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="供应商">
            <a-input :value="purchaseOrder?.supplier" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="采购员">
            <a-input :value="purchaseOrder?.purchaser" disabled size="small" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注" class="remark-item">
            <a-textarea v-model:value="form.remark" :rows="2" placeholder="请输入备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="receiptLines"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1200 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'receivingMode'">
          <a-select
            v-model:value="record.receivingMode"
            size="small"
            style="width: 100%"
            :options="receivingModeOpts"
          />
        </template>
        <template v-else-if="column.key === 'receivingWarehouse'">
          <a-select
            v-model:value="record.receivingWarehouse"
            size="small"
            style="width: 100%"
            :options="warehouseOpts"
          />
        </template>
        <template v-else-if="column.key === 'receiptQty'">
          <a-input-number
            v-model:value="record.receiptQty"
            size="small"
            :min="0"
            :max="record.remainingQty"
            :precision="2"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'productionDate'">
          <a-date-picker
            :value="dateVal(record.productionDate)"
            size="small"
            style="width: 100%"
            placeholder="请选择"
            @change="(d) => onDateChange(record, 'productionDate', d)"
          />
        </template>
        <template v-else-if="column.key === 'expiryDate'">
          <a-date-picker
            :value="dateVal(record.expiryDate)"
            size="small"
            style="width: 100%"
            placeholder="请选择"
            @change="(d) => onDateChange(record, 'expiryDate', d)"
          />
        </template>
        <template v-else-if="column.key === 'lineRemark'">
          <a-input v-model:value="record.remark" size="small" placeholder="请输入 备注" />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
        </template>
        <template v-else>
          {{ record[column.dataIndex] ?? '-' }}
        </template>
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { submitReceipt, updatePurchaseOrder } from '@/store/purchaseOrderStore'
import { receivingModeOptions } from '@/mock/purchaseOrderOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'

const props = defineProps({
  open: { type: Boolean, default: false },
  purchaseOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const form = reactive({ contractNo: '', remark: '自动审批' })
const receiptLines = ref([])

const receivingModeOpts = receivingModeOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物品名称', dataIndex: 'itemName', width: 120, ellipsis: true },
  { title: '物品类型', dataIndex: 'itemType', width: 90 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '采购数量', dataIndex: 'purchaseQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '收货模式', key: 'receivingMode', width: 100 },
  { title: '收货仓库', key: 'receivingWarehouse', width: 110 },
  { title: '收货数量', key: 'receiptQty', width: 100 },
  { title: '生产日期', key: 'productionDate', width: 120 },
  { title: '过期日期', key: 'expiryDate', width: 120 },
  { title: '备注', key: 'lineRemark', width: 100 },
  { title: '操作', key: 'action', width: 70 },
]

watch(
  () => props.open,
  (val) => {
    if (!val || !props.purchaseOrder) return
    form.contractNo = props.purchaseOrder.contractNo || ''
    form.remark = props.purchaseOrder.remark || '自动审批'
    receiptLines.value = (props.purchaseOrder.lineItems || [])
      .filter((l) => (Number(l.purchaseQty) || 0) > (Number(l.receivedQty) || 0))
      .map((l) => {
        const remaining = (Number(l.purchaseQty) || 0) - (Number(l.receivedQty) || 0)
        return {
          id: l.id,
          itemName: l.itemName,
          itemType: l.itemType,
          specModel: l.specModel,
          specAttr: l.specAttr || '',
          purchaseQty: l.purchaseQty,
          unit: l.unit,
          receivingMode: l.receivingMode || '正常收货',
          receivingWarehouse:
            l.receivingWarehouse ||
            resolveDefaultWarehouseByMaterialCode(l.materialCode || l.inventoryCode) ||
            undefined,
          receiptQty: remaining,
          remainingQty: remaining,
          productionDate: '',
          expiryDate: '',
          remark: '',
        }
      })
  },
)

function dateVal(val) {
  return val ? dayjs(val) : null
}

function onDateChange(record, field, date) {
  record[field] = date ? date.format('YYYY-MM-DD') : ''
}

function removeLine(index) {
  receiptLines.value.splice(index, 1)
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!receiptLines.value.length) {
    message.warning('没有可收货的明细')
    return
  }
  const invalid = receiptLines.value.find(
    (l) => !l.receivingWarehouse || !l.receiptQty || l.receiptQty <= 0,
  )
  if (invalid) {
    message.warning('请填写收货仓库和收货数量')
    return
  }

  const result = submitReceipt(props.purchaseOrder.id, receiptLines.value)
  if (result.ok) {
    if (form.contractNo) {
      updatePurchaseOrder(props.purchaseOrder.id, { contractNo: form.contractNo })
    }
    message.success(result.message)
    emit('confirmed')
    emit('update:open', false)
  }
}
</script>

<style lang="less" scoped>
.header-form {
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
    }
  }
}
</style>

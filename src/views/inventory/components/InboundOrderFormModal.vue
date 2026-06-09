<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑入库单' : '新增入库单'"
    width="1100px"
    :mask-closable="false"
    destroy-on-close
    class="inbound-form-modal"
    @cancel="handleCancel"
  >
    <a-form :model="form" layout="inline" class="header-form horizontal-form">
      <a-row :gutter="[12, 12]" style="width: 100%">
        <a-col :span="8">
          <a-form-item label="入库类型" required>
            <a-select
              v-model:value="form.inboundType"
              size="small"
              placeholder="请选择"
              :options="inboundTypeOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="送货日期">
            <a-date-picker
              v-model:value="form.deliveryDate"
              size="small"
              style="width: 100%"
              placeholder="请选择 送货日期"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="入库仓库" required>
            <a-select
              v-model:value="form.warehouse"
              size="small"
              placeholder="请选择 入库仓库"
              :options="warehouseOpts"
              @change="onWarehouseChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="物品类型" required>
            <a-select
              v-model:value="form.itemType"
              size="small"
              :options="itemTypeOpts"
              @change="onItemTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="供应商">
            <a-select
              v-model:value="form.supplier"
              allow-clear
              show-search
              size="small"
              placeholder="请选择 供应商"
              :options="supplierOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="经手人">
            <a-select
              v-model:value="form.handler"
              size="small"
              show-search
              :options="handlerOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注" class="remark-item">
            <a-textarea
              v-model:value="form.remark"
              :rows="2"
              size="small"
              :maxlength="200"
              show-count
              placeholder="请输入 备注"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="发票号码">
            <a-input
              v-model:value="form.invoiceNo"
              size="small"
              :maxlength="30"
              show-count
              placeholder="请输入发票号码"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="入库单号" required>
            <a-input-group compact>
              <a-input
                v-model:value="form.docNo"
                size="small"
                style="width: calc(100% - 88px)"
                placeholder="请输入入库单号"
              />
              <a-button size="small" @click="generateCode">生成编码</a-button>
            </a-input-group>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="入库日期">
            <a-date-picker v-model:value="form.inboundDate" size="small" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="line-toolbar">
      <a-button type="primary" size="small" @click="pickerOpen = true">
        <PlusOutlined />
        {{ form.itemType === '物料' ? '选择物料' : '选择产品' }}
      </a-button>
    </div>

    <a-table
      :columns="lineColumns"
      :data-source="form.lineItems"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: lineScrollX, y: 280 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'qty'">
          <a-input-number v-model:value="record.qty" :min="0" size="small" style="width: 100%" />
        </template>
        <template v-else-if="column.key === 'weight'">
          <a-input-number v-model:value="record.weight" :min="0" size="small" style="width: 100%" />
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          <a-input-number
            v-model:value="record.unitPrice"
            :min="0"
            size="small"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'productionDate'">
          <a-date-picker
            :value="dateVal(record.productionDate)"
            size="small"
            style="width: 100%"
            @change="(d) => onLineDate(record, 'productionDate', d)"
          />
        </template>
        <template v-else-if="column.key === 'expiryDate'">
          <a-date-picker
            :value="dateVal(record.expiryDate)"
            size="small"
            style="width: 100%"
            @change="(d) => onLineDate(record, 'expiryDate', d)"
          />
        </template>
        <template v-else-if="column.key === 'barcodeBatchNo'">
          <a-input v-model:value="record.barcodeBatchNo" size="small" />
        </template>
        <template v-else-if="column.key === 'lineRemark'">
          <a-input v-model:value="record.lineRemark" size="small" />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeLine(record.id)">删除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="暂无数据" />
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>

    <SelectWarehouseItemModal
      v-model:open="pickerOpen"
      :selected-items="pickerPreset"
      @confirm="onItemsPicked"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons-vue'
import SelectWarehouseItemModal from '@/views/basic-config/components/SelectWarehouseItemModal.vue'
import { createInboundLine } from '@/mock/inboundOrders'
import { inboundTypeOptions, inboundItemTypeOptions, handlerOptions } from '@/mock/inboundOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  addInboundOrder,
  updateInboundOrder,
  generateInboundNo,
  resolveWarehouseKeeper,
} from '@/store/inboundOrderStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const pickerOpen = ref(false)

const isEdit = computed(() => Boolean(props.editRecord?.id))

const inboundTypeOpts = inboundTypeOptions.map((v) => ({ label: v, value: v }))
const itemTypeOpts = inboundItemTypeOptions.map((v) => ({ label: v, value: v }))
const handlerOpts = handlerOptions.map((v) => ({ label: v, value: v }))
const supplierOpts = supplierOptions

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const form = reactive({
  docNo: '',
  inboundType: '其他入库',
  warehouse: undefined,
  warehouseKeeper: '',
  inboundDate: dayjs(),
  deliveryDate: null,
  itemType: '产品',
  supplier: undefined,
  handler: 'admin1',
  invoiceNo: '',
  remark: '',
  lineItems: [],
})

const productLineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', width: 110 },
  { title: '物品名称', dataIndex: 'itemName', width: 130, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '数量', key: 'qty', width: 90 },
  { title: '重量(kg)', key: 'weight', width: 90 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '单价', key: 'unitPrice', width: 90 },
  { title: '操作', key: 'actions', width: 70, fixed: 'right' },
]

const materialLineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', width: 110 },
  { title: '物品名称', dataIndex: 'itemName', width: 120, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 80 },
  { title: '规格型号', dataIndex: 'specModel', width: 90 },
  { title: '材质', dataIndex: 'material', width: 70 },
  { title: '数量', key: 'qty', width: 80 },
  { title: '重量(kg)', key: 'weight', width: 80 },
  { title: '单位', dataIndex: 'unit', width: 60 },
  { title: '单价', key: 'unitPrice', width: 80 },
  { title: '条码编号/批次号', key: 'barcodeBatchNo', width: 130 },
  { title: '生产日期', key: 'productionDate', width: 120 },
  { title: '过期日期', key: 'expiryDate', width: 120 },
  { title: '备注', key: 'lineRemark', width: 100 },
  { title: '操作', key: 'actions', width: 70, fixed: 'right' },
]

const lineColumns = computed(() =>
  form.itemType === '物料' ? materialLineColumns : productLineColumns,
)

const lineScrollX = computed(() => lineColumns.value.reduce((s, c) => s + (c.width || 80), 0))

const pickerPreset = computed(() =>
  form.lineItems.map((l) => ({
    itemType: form.itemType,
    itemId: l.itemId || l.itemCode,
    code: l.itemCode,
    name: l.itemName,
  })),
)

watch(
  () => props.open,
  (v) => {
    if (!v) return
    if (props.editRecord) {
      const o = props.editRecord
      Object.assign(form, {
        docNo: o.docNo,
        inboundType: o.inboundType,
        warehouse: o.warehouse,
        warehouseKeeper: o.warehouseKeeper,
        inboundDate: o.inboundDate ? dayjs(o.inboundDate) : dayjs(),
        deliveryDate: o.deliveryDate ? dayjs(o.deliveryDate) : null,
        itemType: o.itemType || '产品',
        supplier: o.supplier,
        handler: o.handler || 'admin1',
        invoiceNo: o.invoiceNo || '',
        remark: o.remark || '',
        lineItems: (o.lineItems || []).map((l) => ({ ...l })),
      })
      return
    }
    resetForm()
  },
)

function resetForm() {
  Object.assign(form, {
    docNo: generateInboundNo(),
    inboundType: '其他入库',
    warehouse: undefined,
    warehouseKeeper: '',
    inboundDate: dayjs(),
    deliveryDate: null,
    itemType: '产品',
    supplier: undefined,
    handler: 'admin1',
    invoiceNo: '',
    remark: '',
    lineItems: [],
  })
}

function generateCode() {
  form.docNo = generateInboundNo()
}

function onWarehouseChange(name) {
  form.warehouseKeeper = resolveWarehouseKeeper(name)
}

function onItemTypeChange() {
  form.lineItems = []
}

function dateVal(val) {
  return val ? dayjs(val) : null
}

function onLineDate(record, field, date) {
  record[field] = date ? date.format('YYYY-MM-DD') : ''
}

function onItemsPicked(items) {
  const map = new Map(form.lineItems.map((l) => [l.itemCode, l]))
  items
    .filter((it) => it.itemType === form.itemType)
    .forEach((it) => {
      const existing = map.get(it.code)
      if (existing) return
      map.set(
        it.code,
        createInboundLine({
          itemId: it.itemId,
          itemCode: it.code,
          itemName: it.name,
          specModel: it.specModel || '',
          material: it.material || '',
          unit: it.inventoryUnit || '件',
          unitPrice: it.unitPrice ?? null,
          qty: 1,
        }),
      )
    })
  form.lineItems = [...map.values()]
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
}

function buildPayload() {
  return {
    docNo: form.docNo?.trim(),
    inboundType: form.inboundType,
    warehouse: form.warehouse,
    warehouseKeeper: form.warehouseKeeper || resolveWarehouseKeeper(form.warehouse),
    inboundDate: form.inboundDate?.format('YYYY-MM-DD'),
    deliveryDate: form.deliveryDate?.format('YYYY-MM-DD') || '',
    itemType: form.itemType,
    supplier: form.supplier,
    handler: form.handler,
    invoiceNo: form.invoiceNo?.trim(),
    remark: form.remark?.trim(),
    lineItems: form.lineItems.map((l) => ({ ...l })),
  }
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.inboundType) {
    message.warning('请选择入库类型')
    return
  }
  if (!form.warehouse) {
    message.warning('请选择入库仓库')
    return
  }
  if (!form.docNo?.trim()) {
    message.warning('请输入入库单号')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少添加一条明细')
    return
  }

  saving.value = true
  const payload = buildPayload()

  if (isEdit.value) {
    const res = updateInboundOrder(props.editRecord.id, payload)
    saving.value = false
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('入库单已更新')
  } else {
    addInboundOrder(payload)
    message.success('入库单已创建')
  }

  saving.value = false
  emit('saved')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.header-form {
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 72px;
    align-self: flex-start;
  }
}

.line-toolbar {
  margin-bottom: 8px;
}

.danger-link {
  color: #ff4d4f;
}
</style>

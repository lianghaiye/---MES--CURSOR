<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑采购申请单' : '新增采购申请单'"
    width="90%"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="section-block">
      <div class="section-title">基本信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="申请单号">
              <a-input
                v-model:value="form.reqNo"
                placeholder="留空则系统自动生成"
                allow-clear
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="紧急度">
              <a-select v-model:value="form.urgency" size="small" :options="urgencyOpts" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货日期" required>
              <a-date-picker
                v-model:value="form.deliveryDate"
                size="small"
                style="width: 100%"
                placeholder="请选择交货日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="预计到货日期">
              <a-date-picker
                v-model:value="form.estimatedArrivalDate"
                size="small"
                style="width: 100%"
                placeholder="请选择预计到货日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="500"
                show-count
                placeholder="请输入备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title">采购清单</div>
      <a-divider class="section-divider" />
      <div class="detail-toolbar">
        <a-button type="primary" size="small" @click="openInventoryPicker">
          <PlusOutlined />
          选择库存
        </a-button>
      </div>
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1200 }"
        locale="{ emptyText: '暂无数据' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'planPurchaseQty'">
            <a-input-number
              v-model:value="record.planPurchaseQty"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
              @change="onQtyChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'supplierName'">
            <a-select
              v-model:value="record.supplierName"
              size="small"
              allow-clear
              show-search
              style="width: 100%"
              :options="supplierOpts"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '-' }}
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="inventoryPickerOpen"
      title="选择库存"
      width="800px"
      @ok="confirmInventoryPick"
    >
      <a-table
        :columns="inventoryPickerColumns"
        :data-source="mockInventory"
        row-key="code"
        size="small"
        :row-selection="{
          type: 'checkbox',
          selectedRowKeys: pickedInventoryKeys,
          onChange: (keys) => (pickedInventoryKeys = keys),
        }"
        :pagination="false"
      />
    </a-modal>

    <template #footer>
      <a-button @click="handleCancel">
        <CloseOutlined />
        取消
      </a-button>
      <a-button type="primary" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { urgencyOptions } from '@/mock/purchaseRequisitionOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'
import { mockInventory } from '@/mock/inventory'
import { createLineItem } from '@/mock/purchaseRequisitions'
import { generateReqNo } from '@/store/purchaseRequisitionStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const inventoryPickerOpen = ref(false)
const pickedInventoryKeys = ref([])

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const supplierOpts = supplierOptions

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '库存名称', dataIndex: 'inventoryName', width: 120, ellipsis: true },
  { title: '库存编码', dataIndex: 'inventoryCode', width: 120 },
  { title: '型号规格', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '供货类型', dataIndex: 'supplyType', width: 90 },
  { title: '计量单位', dataIndex: 'unit', width: 80 },
  { title: '包装方式', dataIndex: 'packagingMethod', width: 90 },
  { title: '供方类型', dataIndex: 'supplierType', width: 90 },
  { title: '库存数量', dataIndex: 'stockQty', width: 90, align: 'right' },
  { title: '计划采购量', key: 'planPurchaseQty', width: 100 },
  { title: '供应商', key: 'supplierName', width: 120 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const inventoryPickerColumns = [
  { title: '库存编码', dataIndex: 'code', width: 130 },
  { title: '库存名称', dataIndex: 'name', width: 120 },
  { title: '型号规格', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '库存数量', dataIndex: 'stockQty', width: 90, align: 'right' },
]

const form = reactive({
  reqNo: '',
  urgency: '正常',
  deliveryDate: null,
  estimatedArrivalDate: null,
  remark: '',
  lineItems: [],
})

watch(
  () => props.open,
  (val) => {
    if (!val) return
    if (props.editRecord) {
      const r = props.editRecord
      form.reqNo = r.reqNo
      form.urgency = r.urgency
      form.deliveryDate = r.deliveryDate ? dayjs(r.deliveryDate) : null
      form.estimatedArrivalDate = r.estimatedArrivalDate ? dayjs(r.estimatedArrivalDate) : null
      form.remark = r.remark || ''
      form.lineItems = JSON.parse(JSON.stringify(r.lineItems || []))
      return
    }
    resetForm()
  },
)

function resetForm() {
  form.reqNo = ''
  form.urgency = '正常'
  form.deliveryDate = null
  form.estimatedArrivalDate = null
  form.remark = ''
  form.lineItems = []
}

function openInventoryPicker() {
  pickedInventoryKeys.value = []
  inventoryPickerOpen.value = true
}

function confirmInventoryPick() {
  pickedInventoryKeys.value.forEach((code) => {
    const item = mockInventory.find((m) => m.code === code)
    if (!item) return
    if (form.lineItems.some((l) => l.inventoryCode === code)) return
    form.lineItems.push(
      createLineItem({
        inventoryName: item.name,
        inventoryCode: item.code,
        specModel: item.specModel,
        material: item.material,
        materialType: item.materialType,
        supplyType: item.supplyType,
        unit: item.unit,
        packagingMethod: item.packagingMethod,
        supplierType: item.supplierType,
        stockQty: item.stockQty,
        demandQty: 1,
        planPurchaseQty: 1,
        supplierName: item.defaultSupplier || '',
        designatedSupplier: Boolean(item.defaultSupplier),
      }),
    )
  })
  inventoryPickerOpen.value = false
}

function onQtyChange(record) {
  record.demandQty = record.planPurchaseQty
}

function removeLine(index) {
  form.lineItems.splice(index, 1)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.deliveryDate) {
    message.warning('请选择交货日期')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少添加一条采购清单')
    return
  }

  const reqNo = form.reqNo?.trim() || generateReqNo()
  const deliveryDate = form.deliveryDate.format('YYYY-MM-DD')
  const estimatedArrivalDate = form.estimatedArrivalDate
    ? form.estimatedArrivalDate.format('YYYY-MM-DD')
    : deliveryDate

  form.lineItems.forEach((line) => {
    line.demandQty = line.planPurchaseQty
    line.deliveryDate = deliveryDate
    line.expectedArrivalDate = estimatedArrivalDate
  })

  const payload = {
    ...JSON.parse(JSON.stringify(form)),
    reqNo,
    deliveryDate,
    estimatedArrivalDate,
    orderDate: dayjs().format('YYYY-MM-DD'),
    source: '新增',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    salesOrderNo: props.editRecord?.salesOrderNo || '',
    purchaseOrderNo: props.editRecord?.purchaseOrderNo || '',
    operator: '管理员',
    creator: props.editRecord?.creator || '管理员',
    createdAt: props.editRecord?.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }

  emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  message.success(isEdit.value ? '采购申请已更新' : '采购申请已保存')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 12px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
  }

  .section-divider {
    margin: 8px 0 12px;
  }
}

.header-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
    }
  }
}

.detail-toolbar {
  margin-bottom: 8px;
}
</style>

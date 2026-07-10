<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="purchase-req-form-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-form :model="form" layout="inline" class="header-form horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="申请单号">
                <a-input
                  v-model:value="form.reqNo"
                  placeholder="不填则系统自动生成"
                  allow-clear
                  size="small"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="紧急度">
                <a-select v-model:value="form.urgency" size="small" :options="urgencyOpts" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="交货日期">
                <a-date-picker
                  v-model:value="form.deliveryDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择交货日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="期望到货日期" required>
                <a-date-picker
                  v-model:value="form.estimatedArrivalDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择期望到货日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注" class="remark-item">
                <a-textarea
                  v-model:value="form.remark"
                  :rows="2"
                  size="small"
                  :maxlength="500"
                  show-count
                  placeholder="请输入备注"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-block section-block--lines">
        <div class="section-title">采购清单</div>
        <div class="line-toolbar">
          <a-space>
            <a-button type="primary" size="small" :loading="addingItems" @click="openProductPicker">
              <PlusOutlined />
              添加物品
            </a-button>
            <TableColumnSettingButton @click="columnDrawerOpen = true" />
          </a-space>
        </div>

        <div
          ref="lineTablePanelRef"
          class="line-table-panel"
          :class="{ 'panel-scrolling': isLineTableScrolling }"
          :style="lineTablePanelStyle"
        >
          <div class="line-table-body" :class="{ 'is-scrolling': isLineTableScrolling }">
            <a-table
              :columns="displayColumns"
              :data-source="form.lineItems"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="lineTableScroll"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'stockQty'">
                  {{ formatQty(record.stockQty) }}
                </template>
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
                  <PlanSupplierSelect
                    v-model:value="record.supplierName"
                    size="small"
                    placeholder="请搜索或选择供应商"
                  />
                </template>
                <template v-else-if="column.key === 'remark'">
                  <a-input
                    v-model:value="record.remark"
                    size="small"
                    allow-clear
                    placeholder="请输入备注"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a class="danger-link" @click="removeLine(record.id)">删除</a>
                </template>
                <template v-else>
                  {{ record[column.dataIndex] ?? '—' }}
                </template>
              </template>
              <template #emptyText>
                <div class="line-empty-placeholder">暂无数据</div>
              </template>
            </a-table>
          </div>
          <InventoryLineTableFooter
            :columns="displayColumns"
            :scroll-x="lineScrollX"
            @add-line="addBlankLine"
          >
            <template #cell="{ column }">
              <template v-if="column.key === 'index'">合计</template>
              <template v-else-if="column.key === 'productCode'">
                项数 {{ lineSummary.lineCount }}
              </template>
              <template v-else-if="column.key === 'planPurchaseQty'">
                {{ formatQty(lineSummary.qtyTotal) }}
              </template>
            </template>
          </InventoryLineTableFooter>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-if="isActive"
    v-model:open="productPickerOpen"
    title="添加产品/物料"
    @selected="onProductsSelected"
  />

  <TableColumnSettingDrawer
    v-model:open="columnDrawerOpen"
    v-model:settings="columnSettings"
    :default-settings="defaultColumnSettings"
    title="采购清单列设置"
  />
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { urgencyOptions } from '@/mock/purchaseRequisitionOptions'
import { mockInventory } from '@/mock/inventory'
import { createLineItem } from '@/mock/purchaseRequisitions'
import {
  addPurchaseRequisition,
  generateReqNo,
  updatePurchaseRequisition,
} from '@/store/purchaseRequisitionStore'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import InventoryLineTableFooter from '@/views/inventory/components/InventoryLineTableFooter.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'
import { useInventoryLineTableScroll } from '@/composables/useInventoryLineTableScroll'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { purchaseRequisitionFormLineColumns } from '@/utils/purchaseRequisitionLineColumns'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/procurement/purchase-req',
  getTitle: () => (isEdit.value ? '编辑采购申请单' : '新增采购申请单'),
})

const saving = ref(false)
const addingItems = ref(false)
const productPickerOpen = ref(false)

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-req-form-lines-v1', purchaseRequisitionFormLineColumns, {
    minScrollX: 1430,
  })

const lineScrollX = tableScrollX

const form = reactive({
  reqNo: '',
  urgency: '正常',
  deliveryDate: null,
  estimatedArrivalDate: null,
  remark: '',
  lineItems: [],
})

const lineSummary = computed(() => {
  const lines = form.lineItems.filter((line) => lineItemCode(line))
  const qtyTotal = lines.reduce((sum, line) => sum + (Number(line.planPurchaseQty) || 0), 0)
  return {
    lineCount: lines.length,
    qtyTotal: Math.round(qtyTotal * 100) / 100,
  }
})

const {
  panelRef: lineTablePanelRef,
  panelStyle: lineTablePanelStyle,
  tableScroll: lineTableScroll,
  isScrolling: isLineTableScrolling,
  updateScrollY,
} = useInventoryLineTableScroll({
  scrollX: lineScrollX,
  getRowCount: () => form.lineItems.length,
})

watch(
  () => isActive.value,
  (visible) => {
    if (visible) nextTick(updateScrollY)
  },
)

watch(
  () => [isActive.value, props.editRecord?.id],
  ([visible]) => {
    if (!visible) return
    if (props.editRecord) loadEditForm(props.editRecord)
    else resetForm()
  },
  { immediate: true },
)

function normalizeLineItems(items) {
  return items.map((line) => ({
    ...line,
    productName: line.productName || line.inventoryName || '',
    productCode: line.productCode || line.inventoryCode || '',
    inventoryName: line.inventoryName || line.productName || '',
    inventoryCode: line.inventoryCode || line.productCode || '',
    drawingNo: line.drawingNo || '',
    remark: line.remark || '',
  }))
}

function resetForm() {
  form.reqNo = ''
  form.urgency = '正常'
  form.deliveryDate = null
  form.estimatedArrivalDate = null
  form.remark = ''
  form.lineItems = []
}

function loadEditForm(record) {
  form.reqNo = record.reqNo
  form.urgency = record.urgency
  form.deliveryDate = record.deliveryDate ? dayjs(record.deliveryDate) : null
  form.estimatedArrivalDate = record.estimatedArrivalDate
    ? dayjs(record.estimatedArrivalDate)
    : null
  form.remark = record.remark || ''
  form.lineItems = normalizeLineItems(record.lineItems || [])
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function resolveStockQty(code) {
  const inv = mockInventory.find((m) => m.code === code)
  return inv?.stockQty ?? 0
}

function lineItemCode(line) {
  return line.productCode || line.inventoryCode || ''
}

function openProductPicker() {
  productPickerOpen.value = true
}

function mapPickerToLineItem(payload) {
  const code = payload.code || ''
  const name = payload.name || ''
  return createLineItem({
    productName: name,
    productCode: code,
    inventoryName: name,
    inventoryCode: code,
    specModel: payload.specModel || '',
    material: payload.material || '',
    drawingNo: payload.drawingNo || '',
    materialType: payload.materialType || '零部件',
    supplyType: payload.supplyForm || '',
    unit: payload.inventoryUnit || '件',
    stockQty: resolveStockQty(code),
    demandQty: 1,
    planPurchaseQty: 1,
    supplierName: payload.defaultSupplier || '',
    designatedSupplier: Boolean(payload.defaultSupplier),
    remark: '',
  })
}

function onProductsSelected(rows) {
  const list = Array.isArray(rows) ? rows : [rows]
  if (!list.length) {
    message.warning('未选择物品')
    return
  }
  addingItems.value = true
  productPickerOpen.value = false
  nextTick(() => {
    try {
      const before = form.lineItems.length
      list.forEach((payload) => {
        const code = payload.code || ''
        if (!code) return
        if (form.lineItems.some((l) => lineItemCode(l) === code)) return
        form.lineItems.push(mapPickerToLineItem(payload))
      })
      const added = form.lineItems.length - before
      if (added > 0) message.success(`已添加 ${added} 条明细`)
      else message.info('所选物品已在明细中')
    } finally {
      addingItems.value = false
    }
  })
}

function addBlankLine() {
  form.lineItems.push(
    createLineItem({
      productName: '',
      productCode: '',
      inventoryName: '',
      inventoryCode: '',
      planPurchaseQty: 1,
    }),
  )
}

function onQtyChange(record) {
  record.demandQty = record.planPurchaseQty
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((line) => line.id !== id)
}

function handleSave() {
  if (!form.estimatedArrivalDate) {
    message.warning('请选择期望到货日期')
    return
  }

  const validLines = form.lineItems.filter((line) => lineItemCode(line))
  if (!validLines.length) {
    message.warning('请至少添加一条有效明细')
    return
  }

  const missingQty = validLines.find(
    (line) => line.planPurchaseQty == null || Number(line.planPurchaseQty) <= 0,
  )
  if (missingQty) {
    message.warning(
      `请填写「${missingQty.productName || missingQty.inventoryName || '明细'}」的计划采购数`,
    )
    return
  }

  saving.value = true
  const reqNo = form.reqNo?.trim() || generateReqNo()
  const deliveryDate = form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : ''
  const estimatedArrivalDate = form.estimatedArrivalDate.format('YYYY-MM-DD')

  const lineItems = validLines.map((line) => {
    const next = { ...line }
    next.demandQty = next.planPurchaseQty
    next.deliveryDate = deliveryDate
    next.expectedArrivalDate = estimatedArrivalDate
    next.productName = next.productName || next.inventoryName || ''
    next.productCode = next.productCode || next.inventoryCode || ''
    next.inventoryName = next.productName
    next.inventoryCode = next.productCode
    return next
  })

  const payload = {
    reqNo,
    urgency: form.urgency,
    deliveryDate,
    estimatedArrivalDate,
    remark: form.remark?.trim() || '',
    lineItems,
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

  if (props.pageMode) {
    if (isEdit.value) {
      updatePurchaseRequisition(props.editRecord.id, payload)
    } else {
      addPurchaseRequisition({ ...payload, id: `pr-${Date.now()}` })
    }
  } else {
    emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  }

  saving.value = false
  message.success(isEdit.value ? '采购申请已更新' : '采购申请已保存')
  closeAfterSave()
}
</script>

<style lang="less" scoped>
:deep(.form-create-page.purchase-req-form-modal) {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;

  .form-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
  }
}

.form-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;

  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #1f1f1f;
  }

  &.section-block--lines {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
  }
}

.header-form {
  flex-shrink: 0;

  :deep(.ant-form-item) {
    margin-bottom: 0;
    width: 100%;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 72px;
    align-self: flex-start;
  }
}

.line-toolbar {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.line-table-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  flex-shrink: 0;

  &.panel-scrolling {
    flex: 1 1 auto;
    min-height: 0;
  }
}

.line-table-body {
  flex: 0 0 auto;
  min-height: 0;

  &.is-scrolling {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;

    :deep(.ant-table-wrapper),
    :deep(.ant-spin-nested-loading),
    :deep(.ant-spin-container),
    :deep(.ant-table) {
      height: 100%;
    }
  }

  :deep(.ant-table) {
    margin-bottom: 0 !important;
  }

  :deep(.ant-table-container),
  :deep(.ant-table-content),
  :deep(.ant-table-header),
  :deep(.ant-table-body) {
    overflow-x: hidden !important;
  }

  :deep(.ant-table-body) {
    overflow-y: auto !important;
  }
}

:deep(.ant-table-tbody > tr > td) {
  padding: 4px 8px !important;
}

.line-empty-placeholder {
  padding: 12px 0;
  color: #bfbfbf;
  font-size: 13px;
  text-align: center;
}

.danger-link {
  color: #ff4d4f;
}
</style>

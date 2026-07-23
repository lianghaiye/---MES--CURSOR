<template>
  <div class="mr-create-page">
    <div class="page-header">
      <div class="header-left">
        <span class="page-title">申请领料</span>
        <span class="page-sub">提交后生成领料申请，并在出库管理生成领料出库单</span>
      </div>
      <a-space :size="8">
        <a-button size="small" @click="goBack">取消</a-button>
        <a-button type="primary" size="small" :loading="submitting" @click="onSubmit">
          提交领料申请
        </a-button>
        <a-button size="small" @click="goBack">返回列表</a-button>
      </a-space>
    </div>

    <div class="page-body">
      <div class="section-card">
        <div class="section-title">领料方式</div>
        <a-radio-group v-model:value="mode" button-style="solid" @change="onModeChange">
          <a-radio-button :value="MATERIAL_REQ_MODES.WORK_ORDER">工单领料</a-radio-button>
          <a-radio-button :value="MATERIAL_REQ_MODES.SALES_ORDER">订单领料</a-radio-button>
          <a-radio-button :value="MATERIAL_REQ_MODES.QUICK">快速领料</a-radio-button>
        </a-radio-group>
        <div class="mode-hint">
          <template v-if="mode === MATERIAL_REQ_MODES.WORK_ORDER">
            选择工单自动带出关联产品；可添加工单行合并领料，按物料编码汇总并保留来源工单溯源
          </template>
          <template v-else-if="mode === MATERIAL_REQ_MODES.SALES_ORDER">
            选择销售订单后自动带出关联工单及 EBOM 物料；可手工补料
          </template>
          <template v-else>无工单场景，手工添加物料领料</template>
        </div>
      </div>

      <div v-if="mode === MATERIAL_REQ_MODES.WORK_ORDER" class="section-card">
        <div class="section-head">
          <div class="section-title">选择工单</div>
          <a-button
            type="link"
            size="small"
            :disabled="!selectedWorkOrders.length"
            @click="loadEbomLines"
          >
            按 EBOM 刷新明细
          </a-button>
        </div>

        <a-table
          :columns="woRowColumns"
          :data-source="workOrderRows"
          row-key="key"
          size="small"
          bordered
          :pagination="false"
          class="wo-pick-table"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'workOrder'">
              <WorkOrderSearchSelect
                :value="record.workOrderCode"
                size="small"
                placeholder="请搜索或选择工单"
                @update:value="(code) => onWorkOrderCodeChange(index, code)"
              />
            </template>
            <template v-else-if="column.key === 'product'">
              <a-input
                :value="record.productName"
                size="small"
                disabled
                placeholder="选择工单后自动带出"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                :disabled="workOrderRows.length <= 1"
                @click="removeWorkOrderRow(index)"
              >
                删除
              </a-button>
            </template>
          </template>
        </a-table>

        <a-button type="dashed" block class="add-wo-btn" @click="addWorkOrderRow">
          + 添加工单
        </a-button>
        <div v-if="selectedWorkOrders.length" class="selected-tip">
          已选 {{ selectedWorkOrders.length }} 个工单
        </div>
      </div>

      <div v-if="mode === MATERIAL_REQ_MODES.SALES_ORDER" class="section-card">
        <div class="section-head">
          <div class="section-title">选择销售订单</div>
          <a-button
            type="link"
            size="small"
            :disabled="!salesLinkedWorkOrders.length"
            @click="loadEbomLines"
          >
            按 EBOM 刷新明细
          </a-button>
        </div>
        <a-form layout="vertical" class="head-form">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12">
              <a-form-item label="销售订单" required>
                <SalesOrderSearchSelect
                  :value="form.salesOrderNo"
                  size="middle"
                  placeholder="请搜索或选择销售订单"
                  @update:value="onSalesOrderChange"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>

        <div v-if="form.salesOrderNo" class="sales-wo-block">
          <div class="sales-wo-title">关联工单（{{ salesLinkedWorkOrders.length }}）</div>
          <a-table
            :columns="salesWoColumns"
            :data-source="salesLinkedWorkOrders"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1480 }"
            :locale="{ emptyText: '该订单下暂无可领料工单' }"
            class="sales-wo-table"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="workOrderStatusColor(record.status)">
                  {{ record.status || '—' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'specModel'">
                {{ record.specModel || record.productSpec || '—' }}
              </template>
              <template v-else-if="column.key === 'variantAttr'">
                {{ record.variantSummary || '—' }}
              </template>
              <template v-else-if="column.key === 'dispatchedAt'">
                {{ record.dispatchedAt || record.submittedAt || '—' }}
              </template>
              <template v-else-if="column.dataIndex">
                {{ displayWoCell(record[column.dataIndex]) }}
              </template>
            </template>
          </a-table>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">申请信息</div>
        <a-form layout="vertical" class="head-form">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="8">
              <a-form-item label="领用车间" required>
                <a-select
                  v-model:value="form.workshop"
                  :options="workshopOpts"
                  show-search
                  allow-clear
                  placeholder="请选择"
                  @change="onWorkshopChange"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="mode !== MATERIAL_REQ_MODES.QUICK" :xs="24" :sm="8">
              <a-form-item label="领入仓库">
                <a-select
                  v-model:value="form.receiveWarehouse"
                  :options="receiveWarehouseOpts"
                  show-search
                  allow-clear
                  placeholder="线边仓（可选）"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-form-item label="备注">
                <a-input v-model:value="form.remark" allow-clear placeholder="选填" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-card">
        <div class="section-head">
          <div class="section-title">领料明细（{{ lines.length }} 项 / 合计 {{ totalQty }}）</div>
          <a-button type="primary" size="small" @click="pickerOpen = true">+ 添加物料</a-button>
        </div>
        <a-table
          :columns="lineColumns"
          :data-source="lines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1480 }"
          :locale="{ emptyText: '请添加领料明细，或从工单 / 销售订单带出 EBOM' }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'shipQty'">
              <a-input-number
                v-model:value="record.shipQty"
                :min="0"
                :precision="0"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'shipWarehouse'">
              <a-select
                v-model:value="record.shipWarehouse"
                :options="pickWarehouseOpts"
                size="small"
                style="width: 100%"
                show-search
              />
            </template>
            <template v-else-if="column.key === 'suggestedQty'">
              {{ record.suggestedQty || '—' }}
            </template>
            <template v-else-if="column.key === 'specModel'">
              <a
                v-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="openVariantConfig(record)"
              >
                {{ record.specModel || '点击配置' }}
              </a>
              <span v-else>{{ record.specModel || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'material'">
              <a
                v-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="openVariantConfig(record)"
              >
                {{ record.material || '点击配置' }}
              </a>
              <span v-else>{{ record.material || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'variantAttr'">
              <a
                v-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="openVariantConfig(record)"
              >
                {{ lineVariantDisplay(record) || '—' }}
              </a>
              <template v-else>
                <a-tooltip v-if="lineVariantDisplay(record)" :title="lineVariantDisplay(record)">
                  <span>{{ lineVariantDisplay(record) }}</span>
                </a-tooltip>
                <span v-else>—</span>
              </template>
            </template>
            <template v-else-if="column.key === 'drawingNo'">
              {{ record.drawingNo || '—' }}
            </template>
            <template v-else-if="column.key === 'source'">
              <template v-if="record.sourceWorkOrders?.length">
                <a-tag v-for="s in record.sourceWorkOrders" :key="s.workOrderId" color="blue">
                  {{ s.workOrderCode }} ×{{ s.qty }}
                </a-tag>
              </template>
              <span v-else>{{ record.lineSource === 'EBOM' ? '工单 EBOM' : '手工添加' }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <SelectBomMaterialModal
      v-model:open="pickerOpen"
      title="添加产品/物料"
      picker-default-item-type="产品"
      :include-spu-templates="true"
      @selected="onMaterialsPicked"
    />

    <ConfigureSalesSpuVariantModal
      v-model:open="variantConfigOpen"
      :spu-id="variantConfigSpuId"
      :initial-variant-values="variantConfigInitialValues"
      :allow-back="false"
      confirm-text="确定"
      @confirm="onVariantConfigConfirm"
    />
  </div>
</template>

<script>
export default { name: 'MaterialRequisitionCreateView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { workCenterOptions } from '@/mock/workOrderOptions'
import { getWorkOrders } from '@/store/workOrderStore'
import { warehouseState } from '@/store/warehouseStore'
import { MATERIAL_REQ_MODES, submitMaterialRequisition } from '@/store/mobileMaterialReqStore'
import {
  createManualMaterialLine,
  createMaterialReqSpuLine,
  resolveBatchWorkOrderMaterialLines,
} from '@/utils/materialReqEbom'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import WorkOrderSearchSelect from '@/views/procurement/components/WorkOrderSearchSelect.vue'
import SalesOrderSearchSelect from '@/views/procurement/components/SalesOrderSearchSelect.vue'
import ConfigureSalesSpuVariantModal from '@/views/sales/components/ConfigureSalesSpuVariantModal.vue'
import { useSpuVariantConfig } from '@/composables/useSpuVariantConfig'
import {
  applyResolvedSkuToInventoryLine,
  isSpuLine,
  lineVariantSummary,
  validateLinesSkuResolved,
} from '@/utils/spuLineResolve'

const router = useRouter()

let rowSeq = 1
function createEmptyWoRow() {
  return {
    key: `wo-row-${rowSeq++}`,
    workOrderCode: '',
    workOrderId: '',
    productName: '',
  }
}

const mode = ref(MATERIAL_REQ_MODES.WORK_ORDER)
const workOrderRows = ref([createEmptyWoRow()])
const lines = ref([])
const pickerOpen = ref(false)
const submitting = ref(false)

const {
  variantConfigOpen,
  variantConfigSpuId,
  variantConfigInitialValues,
  variantConfigTargetLine,
  openVariantConfig,
  lineVariantDisplay,
} = useSpuVariantConfig()

const form = reactive({
  workshop: '装配车间',
  receiveWarehouse: '',
  remark: '',
  salesOrderNo: '',
})

const workshopOpts = workCenterOptions.map((v) => ({ label: v, value: v }))

const pickWarehouseOpts = computed(() =>
  warehouseState.warehouses
    .filter((w) => w.enabled !== false)
    .map((w) => ({ label: w.name, value: w.name })),
)

const receiveWarehouseOpts = computed(() =>
  warehouseState.warehouses
    .filter((w) => w.enabled !== false && w.categoryName === '线边仓')
    .map((w) => ({
      label: `${w.name}${w.workCenter ? `（${w.workCenter}）` : ''}`,
      value: w.name,
    })),
)

const allWorkOrders = computed(() =>
  getWorkOrders().filter((o) => o.status && o.status !== '待下发'),
)

const salesLinkedWorkOrders = computed(() => {
  const so = form.salesOrderNo
  if (!so) return []
  return allWorkOrders.value.filter((o) => (o.sourceOrderNo || '') === so)
})

const selectedWorkOrders = computed(() => {
  if (mode.value === MATERIAL_REQ_MODES.SALES_ORDER) return salesLinkedWorkOrders.value
  const codes = workOrderRows.value.map((r) => r.workOrderCode).filter(Boolean)
  const uniq = [...new Set(codes)]
  return uniq.map((code) => allWorkOrders.value.find((o) => o.code === code)).filter(Boolean)
})

const woRowColumns = [
  { title: '工单编号', key: 'workOrder', width: 320 },
  { title: '关联产品', key: 'product' },
  { title: '操作', key: 'action', width: 80, align: 'center' },
]

const salesWoColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '工单编号', dataIndex: 'code', key: 'code', width: 150, ellipsis: true, fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', key: 'productName', width: 130, ellipsis: true },
  { title: '规格型号', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90, ellipsis: true },
  { title: '变体属性', key: 'variantAttr', width: 120, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 110, ellipsis: true },
  {
    title: '排产数量',
    dataIndex: 'scheduleQty',
    key: 'scheduleQty',
    width: 90,
    align: 'right',
  },
  { title: '加工中心', dataIndex: 'workCenter', key: 'workCenter', width: 110, ellipsis: true },
  {
    title: '工艺路线',
    dataIndex: 'processRouteName',
    key: 'processRouteName',
    width: 120,
    ellipsis: true,
  },
  { title: '负责人', dataIndex: 'owner', key: 'owner', width: 90, ellipsis: true },
  { title: '下发时间', key: 'dispatchedAt', width: 140 },
]

function displayWoCell(value) {
  if (value === 0) return '0'
  const text = String(value ?? '').trim()
  return text || '—'
}

function workOrderStatusColor(status) {
  if (status === '执行中') return 'processing'
  if (status === '完成') return 'success'
  if (status === '已下发') return 'blue'
  if (status === '暂停') return 'warning'
  if (status === '终止') return 'error'
  return 'default'
}

const lineColumns = [
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 140 },
  { title: '规格型号', key: 'specModel', width: 110 },
  { title: '材质', key: 'material', width: 90 },
  { title: '变体属性', key: 'variantAttr', width: 140, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 110 },
  { title: '建议数量', key: 'suggestedQty', width: 90, align: 'right' },
  { title: '领料数量', key: 'shipQty', width: 110 },
  { title: '领料仓库', key: 'shipWarehouse', width: 130 },
  { title: '来源', key: 'source', width: 180 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const totalQty = computed(() =>
  lines.value.reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0),
)

watch(
  selectedWorkOrders,
  (list) => {
    if (
      mode.value !== MATERIAL_REQ_MODES.WORK_ORDER &&
      mode.value !== MATERIAL_REQ_MODES.SALES_ORDER
    ) {
      return
    }
    loadEbomLines()
    const first = list[0]
    if (first?.workCenter) {
      form.workshop = first.workCenter
      syncReceiveWarehouse()
    }
  },
  { deep: true },
)

function onModeChange() {
  workOrderRows.value = [createEmptyWoRow()]
  lines.value = []
  form.salesOrderNo = ''
  if (mode.value === MATERIAL_REQ_MODES.QUICK) {
    form.receiveWarehouse = ''
  } else {
    syncReceiveWarehouse()
  }
}

function onSalesOrderChange(code) {
  form.salesOrderNo = code || ''
  lines.value = []
  if (!form.salesOrderNo) return
  if (!salesLinkedWorkOrders.value.length) {
    message.warning('该销售订单下暂无可领料工单')
  }
}

function addWorkOrderRow() {
  workOrderRows.value.push(createEmptyWoRow())
}

function removeWorkOrderRow(index) {
  if (workOrderRows.value.length <= 1) return
  workOrderRows.value.splice(index, 1)
}

function onWorkOrderCodeChange(index, code) {
  const row = workOrderRows.value[index]
  if (!row) return
  if (!code) {
    row.workOrderCode = ''
    row.workOrderId = ''
    row.productName = ''
    return
  }
  const duplicated = workOrderRows.value.some(
    (r, i) => i !== index && r.workOrderCode && r.workOrderCode === code,
  )
  if (duplicated) {
    message.warning('该工单已添加，请勿重复选择')
    row.workOrderCode = ''
    row.workOrderId = ''
    row.productName = ''
    return
  }
  const wo = allWorkOrders.value.find((o) => o.code === code)
  if (!wo) {
    message.warning('未找到该工单')
    row.workOrderCode = ''
    row.workOrderId = ''
    row.productName = ''
    return
  }
  row.workOrderCode = wo.code
  row.workOrderId = wo.id
  row.productName = wo.productName || wo.name || ''
}

function syncReceiveWarehouse() {
  const matched = receiveWarehouseOpts.value.find((o) => {
    const wh = warehouseState.warehouses.find((w) => w.name === o.value)
    return wh?.workCenter === form.workshop
  })
  form.receiveWarehouse = matched?.value || receiveWarehouseOpts.value[0]?.value || ''
}

function onWorkshopChange() {
  if (mode.value !== MATERIAL_REQ_MODES.QUICK) syncReceiveWarehouse()
}

function loadEbomLines() {
  const selected = selectedWorkOrders.value
  if (!selected.length) {
    lines.value = []
    return
  }
  const { lines: merged, emptyWorkOrders } = resolveBatchWorkOrderMaterialLines(selected)
  lines.value = merged
  if (emptyWorkOrders.length) {
    message.warning(`${emptyWorkOrders.map((w) => w.code).join('、')} 无 EBOM，请手工补料`)
  }
}

function onMaterialsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  const skuRows = list.filter((r) => r.pickType !== 'spu')
  const spuRows = list.filter((r) => r.pickType === 'spu')
  if (skuRows.length) onSkuMaterialsPicked(skuRows)
  if (spuRows.length) onSpuDraftSelected(spuRows)
}

function onSkuMaterialsPicked(list) {
  list.forEach((item) => {
    const code = item.code || item.itemCode
    const exists = lines.value.find((l) => l.itemCode && l.itemCode === code)
    if (exists) {
      exists.shipQty = Number(exists.shipQty || 0) + 1
      return
    }
    lines.value.push(createManualMaterialLine(item, 1))
  })
}

function onSpuDraftSelected(rows) {
  let added = 0
  rows.forEach((payload) => {
    const spuId = payload.spuId || payload.id
    if (!spuId) return
    const dup = lines.value.some(
      (line) => isSpuLine(line) && line.spuId === spuId && !line.itemId && !line.itemCode,
    )
    if (dup) return
    lines.value.push(createMaterialReqSpuLine(payload))
    added += 1
  })
  if (!added) {
    message.info('所选产品族已在明细中（待配置变体），未重复添加')
    return
  }
  message.success(`已添加 ${added} 个产品族，请点击规格型号 / 材质 / 变体属性完成配置`)
}

function onVariantConfigConfirm(payload) {
  const { resolved, variantValues } = payload || {}
  if (!resolved?.sku) {
    message.warning('未匹配到 SKU')
    return
  }
  const target = variantConfigTargetLine.value
  if (!target) {
    message.warning('未找到待配置的明细行')
    return
  }
  const dupSku = lines.value.some(
    (line) => line.id !== target.id && line.itemCode === resolved.productCode,
  )
  if (dupSku) {
    message.warning(`物料编码「${resolved.productCode}」已在明细中`)
    return
  }
  applyResolvedSkuToInventoryLine(target, resolved)
  target.variantValues = { ...(variantValues || resolved.variantValues || {}) }
  target.variantSummary = lineVariantSummary(target)
  message.success('变体已配置')
}

function removeLine(index) {
  lines.value.splice(index, 1)
}

function goBack() {
  router.push('/production/material-requisition')
}

function onSubmit() {
  if (submitting.value) return
  if (mode.value === MATERIAL_REQ_MODES.WORK_ORDER && !selectedWorkOrders.value.length) {
    message.warning('请至少选择一个工单')
    return
  }
  if (mode.value === MATERIAL_REQ_MODES.SALES_ORDER) {
    if (!form.salesOrderNo) {
      message.warning('请选择销售订单')
      return
    }
    if (!selectedWorkOrders.value.length) {
      message.warning('该销售订单下暂无可领料工单')
      return
    }
  }
  if (!form.workshop) {
    message.warning('请选择领用车间')
    return
  }
  const skuCheck = validateLinesSkuResolved(lines.value)
  if (!skuCheck.ok) {
    message.warning(skuCheck.message)
    return
  }

  submitting.value = true
  const selected = selectedWorkOrders.value
  let payload = {
    mode: mode.value,
    workshop: form.workshop,
    receiveWarehouse: mode.value === MATERIAL_REQ_MODES.QUICK ? '' : form.receiveWarehouse,
    remark: form.remark,
    lines: lines.value,
    sourceChannel: 'web',
    applicant: '管理员',
  }

  if (mode.value === MATERIAL_REQ_MODES.WORK_ORDER) {
    if (selected.length === 1) {
      const wo = selected[0]
      payload = {
        ...payload,
        mode: MATERIAL_REQ_MODES.WORK_ORDER,
        workOrderId: wo.id,
        workOrderCode: wo.code,
        workOrderName: wo.name || wo.productName || '',
        workOrderIds: [wo.id],
        workOrders: [
          { id: wo.id, code: wo.code, productName: wo.productName, scheduleQty: wo.scheduleQty },
        ],
        salesOrderNo: wo.sourceOrderNo || '',
        productName: wo.productName || '',
        orderCategory: wo.orderCategory || '',
      }
    } else {
      const salesSet = [...new Set(selected.map((w) => w.sourceOrderNo).filter(Boolean))]
      payload = {
        ...payload,
        mode: MATERIAL_REQ_MODES.BATCH,
        workOrderIds: selected.map((w) => w.id),
        workOrders: selected.map((w) => ({
          id: w.id,
          code: w.code,
          productName: w.productName,
          scheduleQty: w.scheduleQty,
        })),
        salesOrderNo: salesSet.length === 1 ? salesSet[0] : salesSet.length > 1 ? 'MULTI' : '',
        productName: selected
          .map((w) => w.productName)
          .filter(Boolean)
          .slice(0, 2)
          .join('、'),
      }
    }
  }

  if (mode.value === MATERIAL_REQ_MODES.SALES_ORDER) {
    payload = {
      ...payload,
      mode: MATERIAL_REQ_MODES.SALES_ORDER,
      salesOrderNo: form.salesOrderNo,
      workOrderIds: selected.map((w) => w.id),
      workOrders: selected.map((w) => ({
        id: w.id,
        code: w.code,
        productName: w.productName,
        scheduleQty: w.scheduleQty,
      })),
      productName: selected
        .map((w) => w.productName)
        .filter(Boolean)
        .slice(0, 2)
        .join('、'),
    }
  }

  const result = submitMaterialRequisition(payload)
  submitting.value = false
  if (!result.ok) {
    message.warning(result.message || '提交失败')
    return
  }
  message.success(
    result.record.auditStatus === '审核通过'
      ? `已提交并自动通过 ${result.record.reqNo}，出库单 ${result.order?.docNo || ''}`
      : `已提交 ${result.record.reqNo}，待审核`,
  )
  router.push(`/production/material-requisition/${result.record.id}`)
}

syncReceiveWarehouse()
</script>

<style lang="less" scoped>
.mr-create-page {
  margin: -12px;
  height: calc(100vh - 56px - 40px - 24px);
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  z-index: 30;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}

.header-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.page-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.section-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  .section-title {
    margin-bottom: 0;
  }
}

.mode-hint {
  margin-top: 10px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.wo-pick-table {
  margin-bottom: 8px;
}

.sales-wo-block {
  margin-top: 4px;
}

.sales-wo-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 8px;
}

.sales-wo-table {
  margin-bottom: 0;
}

.add-wo-btn {
  margin-top: 4px;
}

.selected-tip {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.variant-field-link {
  color: #1677ff;
  cursor: pointer;
}
</style>

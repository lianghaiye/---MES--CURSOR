<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="920px"
    :mask-closable="false"
    destroy-on-close
    class="report-work-form-modal"
    @cancel="handleCancel"
  >
    <div class="modal-body">
      <section v-if="isWorkOrderMode" class="form-section wo-section">
        <div class="section-head">
          <span class="section-title">工单信息</span>
          <a-tag color="error">必填</a-tag>
        </div>
        <a-row :gutter="[16, 12]">
          <a-col :span="24">
            <div class="field-label required">生产工单</div>
            <a-select
              v-model:value="form.workOrderId"
              show-search
              placeholder="请选择已下发的生产工单"
              :options="workOrderOptions"
              :filter-option="filterWorkOrder"
              style="width: 100%"
              @change="onWorkOrderChange"
            />
          </a-col>
          <template v-if="selectedWorkOrder">
            <a-col :xs="24" :md="8">
              <div class="field-label">工单编号</div>
              <a-input :value="selectedWorkOrder.code" disabled />
            </a-col>
            <a-col :xs="24" :md="8">
              <div class="field-label">产品</div>
              <a-input :value="selectedWorkOrder.productName" disabled />
            </a-col>
            <a-col :xs="24" :md="8">
              <div class="field-label">排产数量</div>
              <a-input
                :value="`${selectedWorkOrder.scheduleQty ?? selectedWorkOrder.planQty ?? 0} 件`"
                disabled
              />
            </a-col>
          </template>
        </a-row>
      </section>

      <section class="form-section">
        <div class="toggle-row">
          <div>
            <div class="toggle-title">按工序登记</div>
            <div class="toggle-hint">
              {{ form.perProcessRegister ? '各工序分别登记数量与人员' : '整体登记完工数量' }}
            </div>
          </div>
          <a-switch
            v-model:checked="form.perProcessRegister"
            @change="onPerProcessRegisterChange"
          />
        </div>

        <div class="section-head">
          <span class="section-title">{{ isWorkOrderMode ? '登记数量' : '产品信息' }}</span>
          <a-tag color="error">必填</a-tag>
        </div>

        <a-row :gutter="[16, 12]">
          <a-col v-if="!isWorkOrderMode" :span="24">
            <div class="field-label required">产品</div>
            <ProductMaterialSelect
              v-model="form.productName"
              placeholder="请选择产品"
              @select="onProductSelect"
            />
          </a-col>

          <a-col v-if="!form.perProcessRegister" :span="24">
            <a-alert
              type="warning"
              show-icon
              message="整体登记不支持工时工资的核算"
              class="overall-warning"
            />
          </a-col>

          <a-col v-if="isWorkOrderMode && !form.perProcessRegister" :span="24">
            <div class="qty-hint">报工数量可小于排产数量</div>
          </a-col>

          <template v-if="!form.perProcessRegister">
            <a-col :xs="24" :md="8">
              <div class="field-label required">良品数</div>
              <a-input-number
                v-model:value="form.goodQty"
                :min="0"
                style="width: 100%"
                addon-after="件"
                @change="normalizeFormQty"
              />
            </a-col>
            <a-col :xs="24" :md="8">
              <div class="field-label">不良品数</div>
              <a-input-number
                v-model:value="form.defectQty"
                :min="0"
                style="width: 100%"
                addon-after="件"
                @change="normalizeFormQty"
              />
            </a-col>
            <a-col :xs="24" :md="8">
              <div class="field-label">合计完工</div>
              <a-input :value="`${totalReportQty} 件`" disabled />
            </a-col>
            <a-col :span="24">
              <div class="field-label">操作人员（选填）</div>
              <a-select
                v-model:value="form.operators"
                mode="multiple"
                placeholder="请选择操作人员"
                :options="personnelOptions"
                style="width: 100%"
              />
            </a-col>
          </template>

          <a-col :span="24">
            <div class="field-label required">生产日期</div>
            <a-space wrap :size="8">
              <a-radio-group v-model:value="dateChip" size="small" @change="onDateChipChange">
                <a-radio-button value="today">今天</a-radio-button>
                <a-radio-button value="yesterday">昨天</a-radio-button>
                <a-radio-button value="custom">选择日期</a-radio-button>
              </a-radio-group>
              <a-date-picker
                v-if="dateChip === 'custom'"
                v-model:value="reportDateValue"
                size="small"
                style="width: 140px"
              />
            </a-space>
            <div v-if="form.reportDate" class="date-selected">已选：{{ form.reportDate }}</div>
          </a-col>
        </a-row>
      </section>

      <section v-if="form.perProcessRegister" class="form-section">
        <div class="section-head">
          <span class="section-title">生产详情</span>
          <a-tag>可选</a-tag>
        </div>

        <a-row v-if="form.routeName" :gutter="16" class="route-row">
          <a-col :span="24">
            <div class="field-label">工艺路线</div>
            <a-select
              v-if="routeOptions.length > 1"
              v-model:value="form.routeName"
              :options="routeOptions"
              style="width: 100%"
              @change="onRouteChange"
            />
            <a-input v-else :value="form.routeName" disabled />
          </a-col>
        </a-row>

        <a-collapse v-model:active-key="processCollapse" ghost class="process-collapse">
          <a-collapse-panel key="process" header="当前工序">
            <a-table
              :columns="processColumns"
              :data-source="form.processes"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'name'">
                  <template v-if="record.deleted">
                    <span class="deleted-name">{{ record.name }}</span>
                    <a-button type="link" size="small" @click="undoDeleteProcess(index)">
                      撤销删除
                    </a-button>
                  </template>
                  <template v-else>
                    <span>{{ record.name }}</span>
                  </template>
                </template>
                <template v-else-if="column.key === 'goodQty'">
                  <a-input-number
                    v-if="!record.deleted"
                    v-model:value="record.goodQty"
                    :min="0"
                    size="small"
                    style="width: 100%"
                    @change="onProcessQtyChange(record)"
                  />
                </template>
                <template v-else-if="column.key === 'defectQty'">
                  <a-input-number
                    v-if="!record.deleted"
                    v-model:value="record.defectQty"
                    :min="0"
                    size="small"
                    style="width: 100%"
                    @change="onProcessQtyChange(record)"
                  />
                </template>
                <template v-else-if="column.key === 'operators'">
                  <a-select
                    v-if="!record.deleted"
                    v-model:value="record.operators"
                    mode="multiple"
                    size="small"
                    placeholder="指定人员"
                    :options="personnelOptions"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    v-if="!record.deleted"
                    type="link"
                    size="small"
                    danger
                    @click="softDeleteProcess(index)"
                  >
                    删除
                  </a-button>
                </template>
              </template>
            </a-table>
            <a-button type="link" size="small" class="add-process-btn" @click="openProcessSelect">
              + 添加工序
            </a-button>
          </a-collapse-panel>
        </a-collapse>
      </section>

      <div v-if="form.perProcessRegister" class="qty-summary-bar">
        良品 <span class="qty-good">{{ form.goodQty ?? 0 }}</span> · 不良
        <span class="qty-defect">{{ form.defectQty ?? 0 }}</span> · 合计
        <span class="qty-total">{{ totalReportQty }}</span> 件
      </div>

      <section class="form-section">
        <div class="section-head">
          <span class="section-title">备注</span>
          <a-tag>可选</a-tag>
        </div>
        <a-textarea
          v-model:value="form.remark"
          :rows="3"
          :maxlength="500"
          show-count
          placeholder="本批次使用替代螺丝规格M6×20..."
        />
      </section>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">提交登记</a-button>
    </template>
  </a-modal>

  <ProcessSelectModal
    v-model:open="processSelectOpen"
    :exclude-process-ids="excludeProcessIds"
    :exclude-names="excludeProcessNames"
    @confirm="onProcessesSelected"
  />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { personnelOptions } from '@/mock/personnel'
import { formatReportDate } from '@/mock/quickReports'
import { getActiveRouteOptions } from '@/mock/processRoutes'
import { getLastOperators, submitQuickReport } from '@/store/quickReportStore'
import { getDispatchedProductionWorkOrders } from '@/store/workOrderStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'
import { resolveDefaultExecutors } from '@/store/processConfigStore'
import {
  buildQuickReportProcessesFromRoute,
  normalizeQuickReportProcess,
  resolveProcessQuantities,
} from '@/utils/quickReportProcess'
import ProcessSelectModal from './ProcessSelectModal.vue'
import ProductMaterialSelect from './ProductMaterialSelect.vue'

const props = defineProps({
  open: Boolean,
  /** workorder | quick */
  mode: { type: String, default: 'quick' },
})

const emit = defineEmits(['update:open', 'saved'])

const submitting = ref(false)
const dateChip = ref('today')
const processCollapse = ref(['process'])
const routeOptions = ref([])
const processSelectOpen = ref(false)

const isWorkOrderMode = computed(() => props.mode === 'workorder')
const modalTitle = computed(() => (isWorkOrderMode.value ? '工单登记' : '快速登记'))

const dispatchedWorkOrders = computed(() => getDispatchedProductionWorkOrders())

const workOrderOptions = computed(() =>
  dispatchedWorkOrders.value.map((wo) => ({
    label: `${wo.code} · ${wo.productName}`,
    value: wo.id,
    wo,
  })),
)

const selectedWorkOrder = computed(
  () => dispatchedWorkOrders.value.find((wo) => wo.id === form.workOrderId) || null,
)

const form = reactive({
  workOrderId: undefined,
  productId: undefined,
  productName: '',
  productCode: '',
  reportDate: formatReportDate(),
  goodQty: null,
  defectQty: 0,
  routeId: undefined,
  routeName: '',
  perProcessRegister: true,
  processes: [],
  operators: [],
  remark: '',
})

const reportDateValue = computed({
  get: () => (form.reportDate ? dayjs(form.reportDate) : null),
  set: (v) => {
    form.reportDate = v ? v.format('YYYY-MM-DD') : ''
    dateChip.value = 'custom'
  },
})

const totalReportQty = computed(() => (Number(form.goodQty) || 0) + (Number(form.defectQty) || 0))

const excludeProcessIds = computed(() =>
  form.processes.filter((p) => !p.deleted && p.processConfigId).map((p) => p.processConfigId),
)

const excludeProcessNames = computed(() =>
  form.processes.filter((p) => !p.deleted).map((p) => p.name),
)

const processColumns = [
  { title: '工序名称', key: 'name', width: 140 },
  { title: '良品数', key: 'goodQty', width: 96, align: 'right' },
  { title: '不良品数', key: 'defectQty', width: 96, align: 'right' },
  { title: '操作人员', key: 'operators', width: 220 },
  { title: '操作', key: 'action', width: 80 },
]

watch(
  () => props.open,
  (visible) => {
    if (visible) resetForm()
  },
)

function filterWorkOrder(input, option) {
  const label = (option?.label || '').toLowerCase()
  return label.includes((input || '').toLowerCase())
}

function resetForm() {
  form.workOrderId = undefined
  form.productId = undefined
  form.productName = ''
  form.productCode = ''
  form.reportDate = formatReportDate()
  form.goodQty = null
  form.defectQty = 0
  form.routeId = undefined
  form.routeName = ''
  form.perProcessRegister = true
  form.processes = []
  form.operators = [...getLastOperators()]
  form.remark = ''
  dateChip.value = 'today'
  routeOptions.value = []
  processCollapse.value = ['process']
}

function normalizeFormQty() {
  form.goodQty = Math.max(0, Number(form.goodQty) || 0)
  form.defectQty = Math.max(0, Number(form.defectQty) || 0)
}

function syncFormQtyFromProcesses() {
  const active = form.processes.filter((p) => !p.deleted)
  if (!active.length) {
    normalizeFormQty()
    return
  }
  form.goodQty = Math.max(...active.map((p) => Number(p.goodQty) || 0), 0)
  form.defectQty = Math.max(...active.map((p) => Number(p.defectQty) || 0), 0)
}

function syncProcessQtyFromForm() {
  normalizeFormQty()
  const qtys = { goodQty: form.goodQty, defectQty: form.defectQty }
  form.processes.forEach((p) => {
    if (!p.deleted) Object.assign(p, resolveProcessQuantities(qtys))
  })
}

function onPerProcessRegisterChange(checked) {
  if (checked) {
    if (!form.processes.length && form.routeName) {
      applyRoute(form.routeName)
    } else if (form.processes.length) {
      syncProcessQtyFromForm()
    }
    syncFormQtyFromProcesses()
  } else {
    syncFormQtyFromProcesses()
    if (!form.operators.length) form.operators = [...getLastOperators()]
  }
}

function onWorkOrderChange(workOrderId) {
  const wo = dispatchedWorkOrders.value.find((o) => o.id === workOrderId)
  if (!wo) return
  const pickable = buildWarehousePickableItems().find(
    (it) => it.name === wo.productName || it.code === wo.materialCode,
  )
  form.productId = pickable?.itemId
  form.productCode = pickable?.code || wo.materialCode || ''
  form.productName = wo.productName || ''
  const routeName = wo.processRouteName || ''
  if (routeName) {
    routeOptions.value = [{ label: routeName, value: routeName }]
    applyRoute(routeName)
  }
}

function onProductSelect(item) {
  if (!item) return
  form.productId = item.itemId
  form.productCode = item.code
  form.productName = item.name
  const routes = getActiveRouteOptions({ productName: item.name })
  routeOptions.value = routes.map((name) => ({ label: name, value: name }))
  if (routes.length) applyRoute(routes[0])
  else {
    form.routeId = undefined
    form.routeName = ''
    form.processes = []
  }
}

function applyRoute(routeName) {
  form.routeName = routeName
  form.routeId = routeName
  const lastOps = getLastOperators()
  form.processes = buildQuickReportProcessesFromRoute(routeName, {
    goodQty: form.goodQty,
    defectQty: form.defectQty,
    finishedQty: totalReportQty.value,
  }).map((p) => ({
    ...p,
    operators: p.operators?.length ? p.operators : [...lastOps],
  }))
  if (form.perProcessRegister) syncFormQtyFromProcesses()
}

function onRouteChange(routeName) {
  if (routeName) applyRoute(routeName)
}

function onDateChipChange() {
  if (dateChip.value === 'today') {
    form.reportDate = formatReportDate()
  } else if (dateChip.value === 'yesterday') {
    form.reportDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  }
}

function onProcessQtyChange(record) {
  Object.assign(record, resolveProcessQuantities(record))
  syncFormQtyFromProcesses()
}

function softDeleteProcess(index) {
  form.processes[index].deleted = true
  syncFormQtyFromProcesses()
}

function undoDeleteProcess(index) {
  form.processes[index].deleted = false
  syncFormQtyFromProcesses()
}

function openProcessSelect() {
  processSelectOpen.value = true
}

function onProcessesSelected(rows) {
  const qtys = resolveProcessQuantities({
    goodQty: form.goodQty,
    defectQty: form.defectQty,
    finishedQty: totalReportQty.value,
  })
  rows.forEach((proc) => {
    form.processes.push(
      normalizeQuickReportProcess({
        id: `cfg-${proc.id}-${Date.now()}`,
        processConfigId: proc.id,
        name: proc.name,
        code: proc.code,
        goodQty: qtys.goodQty,
        defectQty: qtys.defectQty,
        qty: qtys.qty,
        deleted: false,
        manual: true,
        operators: [...resolveDefaultExecutors(proc)],
      }),
    )
  })
  processCollapse.value = ['process']
  syncFormQtyFromProcesses()
}

function handleCancel() {
  emit('update:open', false)
}

function handleSubmit() {
  if (isWorkOrderMode.value && !form.workOrderId) {
    message.warning('请选择生产工单')
    return
  }
  if (form.perProcessRegister) {
    syncFormQtyFromProcesses()
  } else {
    normalizeFormQty()
  }

  submitting.value = true
  const wo = selectedWorkOrder.value
  const res = submitQuickReport({
    registrationType: isWorkOrderMode.value ? '工单登记' : '快速登记',
    workOrderId: isWorkOrderMode.value ? form.workOrderId : '',
    sourceWorkOrderNo: wo?.code || '',
    productId: form.productId,
    productName: form.productName,
    productCode: form.productCode,
    reportDate: form.reportDate,
    goodQty: form.goodQty,
    defectQty: form.defectQty,
    routeId: form.routeId,
    routeName: form.routeName,
    perProcessRegister: form.perProcessRegister,
    processes: form.perProcessRegister ? form.processes : [],
    operators: form.perProcessRegister ? [] : form.operators,
    remark: form.remark,
    reporter: 'admin1',
  })
  submitting.value = false

  if (!res.ok) {
    message.warning(res.message)
    return
  }

  message.success('登记成功')
  emit('saved', res.record)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.report-work-form-modal {
  .modal-body {
    max-height: 68vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .form-section {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
  }

  .section-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
  }

  .field-label {
    font-size: 13px;
    color: #595959;
    margin-bottom: 6px;

    &.required::before {
      content: '*';
      color: #ff4d4f;
      margin-right: 4px;
    }
  }

  .date-selected {
    margin-top: 8px;
    font-size: 13px;
    color: #1677ff;
    font-weight: 500;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding-bottom: 14px;
    margin-bottom: 14px;
    border-bottom: 1px solid #f0f0f0;
  }

  .toggle-title {
    font-weight: 500;
    color: #262626;
  }

  .toggle-hint {
    margin-top: 4px;
    font-size: 12px;
    color: #8c8c8c;
  }

  .overall-warning {
    margin-bottom: 4px;
  }

  .qty-hint {
    font-size: 12px;
    color: #8c8c8c;
    margin-bottom: 4px;
  }

  .route-row {
    margin-bottom: 12px;
  }

  .process-collapse {
    margin-bottom: 12px;

    :deep(.ant-collapse-header) {
      padding: 8px 0 !important;
      font-weight: 600;
    }

    :deep(.ant-collapse-content-box) {
      padding: 0 !important;
    }
  }

  .add-process-btn {
    margin-top: 8px;
    padding-left: 0;
  }

  .deleted-name {
    color: #ff4d4f;
    text-decoration: line-through;
    margin-right: 8px;
  }

  .qty-summary-bar {
    margin-bottom: 12px;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    font-size: 13px;
    color: #595959;
  }

  .qty-good {
    margin: 0 4px;
    font-weight: 600;
    color: #52c41a;
  }

  .qty-defect {
    margin: 0 4px;
    font-weight: 600;
    color: #ff4d4f;
  }

  .qty-total {
    margin: 0 4px;
    font-weight: 600;
    color: #1677ff;
  }
}
</style>

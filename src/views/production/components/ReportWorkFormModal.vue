<template>
  <a-modal
    :open="open"
    title="新增报工"
    width="920px"
    :mask-closable="false"
    destroy-on-close
    class="report-work-form-modal"
    @cancel="handleCancel"
  >
    <div class="modal-body">
      <section class="form-section">
        <div class="section-head">
          <span class="section-title">产品信息</span>
          <a-tag color="error">必填</a-tag>
        </div>
        <a-row :gutter="[16, 12]">
          <a-col :span="24">
            <div class="field-label required">产品</div>
            <a-select
              v-model:value="form.productId"
              show-search
              placeholder="请选择产品"
              :filter-option="filterProduct"
              :options="productOptions"
              style="width: 100%"
              @change="onProductChange"
            />
          </a-col>
          <a-col :xs="24" :md="12">
            <div class="field-label required">完工数量</div>
            <a-input-number
              v-model:value="form.finishedQty"
              :min="1"
              style="width: 100%"
              addon-after="件"
              @change="onFinishedQtyChange"
            />
          </a-col>
          <a-col :xs="24" :md="12">
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

      <section class="form-section">
        <div class="section-head">
          <span class="section-title">生产详情</span>
          <a-tag>可选</a-tag>
        </div>

        <div class="toggle-row">
          <div>
            <div class="toggle-title">按工序指定人员</div>
            <div class="toggle-hint">关闭：所有工序统一人员 · 打开：每道工序单独指定</div>
          </div>
          <a-switch v-model:checked="form.perProcessMode" />
        </div>

        <a-row v-if="form.routeName" :gutter="16" class="route-row">
          <a-col :span="24">
            <div class="field-label">工艺路线</div>
            <a-select
              v-if="routeOptions.length > 1"
              v-model:value="form.routeId"
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
                <template v-else-if="column.key === 'qty'">
                  <a-input-number
                    v-if="!record.deleted"
                    v-model:value="record.qty"
                    :min="0"
                    size="small"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'operators'">
                  <a-select
                    v-if="!record.deleted && form.perProcessMode"
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

        <div v-if="!form.perProcessMode" class="operator-block">
          <div class="field-label required">操作人员（整体）</div>
          <a-select
            v-model:value="form.operators"
            mode="multiple"
            placeholder="请选择操作人员"
            :options="personnelOptions"
            style="width: 100%"
          />
        </div>
      </section>

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
      <a-button type="primary" :loading="submitting" @click="handleSubmit">提交报工</a-button>
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
import {
  productList,
  buildProcessesFromRoute,
  getProductById,
  getRouteById,
} from '@/mock/quickReportProducts'
import { personnelOptions } from '@/mock/personnel'
import { formatReportDate } from '@/mock/quickReports'
import { getLastOperators, submitQuickReport } from '@/store/quickReportStore'
import { resolveDefaultExecutors } from '@/store/processConfigStore'
import ProcessSelectModal from './ProcessSelectModal.vue'

const props = defineProps({
  open: Boolean,
})

const emit = defineEmits(['update:open', 'saved'])

const submitting = ref(false)
const dateChip = ref('today')
const processCollapse = ref(['process'])
const routeOptions = ref([])
const processSelectOpen = ref(false)

const form = reactive({
  productId: undefined,
  productName: '',
  productCode: '',
  reportDate: formatReportDate(),
  finishedQty: null,
  routeId: undefined,
  routeName: '',
  perProcessMode: false,
  processes: [],
  operators: [],
  remark: '',
})

const productOptions = productList.map((p) => ({
  label: `${p.name} · ${p.code}${p.spec ? ` · ${p.spec}` : ''}`,
  value: p.id,
}))

const reportDateValue = computed({
  get: () => (form.reportDate ? dayjs(form.reportDate) : null),
  set: (v) => {
    form.reportDate = v ? v.format('YYYY-MM-DD') : ''
    dateChip.value = 'custom'
  },
})

const excludeProcessIds = computed(() =>
  form.processes.filter((p) => !p.deleted && p.processConfigId).map((p) => p.processConfigId),
)

const excludeProcessNames = computed(() =>
  form.processes.filter((p) => !p.deleted).map((p) => p.name),
)

const processColumns = computed(() => {
  const cols = [
    { title: '工序名称', key: 'name', width: form.perProcessMode ? 160 : 220 },
    { title: '数量', key: 'qty', width: 100 },
  ]
  if (form.perProcessMode) {
    cols.push({ title: '操作人员', key: 'operators', width: 220 })
  }
  cols.push({ title: '操作', key: 'action', width: 80 })
  return cols
})

watch(
  () => props.open,
  (visible) => {
    if (visible) resetForm()
  },
)

function resetForm() {
  form.productId = undefined
  form.productName = ''
  form.productCode = ''
  form.reportDate = formatReportDate()
  form.finishedQty = null
  form.routeId = undefined
  form.routeName = ''
  form.perProcessMode = false
  form.processes = []
  form.operators = [...getLastOperators()]
  form.remark = ''
  dateChip.value = 'today'
  routeOptions.value = []
  processCollapse.value = ['process']
}

function filterProduct(input, option) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function onProductChange(productId) {
  const product = getProductById(productId)
  if (!product) return
  form.productName = product.name
  form.productCode = product.code
  routeOptions.value = (product.routes || []).map((r) => ({
    label: r.name,
    value: r.id,
  }))
  const firstRoute = product.routes?.[0]
  if (firstRoute) applyRoute(firstRoute)
}

function applyRoute(route) {
  form.routeId = route.id
  form.routeName = route.name
  form.processes = buildProcessesFromRoute(route, form.finishedQty)
}

function onRouteChange(routeId) {
  const product = getProductById(form.productId)
  const route = getRouteById(product, routeId)
  if (route) applyRoute(route)
}

function onDateChipChange() {
  if (dateChip.value === 'today') {
    form.reportDate = formatReportDate()
  } else if (dateChip.value === 'yesterday') {
    form.reportDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  }
}

function onFinishedQtyChange() {
  const qty = Number(form.finishedQty) || 0
  form.processes.forEach((p) => {
    if (!p.deleted) p.qty = qty
  })
}

function softDeleteProcess(index) {
  form.processes[index].deleted = true
}

function undoDeleteProcess(index) {
  form.processes[index].deleted = false
}

function openProcessSelect() {
  processSelectOpen.value = true
}

function onProcessesSelected(rows) {
  const qty = Number(form.finishedQty) || 0
  rows.forEach((proc) => {
    form.processes.push({
      id: `cfg-${proc.id}-${Date.now()}`,
      processConfigId: proc.id,
      name: proc.name,
      code: proc.code,
      qty,
      deleted: false,
      manual: true,
      operators: [...resolveDefaultExecutors(proc)],
    })
  })
  processCollapse.value = ['process']
}

function handleCancel() {
  emit('update:open', false)
}

function handleSubmit() {
  submitting.value = true
  const res = submitQuickReport({
    productId: form.productId,
    productName: form.productName,
    productCode: form.productCode,
    reportDate: form.reportDate,
    finishedQty: form.finishedQty,
    routeId: form.routeId,
    routeName: form.routeName,
    perProcessMode: form.perProcessMode,
    processes: form.processes,
    operators: form.operators,
    remark: form.remark,
    reporter: 'admin1',
  })
  submitting.value = false

  if (!res.ok) {
    message.warning(res.message)
    return
  }

  message.success('报工成功')
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

  .operator-block {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }
}
</style>

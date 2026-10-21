<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1100px"
    :mask-closable="false"
    destroy-on-close
    class="create-rework-order-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form layout="inline" class="rework-form horizontal-form">
      <div class="form-section-box modal-basic-card">
        <div class="section-label">基本信息</div>
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="12">
            <a-form-item label="工单" required>
              <WorkOrderSearchSelect
                v-model:value="form.workOrderCode"
                placeholder="请搜索或选择工单"
                :orders="reworkableOrders"
                :category-options="reworkCategoryOpts"
                @select="onWorkOrderSelect"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="返工数量" required>
              <a-input-number v-model:value="form.qty" :min="1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="返工原因">
              <a-input v-model:value="form.reason" allow-clear placeholder="选填" />
            </a-form-item>
          </a-col>
          <a-col :span="24" class="remark-col">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                placeholder="请输入备注"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <div v-if="selectedWo" class="form-section-box">
        <div class="section-label">产品信息</div>
        <div class="item-preview">
          <div class="preview-grid">
            <div class="preview-row">
              <span class="preview-label">产品名称</span>
              <span>{{ selectedWo.productName || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">产品编号</span>
              <span>{{ selectedWo.productCode || selectedWo.materialCode || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">规格型号</span>
              <span>{{ selectedWo.specModel || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">材质</span>
              <span>{{ selectedWo.material || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">图号</span>
              <span>{{ selectedWo.drawingNo || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">排产数量</span>
              <span>{{ scheduleQtyDisplay }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">加工中心</span>
              <span>{{ selectedWo.workCenter || '—' }}</span>
            </div>
            <div class="preview-row preview-row-span">
              <span class="preview-label">工艺路线</span>
              <span>{{ selectedWo.processRouteName || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedWo" class="form-section-box">
        <div class="section-label">工序执行与报工</div>
        <div class="field-hint field-hint-block">
          勾选需重做的工序；默认返工人为原执行人，可单独指定。
        </div>
        <a-table
          :columns="processPreviewCols"
          :data-source="processPreviewRows"
          row-key="name"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 880, y: pageMode ? 360 : 260 }"
          :row-selection="processRowSelection"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'reworkAssignee'">
              <WorkOrderOwnerSelect
                :model-value="form.processAssignees[record.name]"
                size="small"
                placeholder="指定返工人"
                more-text="选择更多"
                :disabled="!form.processNames.includes(record.name)"
                @update:model-value="(v) => setAssignee(record.name, v)"
              />
            </template>
            <template v-else-if="column.dataIndex">
              {{ record[column.dataIndex] ?? '—' }}
            </template>
          </template>
        </a-table>
      </div>
    </a-form>
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">
          <CloseCircleOutlined />
          取消
        </a-button>
        <a-button type="primary" :loading="saving" @click="handleOk">
          <PlusCircleOutlined />
          创建并生效
        </a-button>
      </a-space>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons-vue'
import {
  createReworkOrderRecord,
  listReworkableWorkOrders,
  REWORK_ORDER_SOURCE,
} from '@/store/reworkOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { formatProcessExecutors } from '@/utils/workOrderProcessDisplay'
import { buildWorkOrderScheduleInfoBatchGroups } from '@/utils/workOrderRelatedInfo'
import WorkOrderSearchSelect from '@/views/procurement/components/WorkOrderSearchSelect.vue'
import WorkOrderOwnerSelect from './WorkOrderOwnerSelect.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'
import { useTabs } from '@/composables/useTabs'

const props = defineProps({
  open: { type: Boolean, default: false },
  preset: { type: Object, default: null },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
})
const emit = defineEmits(['update:open', 'created'])

const route = useRoute()
const router = useRouter()
const { openTab, closeTab } = useTabs()

const { isActive, shellTitle, handleCancel } = useFormCreateModal(props, emit, {
  listPath: '/production/rework-orders',
  getTitle: () => '新建返工单',
})

const saving = ref(false)
const form = reactive({
  workOrderCode: '',
  workOrderId: undefined,
  qty: 1,
  reason: '',
  remark: '',
  processNames: [],
  processAssignees: {},
})

const reworkCategoryOpts = ['生产工单', '总装工单']

const reworkableOrders = computed(() => {
  void workOrderState.orders
  void assemblyWorkOrderState.orders
  return listReworkableWorkOrders()
})

const selectedWo = computed(() => {
  const code = form.workOrderCode
  const id = form.workOrderId
  if (!code && !id) return null
  return reworkableOrders.value.find((o) => o.code === code || o.id === id || o.id === code) || null
})

const scheduleQtyDisplay = computed(() => {
  const wo = selectedWo.value
  if (!wo) return '—'
  const n = Number(wo.scheduleQty) || Number(wo.planQty) || 0
  return n || '—'
})

const processPreviewCols = [
  { title: '工序', dataIndex: 'name', width: 110 },
  { title: '原执行人', dataIndex: 'executors', width: 140, ellipsis: true },
  { title: '报工数量', dataIndex: 'reportQty', width: 90, align: 'right' },
  { title: '良品数', dataIndex: 'goodQty', width: 80, align: 'right' },
  { title: '不良品数', dataIndex: 'badQty', width: 90, align: 'right' },
  { title: '返工人', key: 'reworkAssignee', width: 200 },
]

const processPreviewRows = computed(() => {
  const wo = selectedWo.value
  if (!wo) return []
  const qtyMap = {}
  buildWorkOrderScheduleInfoBatchGroups(wo).forEach((g) => {
    ;(g.rows || []).forEach((row) => {
      const name = row.processName
      if (!name) return
      if (!qtyMap[name]) qtyMap[name] = { reportQty: 0, goodQty: 0, badQty: 0 }
      qtyMap[name].reportQty += Number(row.reportQty) || 0
      qtyMap[name].goodQty += Number(row.goodQty) || 0
      qtyMap[name].badQty += Number(row.badQty) || 0
    })
  })
  return (wo.processes || []).map((p) => {
    const q = qtyMap[p.name] || { reportQty: 0, goodQty: 0, badQty: 0 }
    return {
      name: p.name,
      executors: formatProcessExecutors(p),
      reportQty: q.reportQty,
      goodQty: q.goodQty,
      badQty: q.badQty,
      defaultAssignee: (p.executors || [])[0] || '',
    }
  })
})

const processRowSelection = computed(() => ({
  selectedRowKeys: form.processNames,
  onChange: (keys) => {
    form.processNames = keys
    keys.forEach((name) => {
      if (!form.processAssignees[name]) {
        const row = processPreviewRows.value.find((r) => r.name === name)
        if (row?.defaultAssignee) form.processAssignees[name] = row.defaultAssignee
      }
    })
  },
  getCheckboxProps: (record) => ({ name: record.name }),
}))

function resolvePreset() {
  if (props.preset) return props.preset
  if (!props.pageMode) return null
  const q = route.query || {}
  const processNames = String(q.processNames || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    workOrderId: q.workOrderId || undefined,
    qty: q.qty ? Number(q.qty) : 1,
    reason: q.reason || '',
    remark: q.remark || '',
    source: q.source || '',
    processNames,
    qcTaskId: q.qcTaskId || '',
    qcTaskNo: q.qcTaskNo || '',
  }
}

function resetForm() {
  const preset = resolvePreset() || {}
  form.workOrderCode = ''
  form.workOrderId = preset.workOrderId || undefined
  form.qty = preset.qty || 1
  form.reason = preset.reason || ''
  form.remark = preset.remark || ''
  form.processNames = [...(preset.processNames || [])]
  form.processAssignees = { ...(preset.processAssignees || {}) }
  if (form.workOrderId) {
    const wo = reworkableOrders.value.find((o) => o.id === form.workOrderId)
    if (wo) {
      form.workOrderCode = wo.code
      initAssigneesFromWo(wo)
    }
  }
}

watch(
  () => isActive.value,
  (val) => {
    if (!val) return
    resetForm()
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => {
    if (props.pageMode && isActive.value) resetForm()
  },
)

function initAssigneesFromWo(wo) {
  const next = { ...form.processAssignees }
  ;(wo?.processes || []).forEach((p) => {
    if (!next[p.name] && p.executors?.[0]) next[p.name] = p.executors[0]
  })
  form.processAssignees = next
}

function onWorkOrderSelect(wo) {
  form.workOrderId = wo?.id || undefined
  form.workOrderCode = wo?.code || ''
  form.processNames = []
  form.processAssignees = {}
  initAssigneesFromWo(wo)
}

function setAssignee(processName, value) {
  form.processAssignees[processName] = value || ''
}

function resolveSource() {
  const preset = resolvePreset()
  if (preset?.source) return preset.source
  return REWORK_ORDER_SOURCE.WORKSHOP_WEB
}

function handleOk() {
  if (!selectedWo.value && !form.workOrderCode) {
    message.warning('请选择工单')
    return
  }
  if (!form.processNames.length) {
    message.warning('请至少勾选一道重做工序')
    return
  }
  const preset = resolvePreset() || {}
  saving.value = true
  const res = createReworkOrderRecord({
    workOrderId: form.workOrderId || selectedWo.value?.id,
    workOrderNo: form.workOrderCode || selectedWo.value?.code,
    qty: form.qty,
    reason: form.reason,
    remark: form.remark,
    processNames: form.processNames,
    processAssignees: form.processAssignees,
    source: resolveSource(),
    qcTaskId: preset.qcTaskId,
    qcTaskNo: preset.qcTaskNo,
  })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('created', res.order)
  if (props.pageMode && res.order?.id) {
    const path = `/production/rework-orders/${res.order.id}`
    closeTab(route.path)
    openTab(path, `返工单 ${res.order.reworkNo}`)
    router.push({ name: 'production-rework-orders-detail', params: { id: res.order.id } })
    return
  }
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.rework-form {
  width: 100%;

  .form-section-box {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    overflow: hidden;
    margin-bottom: 12px;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  .section-label {
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .field-hint {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.4;
  }

  .field-hint-block {
    margin-top: 0;
    margin-bottom: 8px;
  }

  .item-preview {
    padding: 12px 16px;
    background: #e6f4ff;
    border: 1px solid #91caff;
    border-radius: 8px;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px 20px;
  }

  .preview-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    font-size: 13px;
  }

  .preview-row-span {
    grid-column: 1 / -1;
  }

  .preview-label {
    flex-shrink: 0;
    width: 4.5em;
    color: rgba(0, 0, 0, 0.45);
    white-space: nowrap;
  }

  .preview-row > span:last-child {
    min-width: 0;
    color: rgba(0, 0, 0, 0.88);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.horizontal-form {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  :deep(.ant-col) {
    min-width: 0;
    max-width: 100%;
  }

  :deep(.ant-form-item) {
    display: flex;
    width: 100%;
    max-width: 100%;
    margin-inline-end: 0;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
    width: 100%;
    max-width: 100%;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 72px;
    max-width: 72px;
    padding: 0;
  }

  :deep(.ant-form-item-label > label) {
    height: auto;
    min-height: 32px;
    line-height: 32px;
    font-size: 13px;
    white-space: nowrap;
  }

  :deep(
    .ant-form-item-label
      > label.ant-form-item-required:not(.ant-form-item-required-mark-optional)::before
  ) {
    margin-inline-end: 4px;
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  .remark-col {
    max-width: 100%;
    min-width: 0;
  }

  .remark-item {
    :deep(.ant-form-item-row) {
      align-items: flex-start;
    }

    :deep(.ant-form-item-label) {
      flex: 0 0 72px;
      max-width: 72px;
    }

    :deep(.ant-form-item-control-input),
    :deep(.ant-form-item-control-input-content),
    :deep(.ant-input-textarea),
    :deep(.ant-input-affix-wrapper),
    :deep(textarea.ant-input) {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
  }
}
</style>

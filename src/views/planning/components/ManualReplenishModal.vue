<template>
  <a-modal
    v-model:open="visible"
    title="手工补货"
    width="90%"
    :mask-closable="false"
    destroy-on-close
    class="manual-replenish-modal"
    @cancel="handleClose"
  >
    <div class="modal-desc">选择物料/产品后填写数量与动作，执行后写入补货台账（来源：手工）</div>
    <div class="table-toolbar">
      <a-space>
        <a-button type="dashed" @click="pickOpen = true">添加物料/产品</a-button>
        <a-tooltip :title="batchDisabledTip">
          <span class="batch-btn-wrap">
            <a-button type="primary" :disabled="batchExecuteDisabled" @click="handleConfirm()">
              批量执行（{{ selectedKeys.length }}）
            </a-button>
          </span>
        </a-tooltip>
      </a-space>
    </div>
    <a-table
      size="small"
      row-key="key"
      bordered
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ x: 1200, y: 420 }"
      :locale="{ emptyText: '请点击「添加物料/产品」开始手工补货' }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">
          {{ index + 1 }}
        </template>
        <template v-else-if="column.key === 'planQty'">
          <a-input-number
            v-model:value="record.planQty"
            size="small"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'actionSelect'">
          <a-select
            v-model:value="record.action"
            size="small"
            style="width: 100%"
            :options="actionOpts"
          />
        </template>
        <template v-else-if="column.key === 'bomLabel'">
          {{ record.bomLabel || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="handleConfirm([record.key])">
            执行补货
          </a-button>
        </template>
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleClose">关闭</a-button>
    </template>

    <SelectBomMaterialModal
      v-model:open="pickOpen"
      title="添加补货物料/产品"
      @selected="onPickItems"
    />

    <GeneratePurchaseRequisitionModal
      v-model:open="purchaseModalOpen"
      column-mode="replenish"
      :order="modalOrder"
      :materials="modalMaterials"
      @saved="(req) => onPurchaseSaved(req, afterExecuteCleanup)"
    />

    <GenerateWorkOrderModal
      v-model:open="workOrderModalOpen"
      :order="modalOrder"
      :materials="modalMaterials"
      @save="(saved) => onWorkOrderSaved(saved, afterExecuteCleanup)"
    />

    <GenerateOutsourceWorkOrderModal
      v-model:open="outsourceModalOpen"
      column-mode="replenish"
      :order="modalOrder"
      :materials="modalMaterials"
      @save="(saved) => onOutsourceSaved(saved, afterExecuteCleanup)"
    />
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { REPLENISH_ACTION_OPTIONS, buildManualReplenishRow } from '@/utils/stockReplenish'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { useReplenishExecute } from '@/composables/useReplenishExecute'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import GeneratePurchaseRequisitionModal from './GeneratePurchaseRequisitionModal.vue'
import GenerateWorkOrderModal from './GenerateWorkOrderModal.vue'
import GenerateOutsourceWorkOrderModal from './GenerateOutsourceWorkOrderModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'executed'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const rows = ref([])
const selectedKeys = ref([])
const pickOpen = ref(false)

const actionOpts = REPLENISH_ACTION_OPTIONS

const columns = [
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: '编码', dataIndex: 'productCode', width: 110 },
  { title: '名称', dataIndex: 'productName', ellipsis: true, width: 140 },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '当前库存', dataIndex: 'availableStock', width: 88, align: 'right' },
  { title: '最低', dataIndex: 'minStockQty', width: 64, align: 'right' },
  { title: '最高', dataIndex: 'maxStockQty', width: 64, align: 'right' },
  { title: '建议', dataIndex: 'suggestQty', width: 72, align: 'right' },
  { title: '数量', key: 'planQty', width: 100 },
  { title: '动作', key: 'actionSelect', width: 110 },
  { title: 'BOM', key: 'bomLabel', width: 140, ellipsis: true },
  { title: '操作', key: 'action', width: 96, fixed: 'right' },
]

function canExecuteReplenish(row) {
  return row && Number(row.planQty) > 0
}

const selectedRows = computed(() =>
  rows.value.filter((r) => selectedKeys.value.includes(r.key) && canExecuteReplenish(r)),
)

const selectedActionKinds = computed(() => [...new Set(selectedRows.value.map((r) => r.action))])

const hasMixedActions = computed(
  () => selectedKeys.value.length > 0 && selectedActionKinds.value.length > 1,
)

const batchExecuteDisabled = computed(() => !selectedRows.value.length || hasMixedActions.value)

const batchDisabledTip = computed(() => {
  if (!selectedKeys.value.length) return '请先勾选要执行的行'
  if (!selectedRows.value.length) return '勾选行需填写大于 0 的补货数量'
  if (hasMixedActions.value) return '勾选行包含不同动作，请只勾选同一动作后再批量执行'
  return ''
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: !canExecuteReplenish(record),
  }),
}))

function afterExecuteCleanup(keysToClear) {
  if (keysToClear?.length) {
    const clearSet = new Set(keysToClear)
    rows.value = rows.value.filter((r) => !clearSet.has(r.key))
    selectedKeys.value = selectedKeys.value.filter((k) => !clearSet.has(k))
  } else {
    selectedKeys.value = []
  }
}

const {
  purchaseModalOpen,
  workOrderModalOpen,
  outsourceModalOpen,
  modalOrder,
  modalMaterials,
  dispatchExecute,
  onPurchaseSaved,
  onWorkOrderSaved,
  onOutsourceSaved,
} = useReplenishExecute({
  remarkTag: '手工补货',
  successStayLabel: '留在补货台账',
  onExecuted: (payload) => emit('executed', payload),
})

function onPickItems(picked) {
  const list = Array.isArray(picked) ? picked : picked ? [picked] : []
  list.forEach((item) => {
    const code = item.code || item.materialCode || item.productCode
    const product = productInfoState.products.find((p) => p.code === code || p.id === item.id)
    const material = materialInfoState.materials.find((m) => m.code === code || m.id === item.id)
    const master = product || material || item
    const kind = product ? 'product' : 'material'
    const row = buildManualReplenishRow(master, kind)
    if (!row) return
    const idx = rows.value.findIndex((r) => r.key === row.key)
    if (idx >= 0) rows.value[idx] = { ...rows.value[idx], ...row, manual: true }
    else rows.value.push(row)
    if (!selectedKeys.value.includes(row.key)) selectedKeys.value.push(row.key)
  })
  pickOpen.value = false
}

function handleConfirm(onlyKeys) {
  const keySet = Array.isArray(onlyKeys) && onlyKeys.length ? new Set(onlyKeys) : null
  const selected = rows.value.filter((r) => {
    if (!canExecuteReplenish(r)) return false
    if (keySet) return keySet.has(r.key)
    return selectedKeys.value.includes(r.key)
  })
  if (!selected.length) {
    message.warning('请先勾选要执行的行，并确认数量大于 0')
    return
  }
  dispatchExecute(selected, afterExecuteCleanup)
}

function handleClose() {
  visible.value = false
}
</script>

<style lang="less" scoped>
.modal-desc {
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.batch-btn-wrap {
  display: inline-block;
}
</style>

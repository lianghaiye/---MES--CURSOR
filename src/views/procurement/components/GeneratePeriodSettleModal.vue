<template>
  <a-modal
    :open="open"
    title="按账期生成对账"
    :width="1080"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="header-form">
      <a-row :gutter="12">
        <a-col :span="6">
          <a-form-item label="会计期间" required>
            <a-date-picker
              v-model:value="form.yearMonth"
              picker="month"
              value-format="YYYY-MM"
              style="width: 100%"
              placeholder="选择年月"
              @change="onYearMonthChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="10">
          <a-form-item label="期间起止" required>
            <a-range-picker
              v-model:value="form.periodRange"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              :placeholder="['开始日期', '结束日期']"
              @change="onConditionChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="生成维度" required>
            <a-select
              v-model:value="form.settleTarget"
              :options="settleTargetOpts"
              @change="onSettleTargetChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="10">
          <a-form-item label="供应商（可选）">
            <a-select
              v-model:value="form.supplierIds"
              mode="multiple"
              allow-clear
              show-search
              placeholder="为空时默认全部可账期结算的供应商"
              :options="supplierOpts"
              :filter-option="filterOption"
              @change="onSupplierChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" allow-clear placeholder="选填，写入对账单备注" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label=" ">
            <a-checkbox v-model:checked="form.allowAppend" @change="onConditionChange">
              追加未结算量
            </a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row>
        <a-col :span="24">
          <a-button type="primary" ghost :loading="loading" @click="runPreview">
            {{
              form.settleTarget === 'purchase_order' ? '预览可结算的采购单' : '预览可结算的供应商'
            }}
          </a-button>
        </a-col>
      </a-row>
    </a-form>

    <template v-if="previewed">
      <a-alert v-if="hint" type="info" show-icon style="margin: 12px 0" :message="hint" />

      <a-table
        :columns="columns"
        :data-source="previewGroups"
        row-key="key"
        size="small"
        :pagination="false"
        :row-selection="rowSelection"
        :scroll="{ x: 1060, y: 360 }"
        :loading="loading"
        :locale="{
          emptyText:
            form.settleTarget === 'purchase_order'
              ? '当前条件下无可结算采购单'
              : '当前条件下无可结算供应商',
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'totalAmount'">
            {{ formatMoney(record.totalAmount) }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ displayDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'completedAt'">
            {{ displayDateTime(record.completedAt) }}
          </template>
          <template v-else-if="column.key === 'exists'">
            <a-tag
              v-if="record.exists"
              :color="record.existingStatus === '已确认' ? 'green' : 'orange'"
            >
              {{ record.existingSettleNo }}（{{ record.existingStatus }}）
            </a-tag>
            <span v-else>—</span>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
    </template>
    <a-alert
      v-else
      type="info"
      show-icon
      style="margin-top: 12px"
      :message="
        form.settleTarget === 'purchase_order'
          ? '请先填写条件，点击「预览可结算的采购单」后再勾选生成；选定供应商后会自动预览'
          : '请先填写条件，点击「预览可结算的供应商」后再勾选生成；选定供应商后会自动预览'
      "
    />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" :disabled="!previewed" @click="handleConfirm">
        生成对账单
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { supplierState } from '@/store/supplierStore'
import {
  previewPeriodSettles,
  previewPeriodSettlesByPurchaseOrder,
  createSettlesFromPeriod,
  createSettlesFromPeriodPurchaseOrders,
} from '@/store/purchaseSettleStore'
import { PERIOD_SETTLE_DEMO } from '@/mock/periodSettleDemoSeed'
import { formatNumber } from '@/utils/numberFormat'
import { isPeriodSettleCycle, parseYearMonth } from '@/utils/purchaseSettlePeriod'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open', 'confirmed'])

const settleTargetOpts = [
  { label: '按入库', value: 'inbound' },
  { label: '按采购单（已完成）', value: 'purchase_order' },
]

function defaultRangeForMonth(yearMonth) {
  const parsed = parseYearMonth(yearMonth)
  if (!parsed.ok) return []
  return [parsed.monthStart, parsed.monthEnd]
}

const form = reactive({
  yearMonth: PERIOD_SETTLE_DEMO.yearMonth,
  periodRange: defaultRangeForMonth(PERIOD_SETTLE_DEMO.yearMonth),
  settleTarget: 'inbound',
  supplierIds: [],
  remark: '',
  allowAppend: true,
})

const previewGroups = ref([])
const selectedKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const hint = ref('')
const previewed = ref(false)

const hasSupplierFilter = computed(() => (form.supplierIds || []).length > 0)

const supplierOpts = computed(() =>
  supplierState.suppliers
    .filter((s) => s.status !== '停用' && isPeriodSettleCycle(s.settlementCycle))
    .map((s) => ({
      label: `${s.name}（${s.settlementCycle}）`,
      value: s.id,
      searchText: `${s.name} ${s.settlementCycle}`,
    })),
)

const columns = computed(() => {
  if (form.settleTarget === 'purchase_order') {
    return [
      {
        title: '采购单号',
        dataIndex: 'purchaseOrderNo',
        key: 'purchaseOrderNo',
        width: 150,
        ellipsis: true,
      },
      { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
      { title: '结算周期', dataIndex: 'settlementCycle', key: 'settlementCycle', width: 90 },
      { title: '创建时间', key: 'createdAt', width: 150 },
      { title: '完成时间', key: 'completedAt', width: 150 },
      {
        title: '入库明细行数',
        dataIndex: 'lineCount',
        key: 'lineCount',
        width: 110,
        align: 'right',
      },
      { title: '金额', key: 'totalAmount', width: 110, align: 'right' },
      { title: '已有对账', key: 'exists', width: 180 },
    ]
  }
  return [
    { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
    { title: '结算周期', dataIndex: 'settlementCycle', key: 'settlementCycle', width: 90 },
    {
      title: '入库明细行数',
      dataIndex: 'lineCount',
      key: 'lineCount',
      width: 110,
      align: 'right',
    },
    { title: '金额', key: 'totalAmount', width: 110, align: 'right' },
    { title: '已有对账', key: 'exists', width: 180 },
  ]
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  getCheckboxProps: (record) => ({
    disabled: !record.selectable,
  }),
  onChange: (keys) => {
    selectedKeys.value = keys
  },
}))

watch(
  () => props.open,
  (val) => {
    if (!val) return
    form.yearMonth = PERIOD_SETTLE_DEMO.yearMonth
    form.periodRange = defaultRangeForMonth(PERIOD_SETTLE_DEMO.yearMonth)
    form.settleTarget = 'inbound'
    form.supplierIds = []
    form.remark = ''
    form.allowAppend = true
    resetPreview()
  },
)

function resetPreview() {
  previewed.value = false
  previewGroups.value = []
  selectedKeys.value = []
  hint.value = ''
}

/** 条件变更：已预览则刷新；未预览不自动扫全量 */
function onConditionChange() {
  if (previewed.value || hasSupplierFilter.value) {
    runPreview()
  }
}

function onSettleTargetChange() {
  if (previewed.value || hasSupplierFilter.value) {
    runPreview()
  }
}

function onSupplierChange() {
  if (hasSupplierFilter.value) {
    runPreview()
    return
  }
  if (previewed.value) {
    runPreview()
  } else {
    resetPreview()
  }
}

function onYearMonthChange() {
  if (form.yearMonth) {
    form.periodRange = defaultRangeForMonth(form.yearMonth)
  }
  onConditionChange()
}

function filterOption(input, option) {
  return String(option?.searchText || option?.label || '')
    .toLowerCase()
    .includes(String(input || '').toLowerCase())
}

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return formatNumber(n, 4)
}

function displayDateTime(v) {
  if (!v) return '—'
  const d = dayjs(v)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : String(v)
}

function runPreview() {
  if (!form.yearMonth) {
    message.warning('请选择会计期间')
    return
  }
  const [periodStart, periodEnd] = form.periodRange || []
  if (!periodStart || !periodEnd) {
    message.warning('请选择期间起止')
    return
  }
  loading.value = true
  const common = {
    yearMonth: form.yearMonth,
    periodStart,
    periodEnd,
    supplierIds: form.supplierIds?.length ? form.supplierIds : undefined,
    allowAppend: form.allowAppend,
  }
  const res =
    form.settleTarget === 'purchase_order'
      ? previewPeriodSettlesByPurchaseOrder(common)
      : previewPeriodSettles(common)
  loading.value = false
  previewed.value = true
  if (!res.ok) {
    previewGroups.value = []
    selectedKeys.value = []
    hint.value = res.message || '预览失败'
    return
  }
  const allGroups = res.groups || []
  // 未选供应商：只展示有可对账量的；已选供应商：全部展示（含 0 行）
  previewGroups.value = hasSupplierFilter.value
    ? allGroups
    : allGroups.filter((g) => Number(g.lineCount) > 0)
  selectedKeys.value = previewGroups.value.filter((g) => g.selectable).map((g) => g.key)
  const parts = []
  if (res.message) parts.push(res.message)
  if (form.settleTarget === 'purchase_order') {
    parts.push(
      `按采购单完成日落入期间窗；共 ${previewGroups.value.length} 张；可选 ${selectedKeys.value.length} 张。`,
    )
  } else if (hasSupplierFilter.value) {
    parts.push(
      `已选供应商全部列出（含无对账量）；共 ${previewGroups.value.length} 组；可选 ${selectedKeys.value.length} 组。`,
    )
  } else {
    parts.push(
      `按入库业务日落入期间窗，按供应商汇总；仅展示有对账量；共 ${previewGroups.value.length} 组；已选 ${selectedKeys.value.length} 组。`,
    )
  }
  hint.value = parts.join(' ')
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!previewed.value) {
    message.warning(
      form.settleTarget === 'purchase_order' ? '请先预览可结算的采购单' : '请先预览可结算的供应商',
    )
    return
  }
  const selected = previewGroups.value.filter((g) => selectedKeys.value.includes(g.key))
  if (!selected.length) {
    message.warning(
      form.settleTarget === 'purchase_order' ? '请勾选要生成的采购单' : '请勾选要生成的账期对账组',
    )
    return
  }
  saving.value = true
  const options = {
    settleDate: dayjs().format('YYYY-MM-DD'),
    remark: form.remark,
    allowAppend: form.allowAppend,
  }
  const res =
    form.settleTarget === 'purchase_order'
      ? createSettlesFromPeriodPurchaseOrders(selected, options)
      : createSettlesFromPeriod(selected, options)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  emit('confirmed', res.settles)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.header-form {
  margin-bottom: 8px;
}
</style>

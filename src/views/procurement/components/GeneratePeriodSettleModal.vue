<template>
  <a-modal
    :open="open"
    title="按账期生成结算"
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
              @change="refreshPreview"
            />
          </a-form-item>
        </a-col>
        <a-col :span="10">
          <a-form-item label="供应商（可选）">
            <a-select
              v-model:value="form.supplierIds"
              mode="multiple"
              allow-clear
              show-search
              placeholder="默认全部可账期结算供应商"
              :options="supplierOpts"
              :filter-option="filterOption"
              @change="refreshPreview"
            />
          </a-form-item>
        </a-col>
        <a-col :span="4">
          <a-form-item label="结算日期">
            <a-date-picker
              v-model:value="form.settleDate"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="4">
          <a-form-item label="半月结窗口">
            <a-select
              v-model:value="form.halfParts"
              mode="multiple"
              :options="halfOpts"
              @change="refreshPreview"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="备注">
            <a-input v-model:value="form.remark" allow-clear placeholder="选填，写入结算单备注" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label=" ">
            <a-checkbox v-model:checked="form.allowAppend" @change="refreshPreview">
              追加未结算量（同期间已有结算单时仍可生成）
            </a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-alert v-if="hint" type="info" show-icon style="margin-bottom: 12px" :message="hint" />

    <a-table
      :columns="columns"
      :data-source="previewGroups"
      row-key="key"
      size="small"
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ x: 980, y: 360 }"
      :loading="loading"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'totalAmount'">
          {{ formatMoney(record.totalAmount) }}
        </template>
        <template v-else-if="column.key === 'window'">
          {{ record.periodStart }} ~ {{ record.periodEnd }}
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

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleConfirm">生成结算单</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { supplierState } from '@/store/supplierStore'
import { previewPeriodSettles, createSettlesFromPeriod } from '@/store/purchaseSettleStore'
import { PERIOD_SETTLE_DEMO } from '@/mock/periodSettleDemoSeed'
import { formatNumber } from '@/utils/numberFormat'
import { isPeriodSettleCycle } from '@/utils/purchaseSettlePeriod'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open', 'confirmed'])

const form = reactive({
  yearMonth: PERIOD_SETTLE_DEMO.yearMonth,
  supplierIds: [],
  settleDate: dayjs().format('YYYY-MM-DD'),
  remark: '',
  halfParts: ['H1', 'H2'],
  allowAppend: false,
})

const previewGroups = ref([])
const selectedKeys = ref([])
const loading = ref(false)
const saving = ref(false)
const hint = ref('')

const halfOpts = [
  { label: '上半月', value: 'H1' },
  { label: '下半月', value: 'H2' },
]

const supplierOpts = computed(() =>
  supplierState.suppliers
    .filter((s) => s.status !== '停用' && isPeriodSettleCycle(s.settlementCycle))
    .map((s) => ({
      label: `${s.name}（${s.settlementCycle}）`,
      value: s.id,
      searchText: `${s.name} ${s.settlementCycle}`,
    })),
)

const columns = [
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '结算周期', dataIndex: 'settlementCycle', key: 'settlementCycle', width: 90 },
  { title: '账期', dataIndex: 'periodLabel', key: 'periodLabel', width: 160, ellipsis: true },
  { title: '窗口', key: 'window', width: 200 },
  { title: '明细行数', dataIndex: 'lineCount', key: 'lineCount', width: 90, align: 'right' },
  { title: '金额', key: 'totalAmount', width: 110, align: 'right' },
  { title: '已有结算', key: 'exists', width: 180 },
]

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
    form.supplierIds = []
    form.settleDate = dayjs().format('YYYY-MM-DD')
    form.remark = ''
    form.halfParts = ['H1', 'H2']
    form.allowAppend = false
    refreshPreview()
  },
)

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

function refreshPreview() {
  if (!form.yearMonth) {
    previewGroups.value = []
    selectedKeys.value = []
    hint.value = '请选择会计期间'
    return
  }
  loading.value = true
  const res = previewPeriodSettles({
    yearMonth: form.yearMonth,
    supplierIds: form.supplierIds?.length ? form.supplierIds : undefined,
    halfParts: form.halfParts,
    allowAppend: form.allowAppend,
  })
  loading.value = false
  if (!res.ok) {
    previewGroups.value = []
    selectedKeys.value = []
    hint.value = res.message || '预览失败'
    return
  }
  previewGroups.value = res.groups || []
  selectedKeys.value = previewGroups.value.filter((g) => g.selectable).map((g) => g.key)
  const parts = []
  if (res.message) parts.push(res.message)
  parts.push(
    `共 ${previewGroups.value.length} 组；可选 ${selectedKeys.value.length} 组。月结/季结/周结按周期切窗；现结/无周期不参与。演示数据期间：${PERIOD_SETTLE_DEMO.yearMonth}`,
  )
  hint.value = parts.join(' ')
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!form.yearMonth) {
    message.warning('请选择会计期间')
    return
  }
  const selected = previewGroups.value.filter((g) => selectedKeys.value.includes(g.key))
  if (!selected.length) {
    message.warning('请勾选要生成的账期结算组')
    return
  }
  saving.value = true
  const res = createSettlesFromPeriod(selected, {
    settleDate: form.settleDate,
    remark: form.remark,
    allowAppend: form.allowAppend,
  })
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

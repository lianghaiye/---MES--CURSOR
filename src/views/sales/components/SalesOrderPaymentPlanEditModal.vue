<template>
  <a-modal
    :open="open"
    title="编辑本单回款计划"
    width="860px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <div class="settings-intro">
      仅影响当前销售订单。保存后按节点重算计划金额；已登记回款/开票按节点名称尽量保留。
    </div>
    <a-form layout="inline" class="term-row">
      <a-form-item label="账期天数">
        <a-input-number
          v-model:value="termDays"
          :min="0"
          :precision="0"
          style="width: 120px"
          placeholder="默认 30"
        />
      </a-form-item>
      <a-button size="small" @click="resetFromPreset">按公司预设填充</a-button>
    </a-form>

    <a-table
      :columns="columns"
      :data-source="draft"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'name'">
          <a-input v-model:value="record.name" size="small" placeholder="节点名称" />
        </template>
        <template v-else-if="column.key === 'ratioPercent'">
          <a-input-number
            :value="record.ratio != null ? Number((record.ratio * 100).toFixed(2)) : null"
            size="small"
            :min="0"
            :max="100"
            :precision="2"
            style="width: 100%"
            @update:value="(v) => onRatioChange(index, v)"
          />
        </template>
        <template v-else-if="column.key === 'termStartType'">
          <a-select
            v-model:value="record.termStartType"
            size="small"
            allow-clear
            :options="termStartOpts"
            placeholder="起算类型"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'startDate'">
          <a-date-picker
            v-model:value="record.startDate"
            size="small"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            placeholder="可后补"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button
            type="link"
            size="small"
            danger
            :disabled="draft.length <= 1"
            @click="draft.splice(index, 1)"
          >
            删除
          </a-button>
        </template>
      </template>
    </a-table>
    <a-button type="dashed" block size="small" class="add-row-btn" @click="addNode">
      <PlusOutlined />
      新增节点
    </a-button>

    <template #footer>
      <a-space>
        <a-button @click="emit('update:open', false)">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { CONTRACT_CASH_DIRECTION, paymentTermStartOptionsFor } from '@/constants/salesContract'
import { getOrderPresetPaymentNodes } from '@/store/salesOrderPaymentNodePresetStore'
import { replaceSalesOrderPaymentPlans } from '@/store/salesPaymentStore'

defineOptions({ name: 'SalesOrderPaymentPlanEditModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
  planRows: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const draft = ref([])
const termDays = ref(30)
const termStartOpts = paymentTermStartOptionsFor(CONTRACT_CASH_DIRECTION.INCOME)

const columns = [
  { title: '节点名称', key: 'name', width: 130 },
  { title: '比例(%)', key: 'ratioPercent', width: 100 },
  { title: '账期起算', key: 'termStartType', width: 130 },
  { title: '起算日', key: 'startDate', width: 140 },
  { title: '操作', key: 'action', width: 70 },
]

function cloneFromPlanRows(rows = []) {
  return (rows || []).map((n, index) => ({
    id: n.id || `sopn-edit-${Date.now()}-${index}`,
    name: n.name || '',
    ratio: n.ratio,
    termStartType: n.termStartType || undefined,
    startDate: n.startDate || undefined,
  }))
}

function cloneFromPreset() {
  return getOrderPresetPaymentNodes().map((n) => ({
    id: n.id,
    name: n.name || '',
    ratio: n.ratio,
    termStartType: n.termStartType || undefined,
    startDate: undefined,
  }))
}

watch(
  () => [props.open, props.order, props.planRows],
  () => {
    if (!props.open) return
    const fromOrder =
      props.order?.paymentTermDays != null && props.order.paymentTermDays !== ''
        ? Number(props.order.paymentTermDays)
        : null
    const fromPlan = props.planRows?.[0]?.termDays
    termDays.value = Number.isFinite(fromOrder)
      ? fromOrder
      : Number.isFinite(Number(fromPlan))
        ? Number(fromPlan)
        : 30
    draft.value = props.planRows?.length ? cloneFromPlanRows(props.planRows) : cloneFromPreset()
  },
)

function onRatioChange(index, v) {
  draft.value[index].ratio = v != null && v !== '' ? Number(v) / 100 : null
}

function addNode() {
  draft.value.push({
    id: `sopn-edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    ratio: null,
    termStartType: undefined,
    startDate: undefined,
  })
}

function resetFromPreset() {
  draft.value = cloneFromPreset()
  message.success('已按公司预设填充，保存后生效')
}

function handleSave() {
  if (!props.order) {
    message.warning('订单无效')
    return
  }
  const named = draft.value.filter((n) => String(n.name || '').trim())
  if (!named.length) {
    message.warning('请至少保留一条回款节点')
    return
  }
  const ratioSum = named.reduce((s, n) => s + (Number(n.ratio) || 0), 0)
  if (ratioSum > 0 && Math.abs(ratioSum - 1) > 0.02) {
    message.warning(`节点比例合计建议为 100%（当前 ${(ratioSum * 100).toFixed(1)}%）`)
  }
  saving.value = true
  try {
    const res = replaceSalesOrderPaymentPlans(props.order, {
      termDays: termDays.value,
      nodes: named.map((n) => ({
        id: n.id,
        name: String(n.name).trim(),
        ratio: n.ratio,
        termStartType: n.termStartType || '',
        startDate: n.startDate
          ? typeof n.startDate === 'string'
            ? n.startDate
            : dayjs(n.startDate).format('YYYY-MM-DD')
          : '',
      })),
    })
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('本单回款计划已保存')
    emit('saved')
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.settings-intro {
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
}

.term-row {
  margin-bottom: 12px;
  gap: 12px;
}

.add-row-btn {
  margin-top: 8px;
}
</style>

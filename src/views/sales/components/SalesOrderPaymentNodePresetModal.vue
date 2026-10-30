<template>
  <a-modal
    :open="open"
    title="预设订单回款节点"
    width="780px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="settings-intro">
      全公司预设，不依赖合同管理。未挂合同的销售订单审核通过后，按此节点自动生成回款计划；单笔订单仍可在详情中单独修改。
    </div>

    <a-table
      :columns="nodeColumns"
      :data-source="draft"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'name'">
          <a-input v-model:value="record.name" size="small" placeholder="如：预付款" />
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
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">确定</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { CONTRACT_CASH_DIRECTION, paymentTermStartOptionsFor } from '@/constants/salesContract'
import {
  getOrderPresetPaymentNodes,
  saveOrderPaymentNodePresets,
} from '@/store/salesOrderPaymentNodePresetStore'

defineOptions({ name: 'SalesOrderPaymentNodePresetModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const saving = ref(false)
const draft = ref([])
const termStartOpts = paymentTermStartOptionsFor(CONTRACT_CASH_DIRECTION.INCOME)

const nodeColumns = [
  { title: '节点名称', key: 'name', width: 140 },
  { title: '比例(%)', key: 'ratioPercent', width: 110 },
  { title: '账期起算', key: 'termStartType', width: 140 },
  { title: '操作', key: 'action', width: 70 },
]

function cloneNodes(list) {
  return (list || []).map((n) => ({
    id: n.id || `sopn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: n.name || '',
    ratio: n.ratio,
    termStartType: n.termStartType || undefined,
  }))
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.value = cloneNodes(getOrderPresetPaymentNodes())
  },
)

function onRatioChange(index, v) {
  draft.value[index].ratio = v != null && v !== '' ? Number(v) / 100 : null
}

function addNode() {
  draft.value.push({
    id: `sopn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    ratio: null,
    termStartType: undefined,
  })
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  const named = draft.value.filter((n) => String(n.name || '').trim())
  if (!named.length) {
    message.warning('请至少配置一条回款节点')
    return
  }
  const ratioSum = named.reduce((s, n) => s + (Number(n.ratio) || 0), 0)
  if (ratioSum > 0 && Math.abs(ratioSum - 1) > 0.02) {
    message.warning(`节点比例合计建议为 100%（当前 ${(ratioSum * 100).toFixed(1)}%）`)
  }
  saving.value = true
  try {
    saveOrderPaymentNodePresets(
      named.map((n) => ({
        id: n.id,
        name: String(n.name).trim(),
        ratio: n.ratio,
        termStartType: n.termStartType || '',
      })),
    )
    message.success('订单回款节点预设已保存')
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

.add-row-btn {
  margin-top: 8px;
}
</style>

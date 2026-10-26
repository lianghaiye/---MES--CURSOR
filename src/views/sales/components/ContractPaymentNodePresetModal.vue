<template>
  <a-modal
    :open="open"
    title="预设回款节点"
    width="780px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="settings-intro">
      <div>全公司预设。新增合同时按「标准 / 框架」自动带入；也可勾选共用，两套一次配好。</div>
      <div class="shared-row">
        <a-checkbox v-model:checked="draft.shared" @change="onSharedChange">
          标准与框架共用同一套
        </a-checkbox>
      </div>
    </div>

    <template v-if="draft.shared">
      <div class="shared-tip">当前编辑内容将同时作为标准合同与框架合同的预设。</div>
      <a-table
        :columns="nodeColumns"
        :data-source="draft.standard"
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
              @update:value="(v) => onRatioChange(draft.standard, index, v)"
            />
          </template>
          <template v-else-if="column.key === 'termStartType'">
            <a-select
              v-model:value="record.termStartType"
              size="small"
              allow-clear
              :options="paymentTermStartOptions"
              placeholder="起算类型"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              type="link"
              size="small"
              danger
              :disabled="draft.standard.length <= 1"
              @click="draft.standard.splice(index, 1)"
            >
              删除
            </a-button>
          </template>
        </template>
      </a-table>
      <a-button type="dashed" block size="small" class="add-row-btn" @click="addNode('standard')">
        <PlusOutlined />
        新增节点
      </a-button>
    </template>

    <a-tabs v-else v-model:activeKey="activeTab">
      <a-tab-pane key="standard" tab="标准合同">
        <a-table
          :columns="nodeColumns"
          :data-source="draft.standard"
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
                @update:value="(v) => onRatioChange(draft.standard, index, v)"
              />
            </template>
            <template v-else-if="column.key === 'termStartType'">
              <a-select
                v-model:value="record.termStartType"
                size="small"
                allow-clear
                :options="paymentTermStartOptions"
                placeholder="起算类型"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                :disabled="draft.standard.length <= 1"
                @click="draft.standard.splice(index, 1)"
              >
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button type="dashed" block size="small" class="add-row-btn" @click="addNode('standard')">
          <PlusOutlined />
          新增节点
        </a-button>
      </a-tab-pane>
      <a-tab-pane key="framework" tab="框架合同">
        <a-table
          :columns="nodeColumns"
          :data-source="draft.framework"
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
                @update:value="(v) => onRatioChange(draft.framework, index, v)"
              />
            </template>
            <template v-else-if="column.key === 'termStartType'">
              <a-select
                v-model:value="record.termStartType"
                size="small"
                allow-clear
                :options="paymentTermStartOptions"
                placeholder="起算类型"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                :disabled="draft.framework.length <= 1"
                @click="draft.framework.splice(index, 1)"
              >
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button
          type="dashed"
          block
          size="small"
          class="add-row-btn"
          @click="addNode('framework')"
        >
          <PlusOutlined />
          新增节点
        </a-button>
      </a-tab-pane>
    </a-tabs>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">确定</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { paymentTermStartOptions } from '@/constants/customerMaster'
import {
  contractPaymentNodePresetState,
  savePaymentNodePresets,
} from '@/store/contractPaymentNodePresetStore'

defineOptions({ name: 'ContractPaymentNodePresetModal' })

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const activeTab = ref('standard')
const saving = ref(false)
const draft = reactive({
  shared: true,
  standard: [],
  framework: [],
})

const nodeColumns = [
  { title: '节点名称', key: 'name', width: 140 },
  { title: '比例(%)', key: 'ratioPercent', width: 110 },
  { title: '账期起算', key: 'termStartType', width: 140 },
  { title: '操作', key: 'action', width: 70 },
]

function cloneNodes(list) {
  return (list || []).map((n) => ({
    id: n.id || `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: n.name || '',
    ratio: n.ratio,
    termStartType: n.termStartType || undefined,
  }))
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.shared = contractPaymentNodePresetState.shared !== false
    draft.standard = cloneNodes(contractPaymentNodePresetState.standard)
    draft.framework = cloneNodes(contractPaymentNodePresetState.framework)
    activeTab.value = 'standard'
  },
)

function onSharedChange() {
  if (draft.shared) {
    const source = activeTab.value === 'framework' ? draft.framework : draft.standard
    draft.standard = cloneNodes(source)
    draft.framework = cloneNodes(source)
  } else {
    draft.framework = cloneNodes(draft.standard)
  }
}

function onRatioChange(list, index, v) {
  list[index].ratio = v != null && v !== '' ? Number(v) / 100 : null
}

function addNode(key) {
  draft[key].push({
    id: `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    ratio: null,
    termStartType: undefined,
  })
}

function handleCancel() {
  emit('update:open', false)
}

function validate(list, label) {
  const named = (list || []).filter((n) => String(n.name || '').trim())
  if (!named.length) {
    message.warning(`请至少配置一条${label}回款节点`)
    return null
  }
  const ratioSum = named.reduce((s, n) => s + (Number(n.ratio) || 0), 0)
  if (ratioSum > 0 && Math.abs(ratioSum - 1) > 0.02) {
    message.warning(`${label}节点比例合计建议为 100%（当前 ${(ratioSum * 100).toFixed(1)}%）`)
  }
  return named.map((n) => ({
    id: n.id,
    name: String(n.name).trim(),
    ratio: n.ratio,
    termStartType: n.termStartType || '',
  }))
}

function handleSave() {
  if (draft.shared) {
    const one = validate(draft.standard, '共用')
    if (!one) return
    saving.value = true
    try {
      savePaymentNodePresets({ shared: true, standard: one, framework: one })
      message.success('预设已保存（标准与框架共用）')
      emit('update:open', false)
    } finally {
      saving.value = false
    }
    return
  }
  const standard = validate(draft.standard, '标准合同')
  if (!standard) return
  const framework = validate(draft.framework, '框架合同')
  if (!framework) return
  saving.value = true
  try {
    savePaymentNodePresets({ shared: false, standard, framework })
    message.success('预设已保存')
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

.shared-row {
  margin-top: 8px;
}

.shared-tip {
  margin-bottom: 10px;
  font-size: 12px;
  color: #1677ff;
}

.add-row-btn {
  margin-top: 8px;
}
</style>

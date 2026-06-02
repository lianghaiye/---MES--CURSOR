<template>
  <a-modal
    :open="open"
    title="出厂质检"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="section-block">
      <div class="section-title">基础信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="质检单号">
              <a-input :value="displayQcNo" disabled size="small" placeholder="保存后系统自动生成" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="销售单号">
              <a-input :value="record?.salesOrderNo" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="客户名称">
              <a-input :value="record?.customerName" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="质检方式" required>
              <a-select v-model:value="form.inspectMethod" size="small" :options="methodOpts" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="质检日期" required>
              <a-date-picker v-model:value="form.inspectDate" size="small" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea v-model:value="form.remark" :rows="2" placeholder="请输入备注" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title">明细信息</div>
      <a-divider class="section-divider" />
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'inspectQty'">
            <a-input-number
              v-model:value="record.inspectQty"
              size="small"
              :min="0"
              :max="record.shipQty"
              :precision="2"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'lineQcResult'">
            <a-select
              v-model:value="record.lineQcResult"
              size="small"
              placeholder="请选择"
              style="width: 100%"
              :options="lineResultOpts"
              @change="onLineResultChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'treatmentPlan'">
            <a-select
              v-model:value="record.treatmentPlan"
              size="small"
              allow-clear
              placeholder="请选择"
              style="width: 100%"
              :options="planOpts"
              :disabled="record.lineQcResult !== '不合格'"
            />
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '-' }}
          </template>
        </template>
      </a-table>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { inspectMethodOptions, lineQcResultOptions, treatmentPlanOptions } from '@/mock/factoryQcOptions'
import { submitFactoryQcInspection } from '@/store/factoryQcStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const form = reactive({
  inspectMethod: '抽检',
  inspectDate: null,
  remark: '',
  lineItems: [],
})

const methodOpts = inspectMethodOptions.map((v) => ({ label: v, value: v }))
const lineResultOpts = lineQcResultOptions.map((v) => ({ label: v, value: v }))
const planOpts = treatmentPlanOptions.map((v) => ({ label: v, value: v }))

const displayQcNo = computed(() => props.record?.qcNo || '')

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center' },
  { title: '物品名称', dataIndex: 'itemName', width: 120, ellipsis: true },
  { title: '物品编号', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '发货数量', dataIndex: 'shipQty', width: 90, align: 'right' },
  { title: '发货仓库', dataIndex: 'shipWarehouse', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '检验数量', key: 'inspectQty', width: 100 },
  { title: '质检结果', key: 'lineQcResult', width: 100 },
  { title: '处理方案', key: 'treatmentPlan', width: 100 },
]

watch(
  () => props.open,
  (val) => {
    if (!val || !props.record) return
    form.inspectMethod = props.record.inspectMethod || '抽检'
    form.inspectDate = props.record.inspectDate ? dayjs(props.record.inspectDate) : dayjs()
    form.remark = props.record.remark || ''
    form.lineItems = JSON.parse(JSON.stringify(props.record.lineItems || [])).map((line) => ({
      ...line,
      inspectQty: line.inspectQty ?? line.shipQty,
    }))
  },
)

function onLineResultChange(line) {
  if (line.lineQcResult !== '不合格') {
    line.treatmentPlan = undefined
  }
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.inspectMethod) {
    message.warning('请选择质检方式')
    return
  }
  if (!form.inspectDate) {
    message.warning('请选择质检日期')
    return
  }

  const result = submitFactoryQcInspection(props.record.id, {
    inspectMethod: form.inspectMethod,
    inspectDate: form.inspectDate.format('YYYY-MM-DD'),
    remark: form.remark,
    lineItems: form.lineItems,
  })

  if (result.ok) {
    message.success(result.message)
    emit('saved', result)
    emit('update:open', false)
  } else {
    message.warning(result.message)
  }
}
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 12px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
  }

  .section-divider {
    margin: 8px 0 12px;
  }
}

.header-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
    }
  }
}
</style>

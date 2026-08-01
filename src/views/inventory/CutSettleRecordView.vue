<template>
  <div class="cut-settle-page">
    <div class="toolbar">
      <div class="title">下料结算</div>
      <a-space>
        <a-button type="primary" size="small" @click="createOpen = true">从出库单创建</a-button>
      </a-space>
    </div>
    <a-table
      :columns="columns"
      :data-source="records"
      row-key="id"
      size="small"
      bordered
      :pagination="{ pageSize: 20 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === '已确认' ? 'green' : 'orange'">{{
            record.status
          }}</a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
            <a-button
              v-if="record.status === '待确认'"
              type="link"
              size="small"
              @click="onConfirm(record)"
            >
              确认结算
            </a-button>
            <a-button
              v-if="record.status === '待确认'"
              type="link"
              size="small"
              danger
              @click="onDelete(record)"
            >
              删除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="createOpen"
      title="从领料出库单创建下料结算"
      ok-text="生成结算单"
      @ok="onCreate"
    >
      <a-form layout="vertical">
        <a-form-item label="已出库的领料出库单" required>
          <a-select
            v-model:value="selectedOutboundId"
            show-search
            placeholder="选择出库单"
            :options="outboundOpts"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model:value="createRemark" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailOpen"
      :title="detail?.docNo ? `下料结算 ${detail.docNo}` : '下料结算详情'"
      width="720"
      :destroy-on-close="true"
    >
      <template v-if="detail">
        <a-descriptions size="small" bordered :column="2" class="mb-12">
          <a-descriptions-item label="状态">{{ detail.status }}</a-descriptions-item>
          <a-descriptions-item label="出库单">{{ detail.outboundDocNo }}</a-descriptions-item>
          <a-descriptions-item label="来源单号">{{
            detail.sourceOrderNo || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="余料入库单">{{
            detail.remnantInboundDocNo || '—'
          }}</a-descriptions-item>
        </a-descriptions>
        <a-table
          :columns="lineColumns"
          :data-source="detail.lines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actualConsumeMeters' && detail.status === '待确认'">
              <a-input-number
                v-model:value="record.actualConsumeMeters"
                :min="0.001"
                :max="record.pickedLength"
                :precision="3"
                size="small"
                style="width: 100%"
                @change="() => recalcRemnant(record)"
              />
            </template>
          </template>
        </a-table>
        <div v-if="detail.status === '待确认'" class="drawer-footer">
          <a-button type="primary" @click="onConfirm(detail)">确认结算（耗用 + 余料回仓）</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script>
export default { name: 'CutSettleRecordView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  cutSettleState,
  buildCutSettleDraftFromOutbound,
  createCutSettleRecord,
  confirmCutSettle,
  deleteCutSettle,
  getCutSettleById,
} from '@/store/cutSettleStore'
import { outboundState } from '@/store/outboundStore'
import { roundMeters } from '@/utils/variableLengthMaterial'

const createOpen = ref(false)
const selectedOutboundId = ref(undefined)
const createRemark = ref('')
const detailOpen = ref(false)
const detailId = ref('')

const records = computed(() => cutSettleState.records)
const detail = computed(() => (detailId.value ? getCutSettleById(detailId.value) : null))

const outboundOpts = computed(() =>
  outboundState.orders
    .filter(
      (o) =>
        o.status === '已出库' &&
        o.outboundType === '领料出库' &&
        (o.lineItems || []).some((l) => l.isVariableLength && l.pickedBatchId),
    )
    .map((o) => ({
      label: `${o.docNo}（${o.sourceOrderNo || '无来源'}）`,
      value: o.id,
    })),
)

const columns = [
  { title: '结算单号', dataIndex: 'docNo', key: 'docNo', width: 140 },
  { title: '状态', key: 'status', width: 90 },
  { title: '出库单号', dataIndex: 'outboundDocNo', key: 'outboundDocNo', width: 140 },
  { title: '来源', dataIndex: 'sourceOrderNo', key: 'sourceOrderNo', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: '操作', key: 'action', width: 200 },
]

const lineColumns = [
  { title: '物料', dataIndex: 'itemName', key: 'itemName', width: 140 },
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '批次', dataIndex: 'pickedBatchNo', key: 'pickedBatchNo', width: 120 },
  { title: '出库长度', dataIndex: 'pickedLength', key: 'pickedLength', width: 90 },
  { title: '需求(米)', dataIndex: 'demandMeters', key: 'demandMeters', width: 90 },
  { title: '实耗(米)', key: 'actualConsumeMeters', width: 110 },
  { title: '余料(米)', dataIndex: 'remnantLength', key: 'remnantLength', width: 90 },
  { title: '工单', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 120 },
]

function recalcRemnant(line) {
  line.remnantLength = roundMeters(
    Math.max(0, Number(line.pickedLength) - Number(line.actualConsumeMeters)),
  )
}

function openDetail(record) {
  detailId.value = record.id
  detailOpen.value = true
}

function onCreate() {
  if (!selectedOutboundId.value) {
    message.warning('请选择出库单')
    return Promise.reject()
  }
  const draftRes = buildCutSettleDraftFromOutbound(selectedOutboundId.value)
  if (!draftRes.ok) {
    message.error(draftRes.message)
    return Promise.reject()
  }
  const res = createCutSettleRecord({
    ...draftRes.draft,
    remark: createRemark.value,
  })
  if (!res.ok) {
    message.error(res.message)
    return Promise.reject()
  }
  message.success(`已生成 ${res.record.docNo}`)
  createOpen.value = false
  selectedOutboundId.value = undefined
  createRemark.value = ''
  openDetail(res.record)
}

function onConfirm(record) {
  Modal.confirm({
    title: '确认下料结算？',
    content: '将按实耗记工单用料，余料按新批次回仓。',
    onOk: () => {
      const res = confirmCutSettle(record.id)
      if (!res.ok) {
        message.error(res.message)
        return
      }
      message.success(
        res.record.remnantInboundDocNo
          ? `已确认，余料入库单 ${res.record.remnantInboundDocNo}`
          : '已确认（无余料）',
      )
    },
  })
}

function onDelete(record) {
  Modal.confirm({
    title: '删除结算单？',
    onOk: () => {
      if (deleteCutSettle(record.id)) message.success('已删除')
    },
  })
}
</script>

<style scoped>
.cut-settle-page {
  padding: 12px;
  background: #fff;
  min-height: 100%;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.mb-12 {
  margin-bottom: 12px;
}
.drawer-footer {
  margin-top: 16px;
  text-align: right;
}
</style>

<template>
  <div class="cut-settle-detail-page">
    <div class="page-header">
      <div class="header-left">
        <template v-if="record">
          <span class="page-title">{{ record.docNo }}</span>
          <a-tag :color="record.status === '已确认' ? 'green' : 'orange'">{{
            record.status
          }}</a-tag>
        </template>
        <span v-else class="page-title">下料结算详情</span>
      </div>
      <a-space>
        <a-button
          v-if="record?.status === '待确认'"
          type="primary"
          size="small"
          @click="openConfirmDrawer"
        >
          确认结算
        </a-button>
        <a-button size="small" @click="goBack">返回列表</a-button>
      </a-space>
    </div>

    <a-empty v-if="!record" description="结算单不存在或已删除" />

    <template v-else>
      <div class="section-card">
        <div class="section-title">基本信息</div>
        <a-descriptions size="small" bordered :column="3">
          <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
          <a-descriptions-item label="结算单号">{{ record.docNo }}</a-descriptions-item>
          <a-descriptions-item label="出库单号">{{
            record.outboundDocNo || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="工单号">{{ workOrderNos }}</a-descriptions-item>
          <a-descriptions-item label="出库仓库">{{
            record.shipWarehouse || record.lines?.[0]?.shipWarehouse || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="领入仓库">{{
            record.receiveWarehouse || record.lines?.[0]?.warehouse || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="出库时间">{{
            record.outboundTime || '—'
          }}</a-descriptions-item>
          <a-descriptions-item v-if="record.remnantInboundDocNo" label="余料入库单">
            {{ record.remnantInboundDocNo }}
          </a-descriptions-item>
          <a-descriptions-item v-if="record.remark" label="备注" :span="2">
            {{ record.remark }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <div class="section-card">
        <div class="section-title">结算明细（{{ record.lines?.length || 0 }}）</div>
        <a-table
          :columns="lineColumns"
          :data-source="record.lines || []"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1340 }"
        >
          <template #bodyCell="{ column, record: line, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'blankSizeText'">
              {{ line.blankSizeText || '—' }}
            </template>
            <template v-else-if="column.key === 'specModel'">{{ line.specModel || '—' }}</template>
            <template v-else-if="column.key === 'drawingNo'">{{ line.drawingNo || '—' }}</template>
            <template v-else-if="column.key === 'material'">{{ line.material || '—' }}</template>
            <template v-else-if="column.key === 'demandMeters'">
              {{ formatQty(line.demandMeters) }}
            </template>
            <template v-else-if="column.key === 'actualConsumeMeters'">
              {{ formatQty(line.actualConsumeMeters) }}
            </template>
            <template v-else-if="column.key === 'remnantLength'">
              {{ formatQty(line.remnantLength) }}
            </template>
            <template v-else-if="column.key === 'pickedBatchNo'">
              {{ line.pickedBatchNo || '—' }}
            </template>
            <template v-else-if="column.key === 'remnantBatchNo'">
              {{ line.remnantBatchNo || '—' }}
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <a-drawer
      v-model:open="confirmOpen"
      :title="record?.docNo ? `确认结算 ${record.docNo}` : '确认结算'"
      width="1080"
      :destroy-on-close="true"
    >
      <template v-if="record">
        <div class="section-title">基本信息</div>
        <a-descriptions size="small" bordered :column="3" class="mb-16">
          <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
          <a-descriptions-item label="结算单号">{{ record.docNo }}</a-descriptions-item>
          <a-descriptions-item label="出库单号">{{
            record.outboundDocNo || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="工单号">{{ workOrderNos }}</a-descriptions-item>
          <a-descriptions-item label="出库仓库">{{
            record.shipWarehouse || record.lines?.[0]?.shipWarehouse || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="领入仓库">{{
            record.receiveWarehouse || record.lines?.[0]?.warehouse || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="出库时间" :span="3">{{
            record.outboundTime || '—'
          }}</a-descriptions-item>
        </a-descriptions>

        <div class="section-title">结算明细</div>
        <a-table
          :columns="lineColumns"
          :data-source="record.lines || []"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1240 }"
        >
          <template #bodyCell="{ column, record: line, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'blankSizeText'">
              {{ line.blankSizeText || '—' }}
            </template>
            <template v-else-if="column.key === 'specModel'">{{ line.specModel || '—' }}</template>
            <template v-else-if="column.key === 'drawingNo'">{{ line.drawingNo || '—' }}</template>
            <template v-else-if="column.key === 'material'">{{ line.material || '—' }}</template>
            <template v-else-if="column.key === 'demandMeters'">
              {{ formatQty(line.demandMeters) }}
            </template>
            <template v-else-if="column.key === 'actualConsumeMeters'">
              <a-input-number
                v-if="record.status === '待确认'"
                v-model:value="line.actualConsumeMeters"
                :min="0.001"
                :max="Number(line.pickedLength) || undefined"
                :precision="3"
                size="small"
                style="width: 100%"
                @change="() => recalcRemnant(line)"
              />
              <span v-else>{{ formatQty(line.actualConsumeMeters) }}</span>
            </template>
            <template v-else-if="column.key === 'remnantLength'">
              {{ formatQty(line.remnantLength) }}
            </template>
            <template v-else-if="column.key === 'pickedBatchNo'">
              {{ line.pickedBatchNo || '—' }}
            </template>
            <template v-else-if="column.key === 'remnantBatchNo'">
              {{ line.remnantBatchNo || '—' }}
            </template>
          </template>
        </a-table>

        <div v-if="record.status === '待确认'" class="drawer-footer">
          <a-button @click="confirmOpen = false">取消</a-button>
          <a-button type="primary" @click="submitConfirm">确认结算（耗用 + 余料回仓）</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script>
export default { name: 'CutSettleDetailView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { confirmCutSettle, getCutSettleById, cutSettleState } from '@/store/cutSettleStore'
import { roundMeters } from '@/utils/variableLengthMaterial'

const route = useRoute()
const router = useRouter()
const confirmOpen = ref(false)
const tick = ref(0)

const record = computed(() => {
  tick.value
  void cutSettleState.records
  return getCutSettleById(String(route.params.id || ''))
})

const workOrderNos = computed(() => {
  const lines = record.value?.lines || []
  const nos = [...new Set(lines.map((l) => l.workOrderNo).filter(Boolean))]
  return nos.join('、') || '—'
})

const lineColumns = [
  { title: '序号', key: 'index', width: 60, align: 'center' },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
  { title: '型号规格', key: 'specModel', width: 100, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 100, ellipsis: true },
  { title: '材质', key: 'material', width: 80 },
  { title: '下料尺寸', key: 'blankSizeText', width: 140, ellipsis: true },
  { title: '需求数', key: 'demandMeters', width: 80, align: 'right' },
  { title: '实耗', key: 'actualConsumeMeters', width: 110 },
  { title: '余料', key: 'remnantLength', width: 80, align: 'right' },
  { title: '拣选批次', key: 'pickedBatchNo', width: 130 },
  { title: '余料新批次', key: 'remnantBatchNo', width: 140 },
]

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val)
}

function recalcRemnant(line) {
  line.remnantLength = roundMeters(
    Math.max(0, Number(line.pickedLength) - Number(line.actualConsumeMeters)),
  )
}

function openConfirmDrawer() {
  confirmOpen.value = true
}

function goBack() {
  router.push('/inventory/cut-settle')
}

function submitConfirm() {
  const row = record.value
  if (!row) return
  Modal.confirm({
    title: '确认下料结算？',
    content: '将按实耗记工单用料，余料按新批次回仓。',
    onOk: () => {
      ;(row.lines || []).forEach((line) => recalcRemnant(line))
      const res = confirmCutSettle(row.id)
      if (!res.ok) {
        message.error(res.message)
        return
      }
      message.success(
        res.record.remnantInboundDocNo
          ? `已确认，余料入库单 ${res.record.remnantInboundDocNo}`
          : '已确认（无余料）',
      )
      confirmOpen.value = false
      tick.value += 1
    },
  })
}
</script>

<style scoped>
.cut-settle-detail-page {
  padding: 12px;
  background: #fff;
  min-height: 100%;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.section-card {
  margin-bottom: 16px;
}
.section-title {
  margin-bottom: 8px;
  font-weight: 600;
}
.mb-16 {
  margin-bottom: 16px;
}
.drawer-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<template>
  <div class="cut-settle-detail-page">
    <div class="page-header">
      <div class="header-left">
        <template v-if="record">
          <span class="page-title">{{
            isConfirmMode ? `确认结算 ${record.docNo}` : record.docNo
          }}</span>
          <a-tag :color="record.status === '已确认' ? 'green' : 'orange'">{{
            record.status
          }}</a-tag>
        </template>
        <span v-else class="page-title">下料结算详情</span>
      </div>
      <a-space>
        <a-button size="small" @click="goBack">返回列表</a-button>
      </a-space>
    </div>

    <a-empty v-if="!record" description="结算单不存在或已删除" />

    <template v-else>
      <DetailSectionCard title="基本信息">
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
          <a-descriptions-item v-if="remnantDispositionLabel" label="余料处置">
            {{ remnantDispositionLabel }}
          </a-descriptions-item>
          <a-descriptions-item v-if="record.remark" label="备注" :span="2">
            {{ record.remark }}
          </a-descriptions-item>
        </a-descriptions>
      </DetailSectionCard>

      <DetailSectionCard :title="`结算明细（${record.lines?.length || 0}）`">
        <a-table
          :columns="lineColumns"
          :data-source="record.lines || []"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1540 }"
        >
          <template #bodyCell="{ column, record: line, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'blankSizeText'">
              {{ line.blankSizeText || '—' }}
            </template>
            <template v-else-if="column.key === 'specModel'">{{ line.specModel || '—' }}</template>
            <template v-else-if="column.key === 'drawingNo'">{{ line.drawingNo || '—' }}</template>
            <template v-else-if="column.key === 'material'">{{ line.material || '—' }}</template>
            <template v-else-if="column.key === 'pickedLength'">
              {{ formatQtyWithUnit(line.pickedLength, lineUnit(line)) }}
            </template>
            <template v-else-if="column.key === 'demandMeters'">
              {{ formatQtyWithUnit(line.demandMeters, lineUnit(line)) }}
            </template>
            <template v-else-if="column.key === 'actualConsumeMeters'">
              <a-input-number
                v-if="isConfirmMode"
                v-model:value="line.actualConsumeMeters"
                :min="0.001"
                :max="Number(line.pickedLength) || undefined"
                :precision="3"
                size="small"
                style="width: 100%"
                :addon-after="lineUnit(line)"
                @change="() => recalcRemnant(line)"
              />
              <span v-else>{{ formatQtyWithUnit(line.actualConsumeMeters, lineUnit(line)) }}</span>
            </template>
            <template v-else-if="column.key === 'remnantLength'">
              {{ formatQtyWithUnit(line.remnantLength, lineUnit(line)) }}
            </template>
            <template v-else-if="column.key === 'pickedBatchNo'">
              {{ line.pickedBatchNo || '—' }}
            </template>
            <template v-else-if="column.key === 'remnantBatchNo'">
              {{ line.remnantBatchNo || '—' }}
            </template>
          </template>
        </a-table>
      </DetailSectionCard>

      <div v-if="isConfirmMode" class="page-footer">
        <a-button @click="goBack">取消</a-button>
        <a-button @click="submitConfirm('return_to_ship')">确认结算（余料退回发料仓）</a-button>
        <a-button type="primary" @click="submitConfirm('keep_line_side')"
          >确认结算（余料留线边）</a-button
        >
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'CutSettleDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  confirmCutSettle,
  getCutSettleById,
  cutSettleState,
  CUT_SETTLE_REMNANT_DISPOSITION,
} from '@/store/cutSettleStore'
import { roundMeters } from '@/utils/variableLengthMaterial'
import { formatQtyWithUnit } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { openTab, closeTab, tabState } = useTabs()
const tick = ref(0)

const record = computed(() => {
  tick.value
  void cutSettleState.records
  return getCutSettleById(String(route.params.id || ''))
})

const isConfirmMode = computed(() => record.value?.status === '待确认')

const remnantDispositionLabel = computed(() => {
  const d = record.value?.remnantDisposition
  if (d === CUT_SETTLE_REMNANT_DISPOSITION.KEEP_LINE_SIDE) return '余料留线边'
  if (d === CUT_SETTLE_REMNANT_DISPOSITION.RETURN_TO_SHIP) return '余料已退回发料仓'
  return ''
})

const workOrderNos = computed(() => {
  const lines = record.value?.lines || []
  const nos = [...new Set(lines.map((l) => l.workOrderNo).filter(Boolean))]
  return nos.join('、') || '—'
})

watch(
  () => [record.value?.docNo, record.value?.status],
  ([docNo, status]) => {
    if (!docNo) return
    const title = status === '待确认' ? `确认结算 ${docNo}` : docNo
    openTab(route.path, title)
  },
  { immediate: true },
)

function lineUnit(line) {
  return String(line?.unit || line?.stockUnit || '').trim() || '米'
}

const lineColumns = computed(() => {
  const cols = [
    { title: '序号', key: 'index', width: 60, align: 'center' },
    { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
    { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
    { title: '型号规格', key: 'specModel', width: 100, ellipsis: true },
    { title: '图号', key: 'drawingNo', width: 100, ellipsis: true },
    { title: '材质', key: 'material', width: 80 },
    { title: '下料尺寸', key: 'blankSizeText', width: 140, ellipsis: true },
    { title: '出库数量', key: 'pickedLength', width: 100, align: 'right' },
    { title: '需求数', key: 'demandMeters', width: 100, align: 'right' },
    {
      title: '实耗',
      key: 'actualConsumeMeters',
      width: isConfirmMode.value ? 140 : 100,
      align: 'right',
    },
    { title: '余料', key: 'remnantLength', width: 100, align: 'right' },
    { title: '拣选批次', key: 'pickedBatchNo', width: 130 },
    { title: '余料新批次', key: 'remnantBatchNo', width: 140 },
  ]
  return cols
})

function recalcRemnant(line) {
  line.remnantLength = roundMeters(
    Math.max(0, Number(line.pickedLength) - Number(line.actualConsumeMeters)),
  )
}

function goBack() {
  const listPath = '/inventory/cut-settle'
  const detailPath = route.path
  const closingActive = tabState.activePath === detailPath
  closeTab(detailPath)
  router.push(closingActive ? tabState.activePath || listPath : listPath)
}

function submitConfirm(disposition) {
  const row = record.value
  if (!row) return
  const keep = disposition === CUT_SETTLE_REMNANT_DISPOSITION.KEEP_LINE_SIDE
  Modal.confirm({
    title: keep ? '确认结算（余料留线边）？' : '确认结算（余料退回发料仓）？',
    content: keep
      ? '将按实耗从线边扣减；余料仍留在线边仓，可供后续工单继续使用。'
      : '将按实耗从线边扣减，并把余料退回发料仓（生成余料入库单）。',
    onOk: () => {
      ;(row.lines || []).forEach((line) => recalcRemnant(line))
      const res = confirmCutSettle(row.id, { remnantDisposition: disposition })
      if (!res.ok) {
        message.error(res.message)
        return
      }
      if (keep) {
        const hasRemnant = (res.record.lines || []).some((l) => Number(l.remnantLength) > 0)
        message.success(hasRemnant ? '已确认：实耗已扣，余料留在线边' : '已确认（无余料）')
      } else {
        message.success(
          res.record.remnantInboundDocNo
            ? `已确认，余料入库单 ${res.record.remnantInboundDocNo}`
            : '已确认（无余料）',
        )
      }
      tick.value += 1
      openTab(route.path, res.record.docNo)
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
.page-footer {
  margin-top: 8px;
  padding: 12px 0 4px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #f0f0f0;
}
</style>

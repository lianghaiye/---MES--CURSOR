<template>
  <div class="cut-settle-page">
    <div class="toolbar">
      <div class="title">下料结算</div>
      <a-space>
        <a-button type="primary" size="small" @click="createOpen = true">从出库单创建</a-button>
      </a-space>
    </div>

    <a-alert
      type="info"
      show-icon
      class="scene-alert"
      message="从出库单创建：适用于「整批出+余料确认回库」。列表按结算明细展示（一单一料）。点结算单号打开详情；点确认结算在右侧填写实耗后确认回库。"
    />

    <div class="filter-card">
      <a-form layout="inline" class="filter-form" :model="filters">
        <a-form-item label="结算单号">
          <a-input
            v-model:value="filters.docNo"
            allow-clear
            placeholder="结算单号"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="工单编号">
          <a-input
            v-model:value="filters.workOrderNo"
            allow-clear
            placeholder="工单编号"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="出库单号">
          <a-input
            v-model:value="filters.outboundDocNo"
            allow-clear
            placeholder="出库单号"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="物料名称">
          <a-input
            v-model:value="filters.itemName"
            allow-clear
            placeholder="物料名称"
            style="width: 130px"
          />
        </a-form-item>
        <a-form-item label="编码">
          <a-input
            v-model:value="filters.itemCode"
            allow-clear
            placeholder="物料编码"
            style="width: 130px"
          />
        </a-form-item>
        <a-form-item label="型号规格">
          <a-input
            v-model:value="filters.specModel"
            allow-clear
            placeholder="型号规格"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item label="图号">
          <a-input
            v-model:value="filters.drawingNo"
            allow-clear
            placeholder="图号"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item label="材质">
          <a-input
            v-model:value="filters.material"
            allow-clear
            placeholder="材质"
            style="width: 100px"
          />
        </a-form-item>
        <a-form-item label="下料尺寸">
          <a-input
            v-model:value="filters.blankSizeText"
            allow-clear
            placeholder="下料尺寸"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="出库时间">
          <a-range-picker
            v-model:value="filters.outboundTimeRange"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="applyFilters">查询</a-button>
            <a-button @click="resetFilters">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-table
      :columns="columns"
      :data-source="pagedRows"
      row-key="rowKey"
      size="small"
      bordered
      :scroll="{ x: 1980 }"
      :pagination="pagination"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === '已确认' ? 'green' : 'orange'">{{
            record.status || '—'
          }}</a-tag>
        </template>
        <template v-else-if="column.key === 'docNo'">
          <a @click.prevent="openDetailTab(record)">{{ record.docNo || '—' }}</a>
        </template>
        <template v-else-if="column.key === 'blankSizeText'">
          {{ record.blankSizeText || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a v-if="record.status === '待确认'" @click.prevent="openConfirmDrawer(record)"
            >确认结算</a
          >
          <span v-else class="action-disabled">—</span>
        </template>
        <template v-else-if="column.key === 'demandMeters'">
          {{ formatQty(record.demandMeters) }}
        </template>
        <template v-else-if="column.key === 'actualConsumeMeters'">
          {{ formatQty(record.actualConsumeMeters) }}
        </template>
        <template v-else-if="column.key === 'remnantLength'">
          {{ formatQty(record.remnantLength) }}
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
      v-model:open="confirmOpen"
      :title="confirmRecord?.docNo ? `确认结算 ${confirmRecord.docNo}` : '确认结算'"
      width="1080"
      :destroy-on-close="true"
    >
      <template v-if="confirmRecord">
        <div class="section-title">基本信息</div>
        <a-descriptions size="small" bordered :column="3" class="mb-16">
          <a-descriptions-item label="状态">{{ confirmRecord.status }}</a-descriptions-item>
          <a-descriptions-item label="结算单号">{{ confirmRecord.docNo }}</a-descriptions-item>
          <a-descriptions-item label="出库单号">{{
            confirmRecord.outboundDocNo || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="工单号">{{ headerWorkOrderNo }}</a-descriptions-item>
          <a-descriptions-item label="出库仓库">{{
            confirmRecord.shipWarehouse || confirmRecord.lines?.[0]?.shipWarehouse || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="领入仓库">{{
            confirmRecord.receiveWarehouse || confirmRecord.lines?.[0]?.warehouse || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="出库时间" :span="3">{{
            confirmRecord.outboundTime || '—'
          }}</a-descriptions-item>
        </a-descriptions>

        <div class="section-title">结算明细</div>
        <a-table
          :columns="drawerLineColumns"
          :data-source="confirmRecord.lines || []"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1100 }"
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
                v-if="confirmRecord.status === '待确认'"
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
          </template>
        </a-table>

        <div v-if="confirmRecord.status === '待确认'" class="drawer-footer">
          <a-button @click="confirmOpen = false">取消</a-button>
          <a-button type="primary" @click="submitConfirm">确认结算（耗用 + 余料回仓）</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script>
export default { name: 'CutSettleRecordView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  cutSettleState,
  buildCutSettleDraftFromOutbound,
  createCutSettleRecord,
  confirmCutSettle,
  getCutSettleById,
} from '@/store/cutSettleStore'
import { outboundState } from '@/store/outboundStore'
import { roundMeters } from '@/utils/variableLengthMaterial'
import { flattenCutSettleLines, filterCutSettleLineRows } from '@/utils/cutSettleLines'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const createOpen = ref(false)
const selectedOutboundId = ref(undefined)
const createRemark = ref('')
const confirmOpen = ref(false)
const confirmSettleId = ref('')
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  docNo: '',
  workOrderNo: '',
  outboundDocNo: '',
  itemName: '',
  itemCode: '',
  specModel: '',
  drawingNo: '',
  material: '',
  blankSizeText: '',
  outboundTimeRange: undefined,
})
const applied = reactive({ ...filters })

const confirmRecord = computed(() =>
  confirmSettleId.value ? getCutSettleById(confirmSettleId.value) : null,
)

const headerWorkOrderNo = computed(() => {
  const lines = confirmRecord.value?.lines || []
  const nos = [...new Set(lines.map((l) => l.workOrderNo).filter(Boolean))]
  return nos.join('、') || '—'
})

const allRows = computed(() => {
  void cutSettleState.records
  return flattenCutSettleLines(cutSettleState.records)
})

const filteredRows = computed(() => filterCutSettleLineRows(allRows.value, applied))

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredRows.value.length,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
}))

const outboundOpts = computed(() =>
  outboundState.orders
    .filter(
      (o) =>
        o.status === '已出库' &&
        (o.outboundType === '领料出库' || o.outboundType === '发料出库') &&
        (o.lineItems || []).some((l) => {
          if (!l.isVariableLength) return false
          if (l.pickedBatchId) return true
          return (l.batchAllocations || []).some((a) => a?.batchId && Number(a.qty) > 0)
        }),
    )
    .map((o) => ({
      label: `${o.docNo}（${o.receiveWarehouse ? `领入 ${o.receiveWarehouse} · ` : ''}${o.sourceOrderNo || '无来源'}）`,
      value: o.id,
    })),
)

const columns = [
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '结算单号', key: 'docNo', width: 140, fixed: 'left' },
  { title: '出库单号', dataIndex: 'outboundDocNo', key: 'outboundDocNo', width: 140 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', width: 150, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 130 },
  { title: '型号规格', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90 },
  { title: '下料尺寸', key: 'blankSizeText', width: 150, ellipsis: true },
  { title: '需求数', key: 'demandMeters', width: 80, align: 'right' },
  { title: '实耗', key: 'actualConsumeMeters', width: 80, align: 'right' },
  { title: '余料', key: 'remnantLength', width: 80, align: 'right' },
  { title: '工单号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 130 },
  { title: '出库仓库', dataIndex: 'shipWarehouse', key: 'shipWarehouse', width: 100 },
  { title: '出库时间', dataIndex: 'outboundTime', key: 'outboundTime', width: 160 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

const drawerLineColumns = [
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

function applyFilters() {
  Object.assign(applied, {
    ...filters,
    outboundTimeRange: filters.outboundTimeRange ? [...filters.outboundTimeRange] : undefined,
  })
  page.value = 1
}

function resetFilters() {
  Object.assign(filters, {
    docNo: '',
    workOrderNo: '',
    outboundDocNo: '',
    itemName: '',
    itemCode: '',
    specModel: '',
    drawingNo: '',
    material: '',
    blankSizeText: '',
    outboundTimeRange: undefined,
  })
  applyFilters()
}

function onTableChange(pag) {
  page.value = pag.current
  pageSize.value = pag.pageSize
}

function openDetailTab(record) {
  const path = `/inventory/cut-settle/${record.settleId}`
  openTab(path, record.docNo || '下料结算详情')
  router.push(path)
}

function openConfirmDrawer(record) {
  confirmSettleId.value = record.settleId
  confirmOpen.value = true
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
  openConfirmDrawer({ settleId: res.record.id })
}

function submitConfirm() {
  const row = confirmRecord.value
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
.scene-alert {
  margin-bottom: 12px;
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
.filter-card {
  margin-bottom: 12px;
  padding: 12px 12px 0;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.filter-form :deep(.ant-form-item) {
  margin-bottom: 12px;
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
.action-disabled {
  color: #bfbfbf;
}
</style>

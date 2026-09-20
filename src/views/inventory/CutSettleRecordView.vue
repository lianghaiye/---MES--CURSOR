<template>
  <div class="cut-settle-page list-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form" :model="filters">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="结算单号">
              <a-input
                v-model:value="filters.docNo"
                allow-clear
                size="small"
                placeholder="结算单号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="工单编号">
              <a-input
                v-model:value="filters.workOrderNo"
                allow-clear
                size="small"
                placeholder="工单编号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库单号">
              <a-input
                v-model:value="filters.outboundDocNo"
                allow-clear
                size="small"
                placeholder="出库单号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物料名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                size="small"
                placeholder="物料名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                size="small"
                placeholder="物料编码"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="型号规格">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                size="small"
                placeholder="型号规格"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="图号">
              <a-input
                v-model:value="filters.drawingNo"
                allow-clear
                size="small"
                placeholder="图号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="材质">
              <a-input
                v-model:value="filters.material"
                allow-clear
                size="small"
                placeholder="材质"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="下料尺寸">
              <a-input
                v-model:value="filters.blankSizeText"
                allow-clear
                size="small"
                placeholder="下料尺寸"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="出库时间">
              <a-range-picker
                v-model:value="filters.outboundTimeRange"
                size="small"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="applyFilters">查询</a-button>
                <a-button size="small" @click="resetFilters">重置</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="createOpen = true">从出库单创建</a-button>
      </a-space>
    </div>

    <a-alert
      type="info"
      show-icon
      class="summary-bar"
      message="从出库单创建：工单含「下料工序」且物料勾选「需要下料结算」时可结算。确认时可选择「余料留线边」（主）或「余料退回发料仓」。"
    />

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedRows"
        row-key="rowKey"
        size="small"
        bordered
        :scroll="{ x: 2080 }"
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
            <a-space v-if="record.status === '待确认'" :size="8">
              <a @click.prevent="openConfirmTab(record)">确认结算</a>
            </a-space>
            <span v-else class="action-disabled">—</span>
          </template>
          <template v-else-if="column.key === 'pickedLength'">
            {{ formatQtyWithUnit(record.pickedLength, lineUnit(record)) }}
          </template>
          <template v-else-if="column.key === 'demandMeters'">
            {{ formatQtyWithUnit(record.demandMeters, lineUnit(record)) }}
          </template>
          <template v-else-if="column.key === 'actualConsumeMeters'">
            {{ formatQtyWithUnit(record.actualConsumeMeters, lineUnit(record)) }}
          </template>
          <template v-else-if="column.key === 'remnantLength'">
            {{ formatQtyWithUnit(record.remnantLength, lineUnit(record)) }}
          </template>
        </template>
      </a-table>
    </div>

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
  </div>
</template>

<script>
export default { name: 'CutSettleRecordView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  cutSettleState,
  buildCutSettleDraftFromOutbound,
  createCutSettleRecord,
} from '@/store/cutSettleStore'
import { outboundState } from '@/store/outboundStore'
import { flattenCutSettleLines, filterCutSettleLineRows } from '@/utils/cutSettleLines'
import { isOutboundEligibleForCutSettle } from '@/utils/workOrderBlanking'
import { formatQtyWithUnit } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { openTab } = useTabs()

const createOpen = ref(false)
const selectedOutboundId = ref(undefined)
const createRemark = ref('')
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
    .filter((o) => isOutboundEligibleForCutSettle(o))
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
  { title: '出库数量', key: 'pickedLength', width: 100, align: 'right' },
  { title: '需求数', key: 'demandMeters', width: 100, align: 'right' },
  { title: '实耗', key: 'actualConsumeMeters', width: 100, align: 'right' },
  { title: '余料', key: 'remnantLength', width: 100, align: 'right' },
  { title: '工单号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 130 },
  { title: '出库仓库', dataIndex: 'shipWarehouse', key: 'shipWarehouse', width: 100 },
  { title: '出库时间', dataIndex: 'outboundTime', key: 'outboundTime', width: 160 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

function lineUnit(line) {
  return String(line?.unit || line?.stockUnit || '').trim() || '米'
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

function openConfirmTab(record) {
  const path = `/inventory/cut-settle/${record.settleId}`
  openTab(path, record.docNo ? `确认结算 ${record.docNo}` : '确认结算')
  router.push(path)
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
  openConfirmTab({ settleId: res.record.id, docNo: res.record.docNo })
}
</script>

<style scoped>
.cut-settle-page {
  /* 壳层由全局 .list-page 提供 */
}
.action-disabled {
  color: #bfbfbf;
}
</style>

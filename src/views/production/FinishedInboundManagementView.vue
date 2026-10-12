<template>
  <div class="finished-inbound-page list-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form" :model="filters">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="申请单号">
              <a-input
                v-model:value="filters.reqNo"
                allow-clear
                placeholder="搜索申请单号"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="申请状态">
              <a-select
                v-model:value="filters.auditStatus"
                allow-clear
                placeholder="全部"
                size="small"
                :options="auditStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库方式">
              <a-select
                v-model:value="filters.mode"
                allow-clear
                placeholder="全部"
                size="small"
                :options="modeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="入库状态">
              <a-select
                v-model:value="filters.inboundStatus"
                allow-clear
                placeholder="全部"
                size="small"
                :options="statusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="工单号">
              <a-input
                v-model:value="filters.workOrderNo"
                allow-clear
                placeholder="关联工单"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="申请人">
              <a-input
                v-model:value="filters.applicant"
                allow-clear
                placeholder="申请人"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="goCreate">申请成品入库</a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleRefresh">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredList.length }} 条数据
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1200 }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'auditStatus'">
            <a-tag :color="auditColor(record.auditStatus)">{{ record.auditStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'inboundStatus'">
            <a-badge :status="statusBadge(record.inboundStatus)" :text="record.inboundStatus" />
          </template>
          <template v-else-if="column.key === 'reqNo'">
            <a class="link-code" @click="goDetail(record)">{{ record.reqNo }}</a>
          </template>
          <template v-else-if="column.key === 'mode'">
            <a-tag :color="modeColor(record.mode)">{{ record.modeLabel }}</a-tag>
          </template>
          <template v-else-if="column.key === 'workOrder'">
            <span :title="relatedWorkOrderText(record)">{{
              truncate(relatedWorkOrderText(record), 28)
            }}</span>
          </template>
          <template v-else-if="column.key === 'product'">
            <span :title="relatedProductText(record)">{{
              truncate(relatedProductText(record), 24)
            }}</span>
          </template>
          <template v-else-if="column.key === 'inboundDocNo'">
            <template v-if="inboundLinksOf(record).length">
              <a
                v-for="(link, idx) in inboundLinksOf(record)"
                :key="link.id || link.docNo"
                class="link-code"
                @click="goInbound(link)"
              >
                {{ link.docNo
                }}<template v-if="idx < inboundLinksOf(record).length - 1">、</template>
              </a>
            </template>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'qty'">
            {{ record.lineCount || 0 }} 行 / {{ record.totalQty || 0 }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="4">
              <a-button type="link" size="small" @click="goDetail(record)">详情</a-button>
              <template v-if="record.auditStatus === FINISHED_INBOUND_AUDIT.PENDING">
                <a-button type="link" size="small" @click="onApprove(record)">通过</a-button>
                <a-button type="link" size="small" danger @click="onReject(record)">驳回</a-button>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'FinishedInboundManagementView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import {
  listMobileFinishedInbounds,
  refreshMobileFinishedInbounds,
  relatedWorkOrderText,
  relatedProductText,
  approveFinishedInboundApplication,
  rejectFinishedInboundApplication,
  FINISHED_INBOUND_MODES,
  FINISHED_INBOUND_AUDIT,
  FINISHED_INBOUND_AUDIT_OPTIONS,
} from '@/store/mobileFinishedInboundStore'

const router = useRouter()

const filters = reactive({
  reqNo: '',
  mode: undefined,
  auditStatus: undefined,
  inboundStatus: undefined,
  workOrderNo: '',
  applicant: '',
})

const applied = reactive({ ...filters })

const pagination = reactive({
  current: 1,
  pageSize: 10,
})

const selectedRowKeys = ref([])

const modeOptions = [
  { label: '工单入库', value: FINISHED_INBOUND_MODES.WORK_ORDER },
  { label: '工单入库（多工单）', value: FINISHED_INBOUND_MODES.BATCH },
  { label: '快速入库', value: FINISHED_INBOUND_MODES.QUICK },
]

const auditStatusOptions = FINISHED_INBOUND_AUDIT_OPTIONS

const statusOptions = [
  { label: '待入库', value: '待入库' },
  { label: '部分入库', value: '部分入库' },
  { label: '已入库', value: '已入库' },
  { label: '已拒绝', value: '已拒绝' },
  { label: '—', value: '—' },
]

const columns = [
  { title: '申请状态', key: 'auditStatus', width: 110, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', width: 150, fixed: 'left' },
  { title: '入库方式', key: 'mode', width: 130 },
  { title: '关联工单', key: 'workOrder', width: 180, ellipsis: true },
  { title: '产品/摘要', key: 'product', width: 160, ellipsis: true },
  { title: '车间', dataIndex: 'workshop', key: 'workshop', width: 110 },
  { title: '入库单号', key: 'inboundDocNo', width: 200 },
  { title: '入库状态', key: 'inboundStatus', width: 110 },
  { title: '申请人', dataIndex: 'applicant', key: 'applicant', width: 90 },
  { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: '数量', key: 'qty', width: 110 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
]

const allList = computed(() => listMobileFinishedInbounds())

const filteredList = computed(() => {
  const reqNo = applied.reqNo.trim().toLowerCase()
  const wo = applied.workOrderNo.trim().toLowerCase()
  const applicant = applied.applicant.trim().toLowerCase()
  return allList.value.filter((r) => {
    if (
      reqNo &&
      !String(r.reqNo || '')
        .toLowerCase()
        .includes(reqNo)
    )
      return false
    if (applied.mode && r.mode !== applied.mode) return false
    if (applied.auditStatus && r.auditStatus !== applied.auditStatus) return false
    if (applied.inboundStatus && r.inboundStatus !== applied.inboundStatus) return false
    if (
      applicant &&
      !String(r.applicant || '')
        .toLowerCase()
        .includes(applicant)
    )
      return false
    if (wo) {
      const text = `${relatedWorkOrderText(r)} ${r.workOrderCode || ''} ${(r.workOrders || [])
        .map((w) => w.code)
        .join(' ')}`.toLowerCase()
      if (!text.includes(wo)) return false
    }
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

watch(
  () => [
    applied.reqNo,
    applied.mode,
    applied.auditStatus,
    applied.inboundStatus,
    applied.workOrderNo,
    applied.applicant,
  ],
  () => {
    pagination.current = 1
    selectedRowKeys.value = []
  },
)

onMounted(() => {
  refreshMobileFinishedInbounds()
})

function handleSearch() {
  Object.assign(applied, { ...filters })
}

function handleReset() {
  filters.reqNo = ''
  filters.mode = undefined
  filters.auditStatus = undefined
  filters.inboundStatus = undefined
  filters.workOrderNo = ''
  filters.applicant = ''
  Object.assign(applied, { ...filters })
}

function handleRefresh() {
  refreshMobileFinishedInbounds()
  message.success('已刷新')
}

function goCreate() {
  router.push('/production/finished-inbound/create')
}

function goDetail(record) {
  router.push(`/production/finished-inbound/${record.id}`)
}

function goInbound(linkOrRecord) {
  const link =
    linkOrRecord?.docNo && (linkOrRecord.id || linkOrRecord.docNo)
      ? linkOrRecord
      : inboundLinksOf(linkOrRecord)[0]
  if (!link?.id) {
    message.info('暂无关联入库单')
    return
  }
  router.push(`/inventory/inbound/${link.id}`)
}

function inboundLinksOf(record) {
  if (!record) return []
  const list = Array.isArray(record.inboundOrders) ? record.inboundOrders : []
  if (list.length) {
    return list.map((o) => ({ id: o.id || '', docNo: o.docNo || '' })).filter((o) => o.docNo)
  }
  if (record.inboundDocNo) {
    return [{ id: record.inboundId || '', docNo: record.inboundDocNo }]
  }
  return []
}

function onApprove(record) {
  Modal.confirm({
    title: '审核通过',
    content: `确认通过申请单 ${record.reqNo}？通过后将生成成品入库单。`,
    onOk() {
      const res = approveFinishedInboundApplication(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      const nos = res.record.inboundDocNo || ''
      message.success(nos ? `已通过，入库单 ${nos}` : '已通过')
    },
  })
}

function onReject(record) {
  Modal.confirm({
    title: '审核驳回',
    content: `确认驳回申请单 ${record.reqNo}？`,
    okType: 'danger',
    onOk() {
      const res = rejectFinishedInboundApplication(record.id, '')
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已驳回')
    },
  })
}

function modeColor(mode) {
  if (mode === FINISHED_INBOUND_MODES.QUICK) return 'purple'
  if (mode === FINISHED_INBOUND_MODES.BATCH) return 'blue'
  return 'cyan'
}

function auditColor(status) {
  if (status === FINISHED_INBOUND_AUDIT.APPROVED) return 'success'
  if (status === FINISHED_INBOUND_AUDIT.REJECTED) return 'error'
  return 'warning'
}

function statusBadge(status) {
  const map = {
    待入库: 'processing',
    部分入库: 'warning',
    已入库: 'success',
    已拒绝: 'error',
    多单进行中: 'processing',
  }
  return map[status] || 'default'
}

function truncate(text, max) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}
</script>

<style lang="less" scoped>
.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;

  .toolbar-icons {
    color: rgba(0, 0, 0, 0.45);
  }
}

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>

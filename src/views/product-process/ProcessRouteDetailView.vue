<template>
  <div class="process-route-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.name }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub-code">{{ record.code }}</span>
          </div>
          <a-space class="header-actions" :size="8">
            <a-button size="small" :disabled="record.status === '已归档'" @click="openEdit">
              编辑
            </a-button>
            <a-button
              v-if="record.status === '使用中' || record.status === '新建'"
              size="small"
              @click="handleArchive"
            >
              归档
            </a-button>
            <a-button v-if="record.status === '已归档'" size="small" @click="handleUnarchive">
              取消归档
            </a-button>
            <a-button size="small" @click="handleClone">克隆</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <DetailSectionCard title="基本信息">
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工艺路线编号">{{ record.code }}</a-descriptions-item>
            <a-descriptions-item label="名称">{{ record.name }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
            <a-descriptions-item label="适用范围">{{
              formatApplyScopeLabel(record.applyScope)
            }}</a-descriptions-item>
            <a-descriptions-item label="适用对象">
              {{ record.productDisplay || record.itemName || record.categoryName || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="备注">{{ record.remark || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建日期">{{ record.createdAt }}</a-descriptions-item>
            <a-descriptions-item label="更新日期">{{ record.updatedAt }}</a-descriptions-item>
          </a-descriptions>
        </DetailSectionCard>

        <DetailSectionCard title="工序流程（只读）">
          <a-table
            :columns="stepCols"
            :data-source="flatSteps"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.key === 'processFile'">
                {{ row.processFileName || '—' }}
              </template>
              <template v-else>
                {{ row[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>
        </DetailSectionCard>
      </template>
      <a-empty v-else-if="!loading" description="未找到该工艺路线" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'ProcessRouteDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import {
  getProcessRouteById,
  archiveProcessRoute,
  unarchiveProcessRoute,
  cloneProcessRoute,
} from '@/store/processRouteStore'
import {
  flattenGridToSteps,
  formatApplyScopeLabel,
  formatCompletionModeLabel,
  syncStepPolicies,
} from '@/utils/processRouteGrid'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)

const stepCols = [
  { title: '步骤', dataIndex: 'stepNo', width: 70 },
  { title: '行号', dataIndex: 'rowNo', width: 70 },
  { title: '完成方式', dataIndex: 'completionModeLabel', width: 100 },
  { title: '工序编码', dataIndex: 'processCode', width: 120 },
  { title: '工序名称', dataIndex: 'name', width: 120 },
  { title: '工艺文件', key: 'processFile', width: 180 },
]

const flatSteps = computed(() => {
  if (!record.value?.grid) return []
  const policies = syncStepPolicies(record.value.grid, record.value.stepPolicies)
  return flattenGridToSteps(record.value.grid, policies).map((s, i) => ({
    ...s,
    id: `${s.stepNo}-${s.rowNo}-${i}`,
    completionModeLabel: formatCompletionModeLabel(s.completionMode),
  }))
})

function statusColor(status) {
  if (status === '使用中') return 'processing'
  if (status === '已归档') return 'warning'
  return 'default'
}

function reloadRecord() {
  record.value = getProcessRouteById(route.params.id)
}

function openEdit() {
  if (!record.value?.id) return
  if (record.value.status === '已归档') {
    message.warning('已归档的工艺路线不可编辑，请先取消归档')
    return
  }
  openCreateTab(router, openTab, {
    path: `/product-process/routing/${record.value.id}/edit`,
    title: `编辑工艺路线 ${record.value.code || record.value.name || ''}`.trim(),
  })
}

function handleArchive() {
  if (!record.value) return
  Modal.confirm({
    title: '确认归档',
    content: `确定归档工艺路线「${record.value.name}」吗？归档后不可用于新工单下发。`,
    onOk: () => {
      const res = archiveProcessRoute(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已归档')
      reloadRecord()
    },
  })
}

function handleUnarchive() {
  if (!record.value) return
  const res = unarchiveProcessRoute(record.value.id)
  if (!res.ok) message.warning(res.message)
  else {
    message.success('已取消归档')
    reloadRecord()
  }
}

function handleClone() {
  if (!record.value) return
  const res = cloneProcessRoute(record.value.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(`已克隆为 ${res.route.code}`)
  router.push(`/product-process/routing/${res.route.id}`)
}

function goBack() {
  router.push('/product-process/routing')
}

watch(
  () => route.params.id,
  (id) => {
    loading.value = true
    record.value = getProcessRouteById(id)
    loading.value = false
  },
  { immediate: true },
)
</script>

<style scoped lang="less">
.process-route-detail-page {
  :deep(.detail-section-card) {
    margin-bottom: 8px;
  }

  :deep(.detail-section-card:last-child) {
    margin-bottom: 0;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-actions {
  flex-shrink: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.sub-code {
  color: #888;
  font-size: 13px;
}
</style>

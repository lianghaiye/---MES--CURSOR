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
          <a-button size="small" @click="goBack">返回列表</a-button>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工艺路线编号">{{ record.code }}</a-descriptions-item>
            <a-descriptions-item label="名称">{{ record.name }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
            <a-descriptions-item label="工艺应用范围">{{ record.applyScope }}</a-descriptions-item>
            <a-descriptions-item label="产品/物品">
              {{ record.productDisplay || record.itemName || record.categoryName || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="备注">{{ record.remark || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建日期">{{ record.createdAt }}</a-descriptions-item>
            <a-descriptions-item label="更新日期">{{ record.updatedAt }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">工序流程（只读）</div>
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
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该工艺路线" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'ProcessRouteDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProcessRouteById } from '@/store/processRouteStore'
import { flattenGridToSteps } from '@/utils/processRouteGrid'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const record = ref(null)

const stepCols = [
  { title: '步骤', dataIndex: 'stepNo', width: 70 },
  { title: '行号', dataIndex: 'rowNo', width: 70 },
  { title: '工序编码', dataIndex: 'processCode', width: 120 },
  { title: '工序名称', dataIndex: 'name', width: 120 },
  { title: '工艺文件', key: 'processFile', width: 180 },
]

const flatSteps = computed(() => {
  if (!record.value?.grid) return []
  return flattenGridToSteps(record.value.grid).map((s, i) => ({
    ...s,
    id: `${s.stepNo}-${s.rowNo}-${i}`,
  }))
})

function statusColor(status) {
  if (status === '使用中') return 'processing'
  if (status === '已归档') return 'warning'
  return 'default'
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

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
}
.sub-code {
  color: #888;
  font-size: 13px;
}
.section-card {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1677ff;
}
</style>

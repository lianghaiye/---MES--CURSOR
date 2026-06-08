<template>
  <div class="process-config-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.name }}</span>
            <a-tag :color="record.status === '使用中' ? 'processing' : 'default'">{{
              record.status
            }}</a-tag>
            <span class="sub-code">{{ record.code }}</span>
          </div>
          <a-space>
            <a-button type="primary" size="small" @click="openEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工序编码">{{ record.code }}</a-descriptions-item>
            <a-descriptions-item label="工序名称">{{ record.name }}</a-descriptions-item>
            <a-descriptions-item label="工序分类">{{ record.category }}</a-descriptions-item>
            <a-descriptions-item label="资源类型">{{ record.resourceType }}</a-descriptions-item>
            <a-descriptions-item label="岗位">{{ record.position }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
            <a-descriptions-item label="图片">
              <img v-if="record.image" :src="record.image" class="detail-thumb" alt="" />
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="2">{{
              record.remark || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="创建日期">{{ record.createdAt }}</a-descriptions-item>
            <a-descriptions-item label="更新日期">{{ record.updatedAt }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">工序操作（工单任务可操作项）</div>
          <div class="ops-tags">
            <a-tag v-for="label in operationLabels" :key="label" color="blue">{{ label }}</a-tag>
            <span v-if="!operationLabels.length" class="empty-ops">未配置任何操作</span>
          </div>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该工序" />
    </a-spin>

    <ProcessConfigFormModal v-model:open="modalOpen" :record="record" @saved="reload" />
  </div>
</template>

<script>
export default { name: 'ProcessConfigDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProcessById, getOperationLabels } from '@/store/processConfigStore'
import ProcessConfigFormModal from './components/ProcessConfigFormModal.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const record = ref(null)
const modalOpen = ref(false)

const operationLabels = computed(() => (record.value ? getOperationLabels(record.value) : []))

function reload() {
  const id = route.params.id
  record.value = getProcessById(id)
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    reload()
    loading.value = false
  },
  { immediate: true },
)

function goBack() {
  router.push('/product-process/process-config')
}

function openEdit() {
  modalOpen.value = true
}
</script>

<style lang="less" scoped>
.process-config-detail-page {
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
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .section-title {
    font-weight: 500;
    margin-bottom: 12px;
  }

  .detail-thumb {
    width: 48px;
    height: 48px;
    border-radius: 4px;
  }

  .ops-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .empty-ops {
    color: #999;
  }
}
</style>

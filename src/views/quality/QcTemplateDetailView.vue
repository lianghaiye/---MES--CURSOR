<template>
  <div class="qc-template-detail-page">
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && !record" description="模板不存在或已删除" />
      <template v-else-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ pageTitle }}</span>
            <a-tag :color="record.isSystem ? 'blue' : 'processing'">
              {{ record.type || '—' }}
            </a-tag>
            <a-tag
              v-if="!record.isSystem"
              :color="record.status === '启用' ? 'success' : 'default'"
            >
              {{ record.status || '—' }}
            </a-tag>
          </div>
          <a-space>
            <a-button v-if="record.isSystem" type="primary" size="small" @click="handleCopy">
              复制
            </a-button>
            <a-button v-else type="primary" size="small" @click="handleEdit">编辑</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <QcTemplateDetailPanel :record="record" :table-scroll-y="560" />
        </div>
      </template>
    </a-spin>
  </div>
</template>

<script>
export default { name: 'QcTemplateDetailView' }
</script>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  copyQcTemplate,
  ensureQcTemplateDemoSeed,
  getQcTemplateById,
} from '@/store/qcTemplateStore'
import { ensureQcLibraryDemoSeed } from '@/store/qcFieldLibraryStore'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'
import QcTemplateDetailPanel from './components/QcTemplateDetailPanel.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const qcTemplateCreatePage = findCreatePageByListPath('/quality/qc-template')

const loading = ref(false)
const record = ref(null)

const pageTitle = computed(() => {
  const code = record.value?.code
  if (!code) return '质检模板详情'
  return record.value?.isSystem ? `系统模板 ${code}` : `模板详情 ${code}`
})

function loadRecord() {
  loading.value = true
  try {
    ensureQcLibraryDemoSeed()
    ensureQcTemplateDemoSeed()
    const id = String(route.params.id || '').trim()
    record.value = id ? getQcTemplateById(id) : null
  } finally {
    loading.value = false
  }
}

function handleEdit() {
  if (!qcTemplateCreatePage || !record.value?.id) return
  if (record.value.isSystem) {
    message.warning('系统模板不可编辑')
    return
  }
  openCreateTab(router, openTab, {
    path: qcTemplateCreatePage.newPath,
    title: `编辑质检模板 ${record.value.code || ''}`,
    query: { id: record.value.id },
  })
}

function handleCopy() {
  if (!record.value?.id) return
  const res = copyQcTemplate(record.value.id)
  if (!res.ok) {
    message.warning(res.message || '复制失败')
    return
  }
  message.success(`已复制为 ${res.template.code}`)
  if (!qcTemplateCreatePage) return
  openCreateTab(router, openTab, {
    path: qcTemplateCreatePage.newPath,
    title: `编辑质检模板 ${res.template.code}`,
    query: { id: res.template.id },
  })
}

onMounted(loadRecord)
watch(
  () => route.params.id,
  () => loadRecord(),
)
</script>

<style lang="less" scoped>
.qc-template-detail-page {
  padding: 16px;
  background: #f5f6f8;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.section-card {
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 12px 16px 16px;
}
</style>

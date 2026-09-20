<template>
  <div class="qc-template-detail-page">
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && !record" description="模板不存在或已删除" />
      <template v-else-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ pageTitle }}</span>
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
            <a-space :size="8">
              <a-button v-if="record.isSystem" type="primary" size="small" @click="handleCopy">
                复制
              </a-button>
              <a-button v-else type="primary" size="small" @click="handleEdit">编辑</a-button>
            </a-space>
          </div>

          <div class="detail-tabs-wrap">
            <a-tabs
              v-model:active-key="activeTab"
              class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
            >
              <a-tab-pane key="detail" tab="模板详情" />
              <a-tab-pane key="fill" tab="填写预览" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <QcTemplateDetailPanel :record="record" :active-tab="activeTab" :table-scroll-y="560" />
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
const activeTab = ref('detail')

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
    activeTab.value = 'detail'
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
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--page-bg, #f0f2f5);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.detail-sticky-bar .detail-tabs-wrap {
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  overflow: auto;
}
</style>

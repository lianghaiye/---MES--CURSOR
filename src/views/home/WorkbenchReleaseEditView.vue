<template>
  <div class="release-edit-page page-shell">
    <section class="toolbar-card">
      <div class="toolbar-left">
        <h2 class="page-title">{{ isEdit ? '编辑功能发布' : '新增功能发布' }}</h2>
        <a-tag v-if="form.status === 'published'" color="green">已发布</a-tag>
        <a-tag v-else>草稿</a-tag>
      </div>
      <a-space>
        <a-button @click="goBack">取消</a-button>
        <a-button :loading="saving" @click="handleSave(false)">保存草稿</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave(true)">保存并发布</a-button>
      </a-space>
    </section>

    <a-spin :spinning="loading">
      <section class="form-card">
        <a-form
          class="release-form"
          layout="horizontal"
          :label-col="{ flex: '80px' }"
          :wrapper-col="{ flex: '1' }"
          :colon="false"
        >
          <a-form-item label="标题" required>
            <a-input v-model:value="form.title" placeholder="消息标题" />
          </a-form-item>
          <a-row :gutter="16">
            <a-col :xs="24" :lg="6">
              <a-form-item label="版本标签" required>
                <a-input v-model:value="form.versionTag" placeholder="如 2609" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :lg="6">
              <a-form-item label="发布人">
                <a-input v-model:value="form.publisher" placeholder="系统管理员" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :lg="6">
              <a-form-item label="发布日期">
                <a-date-picker
                  v-model:value="form.publishDate"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :lg="6">
              <a-form-item label="排序">
                <a-input-number v-model:value="form.sort" :min="1" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="发布范围" required>
            <div class="scope-wrap">
              <a-radio-group v-model:value="form.scopeType">
                <a-radio value="all">全部租户</a-radio>
                <a-radio value="tenants">指定租户</a-radio>
              </a-radio-group>
              <a-select
                v-if="form.scopeType === 'tenants'"
                v-model:value="form.tenantIds"
                mode="multiple"
                allow-clear
                placeholder="选择可见租户"
                style="width: 100%; margin-top: 8px; max-width: 560px"
                :options="tenantOptions"
              />
            </div>
          </a-form-item>
          <a-form-item label="正文" required class="content-item">
            <WorkbenchRichTextEditor v-if="editorReady" v-model="form.contentHtml" height="420px" />
          </a-form-item>
        </a-form>
      </section>
    </a-spin>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useTabs } from '@/composables/useTabs'
import { listWorkbenchTenants } from '@/mock/tenants'
import {
  getReleaseById,
  listAllReleases,
  publishRelease,
  saveRelease,
} from '@/store/workbenchStore'
import WorkbenchRichTextEditor from '@/views/home/components/WorkbenchRichTextEditor.vue'

const LIST_PATH = '/home/workbench-admin?tab=releases'

const route = useRoute()
const router = useRouter()
const { openTab, closeTab } = useTabs()

const loading = ref(true)
const saving = ref(false)
const editorReady = ref(false)

const tenantOptions = listWorkbenchTenants().map((t) => ({ label: t.name, value: t.id }))

const form = reactive({
  id: '',
  versionTag: '',
  title: '',
  publisher: '系统管理员',
  publishDate: dayjs().format('YYYY-MM-DD'),
  contentHtml: '<p></p>',
  scopeType: 'all',
  tenantIds: [],
  sort: 1,
  status: 'draft',
})

const isEdit = computed(() => Boolean(route.params.id && route.params.id !== 'new'))

function load() {
  loading.value = true
  editorReady.value = false
  try {
    if (!isEdit.value) {
      form.id = ''
      form.versionTag = ''
      form.title = ''
      form.publisher = '系统管理员'
      form.publishDate = dayjs().format('YYYY-MM-DD')
      form.contentHtml = '<p></p>'
      form.scopeType = 'all'
      form.tenantIds = []
      form.sort = listAllReleases().length + 1
      form.status = 'draft'
      return
    }
    const row = getReleaseById(route.params.id)
    if (!row) {
      message.error('发布记录不存在')
      goBack()
      return
    }
    Object.assign(form, {
      id: row.id,
      versionTag: row.versionTag || '',
      title: row.title || '',
      publisher: row.publisher || '系统管理员',
      publishDate: row.publishDate || dayjs().format('YYYY-MM-DD'),
      contentHtml: row.contentHtml || '<p></p>',
      scopeType: row.scopeType === 'tenants' ? 'tenants' : 'all',
      tenantIds: Array.isArray(row.tenantIds) ? [...row.tenantIds] : [],
      sort: row.sort || 1,
      status: row.status || 'draft',
    })
  } finally {
    loading.value = false
    // 延后挂载编辑器，避免路由切换时销毁异常
    setTimeout(() => {
      editorReady.value = true
    }, 0)
  }
}

async function handleSave(andPublish) {
  if (!String(form.versionTag || '').trim() || !String(form.title || '').trim()) {
    message.warning('请填写版本与标题')
    return
  }
  const plain = String(form.contentHtml || '')
    .replace(/<[^>]+>/g, '')
    .trim()
  if (!plain) {
    message.warning('请填写正文')
    return
  }
  saving.value = true
  try {
    const res = saveRelease({ ...form })
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    const id = form.id || res.row?.id
    if (andPublish && id) {
      const pub = publishRelease(id)
      if (!pub.ok) {
        message.warning(pub.message)
        return
      }
      message.success(pub.message)
    } else {
      message.success(res.message)
    }
    closeTab(route.fullPath)
    openTab(LIST_PATH, '工作台内容管理')
    router.push({ path: '/home/workbench-admin', query: { tab: 'releases' } })
  } finally {
    saving.value = false
  }
}

function goBack() {
  closeTab(route.fullPath)
  openTab(LIST_PATH, '工作台内容管理')
  router.push({ path: '/home/workbench-admin', query: { tab: 'releases' } })
}

onMounted(load)

watch(
  () => route.params.id,
  () => load(),
)
</script>

<script>
export default { name: 'WorkbenchReleaseEditView' }
</script>

<style lang="less" scoped>
.release-edit-page {
  padding: 4px 4px 24px;
}

.toolbar-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(15, 35, 95, 0.04);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.form-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 18px 20px 24px;
  box-shadow: 0 1px 2px rgba(15, 35, 95, 0.04);
}

.release-form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }

  :deep(.ant-form-item-label) {
    text-align: right;
  }

  :deep(.ant-row > .ant-col .ant-form-item-label) {
    width: 80px;
    max-width: 80px;
  }
}

.scope-wrap {
  width: 100%;
}

.content-item {
  :deep(.ant-form-item-label) {
    padding-top: 6px;
  }
}
</style>

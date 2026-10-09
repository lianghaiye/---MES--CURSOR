<template>
  <div class="workbench-admin page-shell">
    <section class="toolbar-card">
      <div class="toolbar-left">
        <h2 class="page-title">工作台内容管理</h2>
        <span class="updated-at"
          >运营配置：场景/新手维护外站文档链接；月度发布为站内消息。意见反馈请使用独立菜单。</span
        >
      </div>
      <a-button @click="goDashboard">返回工作台</a-button>
    </section>

    <a-tabs v-model:activeKey="activeTab" type="card" class="admin-tabs">
      <a-tab-pane key="scenarios" tab="场景解决方案">
        <div class="toolbar-row">
          <a-button type="primary" size="small" @click="openScenario()">
            <PlusOutlined />
            新增方案
          </a-button>
        </div>
        <a-table
          :columns="scenarioColumns"
          :data-source="scenarios"
          row-key="id"
          size="small"
          bordered
          :pagination="{ pageSize: 10, size: 'small' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'link'">
              <a class="ext-link" @click.prevent="previewLink(record.link)">{{ record.link }}</a>
            </template>
            <template v-else-if="column.key === 'enabled'">
              <a-switch
                :checked="record.enabled !== false"
                size="small"
                @change="(v) => onToggleScenario(record, v)"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space :size="12">
                <a @click="openScenario(record)">编辑</a>
                <a class="danger-link" @click="onRemoveScenario(record)">删除</a>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="releases" tab="月度功能发布">
        <div class="toolbar-row">
          <a-button type="primary" size="small" @click="openRelease()">
            <PlusOutlined />
            新增发布
          </a-button>
        </div>
        <a-table
          :columns="releaseColumns"
          :data-source="releases"
          row-key="id"
          size="small"
          bordered
          :pagination="{ pageSize: 10, size: 'small' }"
          :scroll="{ x: 1100 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="record.status === 'published' ? 'green' : 'default'">
                {{ record.status === 'published' ? '已发布' : '草稿' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'scope'">
              <span v-if="record.scopeType !== 'tenants'">全部租户</span>
              <span v-else>{{ formatTenantNames(record.tenantIds) }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space :size="10" wrap>
                <a @click="openRelease(record)">编辑</a>
                <a v-if="record.status !== 'published'" @click="onPublish(record)">发布</a>
                <a v-else @click="onUnpublish(record)">撤回</a>
                <a class="danger-link" @click="onRemoveRelease(record)">删除</a>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="guides" tab="新手入门">
        <div class="toolbar-row">
          <a-button type="primary" size="small" @click="openGuide()">
            <PlusOutlined />
            新增指南
          </a-button>
        </div>
        <a-table
          :columns="guideColumns"
          :data-source="guides"
          row-key="id"
          size="small"
          bordered
          :pagination="{ pageSize: 10, size: 'small' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'link'">
              <a class="ext-link" @click.prevent="previewLink(record.link)">{{ record.link }}</a>
            </template>
            <template v-else-if="column.key === 'enabled'">
              <a-switch
                :checked="record.enabled !== false"
                size="small"
                @change="(v) => onToggleGuide(record, v)"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space :size="12">
                <a @click="openGuide(record)">编辑</a>
                <a class="danger-link" @click="onRemoveGuide(record)">删除</a>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <!-- 场景编辑 -->
    <a-modal
      v-model:open="scenarioModalOpen"
      :title="scenarioForm.id ? '编辑场景方案' : '新增场景方案'"
      ok-text="保存"
      width="560px"
      @ok="saveScenarioForm"
    >
      <a-form layout="vertical">
        <a-form-item label="标题" required>
          <a-input v-model:value="scenarioForm.title" placeholder="方案标题" />
        </a-form-item>
        <a-form-item label="摘要">
          <a-textarea v-model:value="scenarioForm.summary" :rows="2" placeholder="简要说明" />
        </a-form-item>
        <a-form-item label="外站文档链接" required>
          <a-input
            v-model:value="scenarioForm.link"
            placeholder="如 blacklake.feishu.cn/wiki/xxx 或完整 https 链接"
          />
          <div class="field-tip">在飞书等外站编辑文档，工作台点击标题将新标签页打开该链接</div>
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="scenarioForm.sort" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="scenarioForm.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 指南编辑 -->
    <a-modal
      v-model:open="guideModalOpen"
      :title="guideForm.id ? '编辑新手指南' : '新增新手指南'"
      ok-text="保存"
      width="560px"
      @ok="saveGuideForm"
    >
      <a-form layout="vertical">
        <a-form-item label="标题" required>
          <a-input v-model:value="guideForm.title" />
        </a-form-item>
        <a-form-item label="摘要">
          <a-textarea v-model:value="guideForm.summary" :rows="2" />
        </a-form-item>
        <a-form-item label="外站文档链接" required>
          <a-input
            v-model:value="guideForm.link"
            placeholder="如 blacklake.feishu.cn/wiki/xxx 或完整 https 链接"
          />
          <div class="field-tip">在飞书等外站编辑文档，工作台点击标题将新标签页打开该链接</div>
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="guideForm.sort" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="guideForm.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { normalizeExternalUrl, openExternalLink } from '@/utils/externalLink'
import { getTenantName } from '@/mock/tenants'
import {
  listAllGuides,
  listAllReleases,
  listAllScenarios,
  publishRelease,
  removeGuide,
  removeRelease,
  removeScenario,
  saveGuide,
  saveScenario,
  unpublishRelease,
  workbenchState,
} from '@/store/workbenchStore'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const TAB_KEYS = ['scenarios', 'releases', 'guides']
const activeTab = ref(normalizeTab(route.query.tab))

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'feedbacks') {
      openTab('/home/feedback', '意见反馈')
      router.replace('/home/feedback')
      return
    }
    activeTab.value = normalizeTab(tab)
  },
  { immediate: true },
)

watch(activeTab, (tab) => {
  if (route.query.tab === tab) return
  if (route.path !== '/home/workbench-admin') return
  router.replace({ path: '/home/workbench-admin', query: { tab } })
})

function normalizeTab(tab) {
  return TAB_KEYS.includes(tab) ? tab : 'scenarios'
}

const scenarios = computed(() => {
  void workbenchState.scenarios
  return listAllScenarios()
})
const releases = computed(() => {
  void workbenchState.releases
  return listAllReleases()
})
const guides = computed(() => {
  void workbenchState.guides
  return listAllGuides()
})

const scenarioColumns = [
  { title: '排序', dataIndex: 'sort', width: 70 },
  { title: '标题', dataIndex: 'title', width: 160 },
  { title: '摘要', dataIndex: 'summary', ellipsis: true },
  { title: '外站链接', key: 'link', dataIndex: 'link', ellipsis: true },
  { title: '启用', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 120 },
]

const releaseColumns = [
  { title: '排序', dataIndex: 'sort', width: 64 },
  { title: '版本', dataIndex: 'versionTag', width: 72 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '状态', key: 'status', width: 88 },
  { title: '发布范围', key: 'scope', width: 160, ellipsis: true },
  { title: '发布时间', dataIndex: 'publishedAt', width: 160 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const guideColumns = [
  { title: '排序', dataIndex: 'sort', width: 70 },
  { title: '标题', dataIndex: 'title', width: 160 },
  { title: '摘要', dataIndex: 'summary', ellipsis: true },
  { title: '外站链接', key: 'link', dataIndex: 'link', ellipsis: true },
  { title: '启用', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 120 },
]

const scenarioModalOpen = ref(false)
const scenarioForm = reactive(emptyScenario())
const guideModalOpen = ref(false)
const guideForm = reactive(emptyGuide())

function emptyScenario() {
  return { id: '', title: '', summary: '', link: '', sort: 1, enabled: true }
}
function emptyGuide() {
  return { id: '', title: '', summary: '', link: '', sort: 1, enabled: true }
}

function assignForm(target, source, factory) {
  Object.assign(target, factory(), source || {})
}

function formatTenantNames(ids = []) {
  if (!ids?.length) return '—'
  return ids.map((id) => getTenantName(id)).join('、')
}

function previewLink(link) {
  const res = openExternalLink(link)
  if (!res.ok) message.warning(res.message)
}

function openScenario(record) {
  assignForm(scenarioForm, record, emptyScenario)
  if (!record) scenarioForm.sort = scenarios.value.length + 1
  scenarioModalOpen.value = true
}

function saveScenarioForm() {
  if (!String(scenarioForm.title || '').trim()) {
    message.warning('请填写标题')
    return Promise.reject()
  }
  const linkRes = normalizeExternalUrl(scenarioForm.link)
  if (!linkRes.ok) {
    message.warning(linkRes.message)
    return Promise.reject()
  }
  const res = saveScenario({ ...scenarioForm, link: linkRes.url })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  scenarioModalOpen.value = false
}

function onToggleScenario(record, enabled) {
  saveScenario({ id: record.id, enabled })
}

function onRemoveScenario(record) {
  Modal.confirm({
    title: '删除场景方案',
    content: `确认删除「${record.title}」？`,
    onOk: () => {
      const res = removeScenario(record.id)
      if (res.ok) message.success(res.message)
      else message.warning(res.message)
    },
  })
}

function openRelease(record) {
  if (record?.id) {
    const path = `/home/workbench-admin/releases/${record.id}/edit`
    openTab(path, '编辑功能发布')
    router.push(path)
    return
  }
  const path = '/home/workbench-admin/releases/new'
  openTab(path, '新增功能发布')
  router.push(path)
}

function onPublish(record) {
  const res = publishRelease(record.id)
  if (res.ok) message.success(res.message)
  else message.warning(res.message)
}

function onUnpublish(record) {
  Modal.confirm({
    title: '撤回发布',
    content: '撤回后工作台将不再展示该消息，确认继续？',
    onOk: () => {
      const res = unpublishRelease(record.id)
      if (res.ok) message.success(res.message)
      else message.warning(res.message)
    },
  })
}

function onRemoveRelease(record) {
  Modal.confirm({
    title: '删除功能发布',
    content: `确认删除「${record.title}」？`,
    onOk: () => {
      const res = removeRelease(record.id)
      if (res.ok) message.success(res.message)
      else message.warning(res.message)
    },
  })
}

function openGuide(record) {
  assignForm(guideForm, record, emptyGuide)
  if (!record) guideForm.sort = guides.value.length + 1
  guideModalOpen.value = true
}

function saveGuideForm() {
  if (!String(guideForm.title || '').trim()) {
    message.warning('请填写标题')
    return Promise.reject()
  }
  const linkRes = normalizeExternalUrl(guideForm.link)
  if (!linkRes.ok) {
    message.warning(linkRes.message)
    return Promise.reject()
  }
  const res = saveGuide({ ...guideForm, link: linkRes.url })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  guideModalOpen.value = false
}

function onToggleGuide(record, enabled) {
  saveGuide({ id: record.id, enabled })
}

function onRemoveGuide(record) {
  Modal.confirm({
    title: '删除新手指南',
    content: `确认删除「${record.title}」？`,
    onOk: () => {
      const res = removeGuide(record.id)
      if (res.ok) message.success(res.message)
      else message.warning(res.message)
    },
  })
}

function goDashboard() {
  openTab('/home/dashboard', '工作台')
  router.push('/home/dashboard')
}
</script>

<script>
export default { name: 'WorkbenchContentAdminView' }
</script>

<style lang="less" scoped>
.workbench-admin {
  padding: 4px 4px 20px;
}

.toolbar-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(15, 35, 95, 0.04);
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.updated-at {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.admin-tabs {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 12px 16px 16px;
  box-shadow: 0 1px 2px rgba(15, 35, 95, 0.04);
}

.toolbar-row {
  margin-bottom: 12px;
}

.danger-link {
  color: #ff4d4f;
}

.ext-link {
  color: #1677ff;
  word-break: break-all;
}

.field-tip {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}
</style>

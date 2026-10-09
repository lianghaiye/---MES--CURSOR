<template>
  <div class="feedback-list-page page-shell">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="关键词">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="反馈内容 / 提交人"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="范围">
              <a-select v-model:value="filters.scope" size="small" :options="scopeOpts" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" size="small" @click="openSubmit">
            <PlusOutlined />
            提交反馈
          </a-button>
          <a-button size="small" @click="handleRefresh">
            <ReloadOutlined />
            刷新
          </a-button>
        </a-space>
        <span class="toolbar-hint">共 {{ filteredList.length }} 条</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="middle"
        :pagination="false"
        :scroll="{ x: 960 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '已回复' ? 'green' : 'orange'">{{
              record.status
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'reply'">
            <span :class="{ muted: !record.reply }">{{ record.reply || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="12">
              <a @click="openReply(record)">{{
                record.status === '已回复' ? '查看/回复' : '回复'
              }}</a>
              <a class="danger-link" @click="onRemove(record)">删除</a>
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
        />
      </div>
    </div>

    <a-modal
      v-model:open="submitOpen"
      title="提交意见反馈"
      ok-text="提交"
      :confirm-loading="submitLoading"
      @ok="saveSubmit"
    >
      <a-textarea
        v-model:value="submitText"
        :rows="5"
        :maxlength="500"
        show-count
        placeholder="欢迎提出你的宝贵意见，我们会认真对待每一条反馈"
      />
    </a-modal>

    <a-modal v-model:open="replyOpen" title="回复意见反馈" ok-text="保存" @ok="saveReply">
      <div class="fb-meta">
        <div><span class="meta-label">提交人</span>{{ replyForm.creator || '—' }}</div>
        <div><span class="meta-label">提交时间</span>{{ replyForm.createdAt || '—' }}</div>
      </div>
      <p class="fb-content">{{ replyForm.content }}</p>
      <a-form layout="vertical">
        <a-form-item label="状态">
          <a-select
            v-model:value="replyForm.status"
            :options="[
              { label: '待处理', value: '待处理' },
              { label: '已回复', value: '已回复' },
            ]"
          />
        </a-form-item>
        <a-form-item label="回复内容">
          <a-textarea v-model:value="replyForm.reply" :rows="4" placeholder="填写回复" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { getUser } from '@/utils/auth'
import {
  listFeedbacks,
  removeFeedback,
  submitFeedback,
  updateFeedback,
  workbenchState,
} from '@/store/workbenchStore'

const statusOpts = [
  { label: '待处理', value: '待处理' },
  { label: '已回复', value: '已回复' },
]
const scopeOpts = [
  { label: '全部', value: 'all' },
  { label: '我的', value: 'mine' },
]

const filters = reactive({
  keyword: '',
  status: undefined,
  scope: 'all',
})
const appliedFilters = ref({ ...filters })
const pagination = reactive({ current: 1, pageSize: 10 })

const submitOpen = ref(false)
const submitLoading = ref(false)
const submitText = ref('')
const replyOpen = ref(false)
const replyForm = reactive({
  id: '',
  content: '',
  creator: '',
  createdAt: '',
  status: '待处理',
  reply: '',
})

const columns = [
  { title: '序号', key: 'index', width: 60, align: 'center' },
  { title: '反馈内容', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: '提交人', dataIndex: 'creator', width: 100 },
  { title: '提交时间', dataIndex: 'createdAt', width: 160 },
  { title: '状态', key: 'status', width: 90 },
  { title: '回复', key: 'reply', dataIndex: 'reply', ellipsis: true },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

function currentUserNames() {
  const user = getUser()
  return [user?.displayName, user?.name, user?.username].filter(Boolean).map(String)
}

const filteredList = computed(() => {
  void workbenchState.feedbacks
  const f = appliedFilters.value
  const names = currentUserNames()
  return listFeedbacks().filter((row) => {
    if (f.status && row.status !== f.status) return false
    if (f.scope === 'mine') {
      if (!names.length) return false
      if (!names.includes(String(row.creator || ''))) return false
    }
    const kw = String(f.keyword || '').trim()
    if (kw) {
      const hay = `${row.content || ''} ${row.creator || ''} ${row.reply || ''}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.keyword = ''
  filters.status = undefined
  filters.scope = 'all'
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleRefresh() {
  appliedFilters.value = { ...filters }
  message.success('列表已刷新')
}

function openSubmit() {
  submitText.value = ''
  submitOpen.value = true
}

async function saveSubmit() {
  submitLoading.value = true
  try {
    const user = getUser()
    const res = submitFeedback(submitText.value, user?.displayName || user?.name || '当前用户', {
      creatorId: user?.id || user?.username || '',
    })
    if (!res.ok) {
      message.warning(res.message)
      return Promise.reject()
    }
    message.success(res.message)
    submitOpen.value = false
    handleRefresh()
  } finally {
    submitLoading.value = false
  }
}

function openReply(record) {
  Object.assign(replyForm, {
    id: record.id,
    content: record.content,
    creator: record.creator,
    createdAt: record.createdAt,
    status: record.status || '待处理',
    reply: record.reply || '',
  })
  replyOpen.value = true
}

function saveReply() {
  const status = replyForm.reply && replyForm.status === '待处理' ? '已回复' : replyForm.status
  const res = updateFeedback(replyForm.id, {
    status,
    reply: replyForm.reply,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  replyOpen.value = false
}

function onRemove(record) {
  Modal.confirm({
    title: '删除反馈',
    content: '确认删除这条意见反馈？',
    onOk: () => {
      const res = removeFeedback(record.id)
      if (res.ok) message.success(res.message)
      else message.warning(res.message)
    },
  })
}
</script>

<script>
export default { name: 'FeedbackListView' }
</script>

<style lang="less" scoped>
.feedback-list-page {
  padding: 4px 4px 20px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.danger-link {
  color: #ff4d4f;
}

.fb-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.meta-label {
  margin-right: 8px;
  color: rgba(0, 0, 0, 0.45);
}

.fb-content {
  margin: 0 0 16px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

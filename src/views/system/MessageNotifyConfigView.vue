<template>
  <div class="message-notify-config page-card">
    <div class="page-toolbar">
      <div>
        <div class="page-title">消息通知配置</div>
        <div class="page-desc">
          配置各业务站内消息是否启用，以及通知角色、单据相关人、部门与人员（角色 +
          单据相关人为主）。
        </div>
      </div>
    </div>

    <a-form layout="inline" class="filter-bar" @submit.prevent>
      <a-form-item label="业务域">
        <a-select
          v-model:value="filters.domain"
          allow-clear
          placeholder="全部"
          style="width: 180px"
          :options="domainOpts"
        />
      </a-form-item>
      <a-form-item label="关键词">
        <a-input
          v-model:value="filters.keyword"
          allow-clear
          placeholder="名称/编码"
          style="width: 180px"
        />
      </a-form-item>
    </a-form>

    <a-table
      size="small"
      bordered
      row-key="code"
      :columns="columns"
      :data-source="filteredRows"
      :pagination="{ pageSize: 12, showTotal: (t) => `共 ${t} 条` }"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'enabled'">
          <a-switch
            :checked="record.config.enabled"
            checked-children="开"
            un-checked-children="关"
            @change="(v) => onToggle(record.code, v)"
          />
        </template>
        <template v-else-if="column.key === 'domain'">
          {{ domainLabel(record.domain) }}
        </template>
        <template v-else-if="column.key === 'recipientSummary'">
          <span class="muted">{{ recipientSummary(record.config) }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a @click="openEdit(record)">配置收件人</a>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="editOpen"
      :title="editRow ? `配置 · ${editRow.name}` : '配置收件人'"
      width="720px"
      :mask-closable="false"
      destroy-on-close
      ok-text="保存"
      @ok="saveEdit"
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px"
        message="建议以「角色 + 单据相关人」为主；部门/固定人员用于补充指定通知对象。"
      />
      <a-form layout="vertical" v-if="editForm">
        <a-form-item label="启用">
          <a-switch v-model:checked="editForm.enabled" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-model:value="editForm.roles"
            mode="multiple"
            allow-clear
            placeholder="请选择角色"
            :options="roleOpts"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="单据相关人">
          <a-checkbox-group v-model:value="editForm.docRelations" :options="docRelationOpts" />
        </a-form-item>
        <a-form-item label="通知部门">
          <a-select
            v-model:value="editForm.deptIds"
            mode="multiple"
            allow-clear
            placeholder="选填"
            :options="deptOpts"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="通知人员">
          <a-select
            v-model:value="editForm.userIds"
            mode="multiple"
            allow-clear
            placeholder="选填"
            :options="userOpts"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item v-if="editRow?.code === 'PAY_DUE_SOON'" label="提前提醒天数">
          <a-input-number
            v-model:value="editForm.advanceDays"
            :min="0"
            :max="90"
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="触发说明">
          <div class="muted">{{ editRow?.trigger }}</div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  MESSAGE_DOC_RELATION_OPTIONS,
  MESSAGE_NOTIFY_DEPT_OPTIONS,
  MESSAGE_NOTIFY_DOMAINS,
  MESSAGE_NOTIFY_ROLE_OPTIONS,
  MESSAGE_NOTIFY_USER_OPTIONS,
  domainLabel,
} from '@/constants/messageNotifyCatalog'
import {
  listMessageConfigs,
  updateMessageConfig,
  messageNotifyState,
} from '@/store/messageNotifyStore'

defineOptions({ name: 'MessageNotifyConfigView' })

const filters = reactive({
  domain: undefined,
  keyword: '',
})

const editOpen = ref(false)
const editRow = ref(null)
const editForm = ref(null)

const domainOpts = MESSAGE_NOTIFY_DOMAINS.map((d) => ({ value: d.value, label: d.label }))
const roleOpts = MESSAGE_NOTIFY_ROLE_OPTIONS
const docRelationOpts = MESSAGE_DOC_RELATION_OPTIONS
const deptOpts = MESSAGE_NOTIFY_DEPT_OPTIONS
const userOpts = MESSAGE_NOTIFY_USER_OPTIONS

const columns = [
  { title: '启用', key: 'enabled', width: 80 },
  { title: '业务域', key: 'domain', width: 130 },
  { title: '编码', dataIndex: 'code', width: 180, ellipsis: true },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '触发时机', dataIndex: 'trigger', width: 180, ellipsis: true },
  { title: '收件策略', key: 'recipientSummary', width: 220, ellipsis: true },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

const rows = computed(() => {
  void messageNotifyState.configs
  return listMessageConfigs()
})

const filteredRows = computed(() => {
  const kw = String(filters.keyword || '')
    .trim()
    .toLowerCase()
  return rows.value.filter((r) => {
    if (filters.domain && r.domain !== filters.domain) return false
    if (kw) {
      const hit = `${r.code} ${r.name}`.toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

function labelOf(options, value) {
  return options.find((o) => o.value === value)?.label || value
}

function recipientSummary(cfg) {
  if (!cfg) return '—'
  const parts = []
  if (cfg.roles?.length) {
    parts.push(`角色:${cfg.roles.map((v) => labelOf(roleOpts, v)).join('、')}`)
  }
  if (cfg.docRelations?.length) {
    parts.push(`单据:${cfg.docRelations.map((v) => labelOf(docRelationOpts, v)).join('、')}`)
  }
  if (cfg.deptIds?.length) {
    parts.push(`部门:${cfg.deptIds.map((v) => labelOf(deptOpts, v)).join('、')}`)
  }
  if (cfg.userIds?.length) {
    parts.push(`人员:${cfg.userIds.map((v) => labelOf(userOpts, v)).join('、')}`)
  }
  return parts.join('；') || '（未配置，发布时默认当前用户）'
}

function onToggle(code, enabled) {
  updateMessageConfig(code, { enabled: Boolean(enabled) })
  message.success(enabled ? '已启用' : '已停用')
}

function openEdit(record) {
  editRow.value = record
  const c = record.config
  editForm.value = {
    enabled: c.enabled !== false,
    roles: [...(c.roles || [])],
    docRelations: [...(c.docRelations || [])],
    deptIds: [...(c.deptIds || [])],
    userIds: [...(c.userIds || [])],
    advanceDays: c.advanceDays,
  }
  editOpen.value = true
}

function saveEdit() {
  if (!editRow.value || !editForm.value) return Promise.reject()
  updateMessageConfig(editRow.value.code, { ...editForm.value })
  message.success('已保存')
  editOpen.value = false
  return Promise.resolve()
}
</script>

<style lang="less" scoped>
.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 20px;
}

.page-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-desc {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.filter-bar {
  margin-bottom: 12px;
}

.muted {
  color: rgba(0, 0, 0, 0.55);
  font-size: 12px;
}
</style>

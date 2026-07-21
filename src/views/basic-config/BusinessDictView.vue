<template>
  <div class="business-dict-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="关键字">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="系统字典编号 / 名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="所属模块">
              <a-select
                v-model:value="filters.module"
                allow-clear
                size="small"
                placeholder="请选择模块"
                :options="moduleOpts"
                show-search
                option-filter-prop="label"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="业务状态">
              <a-select
                v-model:value="filters.bizStatus"
                allow-clear
                size="small"
                placeholder="全部"
                :options="bizStatusFilterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
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

    <div class="toolbar-row">
      <div class="toolbar-tip">
        从系统字典中查找并配置企业侧覆盖；启用后业务字典优先于系统字典。
      </div>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'sysStatus'">
            <a-tag :color="record.status === '启用' ? 'success' : 'default'">{{
              record.status
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'bizStatus'">
            <a-tag :color="bizStatusColor(record.bizStatus)">{{
              bizStatusLabel(record.bizStatus)
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            {{ record.items?.length || 0 }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a @click="openConfig(record)">配置</a>
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

    <a-drawer
      v-model:open="configOpen"
      :title="configTitle"
      width="760px"
      destroy-on-close
      @close="closeConfig"
    >
      <template v-if="currentSys">
        <a-descriptions size="small" bordered :column="2" class="meta-desc">
          <a-descriptions-item label="系统字典编号">{{ currentSys.code }}</a-descriptions-item>
          <a-descriptions-item label="系统字典名称">{{ currentSys.name }}</a-descriptions-item>
          <a-descriptions-item label="所属模块">{{ currentSys.module || '—' }}</a-descriptions-item>
          <a-descriptions-item label="系统状态">{{ currentSys.status }}</a-descriptions-item>
          <a-descriptions-item label="业务状态">
            {{ bizStatusLabel(currentBizStatus) }}
          </a-descriptions-item>
        </a-descriptions>

        <template v-if="!currentBiz">
          <a-alert
            type="info"
            show-icon
            class="config-alert"
            message="尚未配置业务字典。生成后将复制当前系统字典项，可再按企业需求编辑；启用后优先使用业务值。"
          />
          <div class="preview-block">
            <div class="preview-title">系统字典项预览</div>
            <a-table
              :columns="previewColumns"
              :data-source="currentSys.items || []"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">{{ record.status }}</template>
              </template>
            </a-table>
          </div>
        </template>

        <template v-else>
          <div class="biz-toolbar">
            <a-space wrap>
              <span>业务字典状态：</span>
              <a-select
                v-model:value="bizFormStatus"
                size="small"
                style="width: 120px"
                :options="statusOpts"
              />
              <a-button size="small" type="primary" @click="saveBizMeta">保存状态</a-button>
              <a-button size="small" @click="openItemsEdit">编辑字典项</a-button>
              <a-button size="small" danger @click="handleResetToSystem">重置为系统默认</a-button>
            </a-space>
          </div>
          <a-table
            :columns="previewColumns"
            :data-source="currentBiz.items || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === '启用' ? 'success' : 'default'">{{
                  record.status
                }}</a-tag>
              </template>
            </template>
          </a-table>
        </template>
      </template>

      <template #footer>
        <a-space>
          <a-button @click="closeConfig">关闭</a-button>
          <a-button v-if="!currentBiz" type="primary" @click="handleGenerate">
            生成业务配置（复制系统项）
          </a-button>
        </a-space>
      </template>
    </a-drawer>

    <DictItemsConfigDrawer
      v-model:open="itemsOpen"
      :title="itemsTitle"
      header-hint="编辑业务字典项；保存后若业务字典为启用，业务侧将优先使用这些值。系统字典预置项不可删除。"
      :items="currentBiz?.items || []"
      :protect-preset-items="true"
      :system-preset-values="systemPresetValues"
      @save="handleItemsSave"
    />
  </div>
</template>

<script>
export default { name: 'BusinessDictView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  DICT_STATUS,
  DICT_MODULE_OPTIONS,
  systemDictState,
  listSystemDicts,
} from '@/store/systemDictStore'
import {
  businessDictState,
  getBusinessDictStatus,
  findBusinessDictByCode,
  createBusinessDictFromSystem,
  updateBusinessDict,
  setBusinessDictItems,
  resetBusinessDictToSystem,
} from '@/store/businessDictStore'
import DictItemsConfigDrawer from '@/views/system/components/DictItemsConfigDrawer.vue'

const filters = reactive({ keyword: '', module: undefined, bizStatus: undefined })
const applied = ref({ keyword: '', module: undefined, bizStatus: undefined })
const pagination = reactive({ current: 1, pageSize: 10 })
const configOpen = ref(false)
const currentSys = ref(null)
const bizFormStatus = ref(DICT_STATUS.ENABLED)
const itemsOpen = ref(false)

const statusOpts = [
  { label: DICT_STATUS.ENABLED, value: DICT_STATUS.ENABLED },
  { label: DICT_STATUS.DISABLED, value: DICT_STATUS.DISABLED },
]
const moduleOpts = DICT_MODULE_OPTIONS

const bizStatusFilterOpts = [
  { label: '未配置', value: 'none' },
  { label: '已配置启用', value: 'enabled' },
  { label: '已配置停用', value: 'disabled' },
]

const columns = [
  { title: '序号', key: 'index', width: 64, align: 'center' },
  { title: '系统状态', key: 'sysStatus', width: 88, align: 'center' },
  { title: '字典编号', dataIndex: 'code', key: 'code', width: 160 },
  { title: '字典名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: '所属模块', dataIndex: 'module', key: 'module', width: 120 },
  { title: '系统项数', key: 'itemCount', width: 88, align: 'center' },
  { title: '业务状态', key: 'bizStatus', width: 120, align: 'center' },
  { title: '操作', key: 'actions', width: 88, fixed: 'right' },
]

const previewColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '显示名称', dataIndex: 'label', key: 'label' },
  { title: '字典值', dataIndex: 'value', key: 'value' },
  { title: '状态', key: 'status', width: 88 },
]

const filteredList = computed(() => {
  void systemDictState.dicts
  void businessDictState.dicts
  const list = listSystemDicts({
    keyword: applied.value.keyword,
    module: applied.value.module,
  }).map((d) => ({
    ...d,
    bizStatus: getBusinessDictStatus(d.code),
  }))
  if (!applied.value.bizStatus) return list
  return list.filter((d) => d.bizStatus === applied.value.bizStatus)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

watch(filteredList, () => {
  const maxPage = Math.max(1, Math.ceil(filteredList.value.length / pagination.pageSize) || 1)
  if (pagination.current > maxPage) pagination.current = 1
})

const currentBiz = computed(() => {
  void businessDictState.dicts
  if (!currentSys.value) return null
  return findBusinessDictByCode(currentSys.value.code)
})

const currentBizStatus = computed(() =>
  currentSys.value ? getBusinessDictStatus(currentSys.value.code) : 'none',
)

const configTitle = computed(() =>
  currentSys.value ? `业务字典配置 — ${currentSys.value.name}` : '业务字典配置',
)

const itemsTitle = computed(() =>
  currentSys.value ? `编辑业务字典项 — ${currentSys.value.name}` : '编辑业务字典项',
)

const systemPresetValues = computed(() =>
  (currentSys.value?.items || []).map((it) => it.value).filter(Boolean),
)

function bizStatusLabel(status) {
  if (status === 'enabled') return '已配置启用'
  if (status === 'disabled') return '已配置停用'
  return '未配置'
}

function bizStatusColor(status) {
  if (status === 'enabled') return 'success'
  if (status === 'disabled') return 'warning'
  return 'default'
}

function handleSearch() {
  applied.value = {
    keyword: filters.keyword,
    module: filters.module,
    bizStatus: filters.bizStatus,
  }
  pagination.current = 1
}

function handleReset() {
  filters.keyword = ''
  filters.module = undefined
  filters.bizStatus = undefined
  handleSearch()
}

function openConfig(record) {
  currentSys.value = record
  const biz = findBusinessDictByCode(record.code)
  bizFormStatus.value = biz?.status || DICT_STATUS.ENABLED
  configOpen.value = true
}

function closeConfig() {
  configOpen.value = false
  currentSys.value = null
}

function handleGenerate() {
  if (!currentSys.value) return
  const res = createBusinessDictFromSystem(currentSys.value.code)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  bizFormStatus.value = DICT_STATUS.ENABLED
  message.success('已生成业务配置，可继续编辑字典项')
}

function saveBizMeta() {
  if (!currentBiz.value) return
  const res = updateBusinessDict(currentBiz.value.id, { status: bizFormStatus.value })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('业务状态已保存')
}

function openItemsEdit() {
  if (!currentBiz.value) {
    message.warning('请先生成业务配置')
    return
  }
  itemsOpen.value = true
}

function handleItemsSave(items) {
  if (!currentBiz.value) return
  const res = setBusinessDictItems(currentBiz.value.id, items)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('业务字典项已保存')
}

function handleResetToSystem() {
  if (!currentSys.value) return
  Modal.confirm({
    title: '重置为系统默认？',
    content: '将清除该字典的业务配置，下拉选项恢复为系统字典值。',
    onOk: () => {
      const res = resetBusinessDictToSystem(currentSys.value.code)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已重置为系统默认')
    },
  })
}
</script>

<style lang="less" scoped>
.business-dict-page {
  padding: 0;
}
.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
  background: #fff;
}
.horizontal-form {
  width: 100%;
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
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
  margin-bottom: 8px;
  gap: 8px;
}
.toolbar-tip {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.toolbar-icons {
  margin-left: auto;
}
.table-card {
  background: #fff;
  padding: 8px 12px 12px;
  border-radius: 4px;
}
.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.meta-desc {
  margin-bottom: 16px;
}
.config-alert {
  margin-bottom: 16px;
}
.preview-block {
  margin-top: 8px;
}
.preview-title {
  margin-bottom: 8px;
  font-weight: 500;
}
.biz-toolbar {
  margin: 12px 0;
}
</style>

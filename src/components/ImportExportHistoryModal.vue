<template>
  <a-modal
    :open="open"
    title="导入导出历史记录"
    width="1100px"
    destroy-on-close
    :footer="null"
    @cancel="emit('update:open', false)"
  >
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
        <template v-else-if="column.key === 'progress'">
          <a-progress
            :percent="record.progress"
            size="small"
            :status="record.progress === 100 ? 'success' : 'normal'"
          />
        </template>
        <template v-else-if="column.key === 'result'">
          <span :class="resultClass(record.result)">{{ record.result }}</span>
        </template>
        <template v-else-if="column.key === 'duration'">
          {{ record.durationSec != null ? `${record.durationSec}秒` : '—' }}
        </template>
        <template v-else-if="column.key === 'remark'">
          <span class="remark" :title="record.remark">{{ record.remark || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space :size="8">
            <a v-if="record.errorRows?.length" class="action-link" @click="downloadErrors(record)">
              <DownloadOutlined />
              下载
            </a>
            <a class="action-link" @click="openPreview(record)">
              <EyeOutlined />
              预览
            </a>
          </a-space>
        </template>
      </template>
    </a-table>

    <div class="pager">
      <a-pagination
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        size="small"
        :total="records.length"
        :show-size-changer="true"
        :page-size-options="['10', '20', '50']"
      />
    </div>

    <a-modal v-model:open="previewOpen" title="预览" width="720px" :footer="null" destroy-on-close>
      <a-descriptions v-if="previewRecord" bordered size="small" :column="2" class="preview-desc">
        <a-descriptions-item label="任务类型">{{ previewRecord.taskType }}</a-descriptions-item>
        <a-descriptions-item label="业务模块">{{ previewRecord.module }}</a-descriptions-item>
        <a-descriptions-item label="结果">{{ previewRecord.result }}</a-descriptions-item>
        <a-descriptions-item label="成功/失败">
          {{ previewRecord.successCount || 0 }} / {{ previewRecord.failCount || 0 }}
        </a-descriptions-item>
        <a-descriptions-item label="说明" :span="2">{{ previewRecord.remark }}</a-descriptions-item>
      </a-descriptions>
      <a-table
        v-if="previewRecord?.previewRows?.length"
        class="preview-table"
        size="small"
        bordered
        row-key="__i"
        :pagination="false"
        :columns="previewColumns"
        :data-source="previewTableData"
      />
      <a-empty v-else description="暂无预览数据" />
    </a-modal>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { importExportHistoryState } from '@/store/importExportHistoryStore'
import { downloadErrorWorkbook, buildImportFileName } from '@/utils/excelImport'

defineProps({
  open: Boolean,
})

const emit = defineEmits(['update:open'])

const pagination = reactive({ current: 1, pageSize: 10 })
const previewOpen = ref(false)
const previewRecord = ref(null)

const columns = [
  { title: '#', key: 'index', width: 50, align: 'center' },
  { title: '任务类型', dataIndex: 'taskType', width: 80 },
  { title: '业务模块', dataIndex: 'module', width: 140 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '操作时间', dataIndex: 'operatedAt', width: 160 },
  { title: '进度', key: 'progress', width: 140 },
  { title: '结果', key: 'result', width: 90 },
  { title: '耗时', key: 'duration', width: 70 },
  { title: '说明', key: 'remark', width: 220 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const records = computed(() => importExportHistoryState.records)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return records.value.slice(start, start + pagination.pageSize)
})

const previewColumns = computed(() => {
  const row = previewRecord.value?.previewRows?.[0]
  if (!row) return []
  return Object.keys(row).map((key) => ({ title: key, dataIndex: key, key, ellipsis: true }))
})

const previewTableData = computed(() =>
  (previewRecord.value?.previewRows || []).map((row, i) => ({ ...row, __i: i })),
)

watch(
  () => records.value.length,
  () => {
    pagination.current = 1
  },
)

function resultClass(result) {
  if (result === '成功') return 'ok'
  if (result === '部分成功') return 'partial'
  return 'fail'
}

function downloadErrors(record) {
  downloadErrorWorkbook(
    record.errorRows || [],
    record.errorHeaders || [],
    buildImportFileName(`${record.module || '导入'}_错误信息`),
  )
}

function openPreview(record) {
  previewRecord.value = record
  previewOpen.value = true
}
</script>

<style scoped>
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.remark {
  display: inline-block;
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.ok {
  color: #52c41a;
}

.partial {
  color: #fa8c16;
}

.fail {
  color: #ff4d4f;
}

.action-link {
  color: #1677ff;
  cursor: pointer;
}

.preview-desc {
  margin-bottom: 12px;
}

.preview-table {
  margin-top: 8px;
}
</style>

<template>
  <div class="report-query list-page">
    <div class="filter-card">
      <div class="report-head">
        <div>
          <div class="report-title">{{ def?.title || '报表' }}</div>
          <div class="report-sub">
            {{ def?.desc }}
            <span class="time-tag">时间口径：{{ def?.timeFieldLabel }}</span>
          </div>
        </div>
        <a-button type="link" @click="goCenter">返回目录</a-button>
      </div>
      <a-form layout="inline" class="filter-form horizontal-form" :model="filters">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item :label="dateLabel">
              <a-range-picker
                v-model:value="filters.dateRange"
                size="small"
                style="width: 100%"
                :placeholder="['开始日期', '结束日期']"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="关键词">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                size="small"
                placeholder="单号 / 客户 / 供应商 / 物料等"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item" label=" ">
              <a-space>
                <a-button type="primary" size="small" @click="runQuery">
                  <SearchOutlined />
                  查询
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
                <a-button size="small" @click="handleExport">
                  <DownloadOutlined />
                  导出
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          共 <strong>{{ summary.count }}</strong> 行
          <template v-for="(val, key) in summary.sums" :key="key">
            <span v-if="isAmountKey(key)" class="sum-item">
              · {{ sumLabel(key) }} ¥{{ formatMoney(val) }}
            </span>
            <span v-else class="sum-item"> · {{ sumLabel(key) }} {{ val }}</span>
          </template>
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedRows"
        row-key="__rowKey"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="isAmountKey(column.key)">
            {{ formatMoney(record[column.key]) }}
          </template>
          <template v-else>
            {{ record[column.key] ?? '—' }}
          </template>
        </template>
      </a-table>
      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          size="small"
          show-size-changer
          :total="rows.length"
          :show-total="(t) => `共 ${t} 条`"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { getReportDef } from '@/config/reportCatalog'
import {
  buildReportRows,
  getReportColumns,
  summarizeReportRows,
} from '@/utils/reportCenter/buildReportRows'
import { buildExportFileName, exportRowsToExcel } from '@/utils/excelExport'

defineOptions({ name: 'ReportQueryView' })

const props = defineProps({
  reportKey: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const { openTab, closeTab } = useTabs()

const def = computed(() => getReportDef(props.reportKey))
const columns = computed(() => getReportColumns(props.reportKey))
const tableScrollX = computed(() => Math.max(960, columns.value.length * 120))

const dateLabel = computed(() => {
  const map = {
    'sales-order-exec': '审核通过日',
    'sales-line-summary': '审核通过日',
    'sales-delivery-achieve': '审核通过日',
    'sales-order-cost': '审核通过日',
    'work-order-progress': '计划开工日',
    'work-order-cost': '计划开工日',
    'purchase-order-exec': '单据日期',
    'outsourcing-order-exec': '单据日期',
    'inventory-io-balance': '确认出入库日',
    'qc-task-stats': '质检日期',
  }
  return map[props.reportKey] || '统计期间'
})

const filters = reactive({
  dateRange: [dayjs().startOf('month'), dayjs()],
  keyword: '',
})
const applied = ref({
  dateRange: [...filters.dateRange],
  keyword: '',
})
const rows = ref([])
const pagination = reactive({ current: 1, pageSize: 20 })

const summary = computed(() => summarizeReportRows(props.reportKey, rows.value))

const pagedRows = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return rows.value.slice(start, start + pagination.pageSize).map((r, i) => ({
    ...r,
    __rowKey: `${props.reportKey}-${start + i}`,
  }))
})

function isAmountKey(key) {
  return /amount|Amount|金额/.test(String(key)) || String(key).toLowerCase().includes('amount')
}

function sumLabel(key) {
  const col = columns.value.find((c) => c.key === key)
  return col?.title || key
}

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

function runQuery() {
  applied.value = {
    dateRange: filters.dateRange ? [...filters.dateRange] : null,
    keyword: filters.keyword,
  }
  rows.value = buildReportRows(props.reportKey, applied.value)
  pagination.current = 1
}

function handleReset() {
  filters.dateRange = [dayjs().startOf('month'), dayjs()]
  filters.keyword = ''
  runQuery()
}

function handleExport() {
  if (!rows.value.length) {
    message.warning('暂无数据可导出')
    return
  }
  const fields = columns.value.map((c) => ({
    title: c.title,
    getValue: (row) => {
      const val = row[c.key]
      if (isAmountKey(c.key)) return formatMoney(val)
      return val ?? ''
    },
  }))
  exportRowsToExcel({
    rows: rows.value,
    fields,
    fileName: buildExportFileName(def.value?.title || '报表'),
    sheetName: (def.value?.title || '报表').slice(0, 31),
  })
  message.success('已导出')
}

function goCenter() {
  const path = '/report/overview'
  openTab(path, '报表中心')
  closeTab(route.fullPath || route.path)
  router.push(path)
}

watch(
  () => props.reportKey,
  () => runQuery(),
  { immediate: true },
)
</script>

<style lang="less" scoped>
.report-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.report-title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.report-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.time-tag {
  margin-left: 8px;
  color: #1677ff;
}

.summary-bar {
  margin-bottom: 8px;
}

.sum-item {
  margin-left: 4px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>

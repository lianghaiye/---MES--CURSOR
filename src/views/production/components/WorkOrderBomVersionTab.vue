<template>
  <div class="work-order-bom-version-tab">
    <div class="section-card">
      <div class="section-title">EBOM 信息</div>
      <div class="section-hint">
        展示各明细行现行 EBOM（始终为最新版本）；「初始版本」为订单审核通过时生成的快照版本。
      </div>
      <a-table
        :columns="ebomColumns"
        :data-source="ebomRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: ebomTableScrollX }"
        :locale="{ emptyText: '暂无 EBOM 信息' }"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.key === 'index'">{{ row.index }}</template>
          <template v-else-if="column.key === 'ebomStatus'">
            <a-tag :color="row.ebomStatusColor">{{ row.ebomStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'bomName'">
            <a
              v-if="row.bomId"
              class="link-code"
              @click.prevent="openBomDetail(row.bomId, row.bomName)"
            >
              {{ row.bomName }}
            </a>
            <span v-else>{{ row.bomName }}</span>
          </template>
          <template v-else-if="column.key === 'boundVersion'">
            <span>{{ row.boundVersion }}</span>
          </template>
          <template v-else>
            {{ row[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div v-if="showVersionChange" class="section-card">
      <div class="section-title">EBOM 版本变更</div>
      <div class="bom-product-block">
        <div class="bom-line-head">
          <span class="bom-product-name">{{ ebomLine?.productName }}</span>
          <span v-if="ebomLine?.productCode" class="bom-product-code">{{
            ebomLine.productCode
          }}</span>
          <a-tag color="orange">初始版本 {{ ebomLine?.bomVersion || '—' }}</a-tag>
          <a-tag v-if="activeVersion" color="blue">现行版本 {{ activeVersion }}</a-tag>
        </div>
        <BomVersionInfoSection
          :product-id="ebomLine?.productId"
          :bom-id="ebomLine?.bomId"
          :bound-version="ebomLine?.bomVersion"
          :compare-quantity="compareQuantity"
        />
        <SalesOrderEbomDiffSection v-if="ebomLine" :line="ebomLine" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import BomVersionInfoSection from '@/components/BomVersionInfoSection.vue'
import SalesOrderEbomDiffSection from '@/views/sales/components/SalesOrderEbomDiffSection.vue'
import {
  buildWorkOrderEbomLine,
  buildWorkOrderEbomRows,
  workOrderActiveBomVersion,
  workOrderBomVersionChanged,
} from '@/utils/workOrderBomRows'

const props = defineProps({
  workOrder: { type: Object, default: null },
  variant: { type: String, default: 'production' },
})

const router = useRouter()
const { openTab } = useTabs()

const ebomLine = computed(() => buildWorkOrderEbomLine(props.workOrder, props.variant))
const ebomRows = computed(() => buildWorkOrderEbomRows(props.workOrder, props.variant))
const showVersionChange = computed(() => workOrderBomVersionChanged(props.workOrder, props.variant))
const activeVersion = computed(() => workOrderActiveBomVersion(props.workOrder, props.variant))
const compareQuantity = computed(() => Number(ebomLine.value?.salesQty) || 1)

const ebomColumns = [
  { key: 'index', title: '序号', width: 56, align: 'center', fixed: 'left' },
  { key: 'ebomStatus', title: 'EBOM状态', width: 100, fixed: 'left' },
  {
    key: 'bomName',
    title: 'EBOM名称',
    dataIndex: 'bomName',
    width: 160,
    ellipsis: true,
    fixed: 'left',
  },
  { key: 'bomNo', title: 'EBOM编码', dataIndex: 'bomNo', width: 130, ellipsis: true },
  { key: 'itemName', title: '产品名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { key: 'initialVersion', title: '初始版本', dataIndex: 'initialVersion', width: 96 },
  { key: 'boundVersion', title: '订单绑定版本', dataIndex: 'boundVersion', width: 120 },
  { key: 'specModel', title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { key: 'material', title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { key: 'drawingNo', title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { key: 'levelCount', title: '层级数', dataIndex: 'levelCount', width: 72, align: 'center' },
  { key: 'materialCount', title: '物料数', dataIndex: 'materialCount', width: 72, align: 'center' },
  { key: 'snapshotAt', title: '快照时间', dataIndex: 'snapshotAt', width: 150 },
]

const ebomTableScrollX = computed(() =>
  ebomColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function openBomDetail(bomId, bomName) {
  if (!bomId) return
  const path = `/product-process/bom/${bomId}`
  openTab(path, bomName || 'BOM详情')
  router.push(path)
}
</script>

<style lang="less" scoped>
.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.section-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 10px;
}

.section-hint {
  margin: -4px 0 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.bom-product-block {
  margin-bottom: 10px;
}

.bom-line-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;

  .bom-product-name {
    font-weight: 600;
    font-size: 13px;
  }

  .bom-product-code {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    font-family: monospace;
  }
}
</style>

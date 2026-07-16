<template>
  <div class="spu-migration-page">
    <a-page-header title="主数据归族工作台" sub-title="将现有扁平 SKU 自动提案归并为产品族" />

    <a-space style="margin-bottom: 12px">
      <a-button type="primary" size="small" @click="refresh">刷新提案</a-button>
      <a-button size="small" @click="router.push('/product-process/spu')">返回族管理</a-button>
    </a-space>

    <a-table
      :columns="columns"
      :data-source="groups"
      row-key="familyName"
      size="small"
      :pagination="{ pageSize: 10 }"
      :scroll="{ x: 1000 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'skus'">
          <a-tag v-for="s in record.skuPatches" :key="s.id" style="margin-bottom: 4px">
            {{ s.name }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'axes'">
          {{ (record.proposedSpu.variantAxes || []).map((a) => a.label).join(' + ') || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="applyGroup(record)">确认归族</a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { proposeSpuMigrationGroups, applyMigrationGroup } from '@/utils/spuMigration'

const router = useRouter()
const groups = ref([])

const columns = [
  { title: '提案族名', dataIndex: 'familyName', key: 'familyName', width: 120 },
  {
    title: '分类',
    key: 'category',
    width: 100,
    customRender: ({ record }) => record.proposedSpu?.categoryName || '—',
  },
  { title: '变体轴', key: 'axes', width: 120 },
  { title: '包含 SKU', key: 'skus', width: 400 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

function refresh() {
  groups.value = proposeSpuMigrationGroups()
  message.info(`共 ${groups.value.length} 个归族提案`)
}

function applyGroup(group) {
  const res = applyMigrationGroup(group)
  if (res.error) {
    message.warning(res.error)
    return
  }
  message.success(`已创建/关联族「${res.spu.name}」，链接 ${res.linked.length} 个 SKU`)
  refresh()
}

refresh()
</script>

<style scoped>
.spu-migration-page {
  padding: 12px;
  background: #fff;
  border-radius: 6px;
  margin: 12px;
}
</style>
